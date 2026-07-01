import { RecognitionForm } from '@/components/recognition/RecognitionForm'

export default function RecognizePage() {
  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Recognition</p>
          <h1 className="page-title">Recognise Student</h1>
          <p className="page-subtitle">Student, 3R, domain, point value, behaviour note, visibility. Fast enough for the school day.</p>
        </div>
      </header>
      <RecognitionForm />
    </main>
  )
}
