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

## Variáveis de ambiente

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `VITE_API_BASE_URL` | URL base da API de Clientes | `https://api.clientes.exemplo.com` |
