# ADR-017: Contrato de tipos entre MFE e BFF via Hono RPC

> **Status: Proposta — submetida, aguardando aprovação dos Deciders (RACI abaixo). Nenhum código foi alterado para esta ADR.**

## Contexto e Problema

Cada MFE (`mfes/endereco`, `mfes/emprestimo`) mantém sua própria cópia manual do contrato de resposta do BFF que consome — um `domain.ts` no MFE que espelha, campo a campo, o `domain.ts`/`transform.ts` do BFF de origem. Na topologia atual cada MFE consome um único BFF homônimo, mas a relação MFE↔BFF não é 1:1 (ver ADR-015, Atualização 1.2): um MFE pode consumir mais de um BFF. Onde este documento fala do "BFF correspondente", leia-se "cada BFF que o MFE consome" — o mecanismo abaixo (um `contract.ts` por BFF, um alias por BFF consumido) se aplica igual, um alias por BFF em vez de exatamente um por MFE. Essa duplicação é proposital (ADR-009: "MFE autônomo, sem dependências entre si" — nem o `httpClient.ts` do shell é compartilhado com os MFEs, cada um mantém sua própria cópia), mas tem um custo: nenhum sinal de compilação avisa quando o BFF muda o formato de uma resposta. Um campo renomeado ou removido no BFF só aparece como bug em runtime no MFE, potencialmente em produção.

A ADR-016 (Hono como framework web de Gateway e BFFs) tornou essa lacuna, pela primeira vez, endereçável sem dependência nova: Hono expõe nativamente um cliente tipado (`hc()`) que infere o contrato de um app Hono a partir do próprio tipo TypeScript da instância, sem exigir schema paralelo (OpenAPI, GraphQL SDL) nem framework adicional (tRPC).

**Pergunta-problema:** Como fechar a lacuna de sincronização manual de tipos entre MFE e BFF sem reintroduzir o acoplamento de runtime que a ADR-008/009 eliminou, e sem alterar o modelo de transporte HTTP/REST que o Gateway já audita e limita por rota (ADR-015)?

## Drivers

- **Dessincronia silenciosa**: hoje nada impede que `domain.ts` do MFE e do BFF divirjam sem aviso em tempo de build.
- **Tipagem de primeira classe do Hono**: driver já citado na ADR-016 — esta ADR é a primeira a colher esse benefício concretamente.
- **Autonomia de runtime do MFE (ADR-008/009)**: qualquer solução não pode adicionar bytes do BFF ao bundle publicado no S3.
- **Modelo de auditoria/rate-limit do Gateway (ADR-015)**: continua discriminando por método HTTP + path de uma rota REST — uma solução que agrupe (`batch`) múltiplas chamadas num único endpoint quebraria isso.
- **Zero dependência nova**: o projeto já paga o custo de adoção do Hono (ADR-016); a solução não deveria exigir mais uma biblioteca de RPC.

### Aderência a Princípios

| Princípio | Aderência | Impacto |
|-----------|-----------|---------|
| Tipagem de ponta a ponta | ✅ | Elimina a duplicação manual de `domain.ts` entre MFE e BFF |
| Autonomia de runtime do MFE (ADR-008/009) | ✅ | O tipo é `import type`, apagado na compilação — zero byte do BFF no bundle publicado |
| Build independente por MFE (ADR-011) | ⚠️ | O build (checagem de tipo) do MFE passa a exigir o código-fonte **e as dependências instaladas** do BFF correspondente — novo acoplamento, só em build, não em runtime |
| Consistência com o modelo de auditoria do Gateway (ADR-015) | ✅ | Continua HTTP/REST simples, uma requisição por chamada — nada muda no Gateway |

## Stakeholders (RACI)

- **Deciders (A)**: arquiteto de software do projeto
- **Consulted (C)**: equipe de plataforma, equipes donas dos MFEs (endereço, empréstimo)
- **Informed (I)**: demais membros do projeto

## Opções Consideradas

### Opção 1: Hono RPC (`hc()`) + `contract.ts` por BFF via alias de caminho — escolhida

Cada BFF passa a exportar `bffs/<nome>/src/contract.ts` com `export type AppType = typeof app`. Para que esse tipo carregue informação de rota (não apenas `Hono<Env>` genérico), `app.ts` e cada arquivo de rota (`routes/*.ts`) precisam adotar encadeamento fluente (`new Hono().get(...).post(...)`, retornado diretamente, sem anotação de retorno `: Hono<Env>` que apague o tipo específico). O MFE ganha um alias de caminho (`tsconfig.json` `paths` + `vite.config.ts` `resolve.alias`, no mesmo padrão do `@/*` que cada MFE já usa para si mesmo) apontando para esse `contract.ts`; `endpoints.ts` troca o `client<T>(url)` manual por `hc<AppType>(baseUrl, { fetch: fetchCustomizado })`, onde o `fetch` customizado é o ponto de extensão onde hoje o `httpClient.ts` injeta o Bearer e trata 401. Sem pacote publicado, sem registry — é só um `import type` relativo, viável porque BFF e MFE vivem no mesmo repositório.

