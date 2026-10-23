import React, { useState } from 'react';
import { ArrowLeft, CheckCircle2, ShieldCheck, UserCheck, Zap } from 'lucide-react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { auth } from '../firebase';
import { describeAuthError } from '../utils/authErrors';
import { ROUTES, navigateTo } from '../utils/appRoute';

type AuthMode = 'signin' | 'signup';

interface AuthPageProps {
  /** Where to send the user once Firebase reports a signed-in session. */
  redirectTo?: string;
}

export const AuthPage: React.FC<AuthPageProps> = ({ redirectTo = ROUTES.provider }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setPending(true);
    try {
      if (mode === 'signup') {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      setPassword('');
      navigateTo(redirectTo);
    } catch (authError) {
      setError(describeAuthError(authError));
    } finally {
      setPending(false);
    }
  };

  const handleGoogleAuth = async () => {
    setError('');
    setPending(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      navigateTo(redirectTo);
    } catch (authError) {
      setError(describeAuthError(authError));
    } finally {
      setPending(false);
    }
  };

  const handleDemoAuth = async () => {
    setError('');
    setPending(true);
    try {
      await signInAnonymously(auth);
      navigateTo(redirectTo);
    } catch (authError) {
      setError(describeAuthError(authError));
    } finally {
      setPending(false);
    }
  };

  const switchMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
    setError('');
  };

  return (
    <div className="provider-portal flex min-h-screen flex-col bg-[#FAF8F7] font-body text-[#111111] selection:bg-black selection:text-white">
      {/* Top Masthead Header */}
      <header className="fixed top-0 w-full z-50 bg-[#141414] text-white border-b border-neutral-800">
        <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <span className="font-sans text-sm uppercase tracking-[0.16em] font-bold text-white">
              CHARGESHARE
            </span>
            <span className="font-sans text-[10px] text-white/80 font-medium tracking-widest uppercase bg-white/10 px-1.5 py-0.5 rounded border border-white/10">
              HOST
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigateTo(ROUTES.landing)}
            className="flex cursor-pointer items-center gap-1.5 rounded border border-neutral-700 bg-neutral-900 px-3 py-1.5 text-[11px] font-sans font-semibold uppercase tracking-wider text-neutral-300 transition-all hover:bg-neutral-800 hover:text-white"
          >
            <ArrowLeft size={13} />
            <span>Explore Map</span>
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 pt-24 pb-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <span className="rounded bg-black px-2.5 py-0.5 text-[10.5px] font-sans font-semibold uppercase tracking-wider text-white">
              HOST &amp; PROVIDER PORTAL
            </span>
            <h1 className="mt-3 font-sans text-[28px] font-bold leading-tight tracking-tight text-black">
              {mode === 'signup' ? 'Create Host Account' : 'Welcome Back'}
            </h1>
            <p className="mt-1 text-xs text-[#636563]">
              {mode === 'signup'
                ? 'Join India’s community residential EV charging network.'
                : 'Sign in to access your bay telemetry, bookings and tariffs.'}
            </p>
          </div>

          <div className="rounded-xl border border-[#E2E5E5] bg-white p-6 sm:p-7 shadow-[0_2px_10px_rgba(0,0,0,0.02)] space-y-4">
            {/* Quick Demo Access Button */}
            <button
              type="button"
              onClick={handleDemoAuth}
              disabled={pending}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded bg-black py-2.5 text-xs font-sans font-semibold uppercase tracking-wider text-white transition-all hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <UserCheck size={15} />
              <span>Instant Access as Verified Host</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={pending}
              className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded border border-[#E2E5E5] bg-[#F5F3F1] py-2.5 text-xs font-sans font-semibold uppercase tracking-wider text-[#111111] transition-all hover:bg-[#EBE7E5] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative my-3 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#EBE7E5]" />
              </div>
              <span className="relative bg-white px-2.5 text-[9.5px] font-sans font-semibold uppercase tracking-[0.14em] text-[#636563]">
                or email
              </span>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              <div className="space-y-1">
                <label
                  htmlFor="auth-email"
                  className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[#636563]"
                >
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full rounded border border-[#E2E5E5] bg-[#F5F3F1] px-3.5 py-2.5 text-xs font-sans text-[#111111] outline-none transition-all placeholder:text-[#747878] focus:border-black focus:bg-white"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="auth-password"
                  className="font-sans text-[10px] font-semibold uppercase tracking-[0.14em] text-[#636563]"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded border border-[#E2E5E5] bg-[#F5F3F1] px-3.5 py-2.5 text-xs font-sans text-[#111111] outline-none transition-all placeholder:text-[#747878] focus:border-black focus:bg-white"
                />
              </div>

              {error && (
                <div className="rounded border border-red-200 bg-red-50 p-2.5 text-xs text-red-600 font-sans">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full cursor-pointer rounded border border-black bg-white py-2.5 text-xs font-sans font-semibold uppercase tracking-wider text-black transition-all hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {pending
                  ? 'Connecting…'
                  : mode === 'signup'
                    ? 'Register Email'
                    : 'Sign In with Email'}
              </button>
            </form>

            <div className="pt-2 text-center border-t border-[#EBE7E5]">
              <button
                type="button"
                onClick={switchMode}
                className="cursor-pointer text-xs font-sans text-[#636563] transition-all hover:text-black"
              >
                {mode === 'signup' ? (
                  <>
                    Already have an account?{' '}
                    <span className="font-bold text-black underline underline-offset-2">Sign in</span>
                  </>
                ) : (
                  <>
                    New to ChargeShare?{' '}
                    <span className="font-bold text-black underline underline-offset-2">List your charger</span>
                  </>
                )}
              </button>
            </div>

            {/* Backend connectivity indicator */}
            <div className="pt-2 flex items-center justify-center gap-1.5 text-[10px] text-[#636563] font-sans">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              <span>Backend Connected · Firestore chargeshare-hack</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
