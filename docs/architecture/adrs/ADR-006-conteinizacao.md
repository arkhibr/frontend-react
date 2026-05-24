---
source: frontend-react
processed_by: thor
date: 2026-05-24
domain: architecture
tags: [docker, nginx, conteinizacao]
status: pending_review
type: adr
adr_status: accepted
---

# ADR-006: Tática de conteinerização

## Contexto

O Portal Web é uma SPA compilada em arquivos estáticos (HTML, JS, CSS). Em produção, esses arquivos precisam ser servidos com eficiência, suportando SPA routing e executando em ambiente controlado e reproduzível. A infraestrutura de destino exige contêineres — o que descarta opções de hospedagem gerenciada como Vercel ou Netlify.

**Referência:** https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files

## Decisão

Adotar **Docker com Nginx** para conteinerização e serviço dos arquivos estáticos.

A compilação usa múltiplos estágios: o primeiro estágio usa Node para compilar o projeto (`npm run build`); o segundo estágio copia apenas os arquivos gerados em `dist/` para uma imagem Nginx enxuta. O arquivo `nginx.conf` configura `try_files` para roteamento da SPA.

## Opções avaliadas

### Opção 1: Docker + Nginx (escolhida)
- **Prós**: Nginx é o padrão de mercado para servir SPAs em produção; `try_files` resolve SPA routing nativamente; compilação em múltiplos estágios mantém a imagem final pequena; zero sobrecarga de tempo de execução Node
- **Contras**: requer manutenção do `nginx.conf`; time precisa ter familiaridade mínima com Nginx

### Opção 2: Docker + Node (`serve` ou `http-server`)
- **Prós**: configuração mais simples; sem necessidade de conhecer Nginx
- **Contras**: adiciona sobrecarga de tempo de execução Node desnecessária; menos eficiente para servir arquivos estáticos; falta de controle de cabeçalhos HTTP em produção

### Opção 3: Não fazer nada (baseline)
- **Prós**: zero esforço
- **Contras**: sem ambiente reproduzível; inviável para implantação em infraestrutura containerizada

## Consequências

- A imagem de produção é baseada em `nginx:alpine` — pequena e auditável
- Variáveis de ambiente (ex: `VITE_API_BASE_URL`) devem ser injetadas em tempo de **compilação**, não de execução — valores padrão ficam no `nginx.conf` ou em scripts de inicialização do contêiner
- O `nginx.conf` deve ser revisado ao adicionar rotas que não sejam SPA (ex: endpoints de saúde)
