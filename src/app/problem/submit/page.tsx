import { redirect } from 'next/navigation';

export default function ProblemSubmitFallback() {
  redirect('/problem');
}
