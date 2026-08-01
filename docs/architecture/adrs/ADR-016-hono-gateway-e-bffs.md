# ADR-016: Hono como framework web de Gateway e BFFs

## Contexto e Problema

Desde a ADR-015, a plataforma opera um Gateway de API e um conjunto de BFFs (Backend for Frontend) — hoje um por MFE, embora a relação MFE↔BFF não seja 1:1 (ADR-015, Atualização 1.2) —, todos implementados em **Express 5** sobre Node.js. O Gateway depende de `express`, `cors`, `express-rate-limit` e `http-proxy-middleware`; os BFFs (`bffs/endereco`, `bffs/emprestimo`) dependem apenas de `express`. Essas dependências são específicas do modelo `req`/`res` do Express — `http-proxy-middleware`, em particular, só existe para adaptar um proxy reverso a esse modelo, e `express-rate-limit` embute sua própria noção de `Request`/`Response` do Express.

O cliente solicitou a padronização do framework web da plataforma em **Hono**. Avaliado tecnicamente, o pedido se sustenta por méritos próprios, independentes de quem o solicitou: Hono é construído sobre Web Standards (`Request`/`Response`/`fetch` nativos, sem camada de compatibilidade sobre o `http` do Node), tem núcleo com zero dependências e poucos KB (Express, via `body-parser`/`finalhandler`/`send` etc., carrega uma árvore de dependências transitivas bem maior), usa um roteador otimizado (`RegExpRouter`) citado pelo próprio benchmark do projeto como um dos mais rápidos entre frameworks compatíveis com Node, e nasce com tipagem de rotas e contexto de primeira classe — relevante num monorepo 100% TypeScript como este. Hono também traz nativamente boa parte do que hoje só existe no Gateway via dependência de terceiro (CORS, cabeçalhos de segurança, ETag, compressão, JWT), reduzindo a superfície de dependências externas do próprio framework.

**Pergunta-problema:** Como substituir Express por Hono nos três serviços (Gateway, BFF-empréstimo, BFF-endereço) sem perder nenhuma das garantias já estabelecidas pela ADR-015 — autenticação na borda, auditoria, controle de tráfego e contrato de proxy — e sem exigir mudança de runtime ou de infraestrutura de deploy?

## Drivers

- **Performance e pegada mínima**: núcleo do Hono sem dependências, poucos KB, roteador `RegExpRouter` otimizado para casos como os deste Gateway (poucas rotas, prefixos fixos por BFF) — menos overhead por requisição que a cadeia de middlewares do Express.
- **Web Standards nativos**: Hono opera diretamente sobre `Request`/`Response`/`fetch`, o mesmo vocabulário já usado no `src/shared/api/` do front-end (ADR-004) — reduz a distância conceitual entre front e back da plataforma.
- **Menos dependências de terceiro por funcionalidade equivalente**: `express-rate-limit` e `http-proxy-middleware` existem apenas para adaptar suas responsabilidades ao modelo `req`/`res` do Express; sobre Web Standards essas responsabilidades se implementam com `fetch` e um Map, sem lib dedicada.
- **Tipagem de primeira classe**: contexto (`c`), parâmetros de rota e handlers do Hono são tipados nativamente em TypeScript, sem pacote `@types/*` paralelo (o projeto já depende de `@types/express`, `@types/cors`, `@types/supertest` hoje) — alinhado ao stack 100% TypeScript da plataforma (ADR-001).
- **Portabilidade de runtime**: a mesma aplicação roda em Node.js, Bun, Deno ou edge sem reescrita — opcionalidade que o Express não oferece nativamente.
- **Requisito do cliente**: padronizar o framework web da plataforma em Hono — coincide com os pontos acima, e é o driver que define o escopo (todos os serviços web da plataforma, não só o Gateway).
- **Consistência entre serviços**: Gateway e os dois BFFs devem compartilhar o mesmo framework — não faz sentido migrar um e deixar os outros em Express.
- **Zero regressão**: autenticação JWT, auditoria, rate limit e o contrato de headers internos (`X-Correlation-Id`, `X-Internal-Gateway-Key`, `X-Authenticated-Subject`, `X-Authenticated-Roles`) definidos na ADR-015 devem se comportar de forma idêntica após a migração.

### Aderência a Princípios

