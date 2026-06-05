# ADR-013: Trusted Types e Reporting API em Report-Only

## Contexto e Problema

A ADR-012 estabeleceu o CSP (Content Security Policy — política de segurança de conteúdo) de **recursos** em modo enforcement (script-src, style-src, etc.), bloqueando o carregamento de recursos não autorizados. Esse CSP, porém, **não** protege contra **DOM-XSS** (DOM-based Cross-Site Scripting — injeção de script via manipulação do DOM, Document Object Model), em que código já autorizado escreve dados não confiáveis em *sinks* perigosos como `innerHTML`, `script.src` ou `eval`.

A plataforma é composta por MFEs (microfrontends — fragmentos de frontend autônomos) desenvolvidos por equipes independentes. Esses MFEs **podem** usar `innerHTML` cru hoje, sem qualquer sanitização ou policy registrada. **Trusted Types** é o mecanismo do navegador que tranca exatamente esses sinks, mas ligá-lo em enforcement direto **derrubaria** qualquer MFE que escreva HTML cru — uma quebra inaceitável sem adoção prévia.

Falta, portanto, uma camada anti-DOM-XSS que (a) dê **visibilidade** sobre quais MFEs violam as regras, (b) **não bloqueie** nada de imediato e (c) ofereça um **caminho claro de migração** para enforcement quando os relatórios indicarem segurança.

**Pergunta-problema:** Como adicionar uma defesa anti-DOM-XSS aos MFEs autônomos, ganhando visibilidade sobre violações de sinks perigosos, sem quebrar MFEs que hoje escrevem HTML cru?

## Drivers

- **Defesa anti-DOM-XSS**: trancar sinks perigosos (`innerHTML`, `script.src`, `eval`, ...) sem depender só do CSP de recursos
- **Não quebrar MFEs**: MFEs autônomos podem usar `innerHTML` cru; nenhuma quebra antes de adoção
- **Visibilidade**: coletar violações reais antes de qualquer bloqueio
- **Caminho de migração**: passagem gradual de Report-Only para enforcement, guiada por dados
- **Paridade dev/prod**: feedback de violação tanto em produção quanto em desenvolvimento

### Aderência a Princípios

| Princípio | Aderência | Impacto |
|-----------|-----------|---------|
| Segurança por camadas (defense in depth) | ✅ | Trusted Types complementa o CSP de recursos da ADR-012 |
| Autonomia dos MFEs | ✅ | Report-Only não bloqueia; equipes adotam policy no próprio ritmo |
| Decisão guiada por dados | ✅ | Reporting API alimenta a futura decisão de enforcement |
| Paridade dev/prod | ✅ | Mesmo header em dev (Vite) e prod (Nginx); coletor de reports em ambos |

## Stakeholders (RACI)

- **Deciders (A)**: arquiteto de software
- **Responsible (R)**: plataforma (configuração de headers e coletor)
- **Consulted (C)**: segurança da informação, DevOps
- **Informed (I)**: equipes donas dos MFEs

## Opções Consideradas

### Opção 1: Trusted Types em Report-Only + Reporting API (escolhida)

Liga `require-trusted-types-for 'script'` e `trusted-types default` em **Report-Only**, e usa a **Reporting API** (mecanismo do navegador para coletar e enviar violações a um endpoint) para reunir as violações sem bloquear.

- ✅ **Prós**: visibilidade das violações de DOM-XSS; **zero quebra** dos MFEs; caminho claro de migração para enforcement guiado pelos relatórios
- ❌ **Contras**: **não bloqueia** nada até virar enforcement; exige um **coletor real** de reports em produção
- 💰 **Custo**: configuração de headers em dois ambientes + stub de coletor (custo único)

### Opção 2: Enforcement imediato de Trusted Types

Liga `require-trusted-types-for 'script'` já em modo enforcement (header `Content-Security-Policy`).

- ✅ **Prós**: bloqueia DOM-XSS desde o primeiro dia
- ❌ **Contras**: **risco de derrubar MFEs** que escrevem HTML cru sem terem adotado uma Trusted Types policy — quebra inaceitável sem adoção prévia

### Opção 3: Não adotar Trusted Types

Mantém apenas o CSP de recursos da ADR-012.

- ✅ **Prós**: nada a configurar
- ❌ **Contras**: **perde uma camada anti-DOM-XSS**; o CSP de recursos não cobre injeção via sinks do DOM

## Decisão

**Escolhida: Opção 1 — Trusted Types em Report-Only somado à Reporting API.** Ambos os mecanismos entram primeiro em **Report-Only**. A razão é que MFEs autônomos podem usar `innerHTML` cru, e ligar Trusted Types em enforcement direto poderia derrubá-los. O modo Report-Only **coleta violações sem bloquear**; a migração para enforcement é uma **decisão futura**, guiada pelos relatórios coletados.

### Header em produção

Separado do CSP de recursos (que está em enforcement — ver [ADR-012](ADR-012-content-security-policy.md)), o servidor envia em produção:

