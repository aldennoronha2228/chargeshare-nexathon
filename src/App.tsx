/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { User } from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import type { ChargerListing } from './data/demoChargers';
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
} from './components/InteractiveModals';
import { cancelBooking, createBookingRequest, subscribeToUserBookings, type Booking } from './utils/bookings';
import { auth } from './firebase';
import {
  ROUTES,
  buildLoginPath,
  navigateTo,
  readAppRoute,
  readSafeRedirectPath,
  replaceTo,
  type AppRoute,
} from './utils/appRoute';
// Local feature additions
import { EditProfileModal } from './components/EditProfileModal';
import { FindChargersPage } from './components/FindChargersPage';
import { ChargerDetailDrawer } from './components/ChargerDetailDrawer';
import type { ProfileMenuView } from './components/ProfileMenu';
import { subscribeToPublicChargers, toClientListing } from './utils/providerChargers';
import { subscribeToPublicReviews, type Review } from './utils/reviews';

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

/** Used when the login page is opened without an explicit `?next=` destination. */
const LOGIN_FALLBACK_DESTINATION: string = ROUTES.provider;

/** Placeholder shown while Firebase restores a session or a redirect is applied. */
const SessionLoading: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex min-h-screen items-center justify-center bg-[#FAF7F0] font-body text-[13px] font-semibold text-[#414944]">
    {label}
  </div>
);

