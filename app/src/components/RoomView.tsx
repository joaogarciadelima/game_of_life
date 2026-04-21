import { useEffect } from 'react'
import { useGame } from '../store/gameStore'
import { useAuth } from '../store/authStore'
import { useRoom } from '../store/roomStore'

const GENDERS: Array<'blue' | 'pink'> = ['blue', 'pink']

export function RoomView() {
  const { profile } = useAuth()
  const { room, players, toggleReady, startGame, leaveRoom } = useRoom()
  const newGame = useGame((s) => s.newGame)
  const initOnline = useGame((s) => s.initOnline)
  const leaveOnline = useGame((s) => s.leaveOnline)
  const online = useGame((s) => s.online)
  const phase = useGame((s) => s.phase)
  const catchUp = useGame((s) => s.catchUp)

  // Conecta ao canal de sync assim que sala e perfil estão disponíveis
  useEffect(() => {
    if (!room || !profile) return
    if (online?.roomId === room.id) return
    initOnline({
      roomId: room.id,
      myProfileId: profile.id,
      hostProfileId: room.hostId,
    })
  }, [room, profile, online, initOnline])

  // Fallback: se o host já iniciou mas Realtime atrasou, puxamos o último
  // snapshot diretamente. Re-tenta enquanto a fase ainda está em 'setup'.
  useEffect(() => {
    if (!room || !profile) return
    if (room.status !== 'playing') return
    if (phase !== 'setup') return
    let cancelled = false
    const tryCatchUp = async () => {
      if (cancelled) return
      await catchUp()
    }
    tryCatchUp()
    const interval = setInterval(tryCatchUp, 1500)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [room, room?.status, profile, phase, catchUp])

  if (!room || !profile) return null

  const me = players.find((p) => p.profileId === profile.id)
  const canStart =
    me?.isHost && players.length >= 2 && players.every((p) => p.ready || p.isHost)

  const handleStart = () => {
    startGame()
    // Host inicia gameStore local; snapshot propagará para guests via Realtime
    newGame(
      players.map((p) => ({
        name: p.displayName,
        gender: p.gender,
        color: p.color,
        profileId: p.profileId,
      }))
    )
  }

  const handleLeave = () => {
    leaveOnline()
    leaveRoom()
  }

  return (
    <div className="room-view">
      <header className="room-header">
        <div>
          <h1>Sala {room.code}</h1>
          <p>{players.length}/{room.maxPlayers} jogadores</p>
        </div>
        <button className="btn-secondary" onClick={handleLeave}>
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
        (Apenas o host inicia. Guests recebem o estado do jogo em tempo real.)
      </p>
    </div>
  )
}
