import { Suspense } from 'react'
import { QuarterlyHonoursCandidates } from '@/components/admin/honours/QuarterlyHonoursCandidates'
import { LoadingState } from '@/components/ui/LoadingState'

export default function QuarterlyHonoursCandidatesPage() {
  return <Suspense fallback={<main className="page"><LoadingState /></main>}><QuarterlyHonoursCandidates /></Suspense>
}
