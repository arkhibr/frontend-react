# infra

Orquestração local da plataforma de microfrontends (S3 — Amazon Simple Storage Service — via LocalStack).

## Subir o ambiente

O jeito mais simples é o `npm run deploy` da raiz, que sobe o LocalStack se preciso, builda e publica todos os MFEs:
```bash
npm run deploy   # sobe o LocalStack (:4566), builda e publica os MFEs
npm run dev      # shell (raiz)
```

Para controlar a infra manualmente:
```bash
docker compose -f infra/docker-compose.yml up -d   # LocalStack S3 em :4566
```
Com o LocalStack já no ar, cada MFE pode ser publicado isolado em `mfes/<id>/`: `npm run build && npm run deploy`.
