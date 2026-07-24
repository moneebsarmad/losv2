'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, CheckCircle2, Search, Send, X } from 'lucide-react'
import { VISIBILITY_OPTIONS, type VisibilityKey } from '@/lib/constants/formation'
import {
  DIRECT_NOTE_MIN_LENGTH,
  NOMINATION_EXPLANATION_MIN_LENGTH,
  RECOGNITION_NOTE_MAX_LENGTH,
} from '@/lib/recognition/constants'
import { noteMeetsDefinitionRequirement } from '@/lib/recognition/validation'
import type {
  RecognitionDefinition,
  RecognitionReferencePayload,
  StudentSummary,
} from '@/types'

function newIdempotencyKey() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `recognition-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function RecognitionForm() {
  const [references, setReferences] = useState<RecognitionReferencePayload>({
    rValues: [],
    domains: [],
    definitions: [],
    graduateValues: [],
  })
  const [loadingReferences, setLoadingReferences] = useState(true)
  const [studentQuery, setStudentQuery] = useState('')
  const [studentResults, setStudentResults] = useState<StudentSummary[]>([])
  const [selectedStudents, setSelectedStudents] = useState<StudentSummary[]>([])
  const [rValueCode, setRValueCode] = useState('')
  const [definitionCode, setDefinitionCode] = useState('')
  const [domainCode, setDomainCode] = useState('')
  const [note, setNote] = useState('')
  const [witnessInformation, setWitnessInformation] = useState('')
  const [visibility, setVisibility] = useState<VisibilityKey>('student_parent')
  const [idempotencyKey, setIdempotencyKey] = useState(newIdempotencyKey)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadReferences() {
      const response = await fetch('/api/reference')
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(payload.error ?? 'Unable to load the recognition framework.')
      } else {
        setReferences({
          rValues: payload.rValues ?? [],
          domains: payload.domains ?? [],
          definitions: payload.definitions ?? [],
          graduateValues: payload.graduateValues ?? [],
        })
      }
      setLoadingReferences(false)
    }
    loadReferences()
  }, [])

  useEffect(() => {
    if (studentQuery.trim().length < 2) {
      setStudentResults([])
      return
    }

    const timeout = setTimeout(async () => {
      const response = await fetch(`/api/students/search?q=${encodeURIComponent(studentQuery.trim())}`)
      const payload = await response.json().catch(() => ({}))
      const selectedIds = new Set(selectedStudents.map((student) => student.id))
      setStudentResults((payload.students ?? []).filter((student: StudentSummary) => !selectedIds.has(student.id)))
    }, 180)

    return () => clearTimeout(timeout)
  }, [selectedStudents, studentQuery])

  const selectedDefinition = useMemo(
    () => references.definitions.find((definition) => definition.code === definitionCode) ?? null,
    [definitionCode, references.definitions]
  )
  const selectedDomain = useMemo(
    () => references.domains.find((domain) => domain.key === domainCode) ?? null,
    [domainCode, references.domains]
  )
  const behaviours = useMemo(
    () => references.definitions.filter((definition) => definition.r_value_code === rValueCode),
    [rValueCode, references.definitions]
  )

  const isNomination = selectedDefinition?.award_mode === 'nomination'
  const noteRequired = selectedDefinition?.fixed_points === 20 || isNomination
  const noteValid = selectedDefinition
    ? isNomination
      ? note.trim().length >= NOMINATION_EXPLANATION_MIN_LENGTH &&
        note.trim().length <= RECOGNITION_NOTE_MAX_LENGTH
      : noteMeetsDefinitionRequirement(selectedDefinition.fixed_points, note)
    : false
  const bulkNominationInvalid = Boolean(isNomination && selectedStudents.length > 1)

  const canSubmit = Boolean(
    selectedStudents.length > 0 &&
      selectedDefinition &&
      domainCode &&
      (!noteRequired || noteValid) &&
      !bulkNominationInvalid &&
      !saving
  )

  function selectR(code: string) {
    setRValueCode(code)
    setDefinitionCode('')
    setNote('')
    setWitnessInformation('')
    setError(null)
  }

  function selectDefinition(definition: RecognitionDefinition) {
    setDefinitionCode(definition.code)
    setNote('')
    setWitnessInformation('')
    setError(null)
  }

  function addStudent(student: StudentSummary) {
    setSelectedStudents((current) =>
      current.some((selected) => selected.id === student.id) ? current : [...current, student]
    )
    setStudentQuery('')
    setStudentResults([])
    setError(null)
  }

  function resetForm() {
    setStudentQuery('')
    setStudentResults([])
    setSelectedStudents([])
    setRValueCode('')
    setDefinitionCode('')
    setDomainCode('')
    setNote('')
    setWitnessInformation('')
    setVisibility('student_parent')
    setIdempotencyKey(newIdempotencyKey())
  }

  async function submit() {
    if (!canSubmit || !selectedDefinition) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const observedAt = new Date().toISOString()
    const endpoint = isNomination ? '/api/recognitions/nominations' : '/api/recognitions'
    const body = isNomination
      ? {
          student_id: selectedStudents[0].id,
          recognition_definition_code: selectedDefinition.code,
          domain_code: domainCode,
          explanation: note,
          witness_information: witnessInformation || null,
          observed_at: observedAt,
          idempotency_key: idempotencyKey,
        }
      : {
          student_ids: selectedStudents.map((student) => student.id),
          recognition_definition_code: selectedDefinition.code,
          domain_code: domainCode,
          note: note || null,
          observed_at: observedAt,
          idempotency_key: idempotencyKey,
          visibility,
        }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    const payload = await response.json().catch(() => ({}))
    setSaving(false)

    if (!response.ok) {
      setError(payload.error ?? 'Unable to submit this recognition.')
      return
    }

    setSuccess(
      isNomination
        ? `Exceptional recognition nominated for ${selectedStudents[0].student_name}. Points will be added only after approval.`
        : `${selectedDefinition.fixed_points} points awarded to ${selectedStudents.length} ${
            selectedStudents.length === 1 ? 'student' : 'students'
          }.`
    )
    resetForm()
  }

  if (loadingReferences) {
    return <div className="card">Loading recognition behaviours…</div>
  }

  return (
    <div className="recognition-flow" style={{ maxWidth: 1040 }}>
      {success ? (
        <div className="card recognition-success" role="status">
          <CheckCircle2 size={20} />
          <strong>{success}</strong>
        </div>
      ) : null}
      {error ? <div className="error" role="alert">{error}</div> : null}

      <div className="recognition-reminder" role="note">
        <strong>One event receives one award.</strong> Choose the behaviour that best describes the main action.
      </div>

      <section className="card">
        <p className="eyebrow">Step 1</p>
        <h2>Student{selectedStudents.length === 1 ? '' : 's'}</h2>
        <p className="muted">Search and select one student, or several students for the same direct recognition.</p>

        {selectedStudents.length > 0 ? (
          <div className="selected-students" aria-label="Selected students">
            {selectedStudents.map((student) => (
              <div className="selected-student" key={student.id}>
                <div>
                  <strong>{student.student_name}</strong>
                  <span>
                    Grade {student.grade ?? '—'}
                    {student.section ? ` ${student.section}` : ''} · {student.house}
                  </span>
                </div>
                <button
                  type="button"
                  aria-label={`Remove ${student.student_name}`}
                  onClick={() =>
                    setSelectedStudents((current) => current.filter((selected) => selected.id !== student.id))
                  }
                >
                  <X size={17} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <div className="field">
          <label htmlFor="student-search">Search student</label>
          <div className="search-field">
            <Search size={18} aria-hidden="true" />
            <input
              id="student-search"
              className="input"
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder={selectedStudents.length ? 'Add another student' : 'Type a student name'}
              autoComplete="off"
            />
          </div>
        </div>
        {studentResults.length > 0 ? (
          <div className="list" role="listbox" aria-label="Student search results">
            {studentResults.map((student) => (
              <button
                key={student.id}
                type="button"
                className="list-row"
                role="option"
                aria-selected="false"
                onClick={() => addStudent(student)}
              >
                <div className="student-result">
                  <strong>{student.student_name}</strong>
                  <span className="muted">
                    Grade {student.grade ?? '—'}
                    {student.section ? ` ${student.section}` : ''} · {student.house}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <section className="card">
        <p className="eyebrow">Step 2</p>
        <h2>3R</h2>
        <div className="segmented recognition-r-options">
          {references.rValues.map((item) => (
            <button
              className={`choice ${rValueCode === item.key ? 'active' : ''}`}
              type="button"
              key={item.id}
              aria-pressed={rValueCode === item.key}
              onClick={() => selectR(item.key)}
            >
              <strong>{item.name}</strong>
              {item.description ? <span className="muted">{item.description}</span> : null}
            </button>
          ))}
        </div>
      </section>

      {rValueCode ? (
        <section className="card">
          <p className="eyebrow">Step 3</p>
          <h2>Behaviour</h2>
          <p className="muted">Select the specific positive action you observed.</p>
          <div className="behaviour-options">
            {behaviours.map((definition) => {
              const selected = definition.code === definitionCode
              return (
                <button
                  className={`behaviour-choice ${selected ? 'active' : ''}`}
                  type="button"
                  key={definition.code}
                  aria-pressed={selected}
                  onClick={() => selectDefinition(definition)}
                >
                  <span className="behaviour-choice-main">
                    <span className="behaviour-choice-heading">
                      <strong>{definition.label}</strong>
                      <span className="pill">+{definition.fixed_points}</span>
                      {definition.award_mode === 'nomination' ? (
                        <span className="pill nomination-pill">Nomination</span>
                      ) : null}
                    </span>
                    <span>{definition.description}</span>
                    <small>
                      {definition.graduate_values
                        .map((value) => `${value.display_label} (${value.islamic_term})`)
                        .join(' · ')}
                    </small>
                  </span>
                  {selected ? <Check size={20} aria-hidden="true" /> : null}
                </button>
              )
            })}
          </div>
        </section>
      ) : null}

      {selectedDefinition ? (
        <section className="card">
          <p className="eyebrow">Step 4</p>
          <h2>Domain</h2>
          <p className="muted">Where did the behaviour occur? The setting never changes its point value.</p>
          <div className="segmented domain-options">
            {references.domains.map((item) => (
              <button
                className={`choice ${domainCode === item.key ? 'active' : ''}`}
                type="button"
                key={item.id}
                aria-pressed={domainCode === item.key}
                onClick={() => setDomainCode(item.key)}
              >
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {selectedDefinition && noteRequired ? (
        <section className="card">
          <p className="eyebrow">Step 5</p>
          <h2>{isNomination ? 'Nomination explanation' : 'Recognition note'}</h2>
          <p className="muted">
            {isNomination
              ? 'Describe the exceptional action and the meaningful personal or social risk involved.'
              : 'Describe what the student did and the pressure, difficulty, conflict, harm, or meaningful challenge that was present.'}
          </p>
          <div className="field">
            <label htmlFor="recognition-note">
              {isNomination ? 'Explanation' : 'What happened?'}
            </label>
            <textarea
              id="recognition-note"
              className="textarea"
              value={note}
              maxLength={RECOGNITION_NOTE_MAX_LENGTH}
              onChange={(event) => setNote(event.target.value)}
              placeholder={
                isNomination
                  ? 'Explain the action, its impact, and the personal risk involved.'
                  : 'Name the action and the meaningful challenge the student overcame.'
              }
              aria-describedby="recognition-note-help"
            />
            <small id="recognition-note-help" className="muted">
              Minimum {isNomination ? NOMINATION_EXPLANATION_MIN_LENGTH : DIRECT_NOTE_MIN_LENGTH} characters ·{' '}
              {note.trim().length}/{RECOGNITION_NOTE_MAX_LENGTH}
            </small>
          </div>
          {isNomination ? (
            <div className="field">
              <label htmlFor="witness-information">Witness information (optional)</label>
              <textarea
                id="witness-information"
                className="textarea"
                value={witnessInformation}
                maxLength={RECOGNITION_NOTE_MAX_LENGTH}
                onChange={(event) => setWitnessInformation(event.target.value)}
                placeholder="Add relevant staff or student witnesses, if appropriate."
              />
            </div>
          ) : null}
        </section>
      ) : null}

      {selectedDefinition && domainCode && selectedStudents.length > 0 ? (
        <section className="card recognition-review">
          <p className="eyebrow">Step {noteRequired ? 6 : 5}</p>
          <h2>Review</h2>
          {bulkNominationInvalid ? (
            <div className="error" role="alert">
              Exceptional recognition nominations can be submitted for one student at a time.
            </div>
          ) : null}
          <dl className="review-grid">
            <div>
              <dt>Student{selectedStudents.length === 1 ? '' : 's'}</dt>
              <dd>{selectedStudents.map((student) => student.student_name).join(', ')}</dd>
            </div>
            <div>
              <dt>House{new Set(selectedStudents.map((student) => student.house)).size === 1 ? '' : 's'}</dt>
              <dd>{[...new Set(selectedStudents.map((student) => student.house))].join(', ')}</dd>
            </div>
            <div>
              <dt>3R</dt>
              <dd>{selectedDefinition.r_value_name}</dd>
            </div>
            <div>
              <dt>Behaviour</dt>
              <dd>{selectedDefinition.label}</dd>
            </div>
            <div>
              <dt>Domain</dt>
              <dd>{selectedDomain?.name}</dd>
            </div>
            <div>
              <dt>Fixed points</dt>
              <dd>+{selectedDefinition.fixed_points} per student</dd>
            </div>
            {noteRequired ? (
              <div className="review-note">
                <dt>{isNomination ? 'Explanation' : 'Note'}</dt>
                <dd>{note.trim() || 'Required before submission'}</dd>
              </div>
            ) : null}
          </dl>

          {!isNomination ? (
            <details className="visibility-details">
              <summary>Recognition visibility</summary>
              <div className="segmented">
                {VISIBILITY_OPTIONS.map((item) => (
                  <button
                    className={`choice ${visibility === item.key ? 'active' : ''}`}
                    type="button"
                    key={item.key}
                    aria-pressed={visibility === item.key}
                    onClick={() => setVisibility(item.key)}
                  >
                    <strong>{item.label}</strong>
                    <span className="muted">{item.description}</span>
                  </button>
                ))}
              </div>
            </details>
          ) : null}

          <div className="narration-helper">
            <strong>Optional narration</strong>
            <p>
              “You showed {selectedDefinition.r_value_name} by{' '}
              {selectedDefinition.description.charAt(0).toLowerCase() + selectedDefinition.description.slice(1)} That earned{' '}
              {selectedDefinition.fixed_points} points for your House.”
            </p>
          </div>

          <button className="btn btn-gold full" type="button" disabled={!canSubmit} onClick={submit}>
            {saving
              ? isNomination
                ? 'Submitting nomination…'
                : 'Awarding points…'
              : isNomination
                ? 'Submit Nomination'
                : 'Award Points'}
            <Send size={18} />
          </button>
        </section>
      ) : null}
    </div>
  )
}
