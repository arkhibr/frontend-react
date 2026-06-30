# ADR-014: CSS e contrato visual em microfrontends dinâmicos

## Contexto e Problema

A ADR-008 definiu uma arquitetura de MFEs (microfrontends — fragmentos de frontend autônomos) carregados dinamicamente em runtime. A ADR-009 definiu o contrato técnico de montagem (`mount`/`unmount`). Falta, porém, explicitar o contrato visual: **quem é dono do CSS** quando o shell carrega módulos independentes, versionados e implantados fora do build principal.

Centralizar todo o CSS no shell cria acoplamento: o shell passaria a conhecer seletores internos dos MFEs e qualquer mudança de marcação interna poderia quebrar telas de domínio. Por outro lado, deixar cada MFE reinventar paleta, tipografia, botões, espaçamentos e componentes básicos gera uma aplicação fragmentada, com múltiplas identidades visuais no mesmo portal.

**Pergunta-problema:** Como dividir a responsabilidade por CSS e identidade visual entre shell, design system e MFEs, preservando autonomia de implantação sem perder consistência visual?

## Drivers

- **Autonomia dos MFEs**: um MFE deve carregar, versionar e remover seu próprio CSS junto com seu ciclo de vida
- **Consistência visual**: o portal precisa parecer uma única aplicação, não uma coleção de interfaces desconectadas
- **Baixo acoplamento**: o shell não deve conhecer seletores, componentes ou HTML interno dos MFEs
- **Extensibilidade**: adicionar ou remover MFE não deve exigir recompilar o shell por causa de CSS
- **Previsibilidade operacional**: regras globais não podem vazar para MFEs carregados depois, nem MFEs podem quebrar o shell
- **Acessibilidade e responsividade**: padrões mínimos precisam ser compartilhados sem impor layout interno de domínio

### Aderência a Princípios

| Princípio | Aderência | Impacto |
|-----------|-----------|---------|
| Separação de responsabilidades | ✅ | Shell governa o vocabulário visual; MFE governa a implementação local |
| Baixo acoplamento | ✅ | Shell publica tokens, não seletores internos de MFE |
| Autonomia de implantação | ✅ | CSS do MFE viaja com o bundle carregado em runtime |
| Consistência de produto | ✅ | Tokens e design system evitam fragmentação visual |
| Isolamento de falha | ✅ | CSS local pode ser removido no `unmount` e não deve contaminar o shell |

## Stakeholders (RACI)

- **Deciders (A)**: arquiteto de software
- **Responsible (R)**: plataforma para tokens globais; equipes de MFE para CSS local
- **Consulted (C)**: design system, UX/UI, acessibilidade, segurança
- **Informed (I)**: equipes donas dos MFEs

## Opções Consideradas

### Opção 1: Todo CSS no shell

O shell define tanto tokens e layout global quanto regras internas de cada MFE.

- ✅ **Prós**: consistência visual centralizada; menor duplicação inicial
- ❌ **Contras**: acoplamento forte ao HTML dos MFEs; adicionar/alterar MFE passa a exigir mudança no shell; contraria a ADR-008

### Opção 2: Todo CSS em cada MFE

Cada MFE define sua própria paleta, tipografia, componentes, layout e tokens.

- ✅ **Prós**: autonomia máxima; MFE é totalmente autocontido
- ❌ **Contras**: fragmentação visual; duplicação de padrões; risco de múltiplos "design systems" concorrentes

### Opção 3: Contrato visual por tokens + CSS local por MFE (escolhida)

O shell publica tokens e estrutura global. Um design system fornece componentes e padrões reutilizáveis quando disponível. Cada MFE carrega CSS local e compõe sua UI usando tokens e componentes compartilhados, sem depender de seletores internos definidos pelo shell.

- ✅ **Prós**: preserva autonomia de implantação; mantém consistência; reduz vazamento global; escala para múltiplas equipes
- ❌ **Contras**: exige disciplina de contrato; pode haver alguma duplicação de CSS local; design system precisa de governança de versão
- 💰 **Custo**: definir e manter tokens estáveis; documentar padrões para autores de MFE

## Decisão

**Escolhida: Opção 3 — contrato visual por tokens globais, design system compartilhável e CSS local por MFE.**

### Y-Statement

