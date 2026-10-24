import handler from '../../../../lib/adminApi.js';

export default function reviewProvider(request, response) {
  return handler(request, response, `providers/${request.query.providerId}/review`);
}
