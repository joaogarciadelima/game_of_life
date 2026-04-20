// ===== TIPOS PARA MODO ONLINE =====

export type RoomStatus = 'waiting' | 'playing' | 'finished'

export interface Room {
  id: string              // uuid
  code: string            // ex: "XK7P" — para convites
  hostId: string          // profile_id do dono
  status: RoomStatus
  maxPlayers: number
  createdAt: string
}

export interface RoomPlayer {
  roomId: string
  profileId: string
  displayName: string
  color: string
  gender: 'blue' | 'pink'
  ready: boolean
  seatIndex: number
  isHost: boolean
}

/**
 * Cada evento importante do jogo é registrado no DB.
 * Os clientes se inscrevem via Realtime e aplicam localmente.
 */
export interface GameEvent {
  id: string
  roomId: string
  seq: number             // ordem estrita
  kind: string            // corresponde a PendingEventKind ou action name
  payload: Record<string, unknown>
  createdAt: string
}

export type GameMode = 'local' | 'online'
