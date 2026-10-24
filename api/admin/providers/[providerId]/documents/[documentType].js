import handler from '../../../../../lib/adminApi.js';

export default function providerDocument(request, response) {
  request.query = {
    ...request.query,
    path: `providers/${request.query.providerId}/documents/${request.query.documentType}`,
  };
  return handler(request, response);
}
