import handler from '../../../../../lib/adminApi.js';

export default function providerDocument(request, response) {
  return handler(request, response, `providers/${request.query.providerId}/documents/${request.query.documentType}`);
}
