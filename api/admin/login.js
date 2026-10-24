import handler from '../../lib/adminApi.js';

export default function adminLogin(request, response) {
  request.query = { ...request.query, path: 'login' };
  return handler(request, response);
}
