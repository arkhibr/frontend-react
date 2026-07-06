export interface Endereco {
  cep: string
  logradouro: string
  numero: string
}

const ENDERECO_FIXO: Endereco = {
  cep: '01001000',
  logradouro: 'Praça da Sé',
  numero: '1',
}

export function getEndereco(): Endereco {
  return { ...ENDERECO_FIXO }
}

export function putEndereco(input: Endereco): Endereco {
  return { ...input }
}
