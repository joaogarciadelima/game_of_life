import { useGame } from '../store/gameStore'

export function Controls() {
  const phase = useGame((s) => s.phase)
  const current = useGame((s) => s.players[s.currentPlayerIndex])
  const roll = useGame((s) => s.rouletteResult)
  const rollDice = useGame((s) => s.rollDice)
  const nextTurn = useGame((s) => s.nextTurn)
  const choosePath = useGame((s) => s.choosePath)
  const takeLoan = useGame((s) => s.takeLoan)
  const repayLoan = useGame((s) => s.repayLoan)

  if (!current) return null
  const needsPath = current.path === null

  return (
    <section className="controls">
      <div className="current-info">
        <span
          className="current-pin"
          style={{ background: current.color }}
        />
        <strong>Vez de: {current.name}</strong>
      </div>

      {needsPath ? (
        <div className="path-choice">
          <p>Escolha seu caminho:</p>
          <button onClick={() => choosePath(current.id, 'business')}>
            💼 Negócios (salário $12.000)
          </button>
          <button onClick={() => choosePath(current.id, 'university')}>
            🎓 Universidade (salário variável)
          </button>
        </div>
      ) : (
        <>
          <div className="roulette">
            <button
              className="btn-roll"
              disabled={phase !== 'idle'}
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
              disabled={phase !== 'idle'}
            >
              🏦 Pedir empréstimo ($20.000)
            </button>
            <button
              className="btn-secondary"
              onClick={() => repayLoan(1)}
              disabled={phase !== 'idle' || current.promissoryNotes === 0}
            >
              💳 Pagar empréstimo
            </button>
          </div>

          <button
            className="btn-next"
            onClick={nextTurn}
            disabled={phase !== 'idle'}
          >
            ➡️ Próximo jogador
          </button>
        </>
      )}
    </section>
  )
}
