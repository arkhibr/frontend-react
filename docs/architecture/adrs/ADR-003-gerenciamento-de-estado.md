---
source: frontend-react
processed_by: thor
date: 2026-05-24
domain: architecture
tags: [redux, react-query, estado, frontend]
status: pending_review
type: adr
adr_version: madr-v4
adr_status: accepted
source_attribution: MADR v4 (adr.github.io/madr) + arc-kit (MIT, tractorjuice)
---

# ADR-003: Tática de gerenciamento de estado

## Contexto e Problema

SPAs modernas lidam com dois tipos distintos de estado: **estado do servidor** (dados remotos com cache, revalidação e sincronização com a API) e **estado do cliente** (flags de UI, autenticação, sessão — dados que não precisam ser sincronizados com o servidor). Colocar os dois no Redux resulta em reducers complexos, lógica manual de invalidação de cache e ações de sincronização de baixo valor.

O projeto precisava de uma solução que tratasse os dois tipos de estado com as ferramentas adequadas para cada ciclo de vida.

**Pergunta-problema:** Como gerenciar estado do servidor e estado do cliente de forma que cada um use a ferramenta adequada ao seu ciclo de vida?

**Referências primárias:** https://tanstack.com/query/latest · https://redux-toolkit.js.org

## Drivers

- **Separação de responsabilidades**: estado do servidor e estado do cliente têm ciclos de vida distintos
- **Redução de código repetitivo**: lógica de carregamento, erro e revalidação não deve ser implementada manualmente em cada componente
- **Previsibilidade**: mutações de estado do cliente devem ser rastreáveis e inspecionáveis em ferramentas de desenvolvimento
- **Integração com FSD**: solução deve funcionar dentro das restrições de camada da ADR-002

### Aderência a Princípios

| Princípio | Aderência | Impacto |
|-----------|-----------|---------|
| Separação de responsabilidades | ✅ | React Query: servidor; Redux: cliente |
| Princípio da responsabilidade única | ✅ | Cada fatia Redux tem escopo bem definido |
| Não se repita (DRY) | ✅ | Lógica de carregamento centralizada no React Query |

## Stakeholders (RACI)

- **Deciders (A)**: arquiteto de software do projeto
- **Consulted (C)**: equipe de desenvolvimento front-end
- **Informed (I)**: demais membros do projeto

## Opções Consideradas

### Opção 1: Redux Toolkit + React Query (escolhida)

Redux Toolkit gerencia estado do cliente (auth, ui, session). React Query gerencia estado do servidor (requisições, cache, revalidação).

- ✅ **Prós**: separação clara de responsabilidades; React Query elimina código repetitivo de carregamento/erro; Redux oferece ferramentas de desenvolvimento (DevTools) e rastreabilidade de mutações; padrão bem documentado pela comunidade
- ❌ **Contras**: duas bibliotecas para aprender; risco de sobreposição de responsabilidades se não houver disciplina sobre o que vai em cada uma
- 💰 **Custo**: zero custo de licenciamento; ambas são código aberto

### Opção 2: Redux Toolkit + RTK Query

Usar apenas Redux Toolkit, incluindo RTK Query para estado do servidor.

- ✅ **Prós**: uma única biblioteca; integração nativa com Redux DevTools
- ❌ **Contras**: RTK Query é menos ergonômico que React Query para lógica de requisição complexa; configuração verbosa para casos como paginação e mutações otimistas

### Opção 3: Zustand + React Query

Substituir Redux por Zustand para estado do cliente.

- ✅ **Prós**: Zustand tem API mais simples que Redux
- ❌ **Contras**: sem Redux DevTools nativos para depuração de estado do cliente; menos rastreabilidade de ações

### Opção 4: Não fazer nada (baseline)

Usar apenas `useState` e `useEffect` para todo o estado.

- ✅ **Prós**: zero dependências adicionais
- ❌ **Contras**: lógica de cache, revalidação e sincronização implementada manualmente em cada componente; não escala

## Decisão

**Escolhida: Opção 1 — Redux Toolkit + React Query**

### Y-Statement

> **No contexto de** uma SPA com estado de servidor (dados remotos) e estado de cliente (auth, UI, sessão),
> **enfrentando** o problema de ciclos de vida distintos sendo tratados pela mesma ferramenta,
> **decidimos por** Redux Toolkit para estado do cliente e React Query para estado do servidor,
> **para alcançar** separação de responsabilidades e redução de código repetitivo de carregamento,
> **aceitando** a necessidade de manter disciplina sobre qual estado vai em qual ferramenta.

### Justificativa

Redux Toolkit resolve bem o que o Redux sempre resolveu (estado global síncrono, rastreável e inspecionável via DevTools), mas com muito menos código repetitivo. React Query resolve o que o Redux resolve mal (cache de dados remotos, revalidação em segundo plano, estados de carregamento e erro). A combinação das duas é um padrão amplamente adotado na comunidade React para aplicações de médio e grande porte.

## Consequências

### Positivas

- ✅ Componentes não gerenciam lógica de carregamento e erro manualmente
- ✅ Estado do cliente (autenticação, sessão) é rastreável e inspecionável no Redux DevTools
- ✅ React Query gerencia revalidação e cache automaticamente com `staleTime` configurável

### Negativas (trade-offs aceitos)

- ❌ Time precisa entender a fronteira: dados da API vão no React Query; flags e estado de sessão vão no Redux
- ❌ Risco de duplicação: estado que já está no React Query sendo copiado para Redux sem necessidade

### Neutras (mudanças necessárias)

- 🔄 Novas fatias Redux devem ser registradas em `src/shared/lib/store/index.ts`
- 🔄 Configurações de `staleTime` e `retry` do `QueryClient` devem ser revisadas conforme os contratos da API evoluem

### Riscos

| Risco | L | I | Mitigação | Owner |
|-------|---|---|-----------|-------|
| Estado do servidor duplicado no Redux | M | M | Revisão de código verifica se novos estados precisam ser cacheados | Time |
| `staleTime` inadequado causa requisições excessivas | L | M | Monitorar requisições em produção e ajustar `queryClient.ts` | Time |

## Validação

**Como será verificado que a decisão entregou o prometido?**

- [ ] Nenhuma lógica de cache manual (arrays em `useState`) para dados da API
- [ ] Ferramentas Redux DevTools mostram histórico de ações de auth e UI em desenvolvimento
- [ ] Requisições duplicadas para o mesmo endpoint ausentes nas ferramentas de rede do navegador

## Links

- ADRs relacionadas: ADR-001 (plataforma), ADR-004 (autenticação)
- Documentação: https://tanstack.com/query/latest · https://redux-toolkit.js.org

## Revisão

- Revisão inicial: 2026-11-24
- Triggers: migração de versão maior do React Query ou Redux Toolkit, adição de estado offline

## Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-05-24 | Thor | Versão inicial |
