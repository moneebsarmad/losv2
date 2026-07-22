// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QuarterlyHonoursCandidates } from './QuarterlyHonoursCandidates'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams('periodId=period-1&award=north_star'),
}))

const reference = {
  periods: [{ id: 'period-1', name: 'Quarter 1', status: 'review_open', recipient_limit_per_award: 1 }],
  period: { id: 'period-1', name: 'Quarter 1', status: 'review_open', recipient_limit_per_award: 1 },
  definitions: [{ id: 'award-1', code: 'north_star', name: 'North Star Award' }],
  permissions: { canExport: true, canFinalise: true },
}
const candidatePayload = {
  candidates: [{
    id: 'candidate-1',
    rank: 1,
    studentName: 'Amina Rahman',
    grade: 8,
    section: 'A',
    division: 'Middle School',
    house: 'House of Khadijah',
    totalScore: 91.5,
    eligible: true,
    eligibilityReasons: [],
    fairnessFlags: [],
    rsRepresented: 3,
    domainsRepresented: 5,
    configuredDomainCount: 5,
    distinctStaff: 5,
    activeWeeks: 9,
    eligibleWeeks: 10,
    consistency: 90,
    staffConcentration: 0.29,
    significantEvents: 3,
    reviewStatus: 'shortlisted',
  }],
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('QuarterlyHonoursCandidates', () => {
  it('renders configured metrics and applies candidate filters to the API query', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      return Promise.resolve({
        ok: true,
        json: async () => url.includes('/candidates?') ? candidatePayload : reference,
      } as Response)
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<QuarterlyHonoursCandidates />)

    expect(await screen.findByText('Amina Rahman')).toBeTruthy()
    expect(screen.getByText('5 / 5')).toBeTruthy()
    expect(screen.getByText('91.5')).toBeTruthy()

    fireEvent.change(screen.getByLabelText('Grade'), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Apply filters' }))

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => String(url).includes('grade=8'))).toBe(true)
    })
  })
})
