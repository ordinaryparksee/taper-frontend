import type { ChatType } from '../types/chat'
import type { Operation } from 'fast-json-patch'
import { applyOperation } from 'fast-json-patch'

export function chatApplyPatch<T = ChatType>(chat: T, operation: Operation) {
  return applyOperation(chat, operation)
}