- ✅ **Prós**: fecha a lacuna de dessincronia com erro de compilação; zero dependência nova (Hono já é framework do projeto); continua HTTP/REST simples, sem impacto no Gateway; tipo apagado em build, sem custo de bundle/runtime
- ❌ **Contras**: exige refactor de `app.ts` e de todo arquivo de rota nos dois BFFs (encadeamento fluente); build do MFE passa a depender de `node_modules` do BFF correspondente instalado (novo passo de CI); `hc()` não lança exceção em erro HTTP como o `httpClient.ts` atual — exige um wrapper fino para preservar o `throw ApiError`/tratamento de 401 existente
- 💰 **Custo**: refactor único dos dois BFFs (encadeamento) e dos dois MFEs (`endpoints.ts` + alias); um passo a mais de instalação de dependências na esteira de CI do MFE, permanente

### Opção 2: tRPC

Adotar tRPC como camada de RPC entre MFE e BFF, com `@trpc/server` (montado dentro do Hono via adaptador) e `@trpc/client` no MFE.

- ✅ **Prós**: tipagem de ponta a ponta equivalente à Opção 1; ecossistema maduro, mais anos de mercado
- ❌ **Contras**: exige exatamente a mesma dependência de tipo compartilhado entre MFE e BFF que a Opção 1 (não resolve, só reproduz, a tensão com a ADR-009/011) — mas paga esse custo *e* adiciona duas dependências novas (`@trpc/server`, `@trpc/client`) para um problema que o Hono já resolve nativamente; o padrão de transporte usual de tRPC (`httpBatchLink`) agrupa várias chamadas de procedimento num único endpoint HTTP, o que quebraria o modelo de auditoria/rate-limit por rota do Gateway (ADR-015) a menos que se desative o batching, abrindo mão de uma das vantagens de performance mais citadas do tRPC
- **Conclusão**: mesmo custo arquitetural da Opção 1, com dependências a mais e risco a mais no transporte. Descartada.

### Opção 3: Status quo — tipos duplicados à mão (baseline)

Manter `domain.ts` mantido manualmente em cada lado, como hoje.

- ✅ **Prós**: zero esforço, zero risco, zero mudança
- ❌ **Contras**: a dessincronia silenciosa entre MFE e BFF continua sem nenhum sinal de compilação

## Decisão

**Escolhida: Opção 1 — Hono RPC (`hc()`) com `contract.ts` por BFF, consumido via `import type` e alias de caminho no MFE, sem pacote publicado.**

### Y-Statement

> **No contexto de** dois BFFs e seus MFEs que hoje duplicam manualmente o contrato de tipos de resposta, sem nenhum sinal de compilação quando divergem,
> **enfrentando** o risco de dessincronia silenciosa entre o que o BFF retorna e o que o MFE espera, sem querer pagar o custo de uma nova dependência de framework RPC,
> **decidimos por** expor o tipo de rota de cada BFF (`AppType`) via um `contract.ts` dedicado, consumido pelo MFE através do cliente nativo `hc()` do Hono e de um alias de caminho `import type` — sem pacote publicado, sem registry,
> **para alcançar** tipagem de ponta a ponta sem duplicação manual, sem alterar o modelo de transporte HTTP/REST que o Gateway já audita e limita por rota,
> **aceitando** que o build (checagem de tipo) do MFE passe a depender do código-fonte e das dependências instaladas do BFF correspondente, e que `app.ts` e os arquivos de rota de cada BFF precisem adotar encadeamento fluente para preservar a inferência de tipo.

### Justificativa

A Opção 1 é a única que resolve a dessincronia sem introduzir uma dependência de framework nova: ela colhe um driver que a própria ADR-016 já havia citado (tipagem de primeira classe do Hono) em vez de pagar por ele sem usar. Contra a Opção 2 (tRPC): ambas pagam o mesmo custo arquitetural — tipo compartilhado entre MFE e BFF, a mesma tensão com a autonomia de build da ADR-011 —, mas tRPC soma duas dependências novas e um modelo de transporte (batching) que não foi desenhado pensando no Gateway de auditoria/rate-limit por rota deste projeto. Contra a Opção 3 (baseline): o custo de não fazer nada é silencioso e cresce junto com o número de endpoints — hoje são ~17 endpoints somando os dois BFFs, e cada um é um ponto cego de sincronização.

