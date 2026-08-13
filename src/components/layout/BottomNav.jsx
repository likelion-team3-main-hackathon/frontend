import { useEffect, useState } from 'react'
import homeIcon from '../../assets/icons/bottom_bar/barhome.png'
import homeActiveIcon from '../../assets/icons/bottom_bar/barhome_a.png'
import analysisIcon from '../../assets/icons/bottom_bar/baranalysis.png'
import analysisActiveIcon from '../../assets/icons/bottom_bar/baranalysis_a.png'
import marketIcon from '../../assets/icons/bottom_bar/barmarket.png'
import marketActiveIcon from '../../assets/icons/bottom_bar/barmarket_a.png'
import communityIcon from '../../assets/icons/bottom_bar/barcommunity.png'
import communityActiveIcon from '../../assets/icons/bottom_bar/barcommunity_a.png'
import myIcon from '../../assets/icons/bottom_bar/barmypage.png'
import myActiveIcon from '../../assets/icons/bottom_bar/barmypage_a.png'

const ITEMS = [
  { id: 'home', icon: homeIcon, activeIcon: homeActiveIcon, label: '홈' },
  { id: 'analysis', icon: analysisIcon, activeIcon: analysisActiveIcon, label: '분석실' },
  { id: 'market', icon: marketIcon, activeIcon: marketActiveIcon, label: '마켓' },
  { id: 'community', icon: communityIcon, activeIcon: communityActiveIcon, label: '커뮤' },
  { id: 'my', icon: myIcon, activeIcon: myActiveIcon, label: 'MY' },
]

export default function BottomNav({ active = 'home', onNavigate }) {
  const [selected, setSelected] = useState(active)

  useEffect(() => {
    setSelected(active)
  }, [active])

  function handleNavigate(id) {
    setSelected(id)
    onNavigate?.(id)
  }

  return (
    <nav className="bottom-nav" aria-label="주요 메뉴">
      {ITEMS.map((item) => {
        const isActive = selected === item.id
        return (
          <button
            type="button"
            key={item.id}
            className={isActive ? 'active' : ''}
            aria-current={isActive ? 'page' : undefined}
            onClick={() => handleNavigate(item.id)}
          >
            <img src={isActive ? item.activeIcon : item.icon} alt="" />
            <small>{item.label}</small>
          </button>
        )
      })}
    </nav>
  )
}
