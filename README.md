# Portal Web — frontend-react

Aplicação de página única (SPA) construída com React 19 e TypeScript. Consome a API de Clientes via HTTPS com autenticação JWT. Estrutura interna baseada em Feature-Sliced Design (FSD).

## Documentação Arquitetural

A documentação completa de arquitetura está em [`docs/architecture/`](docs/architecture/README.md):

- Diagramas C4 (Contexto e Container)
- Mapa de módulos com links para documentação de cada camada
- 7 Decisões Arquiteturais (ADRs)

## Desenvolvimento local

```bash
npm install
npm run dev
```

A aplicação sobe em `http://localhost:5173`. O servidor de simulação MSW é ativado automaticamente em modo de desenvolvimento.

## Comandos disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor de desenvolvimento com recarregamento automático |
| `npm run build` | Compilação para produção em `dist/` |
| `npm run test` | Testes unitários e de integração via Vitest |
| `npm run test:coverage` | Testes com relatório de cobertura |
| `npm run test:e2e` | Testes de ponta a ponta via Playwright |
| `npm run lint` | Verificação de estilo e fronteiras arquiteturais via ESLint |
| `npm run type-check` | Verificação de tipos TypeScript sem compilação |

## Configuração externa

O arquivo `public/config.json` é carregado em runtime, antes de qualquer render. Isso permite que um único build seja implantado em múltiplos ambientes sem recompilação.

| Campo | Descrição | Padrão |
|-------|-----------|--------|
| `apiUrl` | URL base da API de Clientes | `""` (usa `VITE_API_BASE_URL` como fallback) |
| `primaryColor` | Cor primária (CSS var `--color-primary`) | `#1A56DB` |
| `secondaryColor` | Cor secundária (CSS var `--color-secondary`) | `#6B7280` |

Em dev, `apiUrl` vazio faz as chamadas caírem no MSW. Em produção, monte ou gere o `config.json` com os valores corretos antes de servir o `dist/`.

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_API_BASE_URL` | URL base da API (fallback quando `config.json` não define `apiUrl`) | `https://api.clientes.exemplo.com` |

## Checklist de implantação

1. `npm ci`
2. `npm run lint && npm run lint:css` — garantir zero erros
3. `npm run build` — compila TS + Vite, gera `dist/`
4. Copiar/montar `dist/` para o host (wwwroot, CDN, container)
5. Configurar `dist/config.json` com `apiUrl`, `primaryColor`, `secondaryColor`
6. Validar CSP e domínios permitidos
7. Smoke test funcional (login → dashboard)
