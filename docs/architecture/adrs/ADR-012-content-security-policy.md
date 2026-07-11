# ADR-012: Content Security Policy

## Contexto e Problema

A aplicação é um shell que carrega MFEs (microfrontends) de forma dinâmica e cross-origin, via `import()` de ESM (ECMAScript Modules) servidos a partir de buckets S3 (ver [ADR-008](ADR-008-microfrontends-dinamicos.md) e [ADR-011](ADR-011-deploy-s3-localstack.md)). Esse modelo de carga é justamente o que torna a adoção de uma CSP (Content Security Policy) não trivial: uma política mal construída bloqueia silenciosamente a importação dos MFEs e derruba a aplicação inteira.

Sem CSP, qualquer injeção de script (XSS) executa com os privilégios da origem do shell. Mas a abordagem clássica de mitigação — uma allowlist de origens confiáveis em `script-src` — é frágil neste cenário: as origens dos MFEs são dinâmicas (um bucket/prefixo por MFE, com tendência a crescer), e qualquer endpoint aberto em um host liberado vira um vetor de bypass da allowlist.

Precisamos de uma defesa em profundidade contra XSS que seja rígida, resistente a bypass e que ao mesmo tempo não exija enumerar cada origem de bucket no `script-src`. A política precisa ser aplicada em produção (onde o serving é feito pelo Nginx) sem atrapalhar o ciclo de desenvolvimento (onde o serving é feito pelo Vite, com HMR — Hot Module Replacement — e o Service Worker do MSW — Mock Service Worker).

**Pergunta-problema:** como aplicar uma CSP estrita e resistente a bypass sem quebrar a carga dinâmica de MFEs cross-origin via `import()`?

## Drivers

- **Segurança first:** mitigar XSS com a política mais restritiva viável, evitando allowlists frágeis.
- **Compatibilidade com a arquitetura de MFEs:** a política não pode quebrar o `import()` cross-origin descrito nas ADR-008/011.
- **Independência da topologia de buckets:** adicionar um novo MFE não pode exigir alterar o `script-src`.
- **Paridade dev/prod sem fricção:** desenvolvimento com observabilidade da política (Report-Only), produção com enforcement.
- **Operável:** o mecanismo de nonce precisa funcionar no boot do container, com variáveis por ambiente.

### Aderência a Princípios

| Princípio | Aderência | Impacto |
|---|---|---|
| Defesa em profundidade | Alta | CSP estrita + baseline de cabeçalhos (HSTS, COOP, etc.) somam camadas independentes contra XSS, clickjacking e downgrade. |
| Menor privilégio | Alta | `default-src 'none'` nega tudo por padrão; cada diretiva libera somente o necessário. |
| Acoplamento mínimo | Alta | `strict-dynamic` desacopla a política da topologia de buckets de MFEs — sem allowlist de origens. |
| Paridade dev/prod | Média | Mesma política conceitual nos dois ambientes, com enforcement em prod e Report-Only em dev. |
| Operabilidade | Média | Nonce por requisição exige máquina de substituição no Nginx; configurável por variáveis de ambiente. |

## Stakeholders (RACI)

| Papel | Stakeholder |
|---|---|
| Responsible | Time de Frontend (shell e infraestrutura de serving) |
| Accountable | Tech Lead de Frontend |
| Consulted | Segurança da Informação; time responsável pelos MFEs |
| Informed | Times de Produto; SRE/DevOps |

## Opções Consideradas

### Opção 1: `strict-dynamic` + nonce por requisição (escolhida)

A diretiva `'strict-dynamic'` faz o navegador confiar nos scripts carregados dinamicamente por um script já confiável, ignorando allowlists de host. O script de bootstrap (`main.tsx`) é marcado como confiável via um **nonce por requisição**; ao executar `import()` dos MFEs, ele propaga essa confiança às origens cross-origin dos buckets. Assim, a origem do bucket **não** precisa aparecer no `script-src`.

Os tokens `https:` e `'unsafe-inline'` permanecem na política apenas como fallback para navegadores antigos que não entendem `strict-dynamic` — navegadores modernos os ignoram na presença de nonce + `strict-dynamic`.

**Prós:**
- Política rígida e resistente a bypass de allowlist.
- Compatível com `import()` cross-origin sem enumerar buckets de MFE.
- Independente da topologia: novos MFEs não exigem mudança na política.

**Contras:**
- Exige uma "máquina de nonce" no Nginx (`sub_filter` + `$request_id`) propagando o mesmo valor para o header.
- `$request_id` do Nginx não é um CSPRNG (Cryptographically Secure Pseudo-Random Number Generator); o risco é baixo dado o uso, e é mitigável com `njs`/OpenResty caso necessário.

### Opção 2: allowlist de origens de bucket/CDN no `script-src`

Listar explicitamente cada origem de bucket S3 / CDN (Content Delivery Network) em `script-src`.

**Prós:**
- Conceitualmente simples; não exige nonce nem reescrita no Nginx.

**Contras:**
- Frágil: exige enumerar e manter cada origem de MFE na política.
- Sujeita a bypass: qualquer endpoint que sirva conteúdo arbitrário no host liberado contorna a política.
- Acopla a política à topologia de deploy dos MFEs.

Descartada.

## Decisão

Adotamos a **Opção 1: `strict-dynamic` + nonce por requisição**, com dois pontos de aplicação.

**Produção (Nginx, enforcement)** — definida no template [`nginx.conf.template`](../../../nginx.conf.template). O template usa `envsubst` no boot do container, com o filtro `NGINX_ENVSUBST_FILTER="^CSP_"` para que apenas variáveis com prefixo `CSP_` sejam substituídas, preservando variáveis de runtime do Nginx como `$request_id` e `$csp_nonce`. As variáveis por ambiente `${CSP_CONNECT_SRC}` e `${CSP_REPORT_URI}` têm seus defaults definidos no [`Dockerfile`](../../../Dockerfile).

