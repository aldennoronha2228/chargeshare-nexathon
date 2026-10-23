import React, { useState } from 'react';
import { Menu, X, Zap, ArrowUpRight, Download, User } from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import { downloadProjectZip } from '../utils/projectZipDownload';
import { ROUTES, navigateTo } from '../utils/appRoute';
import { ProfileMenu, type ProfileMenuView } from './ProfileMenu';

interface NavbarProps {
  /** Signed-in user, supplied by App so the bar follows a single auth listener. */
  user: FirebaseUser | null;
  /** Entry point of the Find-a-Charger flow (login when signed out). */
  onExploreChargers: () => void;
  onOpenHostModal: () => void;
  onOpenSignInModal: () => void;
  onOpenProfile: (view: ProfileMenuView) => void;
  /** Deep-links into a landing narrative section from any route. */
  onNavigateSection: (sectionId: string) => void;
  activeReservationCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onExploreChargers,
  onOpenHostModal,
  onOpenSignInModal,
  onOpenProfile,
  onNavigateSection,
  activeReservationCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);

  const handleMobileNav = (callback?: () => void) => {
    setMobileMenuOpen(false);
    if (callback) callback();
  };

  const goHome = (event: React.MouseEvent) => {
    event.preventDefault();
    navigateTo(ROUTES.landing);
  };

  return (
    <div className="sticky top-0 z-40 w-full border-b border-[#D8D5CA] bg-[#F6F3E9]">
      {/* A. Slim Announcement Strip */}
      {announcementVisible && (
        <div className="bg-[#173D2C] text-[#F6F3E9] px-4 sm:px-8 py-2 text-xs border-b border-[#26543E]">
          <div className="max-w-[1360px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 truncate">
              <span className="font-mono text-[#D8F36A] font-medium shrink-0">
                NEIGHBOURHOOD NETWORK
              </span>
              <span aria-hidden="true" className="text-[#88A897]">·</span>
              <span className="truncate text-[#E6E3D8]">
                Have a 3.3 kW or 7.4 kW home EV charger? Share idle driveway hours with verified local drivers.
              </span>
              <button
                type="button"
                onClick={onOpenHostModal}
                className="hidden md:inline-flex items-center gap-1 text-[#D8F36A] font-medium underline underline-offset-4 hover:text-white transition-colors shrink-0 ml-1 cursor-pointer"
              >
                List your charger
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={downloadProjectZip}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#D8F36A] text-[#173D2C] font-mono font-bold text-[11px] rounded hover:bg-[#c9e854] transition-colors cursor-pointer"
              >
                <Download className="w-3 h-3" />
                <span>Download Project (.zip)</span>
              </button>
              <button
                type="button"
                onClick={() => setAnnouncementVisible(false)}
                aria-label="Dismiss announcement banner"
                className="text-[#B5C7BD] hover:text-white p-0.5 rounded focus-visible:outline-2 focus-visible:outline-[#D8F36A] shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Navigation — brand + profile control on the left, links + CTA on the right */}
      <header className="max-w-[1360px] mx-auto flex items-center justify-between gap-2 sm:gap-6 px-3 sm:px-8 py-3">
        {/* Left zone: Brand wordmark, then the signed-in profile control */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <a
            href={ROUTES.landing}
            onClick={goHome}
            className="inline-flex items-center gap-2 text-lg sm:text-xl font-bold tracking-tight text-[#173D2C] font-display whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#173D2C]"
          >
            <span className="w-7 h-7 rounded bg-[#173D2C] text-[#D8F36A] inline-flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </span>
            ChargeShare
          </a>

          {user && <ProfileMenu user={user} onOpenProfile={onOpenProfile} />}
        </div>

        {/* Right zone: primary navigation links, CTA and mobile menu button */}
        <div className="flex items-center gap-2 sm:gap-3 lg:gap-7 shrink-0">
          <nav
            aria-label="Primary Navigation"
            className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#22251F]"
          >
            <button
              type="button"
              onClick={onExploreChargers}
              className="hover:text-[#173D2C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
            >
              Find Chargers
            </button>
            <button
              type="button"
              onClick={onOpenHostModal}
              className="hover:text-[#173D2C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
            >
              Become a Provider
            </button>
            <a
              href="#how-it-works"
              onClick={(event) => {
                event.preventDefault();
                onNavigateSection('how-it-works');
              }}
              className="hover:text-[#173D2C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
            >
              How It Works
            </a>
            <a
              href="#safety"
              onClick={(event) => {
                event.preventDefault();
                onNavigateSection('safety');
              }}
              className="hover:text-[#173D2C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
            >
              Safety
            </a>
            {!user && (
              <button
                type="button"
                onClick={onOpenSignInModal}
                className="hover:text-[#173D2C] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
              >
                {activeReservationCount > 0 ? `Sign In (${activeReservationCount})` : 'Sign In'}
              </button>
            )}
          </nav>

          <button
            type="button"
            onClick={onExploreChargers}
            className="hidden sm:inline-block px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#173D2C] bg-[#D8F36A] border border-[#173D2C] rounded hover:bg-[#c9e854] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
          >
            Explore Chargers
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded border border-[#D8D5CA] text-[#22251F] hover:bg-[#EDE8D8] transition-colors shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2C]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden border-t border-[#D8D5CA] bg-[#F6F3E9] px-4 pt-3 pb-6 space-y-3"
        >
          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1">
            <button
              type="button"
              onClick={() => handleMobileNav(onExploreChargers)}
              className="text-left px-3 py-2.5 text-base font-medium text-[#22251F] hover:bg-[#EDE8D8] rounded cursor-pointer"
            >
              Find Chargers
            </button>
            <button
              type="button"
              onClick={() => handleMobileNav(onOpenHostModal)}
              className="text-left px-3 py-2.5 text-base font-medium text-[#22251F] hover:bg-[#EDE8D8] rounded cursor-pointer"
            >
              Become a Provider
            </button>
            <button
              type="button"
              onClick={() => handleMobileNav(() => onNavigateSection('how-it-works'))}
              className="text-left px-3 py-2.5 text-base font-medium text-[#22251F] hover:bg-[#EDE8D8] rounded cursor-pointer"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => handleMobileNav(() => onNavigateSection('safety'))}
              className="text-left px-3 py-2.5 text-base font-medium text-[#22251F] hover:bg-[#EDE8D8] rounded cursor-pointer"
            >
              Safety
            </button>
            {user ? (
              <>
                <button
                  type="button"
                  onClick={() => handleMobileNav(() => onOpenProfile('view'))}
                  className="text-left px-3 py-2.5 text-base font-medium text-[#173D2C] hover:bg-[#EDE8D8] rounded flex items-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  My Profile
                </button>
                <button
                  type="button"
                  onClick={() => handleMobileNav(() => onOpenProfile('edit'))}
                  className="text-left px-3 py-2.5 text-base font-medium text-[#173D2C] hover:bg-[#EDE8D8] rounded cursor-pointer"
                >
                  Edit Profile
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleMobileNav(onOpenSignInModal)}
                className="text-left px-3 py-2.5 text-base font-medium text-[#22251F] hover:bg-[#EDE8D8] rounded cursor-pointer"
              >
                Sign In {activeReservationCount > 0 ? `(${activeReservationCount} Demo Bookings)` : ''}
              </button>
            )}
          </nav>
          <div className="pt-2 border-t border-[#D8D5CA] flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => handleMobileNav(onExploreChargers)}
              className="w-full py-2.5 px-4 text-sm font-semibold text-[#173D2C] bg-[#D8F36A] border border-[#173D2C] rounded text-center cursor-pointer"
            >
              Explore Chargers
            </button>
            <button
              type="button"
              onClick={() => handleMobileNav(onOpenHostModal)}
              className="w-full py-2.5 px-4 text-sm font-semibold text-[#F6F3E9] bg-[#173D2C] rounded text-center cursor-pointer"
            >
              List Your Charger
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
