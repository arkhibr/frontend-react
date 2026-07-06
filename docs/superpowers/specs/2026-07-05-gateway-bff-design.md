# Design: Gateway de API com BFFs

**Data:** 2026-07-05
**Status:** Aprovado para planejamento

## Contexto

Hoje o Portal Web é um shell nuclear + MFEs autônomos (`mfes/endereco`, `mfes/emprestimo`) que falam diretamente com um back-end externo via `apiUrl` (ADR-008). Não há nenhum serviço de back-end neste repositório: em dev, o MSW simula as respostas no navegador; em produção, `apiUrl` apontaria para uma API real fora deste repo.

Este trabalho é um estudo de arquitetura (mesmo espírito das ADRs 008–014): introduzir uma camada de **Gateway de API + BFF (Backend for Frontend)** entre os MFEs e o back-end simulado, exercitando três responsabilidades:

- **Transformação de mensagem** — adaptar contratos legados para formatos amigáveis ao front-end.
- **Auditoria** — registrar tráfego que passa pela borda da plataforma.
- **Controle de tráfego** — limitar taxa de requisições.

Isso revisita parcialmente a ADR-008 ("cada MFE... se comunica apenas com o back-end, nunca com outros MFEs"): a partir deste trabalho, "o back-end" passa a ser o Gateway.

## Objetivo

Introduzir Gateway + um BFF por MFE existente, com Gateway responsável por auditoria e controle de tráfego, e cada BFF responsável por adaptar o contrato do seu MFE. Documentar a decisão em ADR e manter a documentação de módulo no padrão já usado no repositório.

## Não-objetivos

- Não há integração com um back-end real de produção — o "back-end legado" continua simulado, agora dentro dos próprios BFFs.
- Não se propõe autenticação/autorização nova — o contrato de token Bearer existente (ADR-004) é preservado, apenas atravessando mais um hop.
- Não se propõe service discovery, balanceamento de carga ou observabilidade distribuída (tracing) — fora de escopo para este estudo.
- Não se remove o MSW do shell — ele continua disponível para quem quiser rodar o front isoladamente.

## Arquitetura

```
frontend-react/
├── gateway/                 ← serviço Gateway (Express, :4000)
├── bffs/
│   ├── emprestimo/          ← BFF do MFE de empréstimo (:4001)
│   └── endereco/            ← BFF do MFE de endereço (:4002)
├── mfes/
│   ├── endereco/
│   └── emprestimo/
├── infra/docker-compose.yml ← ganha os 3 novos serviços
└── docs/architecture/adrs/ADR-015-gateway-api-e-bff.md
```

Cada serviço (`gateway/`, `bffs/emprestimo/`, `bffs/endereco/`) é um pacote Node/TypeScript independente — próprio `package.json`, `tsconfig.json`, testes Vitest — no mesmo espírito de independência dos pacotes em `mfes/`. Roda via `node --experimental-strip-types` (a mesma técnica já usada em `scripts/deploy.ts`), sem introduzir `ts-node`/`tsx` como dependência nova.

### Fluxo de requisição

```
MFE → Gateway (:4000) → BFF do MFE → fixtures internas do BFF (back-end legado simulado)
```

1. O MFE chama `apiUrl` (config global do shell) — que passa a apontar para o Gateway.
2. O Gateway aplica, nesta ordem: correlação (gera/propaga `X-Correlation-Id`), controle de tráfego (rate limit), auditoria (loga a requisição), e então roteia por prefixo de path:
   - `/bff/emprestimo/*` → BFF-emprestimo
   - `/bff/endereco/*` → BFF-endereco
3. O BFF recebe a requisição, chama suas fixtures internas (representando o back-end legado) e transforma a resposta para o contrato limpo do seu MFE.
4. A resposta atravessa o Gateway de volta ao MFE; o Gateway loga o status e a duração na mesma entrada de auditoria (via correlationId).

### Back-end legado simulado

Os BFFs não dependem do MSW — MSW é ferramenta de dev/teste de front-end, não runtime de um serviço de back-end. Cada BFF carrega fixtures internas próprias (copiadas/adaptadas de `src/mocks/fixtures/emprestimo/*.json` para o BFF-emprestimo), representando o back-end legado que, num cenário real, existiria fora deste repositório. O MSW do shell (`src/mocks/`) permanece inalterado, continuando a atender quem roda o front sem subir Gateway+BFFs.

### Transformação de mensagem

