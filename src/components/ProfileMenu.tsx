/**
 * ProfileMenu — signed-in account control shown beside the ChargeShare brand.
 *
 * Renders the user's photo (or an initial-based default avatar) plus their
 * name, and exposes a keyboard-accessible dropdown with:
 *   View Profile · Edit Profile · Find a Charger · Logout
 *
 * Authentication state is owned by the parent (App) and passed in as `user`,
 * so the menu re-renders immediately whenever Firebase reports a change.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, Loader2, LogOut, MapPin, Pencil, User, UserCircle } from 'lucide-react';
import { signOut, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import { ROUTES, navigateTo } from '../utils/appRoute';

export type ProfileMenuView = 'view' | 'edit';

interface ProfileMenuProps {
  user: FirebaseUser;
  /** Opens the existing profile dialog in view or edit mode. */
  onOpenProfile: (view: ProfileMenuView) => void;
  /**
   * Which edge the dropdown panel aligns to. Use `right` when the control sits
   * at the right-hand end of a bar so the panel does not overflow the viewport.
   */
  align?: 'left' | 'right';
  /** Adapts the account trigger for the dark landing navigation bar. */
  variant?: 'light' | 'dark';
}

function initialsOf(user: FirebaseUser): string {
  const source = user.displayName?.trim() || user.email?.trim() || 'U';
  const parts = source.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export const ProfileMenu: React.FC<ProfileMenuProps> = ({
  user,
  onOpenProfile,
  align = 'left',
  variant = 'light',
}) => {
  const [open, setOpen]       = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState('');
  const [imgError, setImgError] = useState(false);

  const rootRef    = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs   = useRef<Array<HTMLButtonElement | null>>([]);

  const displayName =
    user.displayName?.trim() || user.email?.split('@')[0] || 'Profile';
  const firstName = displayName.split(/\s+/)[0];

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    setError('');
    if (returnFocus) triggerRef.current?.focus();
  }, []);

  // Reset the image error whenever the profile photo changes (e.g. after an edit)
  useEffect(() => {
    setImgError(false);
  }, [user.photoURL]);

  // Close when clicking/tapping outside the menu
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        close();
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [open, close]);

  // Move focus into the menu when it opens so keyboard users land on the first item
  useEffect(() => {
    if (open) itemRefs.current[0]?.focus();
  }, [open]);

  const handleLogout = async () => {
    setError('');
    setPending(true);
    try {
      await signOut(auth);
      setOpen(false);
      navigateTo(ROUTES.landing);
    } catch (signOutError) {
      console.error('[ProfileMenu] Sign out failed', signOutError);
      setError('Could not sign you out. Check your connection and try again.');
    } finally {
      setPending(false);
    }
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const items = itemRefs.current.filter(Boolean) as HTMLButtonElement[];
    if (items.length === 0) return;

    const currentIndex = items.findIndex((el) => el === document.activeElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        items[currentIndex < 0 ? 0 : (currentIndex + 1) % items.length]?.focus();
        break;
      case 'ArrowUp':
        event.preventDefault();
        items[
          currentIndex < 0 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length
        ]?.focus();
        break;
      case 'Home':
        event.preventDefault();
        items[0]?.focus();
        break;
      case 'End':
        event.preventDefault();
        items[items.length - 1]?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        close(true);
        break;
      case 'Tab':
        close();
        break;
      default:
        break;
    }
  };

  const menuItems: Array<{
    id: string;
    label: string;
    icon: React.ReactNode;
    onSelect: () => void;
    disabled?: boolean;
    danger?: boolean;
  }> = [
    {
      id: 'view-profile',
      label: 'View Profile',
      icon: <UserCircle className="w-4 h-4" />,
      onSelect: () => {
        close();
        onOpenProfile('view');
      },
    },
    {
      id: 'edit-profile',
      label: 'Edit Profile',
      icon: <Pencil className="w-4 h-4" />,
      onSelect: () => {
        close();
        onOpenProfile('edit');
      },
    },
    {
      id: 'find-charger',
      label: 'Find a Charger',
      icon: <MapPin className="w-4 h-4" />,
      onSelect: () => {
        close();
        navigateTo(ROUTES.findChargers);
      },
    },
    {
      id: 'logout',
      label: pending ? 'Signing out…' : 'Logout',
      icon: pending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <LogOut className="w-4 h-4" />
      ),
      onSelect: handleLogout,
      disabled: pending,
      danger: true,
    },
  ];

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        ref={triggerRef}
        type="button"
        id="profile-menu-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="profile-menu"
        aria-label={`Account menu for ${displayName}`}
        onClick={() => (open ? close() : setOpen(true))}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`inline-flex max-w-full items-center gap-2 rounded border px-1.5 py-1 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 ${
          variant === 'dark'
            ? 'border-white/15 text-white hover:border-white/25 hover:bg-white/10 focus-visible:outline-[#D8F36A]'
            : 'border-transparent hover:border-[#D8D5CA] hover:bg-[#EDE8D8] focus-visible:outline-[#173D2C]'
        }`}
      >
        {user.photoURL && !imgError ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-[#D8D5CA] shrink-0"
          />
        ) : (
          <span
            aria-hidden="true"
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#173D2C] text-[#D8F36A] inline-flex items-center justify-center text-[10px] font-bold border border-[#D8D5CA] shrink-0"
          >
            {initialsOf(user) || <User className="w-3.5 h-3.5" />}
          </span>
        )}
        <span className={`hidden sm:inline max-w-[110px] truncate text-sm font-medium ${variant === 'dark' ? 'text-white' : 'text-[#22251F]'}`}>
          {firstName}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-3.5 h-3.5 shrink-0 transition-transform ${variant === 'dark' ? 'text-white/75' : 'text-[#565A52]'} ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          id="profile-menu"
          role="menu"
          aria-labelledby="profile-menu-trigger"
          onKeyDown={handleMenuKeyDown}
          className={`absolute top-full z-50 mt-2 w-60 max-w-[calc(100vw-1.5rem)] rounded border-2 border-[#22251F] bg-[#F6F3E9] py-1.5 shadow-xl ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <div className="border-b border-[#D8D5CA] px-3 py-2">
            <p className="truncate font-display text-sm font-bold text-[#22251F]">{displayName}</p>
            <p className="truncate text-[11px] text-[#565A52]">{user.email}</p>
          </div>

          {menuItems.map((item, index) => (
            <button
              key={item.id}
              ref={(el) => { itemRefs.current[index] = el; }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={item.onSelect}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#173D2C] ${
                item.danger
                  ? 'text-[#B42318] hover:bg-[#FEE4E2]'
                  : 'text-[#22251F] hover:bg-[#EDE8D8]'
              }`}
            >
              <span aria-hidden="true" className={item.danger ? 'text-[#B42318]' : 'text-[#173D2C]'}>
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}

          {error && (
            <p role="alert" className="mt-1 border-t border-[#D8D5CA] px-3 pb-1 pt-2 text-[11px] text-[#B42318]">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
