import handler from '../../lib/adminApi.js';

export default function adminGoogleSession(request, response) {
  return handler(request, response, 'google-session');
}
