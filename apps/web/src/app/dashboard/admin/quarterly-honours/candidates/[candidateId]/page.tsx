import { QuarterlyHonoursCandidateDetail } from '@/components/admin/honours/QuarterlyHonoursCandidateDetail'

export default async function QuarterlyHonoursCandidateDetailPage({
  params,
}: {
  params: Promise<{ candidateId: string }>
}) {
  const { candidateId } = await params
  return <QuarterlyHonoursCandidateDetail candidateId={candidateId} />
}
