const ITEMS = [
  { id: 'home', icon: '⌂', label: '홈' },
  { id: 'analysis', icon: '♙', label: '분석실' },
  { id: 'market', icon: '▢', label: '마켓' },
  { id: 'community', icon: '□', label: '커뮤' },
  { id: 'my', icon: '♧', label: 'MY' },
]

export default function BottomNav({ active = 'home', onNavigate }) {
  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {ITEMS.map((item) => (
        <button
          type="button"
          key={item.id}
          className={active === item.id ? 'active' : ''}
          onClick={() => onNavigate?.(item.id)}
        >
          <span aria-hidden="true">{item.icon}</span>
          <small>{item.label}</small>
        </button>
      ))}
    </nav>
  )
}
