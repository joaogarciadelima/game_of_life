import { useGame } from '../store/gameStore'
import { useAuth } from '../store/authStore'
import { useRoom } from '../store/roomStore'

const GENDERS: Array<'blue' | 'pink'> = ['blue', 'pink']

export function RoomView() {
  const { profile } = useAuth()
  const { room, players, toggleReady, startGame, leaveRoom } = useRoom()
  const newGame = useGame((s) => s.newGame)

  if (!room || !profile) return null

  const me = players.find((p) => p.profileId === profile.id)
  const canStart =
    me?.isHost && players.length >= 2 && players.every((p) => p.ready || p.isHost)

  const handleStart = () => {
    startGame()
    // Inicia jogo local com os dados da sala
    newGame(
      players.map((p) => ({
        name: p.displayName,
        gender: p.gender,
        color: p.color,
      }))
    )
  }

  return (
    <div className="room-view">
      <header className="room-header">
        <div>
          <h1>Sala {room.code}</h1>
          <p>{players.length}/{room.maxPlayers} jogadores</p>
        </div>
        <button className="btn-secondary" onClick={leaveRoom}>
          Sair da sala
        </button>
      </header>

      <div className="room-players">
        {players.map((p) => (
          <div key={p.profileId} className="room-player" style={{ borderColor: p.color }}>
            <div className="player-head">
              <span className="dot" style={{ background: p.color }} />
              <strong>{p.displayName}</strong>
              {p.isHost && <span className="host-badge">👑 Host</span>}
              <span className="ready-badge">
                {p.ready ? '✅ Pronto' : '⏳ Esperando'}
              </span>
            </div>
            <small>{GENDERS.includes(p.gender) ? p.gender === 'blue' ? '♂' : '♀' : ''}</small>
          </div>
        ))}
      </div>

      <div className="room-actions">
        {me && !me.isHost && (
          <button
            className="btn-primary"
            onClick={() => toggleReady(me.profileId)}
          >
            {me.ready ? 'Cancelar' : 'Marcar como pronto'}
          </button>
        )}
        {me?.isHost && (
          <button
            className="btn-primary"
            disabled={!canStart}
            onClick={handleStart}
          >
            🚀 Iniciar jogo
          </button>
        )}
      </div>

      <p className="hint">
        (Apenas o host inicia. Modo online completo requer schema em SUPABASE_SETUP.md.)
      </p>
    </div>
  )
}
