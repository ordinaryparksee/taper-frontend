export type ModelType = 'chat' | 'embedding' | 'rerank'

export interface ModelSchema {
  type: ModelType
  provider: string
  model: string
  input_tokens: number
  output_tokens: number[]
  modality: string[]
}
