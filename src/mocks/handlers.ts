import { http, HttpResponse } from 'msw'
import { TEST_TOKEN } from '@/shared/auth/testToken'

export { TEST_TOKEN }

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
