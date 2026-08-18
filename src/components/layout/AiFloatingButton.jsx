import logoCat from '../../assets/icons/logo/고양이 로고 2.png'
import './AiFloatingButton.css'

export default function AiFloatingButton({ onClick }) {
  return <button type="button" className="ai-floating-button" aria-label="리뉴 AI 챗봇 열기" onClick={onClick}><img src={logoCat} alt="" /></button>
}
