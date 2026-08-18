import { useEffect, useRef, useState } from 'react'
import {
  cancelChatAction,
  confirmChatAction,
  createChatConversation,
  getChatConversations,
  getChatMessages,
  sendChatMessage,
} from '../../api/chat'
import catLogo from '../../assets/icons/logo/고양이 로고 2.png'
import './AiRoutineChat.css'

const QUICK_ACTIONS = ['장바구니에 담아줘', '내일 운동 강도 낮춰줘', '이번 주 리포트 보여줘']

export default function AiRoutineChat({ onBack }) {
  const [conversationId, setConversationId] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [image, setImage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [processingActionId, setProcessingActionId] = useState(null)
  const [error, setError] = useState('')
  const endRef = useRef(null)
  const imageInputRef = useRef(null)

  useEffect(() => {
    let active = true

    async function initialize() {
      try {
        const listResponse = await getChatConversations()
        let conversation = listResponse?.data?.[0]
        if (!conversation) {
          const created = await createChatConversation()
          conversation = created?.data
        }
        if (!conversation?.conversationId) throw new Error('대화방을 만들지 못했습니다.')

        const messageResponse = await getChatMessages(conversation.conversationId)
        if (!active) return
        setConversationId(conversation.conversationId)
        setMessages(messageResponse?.data?.messages || [])
      } catch (requestError) {
        if (active) setError(requestError.message || '대화 내역을 불러오지 못했습니다.')
      } finally {
        if (active) setLoading(false)
      }
    }

    initialize()
    return () => { active = false }
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, sending])

  async function reloadMessages(id = conversationId) {
    if (id == null) return
    const response = await getChatMessages(id)
    setMessages(response?.data?.messages || [])
  }

  async function submitMessage(text = input) {
    const message = text.trim()
    if ((!message && !image) || sending || conversationId == null) return

    const temporaryId = `temporary-${Date.now()}`
    setMessages((current) => [
      ...current,
      {
        messageId: temporaryId,
        role: 'USER',
        content: message || '사진을 보냈습니다.',
        hasImage: Boolean(image),
      },
    ])
    setInput('')
    setError('')
    setSending(true)

    try {
      const response = await sendChatMessage({ conversationId, message, image })
      const nextConversationId = response?.data?.conversationId || conversationId
      setConversationId(nextConversationId)
      setImage(null)
      if (imageInputRef.current) imageInputRef.current.value = ''
      await reloadMessages(nextConversationId)
    } catch (requestError) {
      setMessages((current) => current.filter((item) => item.messageId !== temporaryId))
      setError(requestError.message || '메시지를 보내지 못했습니다.')
    } finally {
      setSending(false)
    }
  }

  async function handleAction(message, execute) {
    if (!message.pendingActionId || processingActionId != null) return
    setProcessingActionId(message.pendingActionId)
    setError('')
    try {
      if (execute) await confirmChatAction(message.pendingActionId)
      else await cancelChatAction(message.pendingActionId)
      await reloadMessages()
    } catch (requestError) {
      setError(requestError.message || '변경 요청을 처리하지 못했습니다.')
    } finally {
      setProcessingActionId(null)
    }
  }

  function renderAssistantCard(message) {
    if (message.responseType === 'ACTION_PROPOSAL') {
      const alreadyProcessed = messages.some((item) =>
        item.pendingActionId === message.pendingActionId
        && ['ACTION_EXECUTED', 'ACTION_CANCELLED'].includes(item.responseType))
      if (alreadyProcessed) return null
      const busy = processingActionId === message.pendingActionId
      return (
        <article className="ai-action-card pending">
          <strong>변경 내용을 확인해 주세요</strong>
          <footer>
            <button type="button" disabled={busy} onClick={() => handleAction(message, true)}>변경하기</button>
            <button type="button" disabled={busy} onClick={() => handleAction(message, false)}>취소</button>
          </footer>
        </article>
      )
    }
    if (message.responseType === 'ACTION_EXECUTED') {
      return (
        <article className="ai-action-card completed">
          <strong>✓ 변경이 반영됐어요</strong>
          <footer>
            <button type="button" onClick={onBack}>화면에서 보기</button>
            <button type="button" onClick={() => window.alert('되돌리기 기능은 준비 중입니다.')}>되돌리기</button>
          </footer>
        </article>
      )
    }
    if (message.responseType === 'ACTION_CANCELLED') {
      return <small className="ai-action-cancelled">취소된 변경입니다.</small>
    }
    return null
  }

  return (
    <section className="ai-routine-chat-page">
      <header>
        <button type="button" onClick={onBack}>‹</button>
        <img src={catLogo} alt="" />
        <div><h1>리뉴 연구원</h1><small>내 기록 · 루틴 열람 중</small></div>
        <em>AI</em>
      </header>

      <main>
        <time>오늘</time>
        {loading && <p className="ai-chat-status">대화를 불러오고 있어요…</p>}
        {!loading && messages.length === 0 && (
          <div className="ai-message">
            <div className="ai-message-body"><p>건강 기록과 루틴에 대해 무엇이든 물어보세요.</p></div>
          </div>
        )}
        {messages.map((message) => {
          const isUser = message.role === 'USER'
          return (
            <div className={isUser ? 'user-message' : 'ai-message'} key={message.messageId}>
              <div className="ai-message-body">
                <p>{message.content}</p>
                {message.hasImage && <small className="ai-image-label">사진 첨부됨</small>}
                {!isUser && renderAssistantCard(message)}
              </div>
            </div>
          )
        })}
        {sending && <p className="ai-chat-status">리뉴가 답변을 만들고 있어요…</p>}
        {error && <p className="ai-chat-error">{error}</p>}
        <div className="ai-quick-actions">
          {QUICK_ACTIONS.map((action) => (
            <button type="button" key={action} disabled={sending || loading} onClick={() => submitMessage(action)}>{action}</button>
          ))}
        </div>
        <div ref={endRef} />
      </main>

      {image && <div className="ai-image-preview"><span>{image.name}</span><button type="button" onClick={() => setImage(null)}>×</button></div>}
      <form className="ai-chat-input" onSubmit={(event) => { event.preventDefault(); submitMessage() }}>
        <input ref={imageInputRef} className="ai-image-input" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setImage(event.target.files?.[0] || null)} />
        <button className="ai-attach-button" type="button" aria-label="사진 첨부" onClick={() => imageInputRef.current?.click()}>＋</button>
        <input aria-label="메시지" placeholder="무엇이든 물어보세요" value={input} disabled={loading || sending} onChange={(event) => setInput(event.target.value)} />
        <button className="ai-send-button" type="submit" disabled={loading || sending || (!input.trim() && !image)}>↑</button>
      </form>
    </section>
  )
}