CSP de produção (enforcement), exata:

```
default-src 'none'; script-src 'nonce-$csp_nonce' 'strict-dynamic' blob: https: 'unsafe-inline'; style-src 'self' 'nonce-$csp_nonce'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' ${CSP_CONNECT_SRC}; worker-src 'self'; manifest-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests; report-to csp-endpoint
```

**Dev (Vite, Report-Only)** — definida em [`vite.config.ts`](../../../vite.config.ts) via `server.headers`. Em desenvolvimento a política é aplicada em modo Report-Only, tolerante a HMR e ao Service Worker do MSW, para observar violações sem quebrar o fluxo de desenvolvimento.

**Mecânica do nonce por requisição.** No build, o plugin Vite (em [`vite.config.ts`](../../../vite.config.ts), com `apply: 'build'`) injeta o placeholder literal `**CSP_NONCE**` nas tags `<script>` e `<style>` geradas. Em runtime, o Nginx substitui esse placeholder por `$request_id` a cada requisição via `sub_filter`, usando o **mesmo** valor no header `Content-Security-Policy`. Como o nonce muda a cada requisição, o `index.html` é servido com `no-cache`.

**Baseline ampliado de cabeçalhos.** Esta decisão também amplia o baseline de cabeçalhos de segurança:

- Adiciona HSTS (HTTP Strict Transport Security): `Strict-Transport-Security: max-age=63072000; includeSubDomains`.
- Adiciona `Permissions-Policy: camera=(), microphone=(), geolocation=(), browsing-topics=()`.
- Adiciona COOP (Cross-Origin-Opener-Policy): `Cross-Origin-Opener-Policy: same-origin`.
- Mantém `X-Content-Type-Options: nosniff` e `Referrer-Policy: strict-origin-when-cross-origin`.
- **Remove** `X-Frame-Options` (substituído por `frame-ancestors 'none'` no CSP).
- **Remove** `X-XSS-Protection` (obsoleto e potencialmente contraproducente).

**COEP fora de escopo.** O COEP (Cross-Origin-Embedder-Policy) **não** entra nesta decisão: habilitá-lo quebraria o `import()` cross-origin enquanto os buckets não enviarem CORP (Cross-Origin-Resource-Policy). Fica registrado como evolução futura.

### Atualização 1.1 — integridade de bundle e allowlist de origem

O shell não importa mais diretamente a URL remota. Ele exige `integrity` no
formato `sha256-<base64>`, permite somente origens presentes em
`mfeAllowedOrigins` (`config.json`; HTTPS em produção), baixa o bundle sem
credenciais, confere SHA-256 com Web Crypto e só importa os bytes aprovados por
uma URL `blob:`. Por isso `blob:` foi incluído em `script-src`.

Essa proteção cobre alteração do bundle no bucket, não comprometimento
simultâneo do shell e do manifesto. A assinatura assimétrica do manifesto segue
como evolução necessária. CSP também não isola um MFE que já foi aceito.

**Rollout.** O enforcement dos recursos (`script-src`, `style-src`, etc.) entra em produção desde o início. Já os Trusted Types ficam em Report-Only nesta fase (ver [ADR-013](ADR-013-trusted-types-e-reporting.md)). O playbook detalhado de rollout (Report-Only → analisar → enforce) está em [`SECURITY.md`](../../../SECURITY.md).

### Mapa código → decisão

| Arquivo | Papel |
|---|---|
| [`../../../nginx.conf.template`](../../../nginx.conf.template) | CSP enforce, baseline, nonce (`sub_filter`), envsubst |
| [`../../../vite.config.ts`](../../../vite.config.ts) | nonce (build) + CSP Report-Only (dev) |
| [`../../../Dockerfile`](../../../Dockerfile) | filtro envsubst + defaults das vars `CSP_*` |
| [`../../../src/app/mfe/manifest.ts`](../../../src/app/mfe/manifest.ts) | validação de origem, rota e integridade |
| [`../../../src/app/mfe/loadMfeModule.ts`](../../../src/app/mfe/loadMfeModule.ts) | download, SHA-256 e import do Blob verificado |
| [`../../../SECURITY.md`](../../../SECURITY.md) | referência e playbook de rollout |

## Consequências

**Prós:**
- Mitigação de XSS rígida e resistente a bypass de allowlist.
- A carga dinâmica de MFEs cross-origin continua funcionando sem listar origens de bucket em `script-src`.
- Adicionar novos MFEs não exige tocar na política.
- Baseline de cabeçalhos endurecido (HSTS, COOP, Permissions-Policy), com remoção de cabeçalhos obsoletos.
- Observabilidade em dev via Report-Only, sem fricção com HMR/MSW.

**Contras:**
- Acréscimo de complexidade operacional no Nginx (máquina de nonce com `sub_filter` + `$request_id`).
- `$request_id` não é um CSPRNG; risco baixo no uso atual, mitigável com `njs`/OpenResty se necessário.
- `index.html` precisa ser servido com `no-cache` por causa do nonce por requisição.
- COEP (e portanto isolamento cross-origin pleno) fica adiado até que os buckets enviem CORP.
- Integridade do bundle depende de manifesto protegido; o manifesto ainda não é assinado.

## Referências

- [ADR-008: Microfrontends Dinâmicos](ADR-008-microfrontends-dinamicos.md)
- [ADR-011: Deploy S3 / LocalStack](ADR-011-deploy-s3-localstack.md)
- [ADR-013: Trusted Types e Reporting](ADR-013-trusted-types-e-reporting.md)
- [`SECURITY.md`](../../../SECURITY.md)
