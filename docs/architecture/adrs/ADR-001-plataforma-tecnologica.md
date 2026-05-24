# ADR-001: Tática de plataforma tecnológica

## Contexto

O projeto necessitava de uma plataforma de desenvolvimento front-end moderna com suporte a TypeScript, ecosistema maduro de componentes e alta velocidade de desenvolvimento. A equipe já possuía experiência acumulada com React, o que reduzia a curva de adoção e o risco de entrega.

## Decisão

Adotar **React 19 + TypeScript + Vite** como plataforma tecnológica principal.

- **React 19**: biblioteca de UI com modelo de componentes baseado em funções e hooks
- **TypeScript**: tipagem estática sobre JavaScript, habilitando detecção precoce de erros e melhor suporte de IDE
- **Vite 8**: ferramenta de compilação com servidor de desenvolvimento via ESM nativo — compilações e recarga em hot reload significativamente mais rápidas que alternativas baseadas em webpack

## Opções avaliadas

### Opção 1: React + TypeScript + Vite (escolhida)
- **Prós**: experiência acumulada da equipe; ecossistema maduro; Vite oferece compilação rápida e configuração mínima; suporte nativo a ESM
- **Contras**: React não impõe estrutura — organização depende de decisões adicionais (ver ADR-002)

### Opção 2: Vue 3 + TypeScript + Vite
- **Prós**: curva de aprendizado menor para desenvolvedores sem experiência em frameworks; Composition API bem estruturada
- **Contras**: equipe sem experiência prévia; ecosistema menor de bibliotecas de suporte

### Opção 3: Não fazer nada (baseline)
- **Prós**: zero investimento, zero risco
- **Contras**: inviável — o projeto exige uma plataforma front-end moderna

## Consequências

- A estrutura do projeto, gestão de estado e roteamento exigem decisões adicionais (ADR-002, ADR-003)
- O ecossistema Vite determina as ferramentas de teste (Vitest — ver ADR-005) e de compilação para produção
- Projetos futuros da equipe se beneficiam do conhecimento acumulado nesta plataforma
