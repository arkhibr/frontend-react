# Runtime de Microfrontends (camada `app`)

Motor que carrega MFEs autônomos a partir de buckets S3 em runtime. Ver ADR-008/009/010.

| Arquivo | Responsabilidade | Decisão |
|---------|------------------|---------|
| [`types.ts`](types.ts) | Tipos do manifesto e do contrato `MfeMountContext`/`MfeModule` | ADR-009 |
| [`manifest.ts`](manifest.ts) | Validação fail-fast do manifesto | ADR-010 |
| [`dependencyResolver.ts`](dependencyResolver.ts) | Ordenação topológica + detecção de ciclo | ADR-010 |
| [`loadManifest.ts`](loadManifest.ts) | Carrega `public/mfe-manifest.json` via fetch | ADR-010 |
| [`loadMfeModule.ts`](loadMfeModule.ts) | `import()` ESM do bundle + validação do contrato | ADR-009 |
| [`MfeHost.tsx`](MfeHost.tsx) | Monta/desmonta o MFE numa `<div>`; injeta o contexto | ADR-009 |
| [`MfeErrorBoundary.tsx`](MfeErrorBoundary.tsx) | Isola falhas de um MFE do shell | ADR-008 |
