import { useGame } from '../store/gameStore'

export function LogPanel() {
  const log = useGame((s) => s.log)
  return (
    <div className="log-panel">
      <h3>Histórico</h3>
      <ul>
        {[...log].slice(-30).reverse().map((entry, i) => (
          <li key={i}>{entry}</li>
        ))}
      </ul>
    </div>
  )
}
