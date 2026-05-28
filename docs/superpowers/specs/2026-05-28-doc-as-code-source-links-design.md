# Design: Doc as Code — Links para Código-Fonte nas Tabelas de Estrutura

## Objetivo

Aprofundar o conceito de Doc as Code adicionando links clicáveis para os arquivos de código-fonte nas tabelas "Estrutura" dos READMEs de módulo. O leitor de qualquer README pode navegar diretamente ao arquivo relevante sem precisar navegar manualmente pelo explorador de arquivos.

## Escopo

**Incluído:**
- Tabelas "Estrutura" nos READMEs de módulo: primeira coluna (nome do arquivo) vira link

**Excluído:**
- Menções inline de arquivos fora das tabelas (inline code em texto corrido e em ADRs)
- Seções "Como usar" (imports nos blocos de código permanecem como estão)
- Seções "Decisões relevantes" (links para ADRs já existem e não mudam)
- READMEs dos ADRs (`docs/architecture/adrs/`)
- `docs/architecture/README.md` e `README.md` raiz

## Convenção de Link

Caminhos **relativos ao arquivo `.md`** que contém o link:

- Arquivo simples: `[tokenStorage.ts](./tokenStorage.ts)`
- Subdiretório referenciado como entrada na tabela: `[router/](./router/)`
- Arquivo dentro de subdiretório: `[guards/AuthGuard.tsx](./guards/AuthGuard.tsx)`

Essa convenção garante portabilidade: funciona em GitHub, VS Code preview e qualquer renderizador Markdown padrão.

## Arquivos Afetados

| README | Entradas da tabela que viram links |
|--------|-----------------------------------|
| `src/shared/auth/README.md` | `tokenStorage.ts`, `tokenParser.ts`, `sessionMonitor.ts` |
| `src/shared/api/README.md` | `httpClient.ts`, `types.ts` |
| `src/shared/lib/store/README.md` | `index.ts`, `authSlice.ts`, `uiSlice.ts`, `sessionSlice.ts` |
| `src/app/README.md` | `providers/index.tsx`, `router/`, `styles/globals.css`, `styles/tokens.css` |
| `src/app/router/README.md` | `index.tsx`, `routes.ts`, `guards/AuthGuard.tsx`, `guards/GuestGuard.tsx` |
| `src/mocks/README.md` | `handlers.ts`, `browser.ts`, `server.ts` |

Total: 6 arquivos, 18 entradas linkadas.

## Exemplo de Transformação

**Antes:**
```markdown
| Arquivo/Pasta | Descrição |
|---------------|-----------|
| `tokenStorage.ts` | Interface de leitura/escrita/limpeza do token em `sessionStorage` |
| `tokenParser.ts` | Decodifica o payload JWT e verifica expiração pelo relógio do cliente |
| `sessionMonitor.ts` | Inicia/para o monitoramento proativo de expiração via `setInterval` (60s) |
```

**Depois:**
```markdown
| Arquivo/Pasta | Descrição |
|---------------|-----------|
| [`tokenStorage.ts`](./tokenStorage.ts) | Interface de leitura/escrita/limpeza do token em `sessionStorage` |
| [`tokenParser.ts`](./tokenParser.ts) | Decodifica o payload JWT e verifica expiração pelo relógio do cliente |
| [`sessionMonitor.ts`](./sessionMonitor.ts) | Inicia/para o monitoramento proativo de expiração via `setInterval` (60s) |
```

O nome do arquivo mantém a formatação de inline code dentro do link para preservar a semântica visual de "isto é um identificador de arquivo".

## Critérios de Sucesso

- Cada entrada na primeira coluna das tabelas "Estrutura" é um link Markdown válido
- Clicar no link em VS Code ou GitHub navega para o arquivo/pasta correto
- Nenhum outro conteúdo dos READMEs é alterado
- Todos os arquivos referenciados existem no repositório
