import { useGame } from '../store/gameStore'
import { BOARD } from '../data/board'

const COLOR_MAP: Record<string, string> = {
  yellow: '#fde047',
  gold: '#eab308',
  red: '#ef4444',
  white: '#f3f4f6',
}

export function Board() {
  const players = useGame((s) => s.players)
  const current = useGame((s) => s.players[s.currentPlayerIndex])

  return (
    <div className="board">
      <div className="board-grid">
        {BOARD.map((sp) => {
          const playersHere = players.filter((p) => p.spaceId === sp.id)
          return (
            <div
              key={sp.id}
              className={`space ${sp.type}`}
              style={{ background: COLOR_MAP[sp.color] }}
              title={sp.label}
            >
              <div className="space-id">#{sp.id}</div>
              <div className="space-label">{sp.label}</div>
              {sp.amount != null && (
                <div className="space-amount">${sp.amount.toLocaleString('pt-BR')}</div>
              )}
              <div className="space-players">
                {playersHere.map((p) => (
                  <div
                    key={p.id}
                    className={`pin ${p.id === current?.id ? 'active' : ''}`}
                    style={{ background: p.color }}
                    title={p.name}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
