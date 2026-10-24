import handler from '../../lib/adminApi.js';

export default function adminLogout(request, response) {
  return handler(request, response, 'logout');
}
