export interface Model {
  type: 'chat' | 'embedding' | 'rerank'
  provider: string
  model: string
  input_tokens: number
  output_tokens: number[]
  modality: string[]
}
