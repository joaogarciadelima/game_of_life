import { useState } from 'react'
import { useAuth } from '../store/authStore'
import { useRoom } from '../store/roomStore'
import { hasSupabase } from '../lib/supabase'

type Mode = 'local' | 'create' | 'join'

interface Props {
  onLocalPlay: () => void
}

export function Lobby({ onLocalPlay }: Props) {
  const { profile, signOut } = useAuth()
  const { createRoom, joinRoom, loading, error } = useRoom()
  const [mode, setMode] = useState<Mode | null>(null)
  const [code, setCode] = useState('')
  const [createdCode, setCreatedCode] = useState<string | null>(null)

  if (!profile) return null

  const canOnline = hasSupabase && !profile.isGuest

  return (
    <div className="lobby">
      <header className="lobby-header">
        <div>
          <h1>🎲 Jogo da Vida</h1>
          <p>
            Olá, <strong>{profile.displayName}</strong>!
            {profile.isGuest && ' (convidado)'}
          </p>
        </div>
        <button className="btn-secondary" onClick={signOut}>
          Sair
        </button>
      </header>

      {!mode && (
        <div className="lobby-choices">
          <div className="choice-card" onClick={onLocalPlay}>
            <h2>🏠 Jogar local</h2>
            <p>Mesmo dispositivo, revezando turnos.</p>
          </div>
          <div
            className={`choice-card ${!canOnline ? 'disabled' : ''}`}
            onClick={() => canOnline && setMode('create')}
          >
            <h2>🌐 Criar sala online</h2>
            <p>Convide amigos por código.</p>
            {!canOnline && (
              <small>
                {!hasSupabase
                  ? 'Requer Supabase configurado'
                  : 'Convidados não podem criar salas'}
              </small>
            )}
          </div>
          <div
            className={`choice-card ${!hasSupabase ? 'disabled' : ''}`}
            onClick={() => hasSupabase && setMode('join')}
          >
            <h2>🔗 Entrar em sala</h2>
            <p>Use um código de convite.</p>
          </div>
        </div>
      )}

      {mode === 'create' && !createdCode && (
        <div className="lobby-panel">
          <button className="btn-link" onClick={() => setMode(null)}>
            ← Voltar
          </button>
          <h2>Criar sala</h2>
          <button
            className="btn-primary"
            disabled={loading}
            onClick={async () => {
              const c = await createRoom(profile.id, profile.displayName)
              if (c) setCreatedCode(c)
            }}
          >
            Criar agora
          </button>
        </div>
      )}

      {createdCode && (
        <div className="lobby-panel">
          <h2>Sala criada!</h2>
          <p>Compartilhe este código:</p>
          <div className="invite-code">{createdCode}</div>
          <p>Aguardando jogadores...</p>
          <p className="hint">
            (Tela da sala será mostrada assim que outros entrarem.)
          </p>
        </div>
      )}

      {mode === 'join' && (
        <div className="lobby-panel">
          <button className="btn-link" onClick={() => setMode(null)}>
            ← Voltar
          </button>
          <h2>Entrar em sala</h2>
          <input
            placeholder="Código (ex: XK7P)"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={4}
          />
          <button
            className="btn-primary"
            disabled={loading || code.length !== 4}
            onClick={() => joinRoom(code, profile.id, profile.displayName)}
          >
            Entrar
          </button>
        </div>
      )}

      {error && <div className="error">{error}</div>}
    </div>
  )
}
