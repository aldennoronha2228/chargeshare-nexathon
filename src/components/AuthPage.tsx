import React, { useState } from 'react';
import { ArrowLeft, Zap } from 'lucide-react';
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
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

  const switchMode = () => {
    setMode((prev) => (prev === 'signin' ? 'signup' : 'signin'));
    setError('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F0] font-body text-[#1c1c18] selection:bg-[#D2F24E] selection:text-[#0A261C]">
      <header className="border-b border-[#DFD9CC] bg-[#FAF7F0]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <button
            type="button"
            onClick={() => navigateTo(ROUTES.landing)}
            className="flex cursor-pointer items-center gap-2.5"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0A261C] shadow-sm">
              <Zap size={18} className="text-[#D2F24E]" />
            </div>
            <span className="font-sans text-[18px] font-extrabold leading-none tracking-tight text-[#0A261C]">
              ChargeShare
            </span>
          </button>
          <button
            type="button"
            onClick={() => navigateTo(ROUTES.landing)}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-[#DFD9CC] bg-white px-3 py-1.5 text-[12px] font-bold text-[#0A261C] transition-colors hover:bg-[#F2EFE8]"
          >
            <ArrowLeft size={15} />
            <span>Back to home</span>
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-5 flex flex-col items-center text-center">
            <span className="rounded-full bg-[#133E2E] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#D2F24E]">
              Provider Access
            </span>
            <h1 className="mt-3 font-sans text-[26px] font-extrabold leading-tight tracking-tight text-[#0A261C]">
              {mode === 'signup' ? 'Create your provider account' : 'Sign in to your provider dashboard'}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[#414944]">
              {mode === 'signup'
                ? 'Set up an account to list your charging bay and manage incoming booking requests.'
                : 'Use the same account you use across ChargeShare to manage your charging bay.'}
            </p>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-[#DFD9CC] bg-white p-5 shadow-[0_2px_8px_rgba(19,62,46,0.04)]">
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={pending}
              className="w-full cursor-pointer rounded-xl border border-[#DFD9CC] bg-white px-4 py-2.5 text-[13px] font-bold text-[#0A261C] transition-colors hover:bg-[#FAF7F0] disabled:cursor-not-allowed disabled:opacity-60"
            >
              Continue with Google
            </button>

            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-[#717974]">
              <span className="h-px flex-1 bg-[#DFD9CC]" />
              <span>or</span>
              <span className="h-px flex-1 bg-[#DFD9CC]" />
            </div>

            <form onSubmit={handleEmailAuth} noValidate className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor="provider-email" className="text-[12px] font-bold text-[#0A261C]">
                  Email address
                </label>
                <input
                  id="provider-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.in"
                  className="w-full rounded-xl border border-[#DFD9CC] bg-[#FAF7F0] px-3 py-2.5 text-[13px] text-[#1c1c18] outline-none transition-colors focus:border-[#133E2E] focus:bg-white"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="provider-password" className="text-[12px] font-bold text-[#0A261C]">
                  Password
                </label>
                <input
                  id="provider-password"
                  type="password"
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-[#DFD9CC] bg-[#FAF7F0] px-3 py-2.5 text-[13px] text-[#1c1c18] outline-none transition-colors focus:border-[#133E2E] focus:bg-white"
                />
              </div>

              {error && (
                <p className="rounded-xl bg-[#ffdad6] px-3 py-2 text-[12px] font-medium text-[#ba1a1a]">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={pending}
                className="w-full cursor-pointer rounded-xl border border-[#b2d40f] bg-[#D2F24E] px-4 py-2.5 text-[13px] font-extrabold text-[#133E2E] shadow-sm transition-colors hover:bg-[#caee34] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {pending ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <button
              type="button"
              onClick={switchMode}
              className="cursor-pointer text-center text-[12px] font-semibold text-[#133E2E] underline underline-offset-4"
            >
              {mode === 'signup'
                ? 'Already have an account? Sign in'
                : 'New to ChargeShare? Create an account'}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};