A dependência de build introduzida (o MFE precisa do BFF correspondente com dependências instaladas para checar tipo) é uma tensão real com a ADR-011, não uma tensão aparente — por isso está registrada como Neutra/Risco abaixo, não escondida. Ela é aceita porque é estritamente uma dependência de **build**, nunca de **runtime**: o bundle publicado no S3 (ADR-008) não ganha nenhum byte do BFF.

## Consequências

### Positivas

- ✅ Erro de compilação no MFE quando o BFF muda um campo de resposta — a dessincronia deixa de ser silenciosa
- ✅ `domain.ts` do MFE reduz escopo: só sobra o que o MFE inventa por conta própria (view-models locais), não mais o espelho do contrato do BFF
- ✅ Zero dependência de framework nova — usa o que a ADR-016 já trouxe

### Negativas (trade-offs aceitos)

- ❌ Refactor de `app.ts` e de todo arquivo de rota nos dois BFFs, para encadeamento fluente
- ❌ Build do MFE passa a depender de `node_modules` do BFF correspondente instalado — novo passo permanente na esteira de CI
- ❌ Wrapper de erro próprio necessário: `hc()` não lança exceção em resposta não-2xx como o `httpClient.ts` atual

### Neutras (mudanças necessárias)

- 🔄 ADR-009 e ADR-011 recebem nota de atualização apontando esta ADR como a origem da nova dependência de build-time entre MFE e BFF (autonomia de *runtime* preservada, autonomia de *build* parcialmente cedida)
- 🔄 `mfes/<nome>/tsconfig.json` e `vite.config.ts` ganham um alias novo (`@bff-<nome>/contract`), no mesmo padrão do `@/*` que cada MFE já usa

### Riscos

| Risco | L | I | Mitigação | Owner |
|-------|---|---|-----------|-------|
| Inferência de tipo do `hc()` não bater com o `domain.ts` atual (ex.: campo `Date` virando `string` na serialização, uma pegadinha conhecida do Hono RPC) | M | M | Prova de conceito no BFF `endereco` (2 rotas) antes de aplicar ao `emprestimo` (5 áreas de domínio) | Plataforma |
| CI que builda só o MFE falha por falta de `node_modules` do BFF correspondente | M | M | Adicionar passo de instalação do BFF correspondente na esteira do MFE, documentado nesta ADR | Plataforma |
| Encadeamento fluente exigido diverge do estilo recém-estabelecido pela migração Hono (ADR-016), que não encadeava | L | L | Escopo limitado a `app.ts` e arquivos de rota; `domain.ts`/`transform.ts`/`legacyBackend.ts` não mudam | Arquiteto |

## Validação

- [ ] `hc<AppType>` no MFE `endereco` infere exatamente os mesmos campos que `domain.ts` declara à mão hoje, sem cast manual
- [ ] Nenhum campo `Date` vira `string` sem ajuste explícito e documentado no tipo inferido
- [ ] Build do MFE `endereco` falha com erro de tipo se o BFF renomear um campo de resposta (teste deliberado de regressão)
- [ ] Wrapper de erro reproduz o `throw ApiError(401)` e o evento `auth:unauthorized` do `httpClient.ts` atual
- [ ] Testes MSW existentes (MFE e shell) continuam passando sem alteração
- [ ] CI builda o MFE `endereco` com sucesso após adicionar o passo de instalação de dependências do `bff-endereco` correspondente

## Links

- Código: nenhum ainda — esta ADR está em fase de proposta, sem implementação
- ADRs relacionadas: ADR-016 (Hono como framework web — pré-requisito técnico direto desta decisão), ADR-008 (microfrontends dinâmicos), ADR-009 (contrato `mount`/`unmount` — recebe nota de atualização), ADR-011 (build independente e deploy de MFEs — recebe nota de atualização), ADR-015 (Gateway de API com BFFs — modelo de auditoria/rate-limit por rota que esta ADR preserva)

## Revisão

- Revisão futura: 2026-10-15
- Triggers: prova de conceito no `endereco` não bater tipos de forma satisfatória, esteira de CI ficar lenta demais com o passo adicional, terceiro BFF/MFE adicionado à plataforma

## Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-07-15 | Marco Mendes | Versão inicial — proposta, aguardando aprovação |
| 1.1 | 2026-08-01 | Marco Mendes | Esclarece que a relação MFE↔BFF não é 1:1; "BFF correspondente" = cada BFF consumido pelo MFE (um alias por BFF) |
