# ADR-010: Manifesto de MFEs e resolução de dependências

## Contexto e Problema

O shell precisa de uma fonte de verdade declarativa sobre **quais** MFEs (microfrontends) existem, **onde** estão seus bundles, em **qual rota** montam, em **qual estado** se encontram e **de que** dependem. Sem isso, adicionar ou desativar um MFE exigiria alterar código do shell — contrariando a autonomia da ADR-008.

Há ainda a questão de **ordem de carga**: se um MFE depende de outro, o shell precisa garantir uma ordem válida e detectar dependências circulares antes de tentar montar qualquer coisa.

**Pergunta-problema:** Como declarar o catálogo de MFEs de forma que o shell descubra navegação, estados e ordem de carga em runtime, falhando cedo diante de configuração inválida?

## Drivers

- **Configuração declarativa**: adicionar/desativar MFE = editar dados, não código
- **Fail-fast**: manifesto inválido deve falhar no boot, com mensagem clara — nunca silenciosamente
- **Estados operacionais**: um MFE pode estar `active`, em `maintenance` (aviso ao usuário) ou `disabled` (oculto)
- **Ordem de dependências**: resolver topologicamente e detectar ciclos

### Aderência a Princípios

| Princípio | Aderência | Impacto |
|-----------|-----------|---------|
| Configuração sobre código | ✅ | Catálogo de MFEs é dado, não lógica |
| Fail-fast | ✅ | Validação estrutural + referencial no carregamento |
| Separação de responsabilidades | ✅ | Manifesto separado do `config.json` (ambiente) |

## Stakeholders (RACI)

- **Deciders (A)**: arquiteto de software
- **Consulted (C)**: time de plataforma
- **Informed (I)**: equipes donas dos MFEs

## Opções Consideradas

### Opção 1: Manifesto dedicado (`mfe-manifest.json`) com validação fail-fast e ordenação topológica (escolhida)

Um arquivo separado do `config.json`, com `schemaVersion`, lista de MFEs (`id`, `name`, `state`, `url`, `integrity`, `route`, `dependsOn`). O shell valida estrutura, enum de estado, URL, integridade e referências de `dependsOn`; em seguida resolve a ordem de carga por **algoritmo de Kahn** (ordenação topológica), detectando ciclos.

- ✅ **Prós**: separação clara entre config de ambiente e catálogo de MFEs; validação explícita; ordem determinística; detecção de ciclo
- ❌ **Contras**: mais um artefato para manter
- 💰 **Custo**: validador + resolvedor (custo único, ~poucas dezenas de linhas)

### Opção 2: Embutir a lista de MFEs no `config.json`

- ✅ **Prós**: um arquivo só
- ❌ **Contras**: mistura responsabilidades (cor/tema/apiUrl vs catálogo de módulos); evolui em ritmos diferentes; polui a config de ambiente

### Opção 3: Hardcode da lista de MFEs no shell

- ✅ **Prós**: tipagem estática direta
- ❌ **Contras**: adicionar MFE recompila o shell — contraria ADR-008

## Decisão

**Escolhida: Opção 1 — manifesto dedicado com validação fail-fast e ordenação topológica.**

### Y-Statement

> **No contexto de** um shell que descobre seus MFEs em runtime,
> **enfrentando** o risco de configuração inválida e ordens de carga inconsistentes,
> **decidimos por** um `mfe-manifest.json` dedicado, validado fail-fast e ordenado topologicamente (Kahn) com detecção de ciclo,
> **para alcançar** catálogo declarativo, estados operacionais e ordem determinística de carga,
> **aceitando** manter um artefato a mais, separado do `config.json`.

### Justificativa

Separar o manifesto do `config.json` (ADR-001) reflete duas responsabilidades distintas: configuração de **ambiente** (apiUrl, tema) muda por deploy; **catálogo de MFEs** muda por evolução de produto. A validação fail-fast evita o pior cenário de um sistema dinâmico: falha silenciosa e parcial. A ordenação topológica torna a ordem de carga uma propriedade calculada, não uma suposição.

### Estados e regras

| Estado | Aparece no menu? | Monta? | Comportamento |
|--------|------------------|--------|---------------|
| `active` | sim | sim | funcionamento normal |
| `maintenance` | sim | não | exibe aviso "em manutenção" |
| `disabled` | não | não | invisível ao usuário |

Validações (fail-fast): `schemaVersion` suportada; `mfes` é array; campos obrigatórios não-vazios; `state` no enum; `dependsOn` é array de strings; `id` único; toda referência em `dependsOn` aponta para um `id` existente; `route` é rota interna segura; `url` usa HTTPS em produção e pertence a `mfeAllowedOrigins`; `integrity` segue o formato `sha256-<base64>`. A ordenação topológica lança erro listando os MFEs envolvidos em caso de ciclo.

## Consequências

### Positivas

- ✅ Adicionar/desativar MFE não toca o código do shell
- ✅ Erros de configuração aparecem no boot com mensagem clara
- ✅ Ordem de carga determinística e ciclos detectados antes de montar

### Negativas (trade-offs aceitos)

- ❌ Um artefato adicional para versionar e revisar

### Neutras

- 🔄 O manifesto de dev vive em `public/mfe-manifest.json`; em produção seria servido pela plataforma/storage

### Riscos

| Risco | L | I | Mitigação | Owner |
|-------|---|---|-----------|-------|
| Manifesto inválido em produção | M | H | Validação fail-fast no boot + revisão na esteira | Plataforma |
| Ciclo de dependência entre MFEs | L | M | Detecção explícita (Kahn) com erro nomeando os envolvidos | Plataforma |
| Bundle adulterado no bucket | M | H | Hash SHA-256 obrigatório no manifesto e conferência antes do import | Plataforma |

## Validação

- [ ] Manifesto inválido falha o boot com mensagem específica
- [ ] `dependsOn` transitivo resolve em ordem correta
- [ ] Ciclo de dependência é detectado e reportado
- [ ] Origem não permitida, HTTP em produção ou `integrity` inválido impedem o boot
- [ ] Bytes cujo SHA-256 não corresponde ao manifesto não são executados

## Links

- Código: [`src/app/mfe/manifest.ts`](../../../src/app/mfe/manifest.ts), [`src/app/mfe/dependencyResolver.ts`](../../../src/app/mfe/dependencyResolver.ts), [`public/mfe-manifest.json`](../../../public/mfe-manifest.json)
- ADRs relacionadas: ADR-008 (arquitetura), ADR-009 (contrato), ADR-001 (config.json)

## Revisão

- Revisão futura: 2026-12-04
- Triggers: necessidade de versionar o schema (v2), manifesto servido dinamicamente por serviço

## Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-06-04 | Marco Mendes | Versão inicial |
| 1.1 | 2026-07-11 | Codex | Campo `integrity`, allowlist de origem e validação de rota |
