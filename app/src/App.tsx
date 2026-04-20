import { useEffect, useState } from 'react'
import { useGame } from './store/gameStore'
import { useAuth } from './store/authStore'
import { useRoom } from './store/roomStore'
import { LoginScreen } from './components/LoginScreen'
import { Lobby } from './components/Lobby'
import { RoomView } from './components/RoomView'
import { Setup } from './components/Setup'
import { Board } from './components/Board'
import { PlayerPanel } from './components/PlayerPanel'
import { Controls } from './components/Controls'
import { EventModal } from './components/EventModal'
import { LogPanel } from './components/LogPanel'
import { BettingPanel } from './components/BettingPanel'
import { WealthCardsPanel } from './components/WealthCardsPanel'
import { GameOverScreen } from './components/GameOverScreen'
import './App.css'

type Route = 'lobby' | 'room' | 'local-setup' | 'game'

function App() {
  const [route, setRoute] = useState<Route>('lobby')
  const phase = useGame((s) => s.phase)
  const { profile, initialized, init } = useAuth()
  const room = useRoom((s) => s.room)

  useEffect(() => {
    init()
  }, [init])

  useEffect(() => {
    // Quando o host inicia o jogo online, phase vai para 'idle'
    if (phase !== 'setup' && phase !== 'game-over') {
      if (route !== 'game') setRoute('game')
    }
  }, [phase, route])

  useEffect(() => {
    if (room && route === 'lobby') setRoute('room')
  }, [room, route])

  if (!initialized) {
    return <div className="loading">Carregando...</div>
  }

  if (!profile) return <LoginScreen />

  if (phase === 'game-over') return <GameOverScreen />

  if (route === 'game' && phase !== 'setup') {
    return (
      <div className="game-layout">
        <header className="game-header">
          <h1>🎲 Jogo da Vida</h1>
          <span className="profile-badge">{profile.displayName}</span>
        </header>
        <main className="game-main">
          <Board />
          <div className="side">
            <PlayerPanel />
            <Controls />
            <WealthCardsPanel />
            <BettingPanel />
            <LogPanel />
          </div>
        </main>
        <EventModal />
      </div>
    )
  }

  if (route === 'local-setup') return <Setup />

  if (route === 'room' && room) return <RoomView />

  return <Lobby onLocalPlay={() => setRoute('local-setup')} />
}

export default App
