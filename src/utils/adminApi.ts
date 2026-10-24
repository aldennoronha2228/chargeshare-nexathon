const ADMIN_API_CONNECTION_MESSAGE = 'Cannot reach the admin server. In development, run npm run dev from the chargeshare-nexathon folder and open http://localhost:3001/admin. If port 3001 is occupied, stop the older server first.';

export function getAdminApiError(error: unknown, fallback: string): string {
  if (error instanceof TypeError && /failed to fetch|networkerror|load failed/i.test(error.message)) {
    return ADMIN_API_CONNECTION_MESSAGE;
  }
  return error instanceof Error ? error.message : fallback;
}
