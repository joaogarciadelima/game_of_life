import { useState } from 'react'
import { useGame } from '../store/gameStore'
import type { WealthCardKind } from '../types/game'

const LABELS: Record<WealthCardKind, string> = {
  'share-profit': 'Dividindo Lucros',
  'share-expense': 'Dividindo Despesa',
  exemption: 'Isenção',
}

const ICONS: Record<WealthCardKind, string> = {
  'share-profit': '💰',
  'share-expense': '💸',
  exemption: '🛡️',
}

export function WealthCardsPanel() {
  const current = useGame((s) => s.players[s.currentPlayerIndex])
  const players = useGame((s) => s.players)
  const phase = useGame((s) => s.phase)
  const useShareProfit = useGame((s) => s.useShareProfit)
  const useShareExpense = useGame((s) => s.useShareExpense)
  const useExemption = useGame((s) => s.useExemption)

  const [picker, setPicker] = useState<WealthCardKind | null>(null)

  if (!current || current.wealthCards.length === 0 || phase !== 'idle') return null

  const adversaries = players.filter(
    (p) => p.id !== current.id && p.status === 'active'
  )

  const pickTarget = (target: string) => {
    if (picker === 'share-profit') useShareProfit(target)
    if (picker === 'share-expense') useShareExpense(target)
    setPicker(null)
  }

  return (
    <section className="wealth-panel">
      <h3>🎴 Cartões de Riqueza</h3>
      <div className="wealth-list">
        {current.wealthCards.map((c) => (
          <div key={c.id} className="wealth-card">
            <span>{ICONS[c.kind]} {LABELS[c.kind]}</span>
            <button
              className="btn-tiny"
              onClick={() => {
                if (c.kind === 'exemption') useExemption()
                else setPicker(c.kind)
              }}
            >
              Usar
            </button>
          </div>
        ))}
      </div>
      {picker && (
        <div className="picker-modal">
          <p>Escolha o alvo:</p>
          {adversaries.map((t) => (
            <button key={t.id} onClick={() => pickTarget(t.id)}>
              {t.name}
            </button>
          ))}
          <button onClick={() => setPicker(null)}>Cancelar</button>
        </div>
      )}
    </section>
  )
}
