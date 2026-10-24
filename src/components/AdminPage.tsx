import React, { useEffect, useState } from 'react';
import {
  getMultiFactorResolver,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  TotpMultiFactorGenerator,
} from 'firebase/auth';
import type { MultiFactorError, MultiFactorResolver, User } from 'firebase/auth';
import { ArrowLeft, LoaderCircle, LockKeyhole } from 'lucide-react';
import { auth } from '../firebase';
import { navigateTo, ROUTES } from '../utils/appRoute';
import { getAdminApiError } from '../utils/adminApi';
import { AdminDashboard } from './AdminDashboard';

type AccessState = 'checking' | 'signed-out' | 'admin';

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = await response.json() as { error?: string; diagnosticCode?: string };
    const message = payload.error || fallback;
    return payload.diagnosticCode ? `${message} (code: ${payload.diagnosticCode})` : message;
  } catch {
    return fallback;
  }
}

export const AdminPage: React.FC = () => {
  const [access, setAccess] = useState<AccessState>('checking');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [mfaResolver, setMfaResolver] = useState<MultiFactorResolver | null>(null);
  const [mfaCode, setMfaCode] = useState('');

  useEffect(() => {
    let active = true;
    fetch('/api/admin/session', { credentials: 'same-origin' })
      .then(async (response) => {
        if (!active) return;
        const contentType = response.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('The admin API is not running. Stop the old server and restart this app with npm run dev from the chargeshare-nexathon folder.');
        }
        const session = await response.json() as { authenticated?: boolean };
        setAccess(response.ok && session.authenticated ? 'admin' : 'signed-out');
      })
      .catch((sessionError) => {
        if (active) {
          setAccess('signed-out');
          setError(getAdminApiError(sessionError, 'The admin server is unavailable.'));
        }
      });
    return () => { active = false; };
  }, []);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      const response = await fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) throw new Error(await readError(response, 'Sign-in failed. Check your credentials and try again.'));
      setPassword('');
      setAccess('admin');
    } catch (signInError) {
      setError(getAdminApiError(signInError, 'Sign-in failed. Try again.'));
    } finally {
      setPending(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setPending(true);
    try {
      const credential = await signInWithPopup(auth, new GoogleAuthProvider());
      await finishGoogleSession(credential.user);
    } catch (signInError) {
      if ((signInError as { code?: string }).code === 'auth/multi-factor-auth-required') {
        const resolver = getMultiFactorResolver(auth, signInError as MultiFactorError);
        if (resolver.hints.some((hint) => hint.factorId === TotpMultiFactorGenerator.FACTOR_ID)) {
          setMfaResolver(resolver);
          setMfaCode('');
          setError('');
          setPending(false);
          return;
        }
        setError('This administrator account needs an enrolled authenticator app.');
      } else {
        setError(getAdminApiError(signInError, 'Google sign-in failed. Try again.'));
      }
      await signOut(auth).catch(() => undefined);
    } finally {
      setPending(false);
    }
  };

  const finishGoogleSession = async (user: User) => {
    const idToken = await user.getIdToken();
    const response = await fetch('/api/admin/google-session', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });
    if (!response.ok) throw new Error(await readError(response, 'This Google account could not be verified as an admin.'));
    await signOut(auth);
    setMfaResolver(null);
    setAccess('admin');
  };

  const handleMfaSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!mfaResolver) return;
    const hint = mfaResolver.hints.find((factor) => factor.factorId === TotpMultiFactorGenerator.FACTOR_ID);
    if (!hint) {
      setError('No authenticator app is enrolled on this administrator account.');
      return;
    }
    setError('');
    setPending(true);
    try {
      const assertion = TotpMultiFactorGenerator.assertionForSignIn(hint.uid, mfaCode.trim());
      const credential = await mfaResolver.resolveSignIn(assertion);
      await finishGoogleSession(credential.user);
    } catch {
      setError('That authenticator code was not accepted. Check the current code and try again.');
    } finally {
      setPending(false);
    }
  };

  const handleSignOut = async () => {
    setPending(true);
    try {
      await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' });
      await signOut(auth).catch(() => undefined);
    } finally {
      setPassword('');
      setMfaCode('');
      setMfaResolver(null);
      setError('');
      setAccess('signed-out');
      setPending(false);
    }
  };

  if (access === 'admin') return <AdminDashboard onSignOut={handleSignOut} />;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[#F7F7F5] text-[#171717]">
      <header className="flex min-h-14 items-center justify-between gap-2 bg-[#111] px-3 text-white sm:min-h-16 sm:gap-4 sm:px-8">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <span className="whitespace-nowrap text-xs font-black tracking-[0.14em] sm:text-sm sm:tracking-[0.18em]">CHARGESHARE</span>
          <span className="rounded border border-white/20 px-1.5 py-1 text-[9px] font-bold tracking-wider text-white/70 sm:px-2 sm:text-[10px]">ADMIN</span>
        </div>
        <button type="button" onClick={() => navigateTo(ROUTES.landing)} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-2.5 py-2 text-[10px] font-semibold transition hover:bg-white/10 sm:gap-2 sm:px-3 sm:text-xs">
          <ArrowLeft size={14} aria-hidden="true" /><span className="sm:hidden">Home</span><span className="hidden sm:inline">Back to home</span>
        </button>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 items-start justify-center px-3 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-4 sm:items-center sm:px-8 sm:py-10">
        <section className="w-full max-w-lg rounded-xl border border-black/10 bg-white p-4 shadow-sm sm:rounded-2xl sm:p-10">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F1F1EF] text-[#171717] sm:h-12 sm:w-12 sm:rounded-xl"><LockKeyhole size={20} aria-hidden="true" /></div>
          {access === 'checking' ? (
            <div className="mt-7 flex items-center gap-2 text-sm text-black/60" role="status"><LoaderCircle size={17} className="animate-spin" aria-hidden="true" />Checking admin session…</div>
          ) : mfaResolver ? (
            <>
              <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-black/45">Second factor</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Verify it’s you</h1>
              <p className="mt-3 text-sm leading-6 text-black/60">Enter the current code from your authenticator app.</p>
              <form onSubmit={handleMfaSubmit} className="mt-7 space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="admin-totp" className="text-xs font-semibold text-black/70">6-digit authenticator code</label>
                  <input id="admin-totp" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={mfaCode} onChange={(event) => setMfaCode(event.target.value.replace(/\D/g, '').slice(0, 6))} className="min-h-12 w-full rounded-lg border border-black/15 px-3.5 py-3 text-base tracking-[0.3em] outline-none focus:border-black sm:text-sm" />
                </div>
                {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
                <button type="submit" disabled={pending} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{pending && <LoaderCircle size={16} className="animate-spin" />}{pending ? 'Verifying…' : 'Verify and continue'}</button>
                <button type="button" onClick={handleSignOut} className="w-full py-2 text-sm font-medium text-black/60 hover:text-black">Cancel and sign out</button>
              </form>
            </>
          ) : (
            <>
              <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-black/45">Restricted area</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Admin sign in</h1>
              <p className="mt-3 text-sm leading-6 text-black/60">Use an administrator account configured on the server.</p>

              <button type="button" onClick={handleGoogleSignIn} disabled={pending} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-lg border border-black/15 px-4 py-3 text-sm font-semibold hover:bg-black/5 disabled:cursor-wait disabled:opacity-60 sm:mt-7">
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Continue with Google
              </button>

              <div className="relative my-5 flex items-center justify-center"><div className="absolute inset-x-0 border-t border-black/10" /><span className="relative bg-white px-3 text-[10px] font-bold uppercase tracking-widest text-black/40">or email</span></div>

              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="admin-email" className="text-xs font-semibold text-black/70">Administrator email</label>
                  <input id="admin-email" type="email" autoCapitalize="none" spellCheck={false} autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 w-full rounded-lg border border-black/15 px-3.5 py-3 text-base outline-none focus:border-black sm:text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="admin-password" className="text-xs font-semibold text-black/70">Password</label>
                  <input id="admin-password" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-lg border border-black/15 px-3.5 py-3 text-base outline-none focus:border-black sm:text-sm" />
                </div>
                {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
                <button type="submit" disabled={pending} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-black px-4 py-3 text-sm font-semibold text-white hover:bg-black/80 disabled:cursor-wait disabled:opacity-60">
                  {pending && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}{pending ? 'Verifying…' : 'Secure sign in'}
                </button>
              </form>
            </>
          )}
        </section>
      </main>
    </div>
  );
};
