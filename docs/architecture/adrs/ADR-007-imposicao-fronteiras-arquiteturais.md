# ADR-007: Tática de imposição de fronteiras arquiteturais

## Contexto

A metodologia FSD (Feature-Sliced Design) (ADR-002) define regras explícitas de dependência entre camadas. Sem verificação automatizada, essas regras são apenas convenção documentada — degradam silenciosamente sob pressão de entrega. O projeto necessita de um mecanismo que detecte violações antes do merge e forneça feedback imediato ao desenvolvedor.

**Referência:** https://github.com/javierbrea/eslint-plugin-boundaries

## Decisão

Adotar **`eslint-plugin-boundaries`** para impor as regras de dependência do FSD como erros de lint, executados na esteira de CI.

Cada camada FSD (`shared`, `entities`, `features`, `widgets`, `pages`, `app`) é mapeada como um elemento do plugin. As regras definem explicitamente quais camadas podem importar de quais — qualquer violação é um erro de lint que falha a esteira.

## Opções avaliadas

### Opção 1: `eslint-plugin-boundaries` (escolhida)
- **Prós**: verificação automatizada em tempo de desenvolvimento (IDE) e CI; configuração declarativa alinhada à hierarquia FSD; feedback imediato sem necessidade de revisão de código manual
- **Contras**: configuração inicial requer mapeamento explícito de todos os elementos; adiciona tempo à etapa de lint na esteira

### Opção 2: Revisão de código manual
- **Prós**: zero configuração
- **Contras**: não escala com o crescimento do time; violações passam despercebidas até a revisão; dependência de disciplina individual

### Opção 3: Não fazer nada (baseline)
- **Prós**: zero esforço
- **Contras**: a arquitetura FSD se degrada inevitavelmente sem imposição — importações cruzadas acumulam-se como dívida técnica

## Consequências

- Erros de fronteira são detectados no editor (se ESLint estiver integrado) e obrigatoriamente na esteira de CI
- Novos módulos devem ser registrados em `eslint.config.ts` na seção `boundaries/elements`
- A camada `mocks/` tem permissão especial de importar de `shared`, `entities` e `features` — necessário para que os handlers simulem comportamentos reais
