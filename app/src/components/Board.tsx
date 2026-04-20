import { useGame } from '../store/gameStore'
import { BOARD } from '../data/board'
import type { SpaceType } from '../types/game'

const COLOR_MAP: Record<string, string> = {
  yellow: '#fde047',
  gold: '#eab308',
  red: '#ef4444',
  white: '#f3f4f6',
}

const ICON_MAP: Partial<Record<SpaceType, string>> = {
  start: '🚦',
  payday: '💰',
  'payday-interest': '📈',
  'lucky-day': '🍀',
  revenge: '⚡',
  wedding: '💍',
  baby: '👶',
  twins: '👶👶',
  profession: '🎓',
  diploma: '📜',
  'insurance-life': '❤️',
  'insurance-car': '🚗',
  'insurance-house': '🏠',
  'stocks-buy': '📊',
  'stocks-play': '🎲',
  gain: '💵',
  loss: '💸',
  toll: '🛣️',
  'judgment-day': '⚖️',
  millionaire: '🏆',
  tycoon: '👑',
  branch: '🔀',
}

/**
 * Layout fixo estilo "jogo da vida":
 * - Linha 1: SAÍDA + caminho NEGÓCIOS (1..10)
 * - Linha 2: caminho UNIVERSIDADE (20..29)
 * - Linha 3: caminho comum (30..39) — esquerda → direita
 * - Linha 4: caminho comum (40..49) — direita → esquerda (serpentina)
 * - Linha 5: pódio MILIONÁRIO (50) + MAGNATA (51)
 */
const POSITIONS: Record<number, { col: number; row: number }> = {
  0: { col: 1, row: 1 },
  1: { col: 2, row: 1 },
  2: { col: 3, row: 1 },
  3: { col: 4, row: 1 },
  4: { col: 5, row: 1 },
  5: { col: 6, row: 1 },
  6: { col: 7, row: 1 },
  7: { col: 8, row: 1 },
  8: { col: 9, row: 1 },
  9: { col: 10, row: 1 },
  10: { col: 11, row: 1 },

  20: { col: 2, row: 2 },
  21: { col: 3, row: 2 },
  22: { col: 4, row: 2 },
  23: { col: 5, row: 2 },
  24: { col: 6, row: 2 },
  25: { col: 7, row: 2 },
  26: { col: 8, row: 2 },
  27: { col: 9, row: 2 },
  28: { col: 10, row: 2 },
  29: { col: 11, row: 2 },

  30: { col: 2, row: 3 },
  31: { col: 3, row: 3 },
  32: { col: 4, row: 3 },
  33: { col: 5, row: 3 },
  34: { col: 6, row: 3 },
  35: { col: 7, row: 3 },
  36: { col: 8, row: 3 },
  37: { col: 9, row: 3 },
  38: { col: 10, row: 3 },
  39: { col: 11, row: 3 },

  40: { col: 11, row: 4 },
  41: { col: 10, row: 4 },
  42: { col: 9, row: 4 },
  43: { col: 8, row: 4 },
  44: { col: 7, row: 4 },
  45: { col: 6, row: 4 },
  46: { col: 5, row: 4 },
  47: { col: 4, row: 4 },
  48: { col: 3, row: 4 },
  49: { col: 2, row: 4 },

  50: { col: 2, row: 5 },
  51: { col: 3, row: 5 },
}

export function Board() {
  const players = useGame((s) => s.players)
  const current = useGame((s) => s.players[s.currentPlayerIndex])

  return (
    <div className="board">
      <div className="board-legend">
        <span><b>🚦 Saída</b></span>
        <span className="legend-biz">💼 Negócios</span>
        <span className="legend-uni">🎓 Universidade</span>
        <span className="legend-common">🛣️ Caminho comum</span>
        <span className="legend-final">🏆 Fim</span>
      </div>
      <div className="board-grid">
        {BOARD.map((sp) => {
          const playersHere = players.filter((p) => p.spaceId === sp.id)
          const pos = POSITIONS[sp.id]
          const isCurrent = current && sp.id === current.spaceId
          return (
            <div
              key={sp.id}
              className={`space space-${sp.type} color-${sp.color} ${isCurrent ? 'is-current' : ''}`}
              style={{
                background: COLOR_MAP[sp.color],
                gridColumn: pos ? `${pos.col}` : undefined,
                gridRow: pos ? `${pos.row}` : undefined,
              }}
              title={sp.label}
            >
              <div className="space-head">
                <span className="space-icon">{ICON_MAP[sp.type] ?? '•'}</span>
                <span className="space-id">#{sp.id}</span>
              </div>
              <div className="space-label">{sp.label}</div>
              {sp.amount != null && (
                <div className="space-amount">${sp.amount.toLocaleString('pt-BR')}</div>
              )}
              {sp.profession && (
                <div className="space-salary">
                  ${sp.profession.salary.toLocaleString('pt-BR')}
                </div>
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
