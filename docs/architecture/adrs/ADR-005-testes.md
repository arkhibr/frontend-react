---
source: frontend-react
processed_by: thor
date: 2026-05-24
domain: architecture
tags: [vitest, playwright, msw, testes]
status: pending_review
type: adr
adr_status: accepted
---

# ADR-005: Tática de testes

## Contexto

O projeto necessita de uma estratégia de testes que cubra três níveis: unitário/integração (lógica isolada e componentes), ponta a ponta (fluxos completos no navegador) e simulação de API (para desacoplar testes do back-end real). A escolha de Vite como ferramenta de compilação (ADR-001) limita a compatibilidade com Jest sem configuração extra de transpilação.

**Referências:** https://vitest.dev · https://playwright.dev · https://mswjs.io

## Decisão

Adotar **Vitest + Playwright + MSW** como conjunto de testes:

- **Vitest**: testes unitários e de integração, executados no mesmo processo do Vite
- **Playwright**: testes de ponta a ponta em navegadores reais
- **MSW (Mock Service Worker)**: interceptação de rede para simular a API de Clientes

## Opções avaliadas

### Opção 1: Vitest + Playwright + MSW (escolhida)
- **Prós**: Vitest roda sem transpilação extra (suporte nativo a ESM e TypeScript); Playwright oferece cobertura multinavegador real; MSW intercepta na camada de rede — os testes exercitam o mesmo código de produção com respostas controladas
- **Contras**: três ferramentas distintas para aprender; Playwright exige instalação de binários de navegadores

### Opção 2: Jest + Cypress + MSW
- **Prós**: Jest é amplamente conhecido; Cypress combina testes de componente e ponta a ponta
- **Contras**: Jest exige configuração adicional de transpilação para projetos Vite/ESM; Cypress é mais pesado e lento que Playwright em CI

### Opção 3: Não fazer nada (baseline)
- **Prós**: zero esforço inicial
- **Contras**: sem rede de segurança para regressões; inaceitável para um produto em produção

## Consequências

- A esteira de CI executa `vitest run --coverage` e `playwright test` em cada pull request
- MSW deve ser mantido atualizado com os contratos da API de Clientes — desatualização leva a falsos positivos nos testes
- Arquivos de simulação ficam em `src/mocks/` e são carregados condicionalmente apenas em modo de desenvolvimento e testes (ver `src/main.tsx`)
