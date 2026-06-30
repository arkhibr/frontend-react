// tests/perf/perf.setup.ts
// Projeto de setup do perf: garante que os bundles dos MFEs estão publicados
// no LocalStack antes de medir. Sem isto, o import() do MFE devolve 404 e o
// teste falha de forma opaca (timeout de 30s no seletor) em vez de apontar a
// causa real. Rodado automaticamente como dependência do projeto `perf`.
import { test, expect } from '@playwright/test'
import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const LOCALSTACK_HEALTH = 'http://localhost:4566/_localstack/health'

const MFES = [
  {
    dir: 'mfes/endereco',
    dist: 'mfes/endereco/dist/endereco.js',
    bundle: 'http://localhost:4566/mfe-endereco/endereco.js',
  },
  {
    dir: 'mfes/emprestimo',
    dist: 'mfes/emprestimo/dist/emprestimo.js',
    bundle: 'http://localhost:4566/mfe-emprestimo/emprestimo.js',
  },
]

test('perf-setup: publica e valida os bundles dos MFEs no LocalStack', async () => {
  const health = await fetch(LOCALSTACK_HEALTH).catch(() => null)
  if (!health?.ok) {
    throw new Error(
      `[perf-setup] LocalStack não respondeu em ${LOCALSTACK_HEALTH}. ` +
        'Suba a infraestrutura (docker compose up -d) antes de rodar npm run test:perf.',
    )
  }

  for (const mfe of MFES) {
    if (!existsSync(resolve(mfe.dist))) {
      process.stdout.write(`[perf-setup] dist ausente — compilando ${mfe.dir}…\n`)
      execSync('npm run build', { cwd: mfe.dir, stdio: 'inherit' })
    }
    process.stdout.write(`[perf-setup] publicando ${mfe.dir}…\n`)
    execSync('npm run deploy', { cwd: mfe.dir, stdio: 'inherit' })

    const res = await fetch(mfe.bundle)
    expect(res.status, `bundle ${mfe.bundle} deveria responder 200 após o deploy`).toBe(200)
  }
})
