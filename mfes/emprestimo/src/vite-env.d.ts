/// <reference types="vite/client" />

declare module '*.css?raw' {
  const s: string
  export default s
}