> **No contexto de** um portal com MFEs carregados dinamicamente em runtime,
> **enfrentando** o risco de acoplamento se o shell conhecer CSS interno dos MFEs e o risco de fragmentação se cada MFE reinventar a identidade visual,
> **decidimos por** um contrato visual em que o shell fornece tokens globais e estrutura externa, o design system fornece padrões reutilizáveis, e cada MFE carrega CSS local escopado ao seu domínio,
> **para alcançar** autonomia de implantação, consistência visual e baixo acoplamento,
> **aceitando** disciplina de versionamento visual e alguma duplicação local de CSS nos bundles.

## Contrato Visual

### Responsabilidade do shell

O shell é responsável por:

- reset mínimo e infraestrutura CSS global;
- fontes e tokens corporativos estáveis;
- tema global, como claro/escuro, exposto por variáveis CSS;
- layout estrutural externo: menu lateral, cabeçalho, rodapé e área de montagem;
- navegação global e estados globais;
- z-index e camadas globais, quando necessário;
- regras globais de acessibilidade que independem de domínio.

O shell **não deve**:

- estilizar seletores internos de MFE;
- depender de classes como `.emprestimo-card`, `.customer-table` ou similares;
- conhecer grid, tabela, formulário ou composição interna de uma tela de domínio;
- exigir que um MFE publique arquivos CSS separados no manifesto para que a UI funcione.

### Responsabilidade do design system

Quando existir como pacote ou biblioteca, o design system é responsável por:

- componentes reutilizáveis: botão, card, modal, tabs, tabela, inputs;
- contratos de acessibilidade e estados interativos;
- mapeamento de tokens para componentes;
- guidelines de composição e densidade visual.

O design system deve ser consumido de forma versionada. Se for compartilhado em runtime, ganha-se bundle menor, mas aumenta o acoplamento de versão. Se for empacotado por MFE, preserva-se autonomia, mas há duplicação. Em uma arquitetura que prioriza implantação independente, o padrão inicial é **tokens estáveis + componentes empacotados no MFE**, com revisão futura se a duplicação se tornar relevante.

### Responsabilidade de cada MFE

Cada MFE é responsável por:

- carregar o próprio CSS durante `mount`;
- remover ou isolar o CSS durante `unmount`, quando aplicável;
- layout interno, grids, formulários, tabelas e estados locais;
- composição dos componentes do domínio;
- animações e responsividade internas;
- mapeamento de tokens globais para aliases locais com fallback.

Exemplo recomendado:

```css
.emprestimo-app {
  --emprestimo-primary: var(--color-primary, #06422f);
  --emprestimo-font-family: var(--font-family-sans, Inter, system-ui, sans-serif);
  --emprestimo-radius-lg: var(--radius-lg, 20px);
}
```

### Isolamento de CSS

Padrões aceitos:

1. **CSS Modules** — padrão preferencial para novos MFEs React quando a ergonomia permitir.
2. **Namespace por MFE** — aceitável para bundles simples. O prefixo deve identificar o MFE, por exemplo `.emprestimo-*`.
3. **Shadow DOM** — usar quando houver risco alto de colisão, integração com terceiros ou necessidade de isolamento forte.

Evitar:

- seletores globais (`button`, `table td`, `.card`) fora de um namespace;
- regras em `:root`, `body`, `html` ou reset global dentro de MFE;
- nomes genéricos que possam colidir com outro MFE;
- CSS-in-JS apenas como mecanismo de isolamento arquitetural, sem necessidade funcional.

## Regra prática

Antes de decidir onde uma regra CSS fica, perguntar:

> "Essa regra continuaria existindo se este MFE fosse removido?"

- **Sim**: shell ou design system.
- **Não**: MFE.

| Regra | Responsável |
|-------|-------------|
| Cor primária corporativa | Shell/design system |
| Fonte base do portal | Shell |
| Largura do menu lateral | Shell |
| Aparência de botão corporativo | Design system |
| Grid da carteira de empréstimos | MFE `emprestimo` |
| Destaque de contrato em atraso | MFE `emprestimo` |
| Modal genérico | Design system |
| Tema claro/escuro | Shell por tokens; MFE consome |

## Mapa código → decisão