| Princípio | Aderência | Impacto |
|-----------|-----------|---------|
| Performance | ✅ | Roteador otimizado e núcleo sem dependências reduzem latência e footprint por requisição |
| Minimização de dependências | ✅ | Remove `express`, `express-rate-limit`, `http-proxy-middleware`, `supertest` e seus `@types` dos três serviços |
| Portabilidade de runtime | ✅ | Hono não assume Node.js — a troca de runtime deixa de exigir reescrita da aplicação |
| Consistência entre serviços | ✅ | Gateway e ambos os BFFs passam a compartilhar o mesmo framework e os mesmos padrões de middleware |
| Baixo risco de regressão | ⚠️ | Proxy e rate limit deixam de vir prontos de uma lib e passam a ser código próprio — ver Riscos |

## Stakeholders (RACI)

- **Deciders (A)**: cliente (requisito de framework), arquiteto de software do projeto
- **Consulted (C)**: equipe de plataforma (dona de Gateway e BFFs)
- **Informed (I)**: equipes donas dos MFEs (endereço, empréstimo) — nenhum contrato externo muda

## Opções Consideradas

### Opção 1: Migrar Gateway e os dois BFFs para Hono, com `@hono/node-server` sobre o runtime Node.js atual — escolhida

Os três serviços trocam `express` por `hono`, mantendo Node.js como runtime via `@hono/node-server` (nenhuma mudança em Dockerfile, scripts `dev`/`start` ou infraestrutura). Middlewares próprios (`correlationId`, `auditLog`, `auth`) são reescritos para a API de contexto do Hono (`c.set`/`c.get` no lugar de `res.locals`). CORS usa o middleware nativo `hono/cors`. Rate limit deixa de depender de `express-rate-limit` e passa a ser um limitador em memória próprio — a lógica já era inteiramente custom (`keyGenerator` por `sub`/IP, `skip` por método mutante), então não há redução de funcionalidade. O proxy do Gateway para os BFFs deixa de usar `http-proxy-middleware` (que só existe para adaptar-se ao Express) e passa a usar `fetch()` nativo, encaminhando método, headers e corpo da requisição — viável porque há apenas três destinos fixos e conhecidos (`bffs/emprestimo`, `bffs/endereco`). Testes trocam `supertest` pelo cliente de teste nativo do Hono (`app.request()`), que dispensa abrir uma porta real.

- ✅ **Prós**: núcleo sem dependências e roteador otimizado (menor latência/footprint por requisição que Express); Web Standards nativos (`Request`/`Response`) alinhados ao restante da plataforma; tipagem de contexto e rotas de primeira classe, sem `@types/*` paralelo; remove 4 dependências (`express`, `express-rate-limit`, `http-proxy-middleware`, `supertest`) somadas nos três `package.json`; portátil para outro runtime sem reescrita; atende ao requisito do cliente; zero mudança de runtime/infraestrutura agora
- ❌ **Contras**: reescreve middlewares, proxy e rate limit nos três serviços na mesma janela; proxy e rate limit deixam de ser bibliotecas testadas em produção por terceiros e passam a ser código próprio, a ser coberto por testes
- 💰 **Custo**: migração única dos três serviços (~300 linhas de código de infraestrutura ao todo); manutenção contínua do proxy e do rate limiter próprios, antes delegada a `http-proxy-middleware`/`express-rate-limit`

### Opção 2: Fastify como alternativa a Hono

Fastify é outro framework moderno e rápido, com ecossistema de plugins oficiais (`@fastify/cors`, `@fastify/rate-limit`, `@fastify/http-proxy`) que cobre proxy e rate limit sem código próprio — a favor de Fastify em relação à Opção 1.

- ✅ **Prós**: plugins oficiais cobrem proxy e rate limit prontos, evitando código próprio para essas duas responsabilidades; performance comparável à do Hono em benchmarks de roteamento puro; ecossistema mais maduro (mais anos de mercado, mais plugins de terceiros)
- ❌ **Contras**: sua API de handler (`(request, reply)`) ainda é um modelo próprio sobre o `http` do Node, não Web Standards — não roda em runtimes edge/Workers sem uma camada de adaptação; validação de schema via Ajv/JSON Schema é mais pesada para os contratos simples destes três serviços; não atende ao requisito explícito do cliente
- **Conclusão**: tecnicamente competitivo, mas perde em portabilidade de runtime e em pegada mínima — e não atende ao requisito do cliente. Descartada.

### Opção 3: Status quo — manter Express nos três serviços (baseline)

