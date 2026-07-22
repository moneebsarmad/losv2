// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QuarterlyHonoursOverview } from './QuarterlyHonoursOverview'

function response(data: unknown, ok = true) {
  return Promise.resolve({ ok, json: async () => data } as Response)
}

const emptyOverview = {
  periods: [],
  period: null,
  definitions: [],
  awards: [],
  latestRun: null,
  notifications: [],
  permissions: {
    canRefresh: false,
    canReview: true,
    canFinalise: true,
    canConfigure: false,
    canReopen: false,
    canRevoke: false,
    canExport: true,
    canViewDiagnostics: false,
  },
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('QuarterlyHonoursOverview', () => {
  it('renders the authorised empty state without exposing configuration controls', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response(emptyOverview)))
    render(<QuarterlyHonoursOverview />)

    expect(await screen.findByRole('heading', { name: 'Quarterly Star Honours' })).toBeTruthy()
    expect(await screen.findByText('No quarterly award period configured')).toBeTruthy()
    expect(screen.getByText('A super administrator must configure the award period.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /period/i })).toBeNull()
  })

  it('renders a controlled error state when the admin API rejects the request', async () => {
    vi.stubGlobal('fetch', vi.fn(() => response({ error: 'Forbidden.' }, false)))
    render(<QuarterlyHonoursOverview />)

    expect(await screen.findByText('Forbidden.')).toBeTruthy()
    expect(screen.queryByText('Loading Quarterly Star Honours...')).toBeNull()
  })
})
