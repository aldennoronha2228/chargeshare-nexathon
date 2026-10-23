/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import { DEMO_CHARGERS, type ChargerListing } from './data/demoChargers';
import { ORDERED_CHAPTERS, type StoryChapterId } from './three/ScrollSceneController';
import type { ChargerVisualState } from './three/ChargerModel';
import { Navbar } from './components/Navbar';
import { HeroScene } from './components/HeroScene';
import { ChapterConnectSection, ChapterBookAndChargeSection } from './components/StoryChapters';
import { SafetyAndFeatureShowcase } from './components/SafetyAndFeatureShowcase';
import { IndiaMobilityAndConversion } from './components/IndiaMobilityAndConversion';
import { HostPortal } from './components/HostPortal';
import { AuthPage } from './components/AuthPage';
import {
  SignInAndBookingsModal,
  InfoPolicyModal,
  type ConfirmedDemoBooking,
} from './components/InteractiveModals';
import { auth } from './firebase';
import { ROUTES, readAppRoute, navigateTo } from './utils/appRoute';

const CHAPTER_SECTION_IDS: Record<StoryChapterId, string> = {
  discover: 'chapter-discover',
  connect: 'chapter-connect',
  find: 'chapter-connect',
  book: 'how-it-works',
  share: 'safety',
  safety: 'safety',
  conversion: 'chapter-conversion',
};

const CHARGER_STATE_CYCLE: ChargerVisualState[] = ['charging', 'standby', 'reserved'];

export default function App() {
  const [route, setRoute] = useState(readAppRoute);
  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [chargers] = useState<ChargerListing[]>(DEMO_CHARGERS);
  const [selectedChargerIndex, setSelectedChargerIndex] = useState<number>(0);
  const [confirmedBookings, setConfirmedBookings] = useState<ConfirmedDemoBooking[]>([]);

  // 3D Stage & Narrative Chapter State
  const [activeChapter, setActiveChapter] = useState<StoryChapterId>('discover');
  const [chargerState, setChargerState] = useState<ChargerVisualState>('charging');

  // Modal states
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [infoModalTopic, setInfoModalTopic] = useState<'support' | 'terms' | null>(null);

  // Keep the route in sync with client-side navigation (pushState + popstate)
  useEffect(() => {
    const handlePopState = () => setRoute(readAppRoute());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Track the Firebase session so the provider portal can require a real account
  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthResolved(true);
    });
  }, []);

  // Sync activeChapter with scroll position across the 5 narrative sections
  useEffect(() => {
    const handleScroll = () => {
      const viewportTriggerY = window.innerHeight * 0.45;
      let detectedChapter: StoryChapterId = 'discover';

      for (const ch of ORDERED_CHAPTERS) {
        const el = document.getElementById(CHAPTER_SECTION_IDS[ch]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= viewportTriggerY) {
            detectedChapter = ch;
          }
        }
      }

      setActiveChapter((prev: StoryChapterId) =>
        prev !== detectedChapter ? detectedChapter : prev
      );
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleSelectChapter = useCallback((chapter: StoryChapterId) => {
    setActiveChapter(chapter);
    const targetId = CHAPTER_SECTION_IDS[chapter];
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const handleCycleChargerState = useCallback((nextState?: ChargerVisualState) => {
    if (nextState) {
      setChargerState(nextState);
      return;
    }
    setChargerState((prev: ChargerVisualState) => {
      const idx = CHARGER_STATE_CYCLE.indexOf(prev);
      return CHARGER_STATE_CYCLE[(idx + 1) % CHARGER_STATE_CYCLE.length];
    });
  }, []);

  const scrollToConnect = () => {
    setActiveChapter('connect');
    document.getElementById('chapter-connect')?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToBook = () => {
    setActiveChapter('book');
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectNodeInConnect = (index: number) => {
    setSelectedChargerIndex(index);
  };

  const handleCancelBooking = (bookingId: string) => {
    setConfirmedBookings((prev) => prev.filter((b) => b.bookingId !== bookingId));
  };

  const openProviderPortal = useCallback(() => {
    navigateTo(user ? ROUTES.provider : ROUTES.login);
  }, [user]);

  // Provider portal — requires a real Firebase session
  if (route === 'provider') {
    if (!authResolved) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#FAF7F0] font-body text-[13px] font-semibold text-[#414944]">
          Checking your session…
        </div>
      );
    }
    return user ? <HostPortal user={user} /> : <AuthPage redirectTo={ROUTES.provider} />;
  }

  // Dedicated login / signup page
  if (route === 'login') {
    return <AuthPage redirectTo={ROUTES.provider} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#173D2C] text-[#22251F]">
      {/* Persistent Top Bar Navigation */}
      <Navbar
        onExploreChargers={scrollToConnect}
        onOpenHostModal={openProviderPortal}
        onOpenSignInModal={() => setSignInModalOpen(true)}
        activeReservationCount={confirmedBookings.length}
      />

      <main className="flex-1 relative">
        {/* CHAPTER 1 — DISCOVER (Full-Screen 3D Scene + Persistent WebGL Canvas + Unified 3D Dock) */}
        <HeroScene
          activeChapter={activeChapter}
          chargerState={chargerState}
          selectedChargerIndex={selectedChargerIndex}
          onSelectChapter={handleSelectChapter}
          onCycleChargerState={handleCycleChargerState}
          onFindChargerClick={scrollToConnect}
          onBecomeHostClick={openProviderPortal}
        />

        {/* CHAPTER 2 — CONNECT (3D Neighbourhood Pull-Back & Shared Charging Network) */}
        <ChapterConnectSection
          chargers={chargers}
          selectedChargerIndex={selectedChargerIndex}
          onSelectNode={handleSelectNodeInConnect}
          onExploreClick={scrollToBook}
        />

        {/* CHAPTER 3 — BOOK AND CHARGE (3-Step Interactive Sequence Synced with 3D Stage) */}
        <ChapterBookAndChargeSection
          chargerState={chargerState}
          onSelectStepState={(state) => setChargerState(state)}
          onExploreChargers={scrollToConnect}
        />

        {/* CHAPTER 4 — TRUST AND SAFETY (Readable Editorial Verification & Ground Rules) */}
        <SafetyAndFeatureShowcase />

        {/* CHAPTER 5 — FINAL CONVERSION & FOOTER */}
        <IndiaMobilityAndConversion
          onExploreChargers={scrollToConnect}
          onOpenHostModal={openProviderPortal}
          onOpenInfoModal={(topic) => setInfoModalTopic(topic)}
        />
      </main>

      {/* Interactive Modals */}
      <SignInAndBookingsModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
        confirmedBookings={confirmedBookings}
        onCancelBooking={handleCancelBooking}
      />

      <InfoPolicyModal topic={infoModalTopic} onClose={() => setInfoModalTopic(null)} />
    </div>
  );
}