O BFF-emprestimo é o caso central deste estudo: hoje o contrato do MFE de empréstimo é literalmente o payload legado em PascalCase (`ContratoDto.CodigoDaLinha`, `ValorBruto`, `NumeroDeParcelas`...; ver `mfes/emprestimo/src/dto/index.ts`, cujo comentário já documenta isso: "mirrors server payload"). O BFF-emprestimo expõe rotas limpas em camelCase para **todos** os endpoints hoje consumidos pelo MFE (contratos, propostas, extrato, previsão, detalhamento de parcelas, atraso, simulação, termos de aceite, dados do trabalhador):

| Rota legada (fixture do BFF) | Rota nova (BFF → MFE) |
|---|---|
| `GET /emprestimo.svc/contratos` | `GET /bff/emprestimo/contratos` |
| `GET /emprestimo.svc/contratos/:id` | `GET /bff/emprestimo/contratos/:id` |
| `GET /emprestimo.svc/propostas` | `GET /bff/emprestimo/propostas` |
| `DELETE /emprestimo.svc/propostas/:id` | `DELETE /bff/emprestimo/propostas/:id` |
| `GET /Emprestimo.svc/ObterExtratoEmprestimo/:id/:di/:df` | `GET /bff/emprestimo/contratos/:id/extrato?inicio=&fim=` |
| `GET /emprestimo.svc/obterprevisaodecontratoemandamento/:id` | `GET /bff/emprestimo/contratos/:id/previsao` |
| `GET /emprestimo.svc/detalhamentodeparcelas/:id` | `GET /bff/emprestimo/contratos/:id/parcelas` |
| `GET /emprestimo.svc/obterparcelasematrasodocontrato/:id` | `GET /bff/emprestimo/contratos/:id/atraso` |
| `GET /emprestimo.svc/simulacao` | `GET /bff/emprestimo/simulacao/parametros` |
| `GET /emprestimo.svc/simulacao/:cl/:tv/:dv/:dl/:dr` | `GET /bff/emprestimo/simulacao/primeiro-vencimento?...` |
| `POST /emprestimo.svc/MultiplasSimulacoes` | `POST /bff/emprestimo/simulacao/multiplas` |
| `GET /TermoDeAceite.svc/TermoDeConsentimento/:tipo` | `GET /bff/emprestimo/termos/:tipo` |
| `POST /TermoDeAceite.svc/TermoDeConsentimento/Variaveis/Substituir` | `POST /bff/emprestimo/termos/preencher-variaveis` |
| `POST /TermoDeAceite.svc/AssinarTermoDeAceite` | `POST /bff/emprestimo/termos/assinar` |
| `GET /emprestimo.svc/dados-trabalhador-dataprev` | `GET /bff/emprestimo/dados-trabalhador` |
| `POST /emprestimo.svc/propostas/object` | `POST /bff/emprestimo/propostas` |

Cada DTO limpo (`Contrato`, `Proposta`, `ExtratoEmprestimo`, etc., em `bffs/emprestimo/src/dto.ts`) é o mapeamento 1:1 em camelCase do DTO legado correspondente (`ContratoDto` → `Contrato`, e assim por diante), sem mudança de significado de campo — só de nomenclatura/forma. Isso implica atualizar, no MFE de empréstimo:

- `mfes/emprestimo/src/dto/index.ts` — novos tipos camelCase (o antigo arquivo de DTOs legados é removido; não sobra código morto).
- `mfes/emprestimo/src/api/endpoints.ts` — chama as rotas novas do BFF.
- Todos os hooks/componentes que hoje leem campos PascalCase (ex. `contrato.ValorBruto`, `proposta.StatusDaProposta.Value`) passam a ler os campos camelCase equivalentes.
- Os testes unitários do MFE que hoje montam fixtures em PascalCase são atualizados para o novo formato.

O BFF-endereco expõe `GET /bff/endereco/usuario/endereco` e `PUT /bff/endereco/usuario/endereco`; como o contrato de `/usuario/endereco` já é limpo hoje (`{ cep, logradouro, numero }`), a "transformação" ali é a identidade — o BFF ainda participa do pipeline (auditoria e controle de tráfego aplicam-se a ele via Gateway), mas não remodela payload. Isso é intencional: mostra que nem todo BFF precisa de transformação pesada para justificar existir.

### Auditoria (Gateway)

Middleware de auditoria, aplicado a toda requisição que passa pelo Gateway:

- Gera (ou propaga, se já presente) um `X-Correlation-Id` por requisição.
- Ao final da resposta, grava uma linha JSON em `gateway/logs/audit.log` (append-only, `.gitignore`d) com: `timestamp`, `correlationId`, `method`, `path`, `targetBff`, `status`, `durationMs`, `clientIp`.
- **Não** loga corpo de requisição/resposta nem headers sensíveis (`Authorization`) — só metadados de tráfego, para não vazar segredo ou dado pessoal em log local.

### Controle de tráfego (Gateway)

`express-rate-limit`, com duas políticas por IP do cliente:

