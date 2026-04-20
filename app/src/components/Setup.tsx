import { useState } from 'react'
import { useGame } from '../store/gameStore'
import type { Gender } from '../types/game'

interface DraftPlayer {
  name: string
  gender: Gender
  color: string
}

const PALETTE = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899']

export function Setup() {
  const newGame = useGame((s) => s.newGame)
  const [drafts, setDrafts] = useState<DraftPlayer[]>([
    { name: 'Jogador 1', gender: 'blue', color: PALETTE[0] },
    { name: 'Jogador 2', gender: 'pink', color: PALETTE[1] },
  ])

  const update = (i: number, patch: Partial<DraftPlayer>) => {
    setDrafts((prev) => prev.map((d, k) => (k === i ? { ...d, ...patch } : d)))
  }

  const add = () => {
    if (drafts.length >= 6) return
    setDrafts((prev) => [
      ...prev,
      {
        name: `Jogador ${prev.length + 1}`,
        gender: 'blue',
        color: PALETTE[prev.length % PALETTE.length],
      },
    ])
  }

  const remove = (i: number) => {
    if (drafts.length <= 2) return
    setDrafts((prev) => prev.filter((_, k) => k !== i))
  }

  const start = () => {
    if (drafts.some((d) => !d.name.trim())) return
    newGame(drafts)
  }

  return (
    <div className="setup">
      <h1>🎲 Jogo da Vida</h1>
      <p className="subtitle">Uma disputa emocionante em busca do sucesso!</p>

      <div className="players-setup">
        {drafts.map((d, i) => (
          <div key={i} className="player-draft" style={{ borderColor: d.color }}>
            <input
              className="name-input"
              value={d.name}
              onChange={(e) => update(i, { name: e.target.value })}
              maxLength={20}
            />
            <div className="gender-toggle">
              <button
                className={d.gender === 'blue' ? 'active' : ''}
                onClick={() => update(i, { gender: 'blue' })}
              >
                ♂ Azul
              </button>
              <button
                className={d.gender === 'pink' ? 'active' : ''}
                onClick={() => update(i, { gender: 'pink' })}
              >
                ♀ Rosa
              </button>
            </div>
            <div className="colors">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  className={`color-dot ${d.color === c ? 'active' : ''}`}
                  style={{ background: c }}
                  onClick={() => update(i, { color: c })}
                  aria-label={`cor ${c}`}
                />
              ))}
            </div>
            {drafts.length > 2 && (
              <button className="remove" onClick={() => remove(i)}>
                Remover
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="setup-actions">
        {drafts.length < 6 && (
          <button className="btn-secondary" onClick={add}>
            + Adicionar jogador
          </button>
        )}
        <button className="btn-primary" onClick={start}>
          🚀 Começar jogo
        </button>
      </div>
    </div>
  )
}
