import handler from '../../../../lib/adminApi.js';

export default function reviewProvider(request, response) {
  request.query = { ...request.query, path: `providers/${request.query.providerId}/review` };
  return handler(request, response);
}
