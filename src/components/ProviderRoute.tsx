import React, { useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { LoaderCircle } from 'lucide-react';
import { HostPortal } from './HostPortal';
import { ProviderRegistrationPage } from './ProviderRegistrationPage';
import { subscribeToProviderProfile, type ProviderProfile } from '../utils/providerProfile';

export const ProviderRoute: React.FC<{ user: User }> = ({ user }) => {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoaded(false);
    setError('');
    return subscribeToProviderProfile(
      user.uid,
      (next) => {
        setProfile(next);
        setLoaded(true);
      },
      (message) => {
        setError(message);
        setLoaded(true);
      },
    );
  }, [user.uid]);

  if (!loaded) {
    return <div className="flex min-h-screen items-center justify-center bg-[#FAF8F7] text-sm text-[#555]"><LoaderCircle size={18} className="mr-2 animate-spin" />Loading provider profile…</div>;
  }
  if (error) {
    return <div className="flex min-h-screen items-center justify-center bg-[#FAF8F7] px-5 text-center text-sm text-red-800">Could not load your provider profile: {error}</div>;
  }
  if (!profile) return <ProviderRegistrationPage user={user} />;
  if (profile.applicationStatus === 'under_review' || profile.applicationStatus === 'declined') {
    const declined = profile.applicationStatus === 'declined';
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAF8F7] px-4 py-10 font-body text-[#111]">
        <section className="w-full max-w-lg rounded-2xl border border-black/10 bg-white p-6 text-center shadow-sm sm:p-9">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3F2F0]"><span className="text-xl font-bold">{declined ? '!' : '…'}</span></div>
          <p className="mt-5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#666]">Provider application</p>
          <h1 className="mt-2 text-2xl font-bold">{declined ? 'Application declined' : 'Under review'}</h1>
          <p className="mt-3 text-sm leading-6 text-[#666]">
            {declined
              ? 'Your provider application was declined. Contact ChargeShare support if you need help with the decision.'
              : 'Your details and property documents have been submitted to the ChargeShare admin team. The provider dashboard will be available after your application is accepted.'}
          </p>
          <button type="button" onClick={() => window.location.assign('/')} className="mt-7 min-h-11 w-full rounded-lg bg-black px-4 text-sm font-semibold text-white hover:bg-neutral-800">Back to home</button>
        </section>
      </div>
    );
  }
  return <HostPortal user={user} />;
};