```
Content-Security-Policy-Report-Only: require-trusted-types-for 'script'; trusted-types default; report-to csp-endpoint
```

Mais o header de endpoint, parametrizado por ambiente:

```
Reporting-Endpoints: csp-endpoint="${CSP_REPORT_URI}"
```

- `require-trusted-types-for 'script'` tranca os sinks de DOM-XSS (`innerHTML`, `script.src`, `eval`, etc.) a menos que o valor venha de uma **policy registrada**.
- `trusted-types default` registra uma policy **default**.
- `report-to csp-endpoint` / `Reporting-Endpoints` direcionam as violações ao coletor parametrizável (`CSP_REPORT_URI`).

### Reporting

- **Produção**: `Reporting-Endpoints`/`report-to csp-endpoint` apontam para um **coletor parametrizável** (stub nesta POC — Proof of Concept, prova de conceito). A forma de plugar um **coletor real** é documentada em [`SECURITY.md`](../../../SECURITY.md).
- **Dev**: um handler do MSW (Mock Service Worker — interceptador de requisições para mocks) em [`src/mocks/handlers.ts`](../../../src/mocks/handlers.ts) intercepta o `POST /__csp-report` e **loga as violações no console** (feedback imediato). Em dev, o header é Report-Only configurado via [`vite.config.ts`](../../../vite.config.ts).

### Guia para autores de MFE

- **Evite `innerHTML` cru.** Prefira APIs seguras de manipulação de DOM (por exemplo, `textContent`) ou renderização via framework.
- **Sanitize as entradas** antes de qualquer escrita de HTML.
- **Registre uma Trusted Types policy** quando precisar de fato escrever HTML — só assim o valor passa pelos sinks trancados.
- **Lembre-se**: hoje o mecanismo está em **Report-Only** (não bloqueia), mas **migrará para enforcement**. Violações que aparecem nos relatórios agora viram **erros** depois. Detalhes e exemplos de policy estão em [`SECURITY.md`](../../../SECURITY.md).

### Mapa código → decisão

| Arquivo | Papel |
|---|---|
| [`nginx.conf.template`](../../../nginx.conf.template) | header Trusted Types Report-Only + `Reporting-Endpoints` (prod) |
| [`vite.config.ts`](../../../vite.config.ts) | mesmo header em dev (Report-Only) |
| [`src/mocks/handlers.ts`](../../../src/mocks/handlers.ts) | coletor de reports em dev (loga no console) |
| [`SECURITY.md`](../../../SECURITY.md) | guia de adoção e leitura de relatórios |

## Consequências

### Positivas

- ✅ Camada anti-DOM-XSS adicionada sem quebrar nenhum MFE
- ✅ Visibilidade real das violações antes de qualquer bloqueio
- ✅ Caminho de migração para enforcement guiado por dados dos relatórios
- ✅ Paridade dev/prod: mesmo header e coletor de reports em ambos os ambientes

### Negativas (trade-offs aceitos)

- ❌ Report-Only **não bloqueia** DOM-XSS até a migração para enforcement
- ❌ Produção exige um **coletor real** de reports (hoje stub na POC)

### Neutras

- 🔄 A decisão de migrar para enforcement fica para uma ADR/revisão futura, guiada pelos relatórios
- 🔄 Adoção de Trusted Types policies pelos MFEs ocorre incrementalmente

### Riscos

| Risco | L | I | Mitigação | Owner |
|-------|---|---|-----------|-------|
| Coletor stub em prod descarta violações reais | M | M | Documentar plugagem de coletor real em `SECURITY.md`; trocar antes de enforcement | Plataforma |
| MFEs nunca adotarem policy, travando o enforcement | M | M | Guia para autores de MFE; acompanhar relatórios e cobrar adoção | Arquiteto |
| Migração para enforcement quebrar MFEs ainda não adaptados | M | H | Só migrar quando relatórios indicarem ausência de violações; comunicar prazo | Segurança |

## Validação

- [ ] Em prod, o header `Content-Security-Policy-Report-Only` e o `Reporting-Endpoints` são emitidos pelo Nginx com `CSP_REPORT_URI` resolvido por ambiente
- [ ] Em dev, o `vite.config.ts` emite o mesmo header em Report-Only
- [ ] Uma escrita em `innerHTML` cru gera um report; o handler MSW loga a violação no console em dev
- [ ] O CSP de recursos da ADR-012 permanece em enforcement, independente deste header Report-Only

## Links

- ADRs relacionadas: [ADR-012 (Content Security Policy)](ADR-012-content-security-policy.md)
- Guia de adoção e leitura de relatórios: [`SECURITY.md`](../../../SECURITY.md)

## Revisão

- Revisão futura: decisão de migração Report-Only → enforcement, guiada pelos relatórios coletados
- Triggers: relatórios indicando ausência de violações; ida para produção (troca do coletor stub por coletor real)

## Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-06-05 | Marco Mendes | Versão inicial |
