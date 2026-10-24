import handler from '../../lib/adminApi.js';

export default function adminData(request, response) {
  return handler(request, response, 'data');
}
