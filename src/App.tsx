/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { DEMO_CHARGERS, type ChargerListing } from './data/demoChargers';
import { ORDERED_CHAPTERS, type StoryChapterId } from './three/ScrollSceneController';
import type { ChargerVisualState } from './three/ChargerModel';
import { Navbar } from './components/Navbar';
import { HeroScene } from './components/HeroScene';
import { ChapterConnectSection, ChapterBookAndChargeSection } from './components/StoryChapters';
import { SafetyAndFeatureShowcase } from './components/SafetyAndFeatureShowcase';
import { IndiaMobilityAndConversion } from './components/IndiaMobilityAndConversion';
import {
  HostOnboardingModal,
  SignInAndBookingsModal,
  InfoPolicyModal,
  type ConfirmedDemoBooking,
} from './components/InteractiveModals';

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
  const [chargers, setChargers] = useState<ChargerListing[]>(DEMO_CHARGERS);
  const [selectedChargerIndex, setSelectedChargerIndex] = useState<number>(0);
  const [confirmedBookings, setConfirmedBookings] = useState<ConfirmedDemoBooking[]>([]);

  // 3D Stage & Narrative Chapter State
  const [activeChapter, setActiveChapter] = useState<StoryChapterId>('discover');
  const [chargerState, setChargerState] = useState<ChargerVisualState>('charging');

  // Modal states
  const [hostModalOpen, setHostModalOpen] = useState(false);
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [infoModalTopic, setInfoModalTopic] = useState<'support' | 'terms' | null>(null);

  // Sync activeChapter with scroll position across the 5 narrative sections (RAF-throttled)
  useEffect(() => {
    let ticking = false;
    const evaluateScrollChapter = () => {
      ticking = false;
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

    const handleScroll = () => {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(evaluateScrollChapter);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    evaluateScrollChapter();
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

  const handleAddHostListing = (newCharger: ChargerListing) => {
    setChargers((prev) => [newCharger, ...prev]);
    setSelectedChargerIndex(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#173D2C] text-[#22251F]">
      {/* Persistent Top Bar Navigation */}
      <Navbar
        onExploreChargers={scrollToConnect}
        onOpenHostModal={() => setHostModalOpen(true)}
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
          onBecomeHostClick={() => setHostModalOpen(true)}
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
          onOpenHostModal={() => setHostModalOpen(true)}
          onOpenInfoModal={(topic) => setInfoModalTopic(topic)}
        />
      </main>

      {/* Interactive Modals */}
      <HostOnboardingModal
        isOpen={hostModalOpen}
        onClose={() => setHostModalOpen(false)}
        onAddHostListing={handleAddHostListing}
      />

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
