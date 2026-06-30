// tests/perf/mfe-load.perf.ts
import { test } from '@playwright/test'
import type { BrowserContext, Page } from '@playwright/test'
import { seedSession } from '../e2e/support/auth'
import { PROFILES, TARGETS, RUNS_PER_CELL, PHASES, type NetworkProfile } from './profiles'
import { printReport, type Sample } from './report'

test.use({ serviceWorkers: 'block' })

/** Lê os measures mfe:<id>:<phase> da timeline da página. */
async function readSample(page: Page, id: string): Promise<Sample> {
  return page.evaluate((mfeId) => {
    const out: Record<string, number> = {}
    for (const m of performance.getEntriesByType('measure')) {
      const prefix = `mfe:${mfeId}:`
      if (m.name.startsWith(prefix)) out[m.name.slice(prefix.length)] = m.duration
    }
    return out
  }, id)
}

/** Uma medição fria: contexto novo, cache desabilitado, rede emulada, navega e lê. */
async function measureOnce(
  context: BrowserContext,
  profile: NetworkProfile,
  target: { id: string; route: string },
): Promise<Sample> {
  const page = await context.newPage()
  const client = await context.newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Network.setCacheDisabled', { cacheDisabled: true })
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: profile.downloadThroughput,
    uploadThroughput: profile.uploadThroughput,
    latency: profile.latency,
  })
  await seedSession(page)
  await page.goto(target.route)
  // espera o MFE montar (host com filhos) e o measure total existir.
  // `state: 'attached'` em vez do default 'visible': MFEs que pré-injetam um
  // <style> como primeiro filho (contrato visual da ADR-014, ex.: emprestimo)
  // fariam o selector default esperar a visibilidade de um <style> — que nunca
  // fica visível — e estourar o timeout. O sinal real de "montou" é o measure
  // mfe:<id>:total logo abaixo; aqui só garantimos que o host ganhou conteúdo.
  // Timeout folgado: sob Slow 3G a carga a frio do shell + bundle passa de 30s.
  await page.waitForSelector(`[data-mfe="${target.id}"] *`, {
    state: 'attached',
    timeout: 120_000,
  })
  await page.waitForFunction(
    (id) => performance.getEntriesByName(`mfe:${id}:total`, 'measure').length > 0,
    target.id,
    { timeout: 120_000 },
  )
  const sample = await readSample(page, target.id)
  await page.close()
  return sample
}

/** Escreve uma linha de progresso direto no stdout (visível no reporter list, ao vivo). */
function progress(line: string): void {
  process.stdout.write(`${line}\n`)
}

for (const target of TARGETS) {
  test(`perf: carga dinâmica de ${target.id}`, async ({ browser }) => {
    // Suite de carga a frio sob 4 perfis de rede: cada execução refaz o grafo
    // de módulos do zero (cache desabilitado), então é legitimamente demorado.
    test.setTimeout(900_000)
    const total = PROFILES.length * RUNS_PER_CELL
    progress(
      `\n▶ PERF ${target.id}: ${PROFILES.length} perfis × ${RUNS_PER_CELL} execuções = ${total} cenários (carga a frio, cache desabilitado)`,
    )
    const rows: { profile: string; samples: Sample[] }[] = []
    let done = 0
    for (const profile of PROFILES) {
      progress(`  • ${profile.name}`)
      const samples: Sample[] = []
      for (let i = 0; i < RUNS_PER_CELL; i++) {
        const context = await browser.newContext() // contexto novo => módulo e cache frios
        try {
          const sample = await measureOnce(context, profile, target)
          samples.push(sample)
          done++
          progress(
            `    [${done}/${total}] ${profile.name} ${i + 1}/${RUNS_PER_CELL} — total ${Math.round(sample.total ?? 0)} ms`,
          )
        } finally {
          await context.close()
        }
      }
      rows.push({ profile: profile.name, samples })
    }
    printReport(target.id, rows)
  })
}

void PHASES // documenta as fases lidas; a leitura é dinâmica em readSample
