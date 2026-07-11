// scripts/deploy.ts
// Deploy de raiz: publica os bundles de todos os MFEs no LocalStack S3.
// Feito para rodar num ambiente limpo (clone recém-feito): garante a infra no
// ar, instala as deps de cada MFE se faltarem, compila e delega o upload ao
// script de deploy do próprio MFE, validando que o bundle responde 200.
import { execSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const ENDPOINT = process.env.S3_ENDPOINT ?? 'http://localhost:4566'
const HEALTH = `${ENDPOINT}/_localstack/health`
const COMPOSE_FILE = 'infra/docker-compose.yml'
const READY_TIMEOUT_MS = 60_000
const POLL_STEP_MS = 2_000
const MANIFEST_PATH = 'public/mfe-manifest.json'

const MFES = [
  // endereco primeiro: emprestimo declara dependsOn: ["endereco"] no manifesto.
  { id: 'endereco', dir: 'mfes/endereco', bucket: 'mfe-endereco', file: 'endereco.js' },
  { id: 'emprestimo', dir: 'mfes/emprestimo', bucket: 'mfe-emprestimo', file: 'emprestimo.js' },
]

type Manifest = {
  schemaVersion: number
  mfes: Array<{ id: string; integrity: string }>
}

function run(cmd: string, cwd?: string): void {
  execSync(cmd, { cwd, stdio: 'inherit' })
}

async function isHealthy(): Promise<boolean> {
  const res = await fetch(HEALTH).catch(() => null)
  return Boolean(res?.ok)
}

async function ensureLocalStack(): Promise<void> {
  if (await isHealthy()) {
    console.log(`✓ LocalStack no ar em ${ENDPOINT}`)
    return
  }

  console.log('LocalStack fora do ar — subindo via docker compose…')
  try {
    run(`docker compose -f ${COMPOSE_FILE} up -d`)
  } catch {
    throw new Error(
      'Não foi possível subir o LocalStack. Verifique se o Docker está instalado e rodando, ' +
        `ou suba a infra manualmente: docker compose -f ${COMPOSE_FILE} up -d`,
    )
  }

  for (let waited = 0; waited < READY_TIMEOUT_MS; waited += POLL_STEP_MS) {
    if (await isHealthy()) {
      console.log(`✓ LocalStack pronto em ${ENDPOINT}`)
      return
    }
    await sleep(POLL_STEP_MS)
  }
  throw new Error(
    `LocalStack subiu mas não respondeu healthy em ${READY_TIMEOUT_MS / 1000}s (${HEALTH}).`,
  )
}

async function deployMfe(mfe: (typeof MFES)[number]): Promise<void> {
  console.log(`\n▶ ${mfe.dir}`)
  if (!existsSync(`${mfe.dir}/node_modules`)) {
    console.log('  node_modules ausente — npm ci…')
    run('npm ci', mfe.dir)
  }
  run('npm run build', mfe.dir)
  run('npm run deploy', mfe.dir)

  const url = `${ENDPOINT}/${mfe.bucket}/${mfe.file}`
  const res = await fetch(url).catch(() => null)
  if (!res?.ok) {
    throw new Error(
      `Validação falhou: ${url} respondeu ${res?.status ?? 'sem resposta'} após o deploy.`,
    )
  }
  console.log(`  ✓ publicado e validado: ${url}`)
  updateManifestIntegrity(mfe)
}

function updateManifestIntegrity(mfe: (typeof MFES)[number]): void {
  const bundlePath = `${mfe.dir}/dist/${mfe.file}`
  const integrity = `sha256-${createHash('sha256').update(readFileSync(bundlePath)).digest('base64')}`
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) as Manifest
  const entry = manifest.mfes.find((item) => item.id === mfe.id)
  if (!entry) throw new Error(`Manifesto não possui entrada para o MFE "${mfe.id}".`)

  entry.integrity = integrity
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(`  ✓ manifesto atualizado: ${mfe.id} → ${integrity}`)
}

async function main(): Promise<void> {
  await ensureLocalStack()
  for (const mfe of MFES) {
    await deployMfe(mfe)
  }
  console.log(`\n✅ deploy concluído: ${MFES.length} MFEs publicados em ${ENDPOINT}`)
}

main().catch((e) => {
  console.error(`\n❌ ${e instanceof Error ? e.message : e}`)
  process.exit(1)
})
