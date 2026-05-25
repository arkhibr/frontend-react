/**
 * Configuração externa da aplicação.
 *
 * O arquivo public/config.json é carregado em runtime, permitindo que um único
 * build sirva múltiplos ambientes sem recompilação. Em dev, valores ausentes
 * recaem nas variáveis de ambiente Vite.
 *
 * Campos suportados:
 *   apiUrl        — URL base da API (sobrescreve VITE_API_BASE_URL)
 *   primaryColor  — cor primária aplicada como CSS var --color-primary
 *   secondaryColor — cor secundária aplicada como CSS var --color-secondary
 */

type AppConfig = {
  apiUrl?: string
  primaryColor?: string
  secondaryColor?: string
}

let _config: AppConfig = {}

/**
 * Retorna a URL base da API.
 * Prioridade: config.json › VITE_API_BASE_URL › ''
 */
export function getApiUrl(): string {
  return _config.apiUrl || (import.meta.env.VITE_API_BASE_URL as string | undefined) || ''
}

/**
 * Carrega public/config.json e aplica os valores.
 * Falha rápido se o arquivo existe mas é JSON inválido.
 * Ignorado silenciosamente se o arquivo não estiver presente (dev local).
 */
export async function loadConfig(): Promise<void> {
  let data: AppConfig

  try {
    const res = await fetch('/config.json')
    if (!res.ok) return
    data = (await res.json()) as AppConfig
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`[config] /config.json inválido: ${String(err)}`, { cause: err })
    }
    // Arquivo ausente ou erro de rede — usa variáveis de ambiente como fallback
    return
  }

  _config = data

  const root = document.documentElement
  if (data.primaryColor) root.style.setProperty('--color-primary', data.primaryColor)
  if (data.secondaryColor) root.style.setProperty('--color-secondary', data.secondaryColor)
}
