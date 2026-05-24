// src/shared/api/types.ts
export type ApiResponse<T> = {
  data: T
  message?: string
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API error ${status}`)
    this.name = 'ApiError'
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
