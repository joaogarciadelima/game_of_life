import { useState } from 'react'
import { useAuth } from '../store/authStore'
import { hasSupabase } from '../lib/supabase'

type Tab = 'google' | 'email' | 'guest'

export function LoginScreen() {
  const [tab, setTab] = useState<Tab>('guest')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)

  const { loading, error, signInGoogle, signInEmail, signUpEmail, signInGuest } =
    useAuth()

  return (
    <div className="login">
      <div className="login-card">
        <h1>🎲 Jogo da Vida</h1>
        <p className="subtitle">Entre para começar a jogar</p>

        {!hasSupabase && (
          <div className="warning">
            ⚠️ Supabase não configurado — apenas modo Convidado disponível.
            <br />
            <small>Veja <code>SUPABASE_SETUP.md</code></small>
          </div>
        )}

        <div className="tabs">
          <button
            className={tab === 'guest' ? 'active' : ''}
            onClick={() => setTab('guest')}
          >
            👤 Convidado
          </button>
          <button
            className={tab === 'google' ? 'active' : ''}
            onClick={() => setTab('google')}
            disabled={!hasSupabase}
          >
            🔑 Google
          </button>
          <button
            className={tab === 'email' ? 'active' : ''}
            onClick={() => setTab('email')}
            disabled={!hasSupabase}
          >
            ✉️ Email
          </button>
        </div>

        {tab === 'guest' && (
          <div className="tab-panel">
            <input
              placeholder="Seu nome"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={20}
            />
            <button
              className="btn-primary"
              onClick={() => signInGuest(displayName || 'Convidado')}
            >
              Jogar como Convidado
            </button>
            <p className="hint">
              Jogue sem conta. Seu progresso não será salvo online.
            </p>
          </div>
        )}

        {tab === 'google' && (
          <div className="tab-panel">
            <button
              className="btn-google"
              onClick={() => signInGoogle()}
              disabled={loading}
            >
              Continuar com Google
            </button>
            <p className="hint">Login rápido, sem senhas.</p>
          </div>
        )}

        {tab === 'email' && (
          <div className="tab-panel">
            {isSignUp && (
              <input
                placeholder="Nome de exibição"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            )}
            <input
              type="email"
              placeholder="email@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              className="btn-primary"
              onClick={() =>
                isSignUp
                  ? signUpEmail(email, password, displayName)
                  : signInEmail(email, password)
              }
              disabled={loading || !email || !password}
            >
              {isSignUp ? 'Criar conta' : 'Entrar'}
            </button>
            <button
              className="btn-link"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Já tenho conta' : 'Criar uma conta'}
            </button>
          </div>
        )}

        {error && <div className="error">{error}</div>}
      </div>
    </div>
  )
}
