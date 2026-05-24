// src/shared/api/__tests__/apiError.test.ts
import { describe, it, expect } from 'vitest'
import { ApiError } from '../types'

describe('ApiError', () => {
  it('armazena status e body', () => {
    const err = new ApiError(404, { message: 'Not found' })
    expect(err.status).toBe(404)
    expect(err.body).toEqual({ message: 'Not found' })
  })

  it('extrai fieldErrors quando presentes no body', () => {
    const err = new ApiError(422, {
      fieldErrors: { email: 'E-mail inválido', nome: 'Obrigatório' },
    })
    expect(err.fieldErrors).toEqual({
      email: 'E-mail inválido',
      nome: 'Obrigatório',
    })
  })

  it('retorna undefined para fieldErrors quando body não os contém', () => {
    const err = new ApiError(500, { message: 'Internal server error' })
    expect(err.fieldErrors).toBeUndefined()
  })

  it('é instância de Error', () => {
    expect(new ApiError(400, {})).toBeInstanceOf(Error)
  })
})
