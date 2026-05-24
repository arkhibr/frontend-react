import { http, HttpResponse } from 'msw'

// Test token: { sub: 'user1', exp: 9999999999, iat: 1700000000 }
export const TEST_TOKEN =
  'eyJhbGciOiJSUzI1NiJ9' +
  '.eyJzdWIiOiJ1c2VyMSIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzAwMDAwMDAwfQ' +
  '.signature'

export const handlers = [
  http.post('/auth/token', () =>
    HttpResponse.json({ access_token: TEST_TOKEN }),
  ),
]
