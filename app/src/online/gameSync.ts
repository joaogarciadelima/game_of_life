import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type SyncKind = 'snapshot' | 'intent'

export interface SnapshotPayload {
  state: Record<string, unknown>
  sourceProfileId: string
}

export interface IntentPayload {
  action: string
  args: unknown[]
  sourceProfileId: string
}

type Callbacks = {
  onSnapshot: (payload: SnapshotPayload) => void
  onIntent: (payload: IntentPayload) => void
}

let channel: RealtimeChannel | null = null
let currentRoomId: string | null = null

export async function connect(roomId: string, cb: Callbacks): Promise<void> {
  if (!supabase) return
  if (currentRoomId === roomId && channel) return
  disconnect()
  currentRoomId = roomId
  channel = supabase
    .channel(`game:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'game_events',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const row = payload.new as { kind: string; payload: unknown }
        if (row.kind === 'snapshot') {
          cb.onSnapshot(row.payload as SnapshotPayload)
        } else if (row.kind === 'intent') {
          cb.onIntent(row.payload as IntentPayload)
        }
      }
    )
    .subscribe()

  // Catch-up: fetch latest snapshot in case one exists already.
  const { data } = await supabase
    .from('game_events')
    .select('payload')
    .eq('room_id', roomId)
    .eq('kind', 'snapshot')
    .order('seq', { ascending: false })
    .limit(1)
  if (data && data[0]) {
    cb.onSnapshot(data[0].payload as SnapshotPayload)
  }
}

/** Busca o último snapshot persistido (fallback se o Realtime falhar). */
export async function fetchLatestSnapshot(
  roomId: string
): Promise<SnapshotPayload | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('game_events')
    .select('payload')
    .eq('room_id', roomId)
    .eq('kind', 'snapshot')
    .order('seq', { ascending: false })
    .limit(1)
  if (error) {
    console.error('fetchLatestSnapshot failed', error)
    return null
  }
  const row = data?.[0]
  return row ? (row.payload as SnapshotPayload) : null
}

export async function publishSnapshot(
  roomId: string,
  state: Record<string, unknown>,
  sourceProfileId: string
): Promise<void> {
  if (!supabase) return
  const payload: SnapshotPayload = { state, sourceProfileId }
  const { error } = await supabase.from('game_events').insert({
    room_id: roomId,
    kind: 'snapshot',
    actor_id: sourceProfileId,
    payload,
  })
  if (error) console.error('publishSnapshot failed', error)
}

export async function publishIntent(
  roomId: string,
  action: string,
  args: unknown[],
  sourceProfileId: string
): Promise<void> {
  if (!supabase) return
  const payload: IntentPayload = { action, args, sourceProfileId }
  const { error } = await supabase.from('game_events').insert({
    room_id: roomId,
    kind: 'intent',
    actor_id: sourceProfileId,
    payload,
  })
  if (error) console.error('publishIntent failed', error)
}

export function disconnect(): void {
  if (channel && supabase) {
    supabase.removeChannel(channel)
  }
  channel = null
  currentRoomId = null
}
