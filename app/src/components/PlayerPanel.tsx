import { useGame } from '../store/gameStore'
import { formatMoney } from '../game/utils'

export function PlayerPanel() {
  const players = useGame((s) => s.players)
  const currentId = useGame((s) => s.players[s.currentPlayerIndex]?.id)

  return (
    <aside className="player-panel">
      <h2>Jogadores</h2>
      <div className="players-list">
        {players.map((p) => (
          <div
            key={p.id}
            className={`player-card ${p.id === currentId ? 'current' : ''} ${p.status}`}
            style={{ borderColor: p.color }}
          >
            <div className="player-head">
              <div className="dot" style={{ background: p.color }} />
              <strong>{p.name}</strong>
              <span className="gender">{p.gender === 'blue' ? '♂' : '♀'}</span>
            </div>
            <div className="money">{formatMoney(p.money)}</div>
            <div className="stats">
              {p.profession && <span>🎓 {p.profession}</span>}
              {p.path && <span>🛣️ {p.path === 'business' ? 'Negócios' : 'Univ.'}</span>}
              {p.salary > 0 && <span>💼 {formatMoney(p.salary)}</span>}
              {p.spouse && <span>💍</span>}
              {p.children.length > 0 && <span>👶×{p.children.length}</span>}
              {p.shares > 0 && <span>📈×{p.shares}</span>}
              {p.insurances.length > 0 && <span>🛡️×{p.insurances.length}</span>}
              {p.promissoryNotes > 0 && <span className="debt">🏦×{p.promissoryNotes}</span>}
              {p.status === 'millionaire' && <span>🏆 Milionário</span>}
              {p.status === 'tycoon' && <span>👑 Magnata</span>}
              {p.status === 'bankrupt' && <span>💥 Falido</span>}
            </div>
          </div>
        ))}
      </div>
    </aside>
  )
}
