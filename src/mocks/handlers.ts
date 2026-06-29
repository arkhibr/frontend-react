import { http, HttpResponse } from 'msw'
import { TEST_TOKEN } from '@/shared/auth/testToken'
import { emprestimoHandlers } from './handlers/emprestimo'

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
  // Coletor de violações de CSP em dev: o navegador faz POST para o
  // endpoint de Reporting-Endpoints (/__csp-report). Loga e responde 204.
  http.post('/__csp-report', async ({ request }) => {
    const body = await request.text()
    console.warn('[csp-report]', body)
    return new HttpResponse(null, { status: 204 })
  }),
  ...emprestimoHandlers,
]
