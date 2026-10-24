export const ROUTES = {
  landing: '/',
  login: '/login',
  provider: '/provider',
  findChargers: '/find-chargers',
  clientBookings: '/client/bookings',
  clientActivity: '/client/activity',
  clientProfile: '/client/profile',
  admin: '/admin',
} as const;

export type AppRoute = 'landing' | 'login' | 'provider' | 'findChargers' | 'clientBookings' | 'clientActivity' | 'clientProfile' | 'admin';

const PATH_TO_ROUTE: Record<string, AppRoute> = {
  [ROUTES.landing]: 'landing',
  [ROUTES.login]: 'login',
  [ROUTES.provider]: 'provider',
  [ROUTES.findChargers]: 'findChargers',
  [ROUTES.clientBookings]: 'clientBookings',
  [ROUTES.clientActivity]: 'clientActivity',
  [ROUTES.clientProfile]: 'clientProfile',
  [ROUTES.admin]: 'admin',
};

/** In-app paths that are allowed to be used as a post-login destination. */
const INTERNAL_PATHS = new Set<string>(Object.values(ROUTES));

/** Resolves the current URL path to one of the app's top-level routes. */
export function readAppRoute(): AppRoute {
  const path = window.location.pathname.replace(/\/+$/, '') || ROUTES.landing;
  return PATH_TO_ROUTE[path] ?? 'landing';
}

/** Reads the safe destination path */
export function readSafeRedirectPath(): string | null {
  try {
    const next = new URLSearchParams(window.location.search).get('next');
    if (!next) return null;
    const value = next.trim();
    if (!value.startsWith('/') || value.startsWith('//')) return null;
    const path = value.replace(/\/+$/, '') || ROUTES.landing;
    return INTERNAL_PATHS.has(path) ? path : null;
  } catch {
    return null;
  }
}
/** Builds a login URL that restores `destination` after a successful sign-in. */
export function buildLoginPath(destination?: string): string {
  if (!destination || !INTERNAL_PATHS.has(destination)) return ROUTES.login;
  return `${ROUTES.login}?next=${encodeURIComponent(destination)}`;
}

/** Client-side navigation that keeps the router state in sync. */
export function navigateTo(path: string): void {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

export function replaceTo(path: string): void {
  if (window.location.pathname === path) return;
  window.history.replaceState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
