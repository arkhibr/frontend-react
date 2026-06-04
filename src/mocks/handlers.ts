import { http, HttpResponse } from 'msw'
import { TEST_TOKEN } from '@/shared/auth/testToken'

export { TEST_TOKEN }

export const handlers = [
  http.post('/auth/token', async ({ request }) => {
    const { email, senha } = (await request.json()) as { email?: string; senha?: string }
    if (email === 'usuario@teste.com' && senha === 'senha123') {
      return HttpResponse.json({ access_token: TEST_TOKEN })
    }
    return new HttpResponse(null, { status: 401 })
  }),
  http.get('/usuario/endereco', () =>
    HttpResponse.json({ cep: '01001000', logradouro: 'Praça da Sé', numero: '1' }),
  ),
  http.put('/usuario/endereco', async ({ request }) =>
    HttpResponse.json(await request.json()),
  ),
  http.get('/usuario/emprestimo', () =>
    HttpResponse.json({ valor: '10000', parcelas: '12' }),
  ),
  http.put('/usuario/emprestimo', async ({ request }) =>
    HttpResponse.json(await request.json()),
  ),
]
