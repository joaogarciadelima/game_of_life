import { useState } from 'react'
import { useGame } from '../store/gameStore'
import { formatMoney } from '../game/utils'
import { getSpace } from '../data/board'

export function EventModal() {
  const pending = useGame((s) => s.pendingEvent)
  const players = useGame((s) => s.players)
  const phase = useGame((s) => s.phase)
  const resolve = useGame((s) => s.resolveEvent)
  const buyInsurance = useGame((s) => s.buyInsurance)
  const skipInsurance = useGame((s) => s.skipInsurance)
  const buyStocks = useGame((s) => s.buyStocks)
  const skipStocks = useGame((s) => s.skipStocks)
  const applyRevenge = useGame((s) => s.applyRevenge)
  const rollWeddingGifts = useGame((s) => s.rollWeddingGifts)
  const decideJudgmentDay = useGame((s) => s.decideJudgmentDay)
  const tycoonBet = useGame((s) => s.tycoonBet)
  const chooseBranch = useGame((s) => s.chooseBranch)
  const playStocks = useGame((s) => s.playStocks)
  const luckyDayBet = useGame((s) => s.luckyDayBet)
  const luckyDayKeep = useGame((s) => s.luckyDayKeep)

  if (phase !== 'resolving' || !pending) return null

  const current = players.find((p) => p.id === pending.playerId)
  if (!current) return null

  let content: React.ReactNode = null

  switch (pending.kind) {
    case 'payday':
      content = (
        <>
          <h3>💰 Dia do Pagamento</h3>
          <p>
            {current.name} recebe salário de{' '}
            <strong>{formatMoney(current.salary)}</strong>.
          </p>
          <button onClick={resolve}>OK</button>
        </>
      )
      break
    case 'payday-interest':
      content = (
        <>
          <h3>💰 Dia do Pagamento (com juros)</h3>
          <p>
            Recebe {formatMoney(current.salary)} e paga{' '}
            {formatMoney(current.promissoryNotes * 1000)} de juros.
          </p>
          <button onClick={resolve}>OK</button>
        </>
      )
      break
    case 'lucky-day':
      content = (
        <>
          <h3>🍀 Dia de Sorte</h3>
          <p>Você pode guardar $20.000 ou apostar e tentar ganhar $300.000!</p>
          <button onClick={resolve}>Decidir →</button>
        </>
      )
      break
    case 'lucky-day-bet':
      content = <LuckyDayBetPanel onKeep={luckyDayKeep} onBet={luckyDayBet} />
      break
    case 'gain':
      content = (
        <>
          <h3>➕ {getSpace(current.spaceId).label}</h3>
          <button onClick={resolve}>Receber</button>
        </>
      )
      break
    case 'loss':
      content = (
        <>
          <h3>➖ {getSpace(current.spaceId).label}</h3>
          <button onClick={resolve}>Pagar</button>
        </>
      )
      break
    case 'baby':
      content = (
        <>
          <h3>👶 Nasce um filho!</h3>
          <p>Recebe $1.000 de cada adversário.</p>
          <button onClick={resolve}>OK</button>
        </>
      )
      break
    case 'twins':
      content = (
        <>
          <h3>👶👶 Nascem gêmeos!</h3>
          <p>Recebe $2.000 de cada adversário.</p>
          <button onClick={resolve}>OK</button>
        </>
      )
      break
    case 'wedding': {
      const rolled = pending.data?.giftsRolled
      content = !rolled ? (
        <>
          <h3>💍 Dia do seu Casamento</h3>
          <button onClick={resolve}>Casar-se</button>
        </>
      ) : (
        <>
          <h3>🎁 Presentes de Casamento</h3>
          <p>Gire a roleta: 1-3 = $2k, 4-6 = $1k, 7-10 = nada.</p>
          <button onClick={rollWeddingGifts}>🎲 Girar</button>
        </>
      )
      break
    }
    case 'profession':
      content = (
        <>
          <h3>🎓 {getSpace(current.spaceId).label}</h3>
          <button onClick={resolve}>OK</button>
        </>
      )
      break
    case 'toll':
      content = (
        <>
          <h3>🌉 Ponte do Pedágio</h3>
          <button onClick={resolve}>OK</button>
        </>
      )
      break
    case 'stocks-play':
      content = (
        <>
          <h3>📈 Jogando na Bolsa</h3>
          {current.shares === 0 ? (
            <>
              <p>Você não tem ações.</p>
              <button onClick={skipStocks}>Pular</button>
            </>
          ) : (
            <>
              <p>Você tem {current.shares} ação(ões). Gire a roleta!</p>
              <small>
                1-3: baixa (−$60k) · 4-6: estável · 7-10: alta (+$120k)
              </small>
              <div className="row">
                <button onClick={playStocks}>🎲 Jogar</button>
                <button onClick={skipStocks}>Pular</button>
              </div>
            </>
          )}
        </>
      )
      break
    case 'revenge':
      content = (
        <>
          <h3>⚔️ Vingança</h3>
          <p>Escolha um adversário:</p>
          <div className="revenge-targets">
            {players
              .filter((p) => p.id !== current.id && p.status === 'active')
              .map((t) => (
                <div key={t.id} className="revenge-target">
                  <strong>{t.name}</strong>{' '}
                  <small>({formatMoney(t.money)})</small>
                  <button onClick={() => applyRevenge(t.id, 'money')}>
                    Cobrar $200.000
                  </button>
                  <button onClick={() => applyRevenge(t.id, 'back')}>
                    Voltar 10
                  </button>
                </div>
              ))}
          </div>
        </>
      )
      break
    case 'buy-insurance': {
      const kind = (pending.data?.kind as 'life' | 'car' | 'house') ?? 'life'
      const labels = {
        life: 'Seguro de Vida',
        car: 'Seguro de Carro',
        house: 'Seguro de Casa',
      }
      const already = current.insurances.includes(kind)
      content = (
        <>
          <h3>🛡️ {labels[kind]}</h3>
          {already ? (
            <p>Você já tem esse seguro.</p>
          ) : (
            <p>Preço: $10.000. Quer comprar?</p>
          )}
          <div className="row">
            {!already && (
              <button onClick={() => buyInsurance(kind)}>Comprar</button>
            )}
            <button onClick={skipInsurance}>Pular</button>
          </div>
        </>
      )
      break
    }
    case 'buy-stocks':
      content = (
        <>
          <h3>📈 Ações</h3>
          <p>Preço: $10.000 por ação.</p>
          <div className="row">
            <button onClick={buyStocks}>Comprar</button>
            <button onClick={skipStocks}>Pular</button>
          </div>
        </>
      )
      break
    case 'branch': {
      const options = (pending.data?.options as number[]) ?? []
      content = (
        <>
          <h3>🔀 Bifurcação</h3>
          <p>Escolha o próximo espaço:</p>
          <div className="row">
            {options.map((id) => {
              const sp = getSpace(id)
              return (
                <button key={id} onClick={() => chooseBranch(id)}>
                  #{id} {sp.label}
                </button>
              )
            })}
          </div>
        </>
      )
      break
    }
    case 'judgment-day':
      content = (
        <>
          <h3>⚖️ DIA DO JUÍZO</h3>
          <p>
            Você ganha $48.000 por filho e paga $25.000 por cada nota
            promissória.
          </p>
          <p>Decida:</p>
          <div className="row">
            <button onClick={() => decideJudgmentDay('millionaire')}>
              🏆 Buscar Milionário
            </button>
            <button onClick={() => decideJudgmentDay('tycoon')}>
              👑 Arriscar Magnata
            </button>
          </div>
        </>
      )
      break
    case 'tycoon-bet':
      content = (
        <>
          <h3>👑 Aposta MAGNATA</h3>
          <p>Aposta tudo! Se sair o número escolhido, você ganha o jogo.</p>
          <div className="number-grid">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <button key={n} onClick={() => tycoonBet(n)}>
                {n}
              </button>
            ))}
          </div>
        </>
      )
      break
    case 'millionaire-reached':
      content = (
        <>
          <h3>🏆 MILIONÁRIO!</h3>
          <p>Bônus de $240.000. Você recebe um número da sorte aleatório.</p>
          <button onClick={resolve}>Comemorar!</button>
        </>
      )
      break
    default:
      content = <button onClick={resolve}>OK</button>
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">{content}</div>
    </div>
  )
}

function LuckyDayBetPanel({
  onKeep,
  onBet,
}: {
  onKeep: () => void
  onBet: (n1: number, n2: number) => void
}) {
  const [n1, setN1] = useState<number | null>(null)
  const [n2, setN2] = useState<number | null>(null)

  const pick = (n: number) => {
    if (n1 === null) setN1(n)
    else if (n2 === null && n !== n1) setN2(n)
    else {
      setN1(n)
      setN2(null)
    }
  }

  return (
    <>
      <h3>🍀 Dia de Sorte — Aposta?</h3>
      <div className="row">
        <button onClick={onKeep}>💰 Guardar $20.000</button>
      </div>
      <p>Ou escolha 2 números para apostar (prêmio $300.000):</p>
      <div className="number-grid">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            className={n === n1 || n === n2 ? 'picked' : ''}
            onClick={() => pick(n)}
          >
            {n}
          </button>
        ))}
      </div>
      <button
        className="btn-primary"
        disabled={n1 === null || n2 === null}
        onClick={() => onBet(n1 as number, n2 as number)}
      >
        🎲 Apostar!
      </button>
    </>
  )
}
