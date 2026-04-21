import { useGame } from '../store/gameStore'
import { useAuth } from '../store/authStore'

export function Controls() {
  const phase = useGame((s) => s.phase)
  const current = useGame((s) => s.players[s.currentPlayerIndex])
  const roll = useGame((s) => s.rouletteResult)
  const rollDice = useGame((s) => s.rollDice)
  const nextTurn = useGame((s) => s.nextTurn)
  const choosePath = useGame((s) => s.choosePath)
  const takeLoan = useGame((s) => s.takeLoan)
  const repayLoan = useGame((s) => s.repayLoan)
  const online = useGame((s) => s.online)
  const { profile } = useAuth()

  if (!current) return null

  // Em modo online, só o jogador da vez (pelo profileId) interage.
  const isMyTurn =
    !online ||
    !current.profileId ||
    current.profileId === profile?.id

  const needsPath = current.path === null
  const locked = phase !== 'idle' || !isMyTurn

  return (
    <section className="controls">
      <div className="current-info">
        <span
          className="current-pin"
          style={{ background: current.color }}
        />
        <strong>Vez de: {current.name}</strong>
        {!isMyTurn && <span className="waiting-chip">⏳ Aguardando…</span>}
      </div>

      {needsPath ? (
        <div className="path-choice">
          <p>Escolha seu caminho:</p>
          <button
            onClick={() => choosePath(current.id, 'business')}
            disabled={!isMyTurn}
          >
            💼 Negócios (salário $12.000)
          </button>
          <button
            onClick={() => choosePath(current.id, 'university')}
            disabled={!isMyTurn}
          >
            🎓 Universidade (salário variável)
          </button>
        </div>
      ) : (
        <>
          <div className="roulette">
            <button
              className="btn-roll"
              disabled={locked}
              onClick={rollDice}
            >
              🎲 Girar roleta
            </button>
            {roll != null && <div className="roll-result">{roll}</div>}
          </div>

          <div className="bank-actions">
            <button
              className="btn-secondary"
              onClick={() => takeLoan(1)}
              disabled={locked}
            >
              🏦 Pedir empréstimo ($20.000)
            </button>
            <button
              className="btn-secondary"
              onClick={() => repayLoan(1)}
              disabled={locked || current.promissoryNotes === 0}
            >
              💳 Pagar empréstimo
            </button>
          </div>

          <button
            className="btn-next"
            onClick={nextTurn}
            disabled={locked}
          >
            ➡️ Próximo jogador
          </button>
        </>
      )}
    </section>
  )
}
