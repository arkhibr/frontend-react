import css from './theme.css?raw'

export function injectTheme(host: HTMLElement): () => void {
  const style = document.createElement('style')
  style.setAttribute('data-emprestimo-theme', '')
  style.textContent = css
  host.prepend(style)
  return () => style.remove()
}
