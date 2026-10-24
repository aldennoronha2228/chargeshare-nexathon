import handler from '../../lib/adminApi.js';

export default function adminSession(request, response) {
  return handler(request, response, 'session');
}
