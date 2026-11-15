'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Loader2, Eye, EyeOff } from 'lucide-react';

const safeNext = (n) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '');

export default function AuthForm({ mode, next }) {
  const router = useRouter();
  const reg = mode === 'register';
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch(`/api/auth/${reg ? 'register' : 'login'}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(f) });
    const d = await res.json();
    if (!res.ok) { setBusy(false); return setError(d.error || 'Something went wrong'); }
    router.replace(safeNext(next) || (d.role === 'admin' ? '/admin' : '/'));
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="glass glass-strong animate-pop-in mx-auto w-full max-w-md space-y-4 !rounded-[2rem] p-8">
      <div><h1 className="text-3xl font-extrabold text-ink">{reg ? 'Create account' : 'Welcome back'}</h1><p className="mt-1 text-sm text-muted">{reg ? 'Track orders and check out faster.' : 'Sign in to see your orders.'}</p></div>
      {reg && <div><label className="label" htmlFor="n">Name</label><input id="n" className="input" required autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>}
      <div><label className="label" htmlFor="e">Email</label><input id="e" type="email" className="input" required autoComplete="username" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      <div>
        <label className="label" htmlFor="p">Password</label>
        <div className="relative"><input id="p" type={show ? 'text' : 'password'} className="input pr-11" required autoComplete={reg ? 'new-password' : 'current-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>{show ? <EyeOff size={17} /> : <Eye size={17} />}</button></div>
        {reg && <p className="mt-1 text-xs text-muted">At least 8 characters, with a letter and a number</p>}
      </div>
      {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p>}
      <button className="btn-primary w-full !py-3.5" disabled={busy}>{busy && <Loader2 size={17} className="animate-spin" />} {reg ? 'Create account' : 'Sign in'}</button>
      <p className="text-center text-sm text-muted">{reg ? <>Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-accent2">Sign in</Link></> : <>New here? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-accent2">Create an account</Link></>}</p>
    </form>
  );
}
