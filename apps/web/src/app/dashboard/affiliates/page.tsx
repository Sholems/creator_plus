import { redirect } from 'next/navigation';

export default function OldAffiliatesRedirect() {
  redirect('/affiliate/dashboard');
}