export default function App() {
  const [route, setRoute] = useState<AppRoute>(readAppRoute);
  /** Where to send the user once they sign in on the login page. */
  const [loginDestination, setLoginDestination] = useState<string>(
    () => readSafeRedirectPath() ?? LOGIN_FALLBACK_DESTINATION,
  );
  const [user, setUser] = useState<User | null>(null);
  const [authResolved, setAuthResolved] = useState(false);

  const [chargers, setChargers] = useState<ChargerListing[]>([]);
  const [chargersLoading, setChargersLoading] = useState(true);
  const [chargersError, setChargersError] = useState('');
  const [selectedChargerIndex, setSelectedChargerIndex] = useState<number>(0);
  const [driverBookings, setDriverBookings] = useState<Booking[]>([]);
  const [publicReviews, setPublicReviews] = useState<Review[]>([]);

  // 3D Stage & Narrative Chapter State
  const [activeChapter, setActiveChapter] = useState<StoryChapterId>('discover');
  const [chargerState, setChargerState] = useState<ChargerVisualState>('charging');
  const [pendingSectionId, setPendingSectionId] = useState<string | null>(null);

  // Modal states
  const [signInModalOpen, setSignInModalOpen] = useState(false);
  const [infoModalTopic, setInfoModalTopic] = useState<'support' | 'terms' | null>(null);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editProfileView, setEditProfileView] = useState<ProfileMenuView>('view');
  const [detailCharger, setDetailCharger] = useState<ChargerListing | null>(null);

  // Keep the route — and the intended destination — in sync with browser navigation
  useEffect(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    const syncFromLocation = () => {
      setRoute(readAppRoute());
      setLoginDestination(readSafeRedirectPath() ?? LOGIN_FALLBACK_DESTINATION);
    };
    window.addEventListener('popstate', syncFromLocation);
    return () => {
      window.removeEventListener('popstate', syncFromLocation);
      window.history.scrollRestoration = previousScrollRestoration;
    };
  }, []);

  // Browser history can otherwise restore a previous route's deep scroll offset,
  // making Home or Login appear blank when returning to them.
  useEffect(() => {
    if (route === 'landing' && pendingSectionId) return;
    window.scrollTo(0, 0);
  }, [route]);

  useEffect(() => subscribeToPublicReviews(
    setPublicReviews,
    (message) => console.error('Could not load charger reviews:', message)
  ), []);

  const chargersWithReviews = useMemo(() => chargers.map((charger) => {
    const matchingReviews = publicReviews.filter((review) => review.chargerId === charger.id);
    const rating = matchingReviews.length
      ? matchingReviews.reduce((sum, review) => sum + review.rating, 0) / matchingReviews.length
      : 0;
    return { ...charger, rating, reviewCount: matchingReviews.length };
  }), [chargers, publicReviews]);

  // Single Firebase session listener shared by the whole app
  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthResolved(true);
    });
  }, []);

  /**
   * Firebase settles `auth.currentUser` before the `signInWith*` promise resolves,
   * while `onAuthStateChanged` may notify a tick later. Bridging the two stops a
   * freshly signed-in user from being bounced back to the login screen.
   */
  const effectiveUser = user ?? auth.currentUser;

  useEffect(() => {
    if (!effectiveUser) {
      setDriverBookings([]);
      return;
    }
    return subscribeToUserBookings(
      effectiveUser.uid,
      setDriverBookings,
      (message) => console.error('Could not load driver bookings:', message)
    );
  }, [effectiveUser?.uid]);

  // Client discovery uses the public projection written by provider listings.
  useEffect(() => {
    setChargersLoading(true);
    setChargersError('');
    return subscribeToPublicChargers(
      (listings) => {
        setChargers(listings.map(toClientListing));
        setChargersLoading(false);
      },
      (message) => {
        setChargersError(message);
        setChargersLoading(false);
      }
    );
  }, []);

  // A signed-in user should never be left sitting on the login page.
  // `replaceTo` keeps the login URL out of history so Back does not bounce.
  useEffect(() => {
    if (route !== 'login' || !authResolved || !effectiveUser) return;
    replaceTo(loginDestination);
  }, [route, authResolved, effectiveUser, loginDestination]);

  // /find-chargers is protected: send signed-out visitors to login and remember it
  useEffect(() => {
    if (route !== 'findChargers' || !authResolved || effectiveUser) return;
    replaceTo(buildLoginPath(ROUTES.findChargers));
  }, [route, authResolved, effectiveUser]);

  // Drop user-specific session state as soon as the account signs out
  useEffect(() => {
    if (user) return;
    setDriverBookings([]);
    setSignInModalOpen(false);
    setEditProfileOpen(false);
    setDetailCharger(null);
  }, [user]);

  // Scroll to a landing narrative section requested from another route
  useEffect(() => {
    if (route !== 'landing' || !pendingSectionId) return;
    const sectionId = pendingSectionId;
    setPendingSectionId(null);
    const timer = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [route, pendingSectionId]);

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

  /** Landing narrative deep-links (How It Works / Safety) — safe to use from any route. */
  const handleNavigateToSection = useCallback((sectionId: string) => {
    if (readAppRoute() === 'landing') {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setPendingSectionId(sectionId);
    navigateTo(ROUTES.landing);
  }, []);

  /** Find-a-Charger entry point: routes through login when signed out. */
  const goToFindChargers = useCallback(() => {
    navigateTo(effectiveUser ? ROUTES.findChargers : buildLoginPath(ROUTES.findChargers));
  }, [effectiveUser]);

  const scrollToBook = () => {
    setActiveChapter('book');
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectNodeInConnect = (index: number) => {
    setSelectedChargerIndex(index);
  };

  const handleCancelBooking = async (bookingId: string) => {
    await cancelBooking(bookingId);
  };

  const activeReservationCount = driverBookings.filter((booking) => ['pending', 'accepted'].includes(booking.status)).length;

  const openProviderPortal = useCallback(() => {
    navigateTo(effectiveUser ? ROUTES.provider : ROUTES.login);
  }, [effectiveUser]);

  const openProfile = useCallback((view: ProfileMenuView) => {
    setEditProfileView(view);
    setEditProfileOpen(true);
  }, []);

  // Provider portal — requires a real Firebase session
  if (route === 'provider') {
    if (!authResolved) return <SessionLoading label="Checking your session…" />;
    return effectiveUser ? (
      <HostPortal user={effectiveUser} />
    ) : (
      <AuthPage redirectTo={ROUTES.provider} />
    );
  }

  // Dedicated login / signup page
  if (route === 'login') {
    if (!authResolved) return <SessionLoading label="Checking your session…" />;
    if (effectiveUser) return <SessionLoading label="Redirecting…" />;
    return <AuthPage redirectTo={loginDestination} />;
  }

  // Charger discovery — protected route
  if (route === 'findChargers') {
    if (!authResolved) return <SessionLoading label="Checking your session…" />;
    if (!effectiveUser) return <SessionLoading label="Redirecting to sign in…" />;
  }

  const isFindChargersRoute = route === 'findChargers';

  return (
    <div className="min-h-screen flex flex-col bg-[#173D2C] text-[#22251F]">
      {/*
        The marketing navbar stays on the landing/provider routes. The Find a Charger
        page brings its own compact app nav + mobile bottom nav, so rendering both
        would duplicate navigation.
      */}
      {!isFindChargersRoute && (
        <Navbar
          user={effectiveUser}
          onExploreChargers={goToFindChargers}
          onOpenHostModal={openProviderPortal}
          onOpenSignInModal={() => setSignInModalOpen(true)}
          onOpenProfile={openProfile}
          onNavigateSection={handleNavigateToSection}
          activeReservationCount={activeReservationCount}
        />
      )}

      <main className="flex-1 relative">
        {isFindChargersRoute ? (
          <FindChargersPage
            chargers={chargersWithReviews}
            chargersLoading={chargersLoading}
            chargersError={chargersError}
            user={effectiveUser}
            onOpenDetail={(charger) => setDetailCharger(charger)}
            onOpenProfile={openProfile}
            onOpenBookings={() => setSignInModalOpen(true)}
            activeReservationCount={activeReservationCount}
          />
        ) : (
          <>
            {/* CHAPTER 1 — DISCOVER */}
            <HeroScene
              activeChapter={activeChapter}
              chargerState={chargerState}
              selectedChargerIndex={selectedChargerIndex}
              onSelectChapter={handleSelectChapter}
              onCycleChargerState={handleCycleChargerState}
              onFindChargerClick={goToFindChargers}
              onBecomeHostClick={openProviderPortal}
            />

            {/* CHAPTER 2 — CONNECT */}
            <ChapterConnectSection
              chargers={chargersWithReviews}
              selectedChargerIndex={selectedChargerIndex}
              onSelectNode={handleSelectNodeInConnect}
              onExploreClick={scrollToBook}
            />

            {/* CHAPTER 3 — BOOK AND CHARGE */}
            <ChapterBookAndChargeSection
              chargerState={chargerState}
              onSelectStepState={(state) => setChargerState(state)}
              onExploreChargers={goToFindChargers}
            />

            {/* CHAPTER 4 — TRUST AND SAFETY */}
            <SafetyAndFeatureShowcase />

            {/* CHAPTER 5 — FINAL CONVERSION & FOOTER */}
            <IndiaMobilityAndConversion
              onExploreChargers={goToFindChargers}
              onOpenHostModal={openProviderPortal}
              onOpenInfoModal={(topic) => setInfoModalTopic(topic)}
            />
          </>
        )}
      </main>

      {/* Interactive Modals */}
      <SignInAndBookingsModal
        isOpen={signInModalOpen}
        onClose={() => setSignInModalOpen(false)}
        confirmedBookings={driverBookings}
        onCancelBooking={handleCancelBooking}
        onOpenEditProfile={() => { setSignInModalOpen(false); openProfile('view'); }}
      />

      <InfoPolicyModal topic={infoModalTopic} onClose={() => setInfoModalTopic(null)} />

      <EditProfileModal
        isOpen={editProfileOpen}
        initialView={editProfileView}
        onClose={() => setEditProfileOpen(false)}
      />

      <ChargerDetailDrawer
        charger={detailCharger}
        onClose={() => setDetailCharger(null)}
        onBook={async (charger, request) => {
          if (!effectiveUser || !charger.providerId) throw new Error('Sign in and choose an active provider listing to book.');
          const totalPrice = charger.pricingType === 'per_session'
            ? charger.pricePerKwh
            : charger.pricePerKwh * request.totalKwh;
          await createBookingRequest({
            chargerId: charger.id,
            chargerTitle: charger.title,
            chargerLocality: charger.locality,
            providerId: charger.providerId,
            userId: effectiveUser.uid,
            userName: effectiveUser.displayName || effectiveUser.email || 'ChargeShare driver',
            ...(effectiveUser.photoURL ? { userPhoto: effectiveUser.photoURL } : {}),
            vehicleName: request.vehicleName,
            vehicleNumber: request.vehicleNumber,
            startTime: request.startTime,
            endTime: request.endTime,
            totalKwh: request.totalKwh,
            totalPrice,
          });
        }}
      />
    </div>
  );
}
