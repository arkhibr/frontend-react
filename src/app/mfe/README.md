# Runtime de Microfrontends (camada `app`)

Motor que carrega MFEs (microfrontends) autônomos a partir de buckets S3 (Amazon Simple Storage Service) em runtime. Ver ADR-008/009/010.

| Arquivo | Responsabilidade | Decisão |
|---------|------------------|---------|
| [`types.ts`](types.ts) | Tipos do manifesto e do contrato `MfeMountContext`/`MfeModule` | ADR-009 |
| [`manifest.ts`](manifest.ts) | Validação fail-fast do manifesto | ADR-010 |
| [`dependencyResolver.ts`](dependencyResolver.ts) | Ordenação topológica + detecção de ciclo | ADR-010 |
| [`loadManifest.ts`](loadManifest.ts) | Carrega `public/mfe-manifest.json` via fetch | ADR-010 |
| [`loadMfeModule.ts`](loadMfeModule.ts) | `import()` ESM (ECMAScript Modules — módulos nativos do JavaScript) do bundle + validação do contrato | ADR-009 |
| [`MfeHost.tsx`](MfeHost.tsx) | Monta/desmonta o MFE numa `<div>`; injeta o contexto | ADR-009 |
| [`MfeErrorBoundary.tsx`](MfeErrorBoundary.tsx) | Isola falhas de um MFE do shell | ADR-008 |

## Dinâmica de carga dinâmica

O carregamento acontece em dois momentos: o **bootstrap** (uma vez, em `main.tsx`),
que resolve o manifesto e a ordem de dependências, e o **mount sob demanda**, quando
o usuário navega para a rota de um MFE e o `MfeHost` faz o `import()` do bundle.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuário
    participant Main as main.tsx
    participant Cfg as loadConfig
    participant LM as loadManifest
    participant V as validateManifest
    participant R as resolveLoadOrder
    participant Rt as createAppRouter
    participant Host as MfeHost / MfeMountPoint
    participant Loader as loadMfeModule
    participant S3 as Bundle do MFE (S3/LocalStack)
    participant Mfe as Módulo do MFE

    note over Main,Rt: Bootstrap (uma vez)
    Main->>Cfg: loadConfig()
    Cfg-->>Main: config (apiUrl, ...)
    Main->>LM: loadManifest()
    LM->>S3: fetch('/mfe-manifest.json')
    S3-->>LM: JSON do manifesto
    LM->>V: validateManifest(data)
    V-->>LM: MfeManifest válido
    LM-->>Main: manifest
    Main->>R: resolveLoadOrder(manifest.mfes)
    note right of R: ordenação topológica de Kahn — respeita dependsOn e lança erro em ciclo
    R-->>Main: MFEs ordenados
    Main->>Rt: createAppRouter(ordered)
    Rt-->>Main: router com uma rota por MFE
    Main->>Main: render do RouterProvider

    note over U,Mfe: Mount sob demanda (ao navegar)
    U->>Host: navega para entry.route
    alt state === 'maintenance'
        Host-->>U: aviso "em manutenção"
    else state === 'disabled'
        Host-->>U: nada (rota omitida)
    else state === 'active'
        Host->>Loader: loadMfeModule(entry.url)
        Loader->>S3: import(entry.url) (ESM)
        S3-->>Loader: módulo
        Loader->>Loader: assertMfeModule (mount/unmount?)
        alt contrato inválido ou falha de rede
            Loader-->>Host: throw Error
            Host-->>U: MfeErrorBoundary → "indisponível"
        else contrato OK
            Loader-->>Host: MfeModule
            Host->>Mfe: mount(el, { apiUrl, token, basePath, onUnauthorized })
            Mfe-->>U: UI do MFE renderizada
        end
    end

    note over U,Mfe: Desmontagem (cleanup do useEffect)
    U->>Host: sai da rota / token muda
    Host->>Mfe: unmount(el)
```

Pontos-chave do diagrama:

- **Fail-fast no bootstrap**: manifesto inválido ou ciclo de dependência derrubam o
  boot do shell (tela de erro em `main.tsx`), antes de qualquer MFE montar.
- **Isolamento por MFE**: falha de rede, contrato quebrado ou erro de runtime de um
  MFE ficam contidos no `MfeErrorBoundary` — o shell e os demais MFEs seguem vivos.
- **Contrato `mount`/`unmount`** (ADR-009): o `MfeMountPoint` injeta o
  `MfeMountContext` (`apiUrl`, `token`, `basePath`, `onUnauthorized`) e desmonta no
  cleanup do `useEffect` quando a rota muda ou o token é atualizado.
