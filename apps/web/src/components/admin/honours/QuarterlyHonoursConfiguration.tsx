'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Save, ShieldAlert, Trash2 } from 'lucide-react'
import { LoadingState } from '@/components/ui/LoadingState'

type Definition = {
  id: string
  school_id: string | null
  code: string
  name: string
  algorithm_version: string
  updated_at: string
  configuration: {
    weights?: Record<string, number>
    minimums?: Record<string, number>
    [key: string]: unknown
  }
}

type ConfigPayload = {
  definitions: Definition[]
  mappings: Array<Record<string, any>>
  rValues: Array<{ id: string; key: string; name: string }>
  domains: Array<{ id: string; key: string; name: string }>
  configurationLockedBy: Array<{ id: string; name: string; status: string }>
}

const signalTypes = [
  'significant', 'honesty', 'worship', 'moral_courage', 'initiative', 'perseverance',
  'stewardship', 'peer_inclusion', 'conflict_deescalation', 'justice', 'repair', 'growth_skill',
]

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function QuarterlyHonoursConfiguration() {
  const [payload, setPayload] = useState<ConfigPayload | null>(null)
  const [selectedCode, setSelectedCode] = useState('north_star')
  const [configuration, setConfiguration] = useState<Definition['configuration']>({})
  const [algorithmVersion, setAlgorithmVersion] = useState('quarterly-star-honours-v1')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [mappingForm, setMappingForm] = useState({
    sourceType: 'domain',
    sourceKey: '',
    signalType: 'significant',
    weight: '1',
    qualifiesAsSignificant: true,
    qualifiesAsPeerImpact: false,
  })
  const [deactivationReason, setDeactivationReason] = useState('')

  const load = useCallback(async () => {
    const response = await fetch('/api/admin/quarterly-honours/configuration')
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.error ?? 'Unable to load honours configuration.')
      return
    }
    setPayload(data)
    setError(null)
  }, [])

  useEffect(() => { void load() }, [load])
  const selected = payload?.definitions.find((definition) => definition.code === selectedCode)
  useEffect(() => {
    if (!selected) return
    setConfiguration(structuredClone(selected.configuration ?? {}))
    setAlgorithmVersion(selected.algorithm_version)
  }, [selected?.id, selected?.updated_at]) // eslint-disable-line react-hooks/exhaustive-deps

  const weightTotal = Object.values(configuration.weights ?? {}).reduce((sum, value) => sum + Number(value), 0)
  const locked = Boolean(payload?.configurationLockedBy.length)
  const sourceOptions = mappingForm.sourceType === 'domain' ? payload?.domains ?? [] : payload?.rValues ?? []
  const selectedMappings = useMemo(
    () => (payload?.mappings ?? []).filter((mapping) => {
      const relation = Array.isArray(mapping.quarterly_award_definitions)
        ? mapping.quarterly_award_definitions[0]
        : mapping.quarterly_award_definitions
      return relation?.code === selectedCode
    }),
    [payload?.mappings, selectedCode]
  )

  function updateConfiguration(section: 'weights' | 'minimums', key: string, value: string) {
    setConfiguration((current) => ({
      ...current,
      [section]: { ...(current[section] ?? {}), [key]: Number(value) },
    }))
  }

  async function saveDefinition(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setWorking(true)
    const response = await fetch('/api/admin/quarterly-honours/configuration', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ awardDefinitionId: selected.id, configuration, algorithmVersion }),
    })
    const data = await response.json().catch(() => ({}))
    setWorking(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to save award definition.')
      return
    }
    setNotice('Award configuration saved with a versioned audit record.')
    await load()
  }

  async function addMapping(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setWorking(true)
    const response = await fetch('/api/admin/quarterly-honours/configuration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ awardDefinitionId: selected.id, ...mappingForm }),
    })
    const data = await response.json().catch(() => ({}))
    setWorking(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to add signal mapping.')
      return
    }
    setNotice('Signal mapping saved.')
    await load()
  }

  async function deactivateMapping(mappingId: string) {
    if (!deactivationReason.trim()) {
      setError('A deactivation reason is required.')
      return
    }
    setWorking(true)
    const response = await fetch('/api/admin/quarterly-honours/configuration', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mappingId, reason: deactivationReason }),
    })
    const data = await response.json().catch(() => ({}))
    setWorking(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to deactivate signal mapping.')
      return
    }
    setNotice('Signal mapping deactivated and audited.')
    setDeactivationReason('')
    await load()
  }

  if (!payload) return <main className="page"><LoadingState label="Loading configuration..." /></main>

  return (
    <main className="page honours-page">
      <header className="page-header">
        <div>
          <Link className="back-link" href="/dashboard/admin/quarterly-honours"><ArrowLeft size={16} /> Quarterly Honours</Link>
          <p className="eyebrow">Super admin</p>
          <h1 className="page-title">Honours configuration</h1>
        </div>
      </header>
      {error ? <div className="error honours-error">{error}</div> : null}
      {notice ? <div className="honours-success">{notice}</div> : null}
      {locked ? <div className="honours-conflict"><ShieldAlert size={19} /><div><strong>Configuration locked</strong><p>{payload.configurationLockedBy.map((period) => period.name).join(', ')} is active or open for review. Algorithm settings cannot change until the period is finalised or archived.</p></div></div> : null}

      <div className="honours-config-layout">
        <nav className="honours-config-tabs" aria-label="Award definitions">
          {payload.definitions.map((definition) => <button type="button" className={definition.code === selectedCode ? 'active' : ''} key={definition.id} onClick={() => setSelectedCode(definition.code)}><span>{definition.name}</span><small>{definition.algorithm_version}</small></button>)}
        </nav>

        <div className="honours-config-content">
          {selected ? <>
            <form className="honours-config-section" onSubmit={saveDefinition}>
              <header><p className="eyebrow">{selected.name}</p><h2>Scoring configuration</h2></header>
              <label className="field honours-version-field"><span>Algorithm version</span><input className="input" value={algorithmVersion} onChange={(event) => setAlgorithmVersion(event.target.value)} disabled={locked} /></label>
              <div className="honours-config-columns">
                <div><h3>Component weights <span className={Math.abs(weightTotal - 1) < 0.0001 ? 'text-success' : 'text-danger'}>{weightTotal.toFixed(2)}</span></h3>{Object.entries(configuration.weights ?? {}).map(([key, value]) => <label className="honours-number-row" key={key}><span>{label(key)}</span><input className="input" type="number" min="0" max="1" step="0.01" value={value} disabled={locked} onChange={(event) => updateConfiguration('weights', key, event.target.value)} /></label>)}</div>
                <div><h3>Eligibility minimums</h3>{Object.entries(configuration.minimums ?? {}).map(([key, value]) => <label className="honours-number-row" key={key}><span>{label(key)}</span><input className="input" type="number" step="0.01" value={value} disabled={locked} onChange={(event) => updateConfiguration('minimums', key, event.target.value)} /></label>)}</div>
              </div>
              <footer><button className="btn btn-primary" type="submit" disabled={working || locked || Math.abs(weightTotal - 1) >= 0.0001}><Save size={16} /> Save version</button></footer>
            </form>

            <section className="honours-config-section">
              <header><p className="eyebrow">Evidence taxonomy</p><h2>Signal mappings</h2></header>
              <form className="honours-mapping-form" onSubmit={addMapping}>
                <label className="field"><span>Source</span><select className="select" value={mappingForm.sourceType} onChange={(event) => setMappingForm({ ...mappingForm, sourceType: event.target.value, sourceKey: '' })}><option value="domain">Domain</option><option value="r_value">3R</option></select></label>
                <label className="field"><span>Value</span><select className="select" required value={mappingForm.sourceKey} onChange={(event) => setMappingForm({ ...mappingForm, sourceKey: event.target.value })}><option value="">Select value</option>{sourceOptions.map((option) => <option key={option.id} value={option.key}>{option.name}</option>)}</select></label>
                <label className="field"><span>Signal</span><select className="select" value={mappingForm.signalType} onChange={(event) => setMappingForm({ ...mappingForm, signalType: event.target.value })}>{signalTypes.map((signal) => <option key={signal} value={signal}>{label(signal)}</option>)}</select></label>
                <label className="field"><span>Weight</span><input className="input" type="number" min="0.01" step="0.01" value={mappingForm.weight} onChange={(event) => setMappingForm({ ...mappingForm, weight: event.target.value })} /></label>
                <label className="honours-checkbox"><input type="checkbox" checked={mappingForm.qualifiesAsSignificant} onChange={(event) => setMappingForm({ ...mappingForm, qualifiesAsSignificant: event.target.checked })} /><span>Significant</span></label>
                <label className="honours-checkbox"><input type="checkbox" checked={mappingForm.qualifiesAsPeerImpact} onChange={(event) => setMappingForm({ ...mappingForm, qualifiesAsPeerImpact: event.target.checked })} /><span>Peer impact</span></label>
                <button className="btn btn-primary" disabled={working || !mappingForm.sourceKey} type="submit">Add mapping</button>
              </form>

              <label className="field honours-deactivation-reason"><span>Deactivation reason</span><input className="input" value={deactivationReason} onChange={(event) => setDeactivationReason(event.target.value)} /></label>
              <div className="table-wrap"><table className="data-table honours-mapping-table"><thead><tr><th>Source</th><th>Signal</th><th>Weight</th><th>Significant</th><th>Peer impact</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{selectedMappings.length ? selectedMappings.map((mapping) => <tr key={mapping.id}><td>{label(mapping.source_type)}: {label(mapping.source_key)}</td><td>{label(mapping.signal_type)}</td><td>{Number(mapping.weight).toFixed(2)}</td><td>{mapping.qualifies_as_significant ? 'Yes' : 'No'}</td><td>{mapping.qualifies_as_peer_impact ? 'Yes' : 'No'}</td><td>{mapping.active ? 'Active' : 'Inactive'}</td><td>{mapping.active ? <button className="icon-button" type="button" title="Deactivate mapping" aria-label="Deactivate mapping" disabled={working} onClick={() => deactivateMapping(mapping.id)}><Trash2 size={16} /></button> : null}</td></tr>) : <tr><td colSpan={7} className="muted">No signal mappings configured for this award.</td></tr>}</tbody></table></div>
            </section>
          </> : null}
        </div>
      </div>
    </main>
  )
}
