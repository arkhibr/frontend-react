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
  http.get('/usuario/endereco', () =>
    HttpResponse.json({ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' }),
  ),
  http.put('/usuario/endereco', async ({ request }) =>
    HttpResponse.json(await request.json()),
  ),
]
