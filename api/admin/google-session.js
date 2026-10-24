import handler from '../../lib/adminApi.js';

export default function adminGoogleSession(request, response) {
  request.query = { ...request.query, path: 'google-session' };
  return handler(request, response);
}
