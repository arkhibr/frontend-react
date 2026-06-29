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
  // espera o MFE montar (div com conteúdo) e o measure total existir
  await page.waitForSelector(`[data-mfe="${target.id}"] *`, { timeout: 30_000 })
  await page.waitForFunction(
    (id) => performance.getEntriesByName(`mfe:${id}:total`, 'measure').length > 0,
    target.id,
    { timeout: 30_000 },
  )
  const sample = await readSample(page, target.id)
  await page.close()
  return sample
}

for (const target of TARGETS) {
  test(`perf: carga dinâmica de ${target.id}`, async ({ browser }) => {
    test.setTimeout(180_000)
    const rows: { profile: string; samples: Sample[] }[] = []
    for (const profile of PROFILES) {
      const samples: Sample[] = []
      for (let i = 0; i < RUNS_PER_CELL; i++) {
        const context = await browser.newContext() // contexto novo => módulo e cache frios
        try {
          samples.push(await measureOnce(context, profile, target))
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