Nenhuma mudança de framework.

- ✅ **Prós**: zero risco de regressão, zero esforço de migração, ecossistema mais maduro e com mais anos de mercado que qualquer alternativa
- ❌ **Contras**: não atende ao requisito do cliente; mantém dependências acopladas ao modelo Express (`express-rate-limit`, `http-proxy-middleware`) apenas por herança histórica; maior superfície de dependências transitivas; nenhum caminho de portabilidade para runtime edge/serverless caso a plataforma precise no futuro

## Decisão

**Escolhida: Opção 1 — migrar Gateway e os dois BFFs para Hono sobre `@hono/node-server`, com proxy via `fetch()` nativo e rate limiter próprio.**

### Y-Statement

> **No contexto de** um Gateway e dois BFFs implementados em Express 5, com dependências (`express-rate-limit`, `http-proxy-middleware`) que existem apenas para se adaptar ao modelo de request/response do Express, e de dependências transitivas maiores que as de um framework construído sobre Web Standards,
> **enfrentando** a necessidade de reduzir a superfície de dependências e a latência por requisição, ganhar portabilidade de runtime e alinhar o vocabulário HTTP do back-end (`Request`/`Response`) ao já usado no front-end — sem abrir mão de nenhuma garantia já estabelecida pela ADR-015 (autenticação na borda, auditoria, controle de tráfego, contrato de headers internos),
> **decidimos por** migrar os três serviços para Hono, mantendo Node.js como runtime via `@hono/node-server`, reescrevendo rate limit como limitador em memória próprio e o proxy Gateway→BFF como encaminhamento via `fetch()` nativo,
> **para alcançar** menor pegada e latência, menos dependências acopladas ao framework anterior, tipagem de primeira classe e portabilidade de runtime a médio prazo — resultado que também atende ao requisito explícito do cliente,
> **aceitando** reescrever middlewares, proxy e rate limit nos três serviços na mesma janela de trabalho, substituindo bibliotecas de terceiros testadas em produção por código próprio equivalente.

### Justificativa

Hono vence Express (Opção 3) e Fastify (Opção 2) em conjunto de critérios, não isoladamente: contra o status quo, elimina uma árvore de dependências transitivas maior e um modelo de compatibilidade sobre o `http` do Node que o Express carrega por herança histórica (Express 5 ainda expõe uma API amplamente compatível com Express 4, de 2014). Contra Fastify — também rápido e com plugins prontos para proxy e rate limit —, Hono leva vantagem em pegada mínima (núcleo zero-dependência) e em portabilidade real, por operar nativamente sobre `Request`/`Response`/`fetch` em vez de um modelo próprio de `(request, reply)`; isso mantém em aberto, sem custo hoje, a opção de rodar Gateway/BFFs num runtime edge/serverless no futuro. A tipagem de contexto e rotas de primeira classe do Hono também remove a necessidade dos pacotes `@types/express`, `@types/cors` e `@types/supertest` que o projeto carrega hoje só para tipar uma API que não foi desenhada pensando em TypeScript.

Dado esse conjunto de vantagens técnicas, a pergunta relevante deixa de ser *se* migrar e passa a ser *como* migrar sem regressão. Manter Node.js como runtime (Opção 1) evita tocar em Dockerfile, scripts e infraestrutura — o único ponto que muda é o framework web dentro de cada serviço. Reescrever proxy e rate limit como código próprio, em vez de buscar equivalentes Hono de terceiros, é aceitável porque ambos já eram, no Express, configurados quase inteiramente por lógica própria (`keyGenerator`, `skip`, encaminhamento de headers) — a lib fazia pouco além do que o código já fazia explicitamente. Migrar os três serviços juntos (Gateway + 2 BFFs), e não pilotar em um só, evita o período em que dois frameworks web coexistiriam na plataforma para o mesmo tipo de serviço. O requisito do cliente por Hono, explicitado no início desta ADR, coincide com — e reforça — essa análise técnica; não é ele quem a sustenta sozinho.

## Consequências

### Positivas

- ✅ Núcleo sem dependências e roteador otimizado reduzem latência e footprint por requisição em relação ao Express
- ✅ Remove 4 dependências por serviço (`express`, `express-rate-limit` ou nada, `http-proxy-middleware` ou nada, `supertest`) e seus `@types` paralelos, sem perder cobertura de teste
- ✅ Web Standards nativos (`Request`/`Response`) e tipagem de primeira classe, alinhados ao stack TypeScript da plataforma
- ✅ Abre caminho de portabilidade para runtime edge/serverless, sem custo hoje
- ✅ Atende ao requisito explícito do cliente: Hono é o framework web único de Gateway e BFFs
- ✅ Nenhuma mudança em Dockerfile, `docker-compose`, scripts `dev`/`start` ou infraestrutura de deploy

