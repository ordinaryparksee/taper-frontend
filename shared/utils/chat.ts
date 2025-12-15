import type { ChatSchema } from '../types/chat'
import type { Operation } from 'fast-json-patch'
import { applyOperation } from 'fast-json-patch'

export function chatApplyPatch<T = ChatSchema>(chat: T, operation: Operation) {
  return applyOperation(chat, operation)
}
