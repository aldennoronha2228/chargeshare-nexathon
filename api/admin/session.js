import handler from '../../lib/adminApi.js';

export default function adminSession(request, response) {
  request.query = { ...request.query, path: 'session' };
  return handler(request, response);
}
