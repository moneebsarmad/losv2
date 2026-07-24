// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RecognitionForm } from './RecognitionForm'

const student = {
  id: 'student-a',
  student_name: 'Amina Student',
  grade: 6,
  section: 'A',
  house: 'House of Khadijah',
}

const graduateValue = {
  id: 'graduate-value-adl',
  code: 'adl',
  display_label: 'Unwavering Justice',
  islamic_term: 'ʿAdl',
  parent_r_value_id: 'r-respect',
  relationship: 'primary',
}

const definitions = [
  {
    id: 'definition-included',
    code: 'respect_included_someone',
    r_value_id: 'r-respect',
    r_value_code: 'respect',
    r_value_name: 'Respect',
    label: 'Included Someone',
    description: 'Invited, welcomed, or made space for a student who was being left out.',
    fixed_points: 10,
    award_mode: 'direct',
    requires_note: false,
    is_active: true,
    sort_order: 10,
    framework_version: 'recognition_v2',
    graduate_values: [graduateValue],
  },
  {
    id: 'definition-repair',
    code: 'respect_repaired_relationship',
    r_value_id: 'r-respect',
    r_value_code: 'respect',
    r_value_name: 'Respect',
    label: 'Repaired a Relationship',
    description: 'Took concrete steps after causing relational harm.',
    fixed_points: 20,
    award_mode: 'direct',
    requires_note: true,
    is_active: true,
    sort_order: 20,
    framework_version: 'recognition_v2',
    graduate_values: [graduateValue],
  },
  {
    id: 'definition-defended',
    code: 'respect_defended_someone_personal_risk',
    r_value_id: 'r-respect',
    r_value_code: 'respect',
    r_value_name: 'Respect',
    label: 'Defended Someone Despite Personal Risk',
    description: 'Defended a person when doing so created meaningful personal risk.',
    fixed_points: 50,
    award_mode: 'nomination',
    requires_note: true,
    is_active: true,
    sort_order: 30,
    framework_version: 'recognition_v2',
    graduate_values: [graduateValue],
  },
]

const referencePayload = {
  rValues: [{ id: 'r-respect', key: 'respect', name: 'Respect', description: 'Honouring dignity.' }],
  domains: [
    { id: 'domain-prayer', key: 'prayer_space', name: 'Prayer Space (Muṣallā)' },
    { id: 'domain-halls', key: 'hallways_transitions', name: 'Hallways & Transitions' },
    { id: 'domain-classroom', key: 'classroom_learning', name: 'Classroom & Learning' },
    { id: 'domain-lunch', key: 'lunch_recess', name: 'Lunch / Recess' },
    { id: 'domain-bathrooms', key: 'bathrooms', name: 'Bathrooms' },
  ],
  definitions,
  graduateValues: [graduateValue],
}

function jsonResponse(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data } as Response)
}

async function selectStudent() {
  fireEvent.change(screen.getByLabelText('Search student'), { target: { value: 'Am' } })
  await act(async () => {
    vi.advanceTimersByTime(200)
  })
  fireEvent.click(await screen.findByRole('option', { name: /Amina Student/ }))
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url === '/api/reference') return jsonResponse(referencePayload)
      if (url.startsWith('/api/students/search')) return jsonResponse({ students: [student] })
      return jsonResponse({ awards: [] })
    })
  )
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('RecognitionForm', () => {
  it('shows one universal behaviour library, five independent domains, and no point editor', async () => {
    render(<RecognitionForm />)
    await screen.findByText('One event receives one award.')
    await selectStudent()

    fireEvent.click(screen.getByRole('button', { name: /RespectHonouring dignity/ }))
    fireEvent.click(screen.getByRole('button', { name: /Included Someone/ }))

    const domainSection = screen.getByRole('heading', { name: 'Domain' }).closest('section')
    expect(domainSection).not.toBeNull()
    expect(within(domainSection!).getAllByRole('button')).toHaveLength(5)
    expect(screen.queryByRole('spinbutton')).toBeNull()
    expect(screen.queryByLabelText(/points/i)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Lunch / Recess' }))
    expect(screen.getByText('+10 per student')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Classroom & Learning' }))
    expect(screen.getByText('+10 per student')).toBeTruthy()
  })

  it('requires a note for +20 and uses nomination wording for +50', async () => {
    render(<RecognitionForm />)
    await screen.findByText('One event receives one award.')
    await selectStudent()
    fireEvent.click(screen.getByRole('button', { name: /RespectHonouring dignity/ }))

    fireEvent.click(screen.getByRole('button', { name: /Repaired a Relationship/ }))
    expect(screen.getByRole('heading', { name: 'Recognition note' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Lunch / Recess' }))
    expect((screen.getByRole('button', { name: 'Award Points' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('What happened?'), {
      target: { value: 'The student completed a sincere repair after a difficult conflict.' },
    })
    expect((screen.getByRole('button', { name: 'Award Points' }) as HTMLButtonElement).disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: /Defended Someone Despite Personal Risk/ }))
    expect(screen.getByRole('heading', { name: 'Nomination explanation' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Submit Nomination' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
