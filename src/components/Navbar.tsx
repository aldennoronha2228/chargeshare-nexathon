import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface NavbarProps {
  onExploreChargers: () => void;
  onOpenHostModal: () => void;
  onOpenSignInModal: () => void;
  activeReservationCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onExploreChargers,
  onOpenHostModal,
  onOpenSignInModal,
  activeReservationCount,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileNav = (callback?: () => void) => {
    setMobileMenuOpen(false);
    if (callback) callback();
  };

  return (
    <>
      <div className="fixed top-0 inset-x-0 z-40 w-full border-b border-[#383C34] bg-[#22251F] text-white">
      {/* Main Navigation — Strict 3-Zone Contract */}
      <header className="max-w-[1360px] mx-auto flex items-center justify-between gap-2 sm:gap-6 lg:gap-8 px-3 sm:px-8 py-3">
        {/* Zone 1: Single-line Brand Wordmark & Custom Mark */}
        <a
          href="#"
          className="group inline-flex items-center gap-2.5 text-base sm:text-lg font-black tracking-[0.12em] uppercase whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#D8F36A]"
        >
          <img
            src="/logo-mark-lime.png"
            alt="ChargeShare emblem"
            className="h-6 sm:h-7 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(216,243,106,0.55)] group-hover:scale-105 transition-transform"
          />
          <span className="text-white">
            CHARGE<span className="text-[#D8F36A]">SHARE</span>
          </span>
        </a>

        {/* Zone 2: 5 Single-Line Navigation Links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden lg:flex items-center gap-7 text-sm font-medium text-white"
        >
          <a
            href="#chapter-connect"
            className="text-white hover:text-[#D8F36A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Find Chargers
          </a>
          <button
            type="button"
            onClick={onOpenHostModal}
            className="text-white hover:text-[#D8F36A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer"
          >
            Become a Host
          </button>
          <a
            href="#how-it-works"
            className="text-white hover:text-[#D8F36A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            How It Works
          </a>
          <a
            href="#safety"
            className="text-white hover:text-[#D8F36A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1"
          >
            Safety
          </a>
          <button
            type="button"
            onClick={onOpenSignInModal}
            className="text-white hover:text-[#D8F36A] hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer"
          >
            {activeReservationCount > 0 ? `Sign In (${activeReservationCount})` : 'Sign In'}
          </button>
        </nav>

        {/* Zone 3: 1 Primary CTA Button (+ Mobile Menu Button on <lg) */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={onExploreChargers}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-[#173D2C] bg-[#D8F36A] border border-[#D8F36A] rounded hover:bg-[#c9e854] transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#D8F36A]"
          >
            Explore Chargers
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-nav-drawer"
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="lg:hidden inline-flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded border border-[#383C34] text-white hover:bg-[#2E322A] transition-colors shrink-0"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div
          id="mobile-nav-drawer"
          className="lg:hidden border-t border-[#383C34] bg-[#22251F] px-4 pt-3 pb-6 space-y-3"
        >
          <nav aria-label="Mobile Navigation" className="flex flex-col space-y-1">
            <a
              href="#chapter-connect"
              onClick={() => handleMobileNav()}
              className="px-3 py-2.5 text-base font-medium text-white hover:bg-[#2E322A] rounded"
            >
              Find Chargers
            </a>
            <button
              type="button"
              onClick={() => handleMobileNav(onOpenHostModal)}
              className="text-left px-3 py-2.5 text-base font-medium text-white hover:bg-[#2E322A] rounded"
            >
              Become a Host
            </button>
            <a
              href="#how-it-works"
              onClick={() => handleMobileNav()}
              className="px-3 py-2.5 text-base font-medium text-white hover:bg-[#2E322A] rounded"
            >
              How It Works
            </a>
            <a
              href="#safety"
              onClick={() => handleMobileNav()}
              className="px-3 py-2.5 text-base font-medium text-white hover:bg-[#2E322A] rounded"
            >
              Safety
            </a>
            <button
              type="button"
              onClick={() => handleMobileNav(onOpenSignInModal)}
              className="text-left px-3 py-2.5 text-base font-medium text-white hover:bg-[#2E322A] rounded"
            >
              Sign In {activeReservationCount > 0 ? `(${activeReservationCount} Demo Bookings)` : ''}
            </button>
          </nav>
          <div className="pt-2 border-t border-[#383C34] flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => handleMobileNav(onExploreChargers)}
              className="w-full py-3 px-4 text-sm font-semibold text-[#173D2C] bg-[#D8F36A] border border-[#D8F36A] rounded text-center cursor-pointer active:bg-[#c9e854]"
            >
              Explore Chargers
            </button>
            <button
              type="button"
              onClick={() => handleMobileNav(onOpenHostModal)}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#173D2C] border border-[#26543E] rounded text-center cursor-pointer active:bg-[#112E21]"
            >
              List Your Charger
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  );
};
