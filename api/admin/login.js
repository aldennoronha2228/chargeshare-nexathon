import handler from '../../lib/adminApi.js';

export default function adminLogin(request, response) {
  return handler(request, response, 'login');
}
