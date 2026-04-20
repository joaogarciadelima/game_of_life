import { useState } from 'react'
import { useGame } from '../store/gameStore'
import { formatMoney } from '../game/utils'

/**
 * Painel de apostas na roleta — permite adversários apostarem antes do giro.
 */
export function BettingPanel() {
  const players = useGame((s) => s.players)
  const currentId = useGame((s) => s.players[s.currentPlayerIndex]?.id)
  const phase = useGame((s) => s.phase)
  const bets = useGame((s) => s.bets)
  const placeBet = useGame((s) => s.placeBet)
  const removeBet = useGame((s) => s.removeBet)

  const [openFor, setOpenFor] = useState<string | null>(null)
  const [betNum, setBetNum] = useState<number>(5)
  const [betAmt, setBetAmt] = useState<number>(5000)

  if (phase !== 'idle') return null

  const adversaries = players.filter((p) => p.id !== currentId && p.status === 'active')
  if (adversaries.length === 0) return null

  return (
    <section className="betting-panel">
      <h3>🎯 Apostas na roleta</h3>
      <p className="hint">Adversários podem apostar antes do giro (até $24.000, paga 10x).</p>
      {adversaries.map((p) => {
        const myBet = bets.find((b) => b.playerId === p.id)
        const isOpen = openFor === p.id
        return (
          <div key={p.id} className="bet-row">
            <div className="bet-head">
              <span
                className="dot"
                style={{ background: p.color }}
              />
              <strong>{p.name}</strong>
              {myBet ? (
                <span className="bet-chip">
                  {myBet.number} · {formatMoney(myBet.amount)}
                  <button
                    className="bet-remove"
                    onClick={() => removeBet(p.id)}
                  >
                    ✕
                  </button>
                </span>
              ) : (
                <button
                  className="btn-tiny"
                  onClick={() => setOpenFor(isOpen ? null : p.id)}
                >
                  {isOpen ? 'Cancelar' : 'Apostar'}
                </button>
              )}
            </div>
            {isOpen && !myBet && (
              <div className="bet-form">
                <label>
                  Número:
                  <select
                    value={betNum}
                    onChange={(e) => setBetNum(Number(e.target.value))}
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Valor:
                  <input
                    type="number"
                    min={1000}
                    max={Math.min(24000, p.money)}
                    step={1000}
                    value={betAmt}
                    onChange={(e) => setBetAmt(Number(e.target.value))}
                  />
                </label>
                <button
                  className="btn-tiny"
                  onClick={() => {
                    placeBet(p.id, betNum, betAmt)
                    setOpenFor(null)
                  }}
                >
                  Confirmar
                </button>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
