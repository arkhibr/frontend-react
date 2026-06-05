# infra

Orquestração local da plataforma de microfrontends (S3 — Amazon Simple Storage Service — via LocalStack).

## Subir o ambiente
```bash
docker compose -f infra/docker-compose.yml up -d   # LocalStack S3 em :4566
```
Depois, em cada MFE (`mfes/<id>/`): `npm run build && npm run deploy`.
Por fim, no shell (raiz): `npm run dev`.
