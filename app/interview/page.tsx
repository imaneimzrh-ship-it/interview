import { redirect } from 'next/navigation'

// Legacy route — replaced by /app/start which includes the required JD/resume inputs.
// All entry points now route through /app/start before calling the interview API,
// preventing the "Please provide a job description or resume" error with no escape.
export default function InterviewHub() {
  redirect('/app/start')
}
