import { apiRequest } from './client'

export function getChatConversations() {
  return apiRequest('/chat/conversations')
}

export function createChatConversation() {
  return apiRequest('/chat/conversations', { method: 'POST' })
}

export function getChatMessages(conversationId, beforeMessageId) {
  const query = new URLSearchParams({ limit: '50' })
  if (beforeMessageId != null) query.set('beforeMessageId', String(beforeMessageId))
  return apiRequest(`/chat/conversations/${conversationId}/messages?${query}`)
}

export function sendChatMessage({ conversationId, message, image }) {
  const formData = new FormData()
  formData.append('message', message || '')
  formData.append('history', '[]')
  if (conversationId != null) formData.append('conversationId', String(conversationId))
  if (image) formData.append('image', image)

  return apiRequest('/chat/messages', {
    method: 'POST',
    body: formData,
  })
}

export function confirmChatAction(actionId) {
  return apiRequest(`/chat/actions/${actionId}/confirm`, { method: 'POST' })
}

export function cancelChatAction(actionId) {
  return apiRequest(`/chat/actions/${actionId}/cancel`, { method: 'POST' })
}
