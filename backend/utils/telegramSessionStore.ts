// Simple in-memory session store for Telegram chat -> thread_id mapping
// In production, replace with Redis or database

const chatThreadMap = new Map<number, string>();
const pendingFeedbackMap = new Map<number, boolean>();

export function setChatThread(chatId: number, threadId: string): void {
  chatThreadMap.set(chatId, threadId);
}

export function getChatThread(chatId: number): string | undefined {
  return chatThreadMap.get(chatId);
}

export function clearChatThread(chatId: number): void {
  chatThreadMap.delete(chatId);
  pendingFeedbackMap.delete(chatId);
}

export function setPendingFeedback(chatId: number, pending: boolean): void {
  pendingFeedbackMap.set(chatId, pending);
}

export function isPendingFeedback(chatId: number): boolean {
  return pendingFeedbackMap.get(chatId) || false;
}
