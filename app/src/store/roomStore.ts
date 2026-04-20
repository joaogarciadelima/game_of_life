import { create } from 'zustand'
import type { Room, RoomPlayer } from '../types/online'
import { supabase, hasSupabase } from '../lib/supabase'

interface RoomState {
  room: Room | null
  players: RoomPlayer[]
  loading: boolean
  error: string | null
  createRoom: (hostId: string, displayName: string) => Promise<string | null>
  joinRoom: (code: string, profileId: string, displayName: string) => Promise<boolean>
  leaveRoom: () => Promise<void>
  toggleReady: (profileId: string) => Promise<void>
  startGame: () => Promise<void>
  subscribe: () => void
  unsubscribe: () => void
}

let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null

const genCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export const useRoom = create<RoomState>((set, get) => ({
  room: null,
  players: [],
  loading: false,
  error: null,

  createRoom: async (hostId, displayName) => {
    if (!hasSupabase || !supabase) {
      set({ error: 'Supabase não configurado.' })
      return null
    }
    set({ loading: true, error: null })
    const code = genCode()
    const { data: room, error } = await supabase
      .from('rooms')
      .insert({ code, host_id: hostId, status: 'waiting', max_players: 6 })
      .select()
      .single()
    if (error || !room) {
      set({ loading: false, error: error?.message ?? 'erro ao criar sala' })
      return null
    }
    const { error: pe } = await supabase.from('room_players').insert({
      room_id: room.id,
      profile_id: hostId,
      display_name: displayName,
      color: '#ef4444',
      gender: 'blue',
      seat_index: 0,
      is_host: true,
      ready: false,
    })
    if (pe) {
      set({ loading: false, error: pe.message })
      return null
    }
    set({
      room: mapRoom(room),
      players: [],
      loading: false,
    })
    get().subscribe()
    return code
  },

  joinRoom: async (code, profileId, displayName) => {
    if (!hasSupabase || !supabase) {
      set({ error: 'Supabase não configurado.' })
      return false
    }
    set({ loading: true, error: null })
    const { data: room, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('status', 'waiting')
      .single()
    if (error || !room) {
      set({ loading: false, error: 'Sala não encontrada' })
      return false
    }
    const { data: existing } = await supabase
      .from('room_players')
      .select('*')
      .eq('room_id', room.id)
    const seatIndex = existing?.length ?? 0
    const colors = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#a855f7', '#ec4899']
    const { error: pe } = await supabase.from('room_players').insert({
      room_id: room.id,
      profile_id: profileId,
      display_name: displayName,
      color: colors[seatIndex % colors.length],
      gender: 'blue',
      seat_index: seatIndex,
      is_host: false,
      ready: false,
    })
    if (pe) {
      set({ loading: false, error: pe.message })
      return false
    }
    set({ room: mapRoom(room), loading: false })
    get().subscribe()
    return true
  },

  leaveRoom: async () => {
    const r = get().room
    if (!r || !supabase) return
    get().unsubscribe()
    set({ room: null, players: [] })
  },

  toggleReady: async (profileId) => {
    const r = get().room
    if (!r || !supabase) return
    const p = get().players.find((x) => x.profileId === profileId)
    if (!p) return
    await supabase
      .from('room_players')
      .update({ ready: !p.ready })
      .eq('room_id', r.id)
      .eq('profile_id', profileId)
  },

  startGame: async () => {
    const r = get().room
    if (!r || !supabase) return
    await supabase.from('rooms').update({ status: 'playing' }).eq('id', r.id)
  },

  subscribe: () => {
    const r = get().room
    if (!r || !supabase) return
    // Refresh players list on any change
    const refresh = async () => {
      const { data } = await supabase!
        .from('room_players')
        .select('*')
        .eq('room_id', r.id)
        .order('seat_index')
      if (data) set({ players: data.map(mapRoomPlayer) })
      const { data: room } = await supabase!
        .from('rooms')
        .select('*')
        .eq('id', r.id)
        .single()
      if (room) set({ room: mapRoom(room) })
    }
    refresh()
    channel = supabase
      .channel(`room:${r.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'room_players', filter: `room_id=eq.${r.id}` },
        refresh
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${r.id}` },
        refresh
      )
      .subscribe()
  },

  unsubscribe: () => {
    if (channel && supabase) {
      supabase.removeChannel(channel)
      channel = null
    }
  },
}))

// ========= Mappers (snake_case do DB → camelCase) =========
const mapRoom = (r: Record<string, unknown>): Room => ({
  id: r.id as string,
  code: r.code as string,
  hostId: r.host_id as string,
  status: r.status as Room['status'],
  maxPlayers: (r.max_players as number) ?? 6,
  createdAt: r.created_at as string,
})

const mapRoomPlayer = (p: Record<string, unknown>): RoomPlayer => ({
  roomId: p.room_id as string,
  profileId: p.profile_id as string,
  displayName: p.display_name as string,
  color: p.color as string,
  gender: p.gender as 'blue' | 'pink',
  ready: Boolean(p.ready),
  seatIndex: (p.seat_index as number) ?? 0,
  isHost: Boolean(p.is_host),
})