- Global: 100 requisições/minuto.
- Mutações (`POST`, `PUT`, `DELETE`): 20 requisições/minuto.

Ao exceder, o Gateway responde `429 Too Many Requests` com corpo `{ error: "rate_limit_exceeded", message, correlationId }`, sem repassar a requisição ao BFF.

### Autenticação e propagação de erro

O header `Authorization: Bearer <token>` atravessa Gateway → BFF sem validação pelo Gateway (a validação continua sendo responsabilidade do "back-end", aqui simulada nas fixtures do BFF, análogo ao que o MSW faz hoje). Um `401` retornado pelo BFF propaga inalterado através do Gateway até o MFE — o fluxo existente do shell (`httpClient` → `auth:unauthorized` → logout, ADR-004) continua funcionando sem alteração, pois depende apenas do status HTTP final, não de qual hop o gerou.

Erros do Gateway e dos BFFs seguem um formato consistente: `{ error: string, message: string, correlationId: string }`.

## Testes

- **Unitários (Vitest, cada pacote):** cobertura ≥80%, no padrão dos MFEs (`thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 }`).
  - Gateway: roteamento por prefixo, rate limit (excede → 429), auditoria grava entrada com os campos esperados, propagação de correlationId.
  - BFF-emprestimo: mapeamento de cada endpoint (PascalCase → camelCase), incluindo casos com campos opcionais ausentes.
  - BFF-endereco: passthrough de `GET`/`PUT`.
- **Integração (supertest, dentro de cada pacote):** pipeline completo Gateway → BFF → fixture para pelo menos um endpoint de cada BFF, validando o hop real via HTTP (não mockado), sem browser.
- **E2E (Playwright, `tests/e2e/`):** os specs existentes (`mfe-emprestimo.spec.ts`, `mfe-endereco.spec.ts`) continuam rodando contra o MSW, inalterados — não é objetivo deste trabalho migrar o E2E do shell para depender de Gateway+BFFs de pé.

## Infraestrutura

`infra/docker-compose.yml` ganha três serviços novos (`gateway`, `bff-emprestimo`, `bff-endereco`), cada um com `Dockerfile` próprio no padrão do `Dockerfile` raiz (Node, `--experimental-strip-types` ou build TS→JS para produção). Portas locais: Gateway `:4000`, BFF-emprestimo `:4001`, BFF-endereco `:4002`.

## Documentação

- `docs/architecture/adrs/ADR-015-gateway-api-e-bff.md` — segue o template já usado nas ADRs 008–014 (Contexto e Problema, Drivers, RACI, Opções Consideradas, Decisão/Y-Statement, diagrama Mermaid, Consequências, Riscos, Validação, Links, Revisão, Histórico). Referencia a ADR-008 como decisão parcialmente revisitada.
- `README.md` em `gateway/`, `bffs/emprestimo/` e `bffs/endereco/`, no padrão de `src/shared/api/README.md` (Responsabilidade / Estrutura / Como usar / Decisões relevantes).
- `README.md` raiz: diagrama de estrutura do repositório, tabela de ADRs (nova linha ADR-015), tabela "Documentação por módulo" (novas linhas para Gateway e BFFs), seção de comandos, checklist de implantação.

## Riscos e trade-offs aceitos

| Risco/trade-off | Mitigação |
|---|---|
| Duplicação de dados entre fixtures do MSW (shell) e fixtures internas dos BFFs | Aceito conscientemente: são fontes de simulação para consumidores diferentes (front-end dev vs. runtime de BFF); risco de divergência é didático, não operacional |
| Refatoração ampla do MFE de empréstimo (todos os hooks/componentes que leem PascalCase) | Escopo explicitamente aceito pelo autor da decisão; mitigado por cobertura de teste ≥80% antes/depois da migração |
| Gateway/BFFs como novo ponto único de falha entre MFE e "back-end" | Fora de escopo mitigar (sem HA/observabilidade neste estudo); registrado como não-objetivo |

## Validação de sucesso

- [ ] MFE de empréstimo funciona ponta a ponta (login → listar contratos → propostas → simulação) através de Gateway + BFF, com `apiUrl` apontando para o Gateway.
- [ ] MFE de endereço funciona ponta a ponta através de Gateway + BFF.
- [ ] Requisição que excede o limite de tráfego recebe `429` do Gateway, sem chegar ao BFF.
- [ ] Toda requisição que passa pelo Gateway gera uma linha em `gateway/logs/audit.log` com correlationId rastreável na resposta.
- [ ] Nenhum código do MFE de empréstimo lê mais campos PascalCase do DTO legado.
- [ ] `npm run test:coverage` ≥80% em `gateway/`, `bffs/emprestimo/`, `bffs/endereco/`.
