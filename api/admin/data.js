import handler from '../../lib/adminApi.js';

export default function adminData(request, response) {
  request.query = { ...request.query, path: 'data' };
  return handler(request, response);
}