| Arquivo | Papel |
|---|---|
| [`src/app/styles/globals.css`](../../../src/app/styles/globals.css) | entrada dos estilos globais do shell |
| [`src/app/styles/tokens.css`](../../../src/app/styles/tokens.css) | tokens globais atuais do shell |
| [`src/app/layout/ShellLayout.tsx`](../../../src/app/layout/ShellLayout.tsx) | layout estrutural externo do shell |
| [`src/app/mfe/MfeHost.tsx`](../../../src/app/mfe/MfeHost.tsx) | área de montagem do MFE sem CSS interno de domínio |
| [`mfes/emprestimo/src/theme/inject.ts`](../../../mfes/emprestimo/src/theme/inject.ts) | exemplo de CSS local carregado/removido no ciclo de vida do MFE |
| [`mfes/emprestimo/src/theme/theme.css`](../../../mfes/emprestimo/src/theme/theme.css) | exemplo de CSS de domínio do MFE |

## Consequências

### Positivas

- ✅ Shell continua estável e não conhece HTML interno dos MFEs
- ✅ MFE permanece autocontido para build/deploy/runtime
- ✅ Tokens globais oferecem consistência sem travar a implementação local
- ✅ Falhas visuais ficam mais fáceis de localizar por fronteira de responsabilidade

### Negativas (trade-offs aceitos)

- ❌ Pode haver duplicação de CSS entre MFEs enquanto não houver design system maduro
- ❌ Cada equipe precisa respeitar o contrato de tokens e isolamento
- ❌ Versionamento de design system continua sendo uma decisão futura com trade-offs próprios

### Riscos

| Risco | L | I | Mitigação | Owner |
|-------|---|---|-----------|-------|
| MFE inventar paleta e tipografia próprias | M | M | Tokens globais obrigatórios + revisão de UI | Design system / MFE |
| CSS de MFE vazar para shell ou outro MFE | M | H | CSS Modules ou namespace por MFE; evitar seletores globais | Equipe do MFE |
| Shell estilizar internals de MFE por conveniência | M | H | Revisão arquitetural; regra prática desta ADR | Plataforma |
| Drift de versões do design system | M | M | Política de versionamento; auditoria periódica | Arquitetura |

## Validação

- [ ] Shell não possui seletores que conhecem estrutura interna de MFEs
- [ ] MFE carrega CSS necessário junto com seu bundle
- [ ] MFE remove ou isola CSS no `unmount`
- [ ] CSS de MFE não define `body`, `html`, `:root` ou seletores globais não escopados
- [ ] CSS de MFE usa CSS Modules, Shadow DOM ou namespace específico
- [ ] MFE consome tokens globais do shell por `var(...)` com fallback, quando aplicável
- [ ] Novo MFE pode ser adicionado sem alteração de CSS no shell

### Guardrails automatizados

| Teste | Garante |
|---|---|
| [`src/app/mfe/__tests__/visualContract.test.ts`](../../../src/app/mfe/__tests__/visualContract.test.ts) | shell não referencia classes internas de MFEs |
| [`mfes/emprestimo/src/theme/__tests__/visual-contract.test.ts`](../../../mfes/emprestimo/src/theme/__tests__/visual-contract.test.ts) | CSS do MFE `emprestimo` fica escopado, sem reset global, e consome tokens globais com fallback |
| [`mfes/emprestimo/src/theme/__tests__/inject.test.ts`](../../../mfes/emprestimo/src/theme/__tests__/inject.test.ts) | CSS local do MFE é injetado e removido no ciclo de vida |
| [`mfes/emprestimo/src/__tests__/contract.test.tsx`](../../../mfes/emprestimo/src/__tests__/contract.test.tsx) | `mount` preserva o estilo local e `unmount` limpa o host |

## Links

- ADRs relacionadas: [ADR-008 (microfrontends dinâmicos)](ADR-008-microfrontends-dinamicos.md), [ADR-009 (contrato mount/unmount)](ADR-009-contrato-mount-unmount.md), [ADR-010 (manifesto e dependências)](ADR-010-manifesto-e-dependencias.md), [ADR-011 (deploy S3)](ADR-011-deploy-s3-localstack.md)
- Runtime de MFE: [`src/app/mfe/`](../../../src/app/mfe/README.md)

## Revisão

- Revisão futura: 2026-12-30
- Triggers: introdução de design system compartilhado; terceiro MFE em produção; necessidade de tema claro/escuro global; colisão real de CSS entre MFEs

## Histórico

| Versão | Data | Autor | Mudanças |
|--------|------|-------|----------|
| 1.0 | 2026-06-30 | Marco Mendes | Versão inicial |
