---
source: frontend-react
processed_by: thor
date: 2026-05-24
domain: architecture
tags: [react, typescript, fsd, redux, vite]
status: draft
---

# Arquitetura — Portal Web (frontend-react)

## Visão Geral

O **Portal Web** é uma aplicação de página única (SPA) construída com React 19 e TypeScript, compilada via Vite e servida em produção pelo Nginx. Consome a **API de Clientes** (back-end Python) via HTTPS com autenticação JWT. A estrutura interna segue a metodologia **Feature-Sliced Design (FSD)**, com camadas de dependência estritas verificadas automaticamente pelo ESLint na esteira de CI.

## Diagrama C4 — Contexto

```mermaid
C4Context
    title Contexto — Portal Web
    Person(user, "Usuário", "Cliente ou operador que acessa o portal via navegador")
    System(portal, "Portal Web", "SPA React 19 servida via Nginx. Permite autenticação e acesso ao painel de gestão.")
    System_Ext(api, "API de Clientes", "Back-end Python. Fornece dados e processa operações de negócio.")
    Rel(user, portal, "Acessa", "HTTPS")
    Rel(portal, api, "Consome", "HTTPS + Bearer JWT")
```

## Diagrama C4 — Container

```mermaid
C4Container
    title Containers — Portal Web
    Person(user, "Usuário", "Acessa via navegador")
    Container(nginx, "Nginx", "Servidor HTTP", "Serve os arquivos estáticos compilados. Implementa SPA routing via try_files.")
    Container(spa, "Portal Web", "React 19 + TypeScript", "SPA executada no navegador. Gerencia autenticação, estado e navegação entre páginas.")
    System_Ext(api, "API de Clientes", "Python", "Fornece dados via HTTPS + JWT")
    Rel(user, nginx, "Solicita página", "HTTPS")
    Rel(nginx, spa, "Entrega", "HTML + JS + CSS")
    Rel(spa, api, "Consome", "HTTPS + Bearer JWT")
```

## Mapa de Módulos

| Módulo | Responsabilidade | Documentação |
|--------|-----------------|--------------|
| `src/app/` | Camada App do FSD: inicialização da aplicação, providers globais, roteamento e estilos | [README](../../src/app/README.md) |
| `src/app/router/` | Roteamento declarativo com guards de autenticação e carregamento preguiçoso de páginas | [README](../../src/app/router/README.md) |
| `src/shared/api/` | Cliente HTTP com autoinjeção de token Bearer e tratamento centralizado de erro 401 | [README](../../src/shared/api/README.md) |
| `src/shared/auth/` | Infraestrutura de autenticação: armazenamento, análise e monitoramento de token JWT | [README](../../src/shared/auth/README.md) |
| `src/shared/lib/store/` | Gerenciamento de estado Redux com três fatias: auth, ui e session | [README](../../src/shared/lib/store/README.md) |
| `src/mocks/` | Servidor de simulação MSW para testes automatizados e desenvolvimento local | [README](../../src/mocks/README.md) |

## Decisões Arquiteturais (ADRs)

| ID | Decisão | Status |
|----|---------|--------|
| [ADR-001](adrs/ADR-001-plataforma-tecnologica.md) | Tática de plataforma tecnológica | Accepted |
| [ADR-002](adrs/ADR-002-modularizacao.md) | Tática de modularização | Accepted |
| [ADR-003](adrs/ADR-003-gerenciamento-de-estado.md) | Tática de gerenciamento de estado | Accepted |
| [ADR-004](adrs/ADR-004-autenticacao.md) | Tática de autenticação | Accepted |
| [ADR-005](adrs/ADR-005-testes.md) | Tática de testes | Accepted |
| [ADR-006](adrs/ADR-006-conteinizacao.md) | Tática de conteinerização | Accepted |
| [ADR-007](adrs/ADR-007-imposicao-fronteiras-arquiteturais.md) | Tática de imposição de fronteiras arquiteturais | Accepted |
