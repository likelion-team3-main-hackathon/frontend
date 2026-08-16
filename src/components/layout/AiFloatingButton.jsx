import './AiFloatingButton.css'

export default function AiFloatingButton({ onClick }) {
  return <button type="button" className="ai-floating-button" aria-label="리뉴 AI 챗봇 열기" onClick={onClick}><i>✦</i><strong>리뉴</strong></button>
}