### Negativas (trade-offs aceitos)

- ❌ Proxy Gateway→BFF e rate limiter deixam de ser bibliotecas de terceiros testadas em produção e passam a ser código próprio, mantido pela equipe
- ❌ Reescrita simultânea de middlewares (`correlationId`, `auditLog`, `auth`) nos três serviços — janela única de risco de regressão

### Neutras (mudanças necessárias)

- 🔄 Testes trocam `supertest` por `app.request()` (cliente de teste nativo do Hono) — sintaxe de asserção muda, comportamento testado não
- 🔄 `res.locals` (Express) dá lugar a `c.set`/`c.get` (Hono) nos middlewares próprios — mudança mecânica, sem impacto de contrato externo

### Riscos

| Risco | L | I | Mitigação | Owner |
|-------|---|---|-----------|-------|
| Proxy via `fetch()` próprio introduz regressão sutil (streaming de corpo, encoding, headers de hop-by-hop) | M | H | Cobertura de teste ≥80% mantida antes/depois; smoke test ponta a ponta via Gateway para os dois BFFs | Plataforma |
| Rate limiter próprio em memória tem comportamento diferente do `express-rate-limit` em casos de borda (janela deslizante vs. fixa) | L | M | Testes replicam os mesmos cenários hoje cobertos (`rateLimit.test.ts`), incluindo limite global e por método mutante | Plataforma |
| Ecossistema Hono menor que Express (menos exemplos de terceiros para consulta) | L | L | Aceito conscientemente — escopo dos três serviços é pequeno e já é majoritariamente código próprio | Arquiteto |

## Validação

- [ ] Todos os testes existentes de `gateway/`, `bffs/endereco/` e `bffs/emprestimo/` passam após a migração, com cobertura ≥80% mantida em cada serviço
- [ ] Requisição que excede o limite de tráfego (global ou por método mutante) recebe `429`, com o mesmo `correlationId` no corpo da resposta
- [ ] O proxy do Gateway encaminha corretamente método, corpo e headers (`X-Correlation-Id`, `X-Internal-Gateway-Key`, `X-Authenticated-Subject`, `X-Authenticated-Roles`) para o BFF correspondente, e remove o `Authorization` do cliente antes de encaminhar
- [ ] JWT inválido e chamada direta a um BFF (sem `X-Internal-Gateway-Key`) continuam recebendo `401`
- [ ] Toda requisição que passa pelo Gateway continua gerando uma linha em `gateway/logs/audit.log`
- [ ] Nenhuma dependência Express (`express`, `express-rate-limit`, `http-proxy-middleware`, `cors`, `@types/express`, `supertest`, `@types/supertest`) permanece nos `package.json` dos três serviços
- [ ] Dockerfiles, `docker-compose` e scripts `dev`/`start` funcionam sem alteração

## Links

- Código: [`gateway/`](../../../gateway/README.md), [`bffs/emprestimo/`](../../../bffs/emprestimo/README.md), [`bffs/endereco/`](../../../bffs/endereco/README.md)
- ADRs relacionadas: ADR-015 (Gateway de API com BFFs — arquitetura e contrato que esta ADR preserva), ADR-004 (autenticação — ciclo do JWT), ADR-005 (testes)

## Revisão

- Revisão futura: 2027-01-15
- Triggers: necessidade de rodar Gateway/BFFs em runtime diferente de Node.js (Bun, Deno, edge), terceiro BFF adicionado, necessidade de rate limiting distribuído (múltiplas instâncias) que o limitador em memória não cobre

## Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-07-15 | Marco Mendes | Versão inicial |
| 1.1 | 2026-07-15 | Marco Mendes | Justificativa e drivers reformulados para se apoiar em méritos técnicos do Hono (performance, Web Standards, tipagem, portabilidade), com o requisito do cliente como um driver entre outros, não a justificativa central |
| 1.2 | 2026-08-01 | Marco Mendes | Esclarece no contexto que a relação MFE↔BFF não é 1:1 (ver ADR-015, Atualização 1.2) |
