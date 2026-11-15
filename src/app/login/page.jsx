import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import AuthForm from '@/components/AuthForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Sign in' };

export default async function Page({ searchParams }) {
  const next = typeof searchParams.next === 'string' ? searchParams.next : '';
  if (await getSession()) redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
  return (
    <div className="flex min-h-[70vh] items-center px-4 py-12">
      <AuthForm mode="login" next={next} />
    </div>
  );
}
