// src/shared/api/types.ts
export type ApiResponse<T> = {
  data: T
  message?: string
}

export class ApiError extends Error {
  readonly status: number
  readonly body: unknown

  constructor(status: number, body: unknown) {
    super(`API error ${status}`)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }

  get fieldErrors(): Record<string, string> | undefined {
    if (
      typeof this.body === 'object' &&
      this.body !== null &&
      'fieldErrors' in this.body &&
      typeof (this.body as Record<string, unknown>)['fieldErrors'] === 'object'
    ) {
      return (this.body as { fieldErrors: Record<string, string> }).fieldErrors
    }
    return undefined
  }
}
