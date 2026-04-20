import { useGame } from '../store/gameStore'
import { formatMoney } from '../game/utils'

export function GameOverScreen() {
  const computeFinalScores = useGame((s) => s.computeFinalScores)
  const players = useGame((s) => s.players)
  const scores = computeFinalScores()
  const tycoon = players.find((p) => p.status === 'tycoon')

  return (
    <div className="game-over">
      <div className="game-over-card">
        <h1>🏁 Fim de jogo</h1>

        {tycoon ? (
          <div className="winner-banner">
            👑 <strong>{tycoon.name}</strong> é MAGNATA e venceu o jogo!
          </div>
        ) : (
          <div className="winner-banner">
            🏆 <strong>{scores[0]?.name}</strong> venceu com{' '}
            {formatMoney(scores[0]?.total ?? 0)}!
          </div>
        )}

        <h3>Placar final</h3>
        <table className="scoreboard">
          <thead>
            <tr>
              <th>#</th>
              <th>Jogador</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, i) => (
              <tr key={s.id}>
                <td>{i + 1}º</td>
                <td>{s.name}</td>
                <td>{formatMoney(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <button
          className="btn-primary"
          onClick={() => window.location.reload()}
        >
          Novo jogo
        </button>
      </div>
    </div>
  )
}
