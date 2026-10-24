import handler from '../../lib/adminApi.js';

export default function adminLogout(request, response) {
  request.query = { ...request.query, path: 'logout' };
  return handler(request, response);
}
