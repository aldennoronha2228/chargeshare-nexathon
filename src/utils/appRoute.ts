export const ROUTES = {
  landing: '/',
  login: '/login',
  provider: '/provider',
} as const;

export type AppRoute = 'landing' | 'login' | 'provider';

const PATH_TO_ROUTE: Record<string, AppRoute> = {
  [ROUTES.landing]: 'landing',
  [ROUTES.login]: 'login',
  [ROUTES.provider]: 'provider',
};

/** Resolves the current URL path to one of the app's top-level routes. */
export function readAppRoute(): AppRoute {
  const path = window.location.pathname.replace(/\/+$/, '') || ROUTES.landing;
  return PATH_TO_ROUTE[path] ?? 'landing';
}

/** Client-side navigation that keeps the router state in sync. */
export function navigateTo(path: string): void {
  if (window.location.pathname === path) return;
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
