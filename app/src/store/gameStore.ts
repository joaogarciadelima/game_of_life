import { create } from 'zustand'
import type {
  GameState,
  Player,
  Path,
  Gender,
  PendingEvent,
  InsuranceKind,
  WealthCardKind,
  RouletteBet,
  OnlineCtx,
} from '../types/game'
import {
  connect as syncConnect,
  disconnect as syncDisconnect,
  publishSnapshot,
  publishIntent,
} from '../online/gameSync'
import {
  BOARD,
  BUSINESS_START_ID,
  UNIVERSITY_START_ID,
  MILLIONAIRE_ID,
  JUDGMENT_DAY_ID,
  getSpace,
} from '../data/board'
import {
  BUSINESS_SALARY,
  LOAN_UNIT,
  LOAN_INTEREST,
  BIRTH_PAYOUT,
  TWINS_PAYOUT,
  WEDDING_PAYOUT_HIGH,
  WEDDING_PAYOUT_MID,
  LUCKY_DAY_REWARD,
  LUCKY_DAY_BET_WIN,
  TOLL_AMOUNT,
  REVENGE_DEMAND,
  JUDGMENT_CHILD_BONUS,
  MILLIONAIRE_BONUS,
  MILLIONAIRE_LUCKY_PAYOUT,
  STOCKS_LOSS,
  STOCKS_GAIN,
  STOCKS_FINAL_VALUE,
  LIFE_INSURANCE_FINAL_VALUE,
  MAX_ROULETTE_BET,
  ROULETTE_PAYOUT_MULTIPLIER,
} from '../game/constants'
import {
  createPlayer,
  buildWealthDeck,
  spinRoulette,
  uid,
} from '../game/utils'

// ========= AÇÕES DO STORE =========
interface Actions {
  newGame: (
    players: { name: string; gender: Gender; color: string; profileId?: string | null }[]
  ) => void
  /** Configura sincronização online e subscreve ao canal da sala. */
  initOnline: (ctx: OnlineCtx) => Promise<void>
  /** Encerra sincronização (sai da sala). */
  leaveOnline: () => void
  /** Reseta para tela de lobby (phase='setup') — chamado ao sair da partida. */
  resetGame: () => void
  choosePath: (playerId: string, path: Path) => void
  rollDice: () => void
  resolveEvent: () => void
  nextTurn: () => void
  // Eventos interativos
  buyInsurance: (kind: InsuranceKind) => void
  skipInsurance: () => void
  buyStocks: () => void
  skipStocks: () => void
  playStocks: () => void              // bolsa
  takeLoan: (units: number) => void
  repayLoan: (units: number) => void
  applyRevenge: (targetId: string, mode: 'money' | 'back') => void
  rollWeddingGifts: () => void
  decideJudgmentDay: (choice: 'millionaire' | 'tycoon') => void
  tycoonBet: (number: number) => void
  collectToll: () => void
  chooseBranch: (targetSpaceId: number) => void
  // Cartões de Riqueza
  useShareProfit: (targetId: string) => void
  useShareExpense: (targetId: string) => void
  useExemption: () => void
  // Apostas na roleta
  placeBet: (playerId: string, number: number, amount: number) => void
  removeBet: (playerId: string) => void
  // Lucky Day — apostar bônus
  luckyDayBet: (n1: number, n2: number) => void
  luckyDayKeep: () => void
  // Fim de jogo
  computeFinalScores: () => { id: string; name: string; total: number }[]
}

export type Store = GameState & Actions

// ========= ESTADO INICIAL =========
const initialState: GameState = {
  phase: 'setup',
  players: [],
  currentPlayerIndex: 0,
  spaces: BOARD,
  rouletteResult: null,
  pendingEvent: null,
  bridgeOwnerId: null,
  wealthDeck: [],
  log: [],
  bets: [],
  seed: Date.now(),
  online: null,
}

// ========= SYNC ONLINE (helpers internos) =========

/** Flag para não re-publicar snapshot enquanto estamos hidratando do remoto. */
let _hydrating = false
/** Último snapshot serializado — evita publishes redundantes. */
let _lastSnapshotJson: string | null = null
let _publishTimer: ReturnType<typeof setTimeout> | null = null

const INTENT_ACTIONS = new Set([
  'choosePath', 'rollDice', 'resolveEvent', 'nextTurn',
  'buyInsurance', 'skipInsurance', 'buyStocks', 'skipStocks', 'playStocks',
  'takeLoan', 'repayLoan', 'applyRevenge',
  'rollWeddingGifts', 'decideJudgmentDay', 'tycoonBet',
  'chooseBranch',
  'useShareProfit', 'useShareExpense', 'useExemption',
  'placeBet', 'removeBet',
  'luckyDayBet', 'luckyDayKeep',
])

/** Retorna true se a ação deve ser redirecionada como intent (jogador não é host). */
function routeAsIntent(state: GameState, action: string, args: unknown[]): boolean {
  const o = state.online
  if (!o) return false
  if (o.myProfileId === o.hostProfileId) return false
  if (!INTENT_ACTIONS.has(action)) return false
  publishIntent(o.roomId, action, args, o.myProfileId)
  return true
}

/** Seleciona apenas o subset do estado relevante para sincronizar. */
function snapshotOf(s: GameState): Record<string, unknown> {
  return {
    phase: s.phase,
    players: s.players,
    currentPlayerIndex: s.currentPlayerIndex,
    rouletteResult: s.rouletteResult,
    pendingEvent: s.pendingEvent,
    bridgeOwnerId: s.bridgeOwnerId,
    wealthDeck: s.wealthDeck,
    log: s.log,
    bets: s.bets,
    seed: s.seed,
  }
}

export const useGame = create<Store>((set, get) => ({
  ...initialState,

  // ========= NOVO JOGO =========
  newGame: (defs) =>
    set((s) => ({
      ...initialState,
      phase: 'idle',
      players: defs.map((d) =>
        createPlayer(d.name, d.gender, d.color, d.profileId ?? null)
      ),
      wealthDeck: buildWealthDeck(),
      log: ['Jogo iniciado.'],
      seed: Date.now(),
      online: s.online, // preserva contexto online
    })),

  // ========= ONLINE SYNC =========
  initOnline: async (ctx) => {
    set({ online: ctx })
    await syncConnect(ctx.roomId, {
      onSnapshot: ({ state, sourceProfileId }) => {
        // Ignora meus próprios snapshots (eco)
        if (sourceProfileId === ctx.myProfileId) return
        _hydrating = true
        try {
          useGame.setState({
            ...(state as Partial<GameState>),
            spaces: BOARD,
          })
        } finally {
          _hydrating = false
        }
      },
      onIntent: ({ action, args, sourceProfileId }) => {
        // Só o host executa intents
        if (ctx.myProfileId !== ctx.hostProfileId) return
        if (sourceProfileId === ctx.myProfileId) return
        const store = useGame.getState() as unknown as Record<string, unknown>
        const fn = store[action]
        if (typeof fn === 'function') {
          try {
            ;(fn as (...a: unknown[]) => unknown)(...(args ?? []))
          } catch (err) {
            console.error('Erro aplicando intent remoto', action, err)
          }
        }
      },
    })
  },

  leaveOnline: () => {
    syncDisconnect()
    set({ online: null })
  },

  resetGame: () => set({ ...initialState, online: null }),

  // ========= ESCOLHA INICIAL DE CAMINHO =========
  choosePath: (playerId, path) => {
    if (routeAsIntent(get(), 'choosePath', [playerId, path])) return
    set((s) => {
      const players = s.players.map((p) =>
        p.id === playerId
          ? {
              ...p,
              path,
              salary: path === 'business' ? BUSINESS_SALARY : 0,
            }
          : p
      )
      return {
        players,
        pendingEvent: null,
        log: [
          ...s.log,
          `${findName(players, playerId)} escolheu ${
            path === 'business' ? 'Negócios' : 'Universidade'
          }.`,
        ],
      }
    })
  },

  // ========= GIRO PRINCIPAL =========
  rollDice: () => {
    if (routeAsIntent(get(), 'rollDice', [])) return
    const s = get()
    const current = s.players[s.currentPlayerIndex]
    if (current.status !== 'active' || !current.path) return
    const roll = spinRoulette()

    // 1) Resolve apostas dos adversários (se houver)
    let players = resolveBets(s.players, s.bets, roll, current.id)
    const betsLog = betsLogEntries(s.bets, roll, players)

    // 2) Paga número da sorte de milionários já declarados
    players = payMillionaireLucky(players, roll, current.id)

    // 3) Calcula destino, respeitando bifurcações via data.branchChoice (none por ora)
    const { destId, passed, branchedAt } = walk(current, roll, s.players)

    // 4) Se encontrou bifurcação mid-path → solicita escolha
    if (branchedAt != null) {
      const space = getSpace(branchedAt)
      set({
        rouletteResult: roll,
        players: players.map((p) =>
          p.id === current.id ? { ...p, spaceId: branchedAt } : p
        ),
        pendingEvent: {
          kind: 'branch',
          playerId: current.id,
          data: { options: space.next, remainingSteps: passedRemaining(current, passed, roll, branchedAt) },
        },
        phase: 'resolving',
        log: [...s.log, `🎲 ${current.name} tirou ${roll}.`, ...betsLog],
        bets: [],
      })
      return
    }

    // 5) Aplica eventos de passagem (payday, pedágio)
    let currentPlayer = players.find((p) => p.id === current.id)!
    const { updatedPlayer, passEvents, ownerPayments } = collectPassThroughEvents(
      currentPlayer,
      passed,
      s.bridgeOwnerId,
      players
    )
    players = players.map((p) => {
      if (p.id === updatedPlayer.id) return updatedPlayer
      const pay = ownerPayments.find((o) => o.toPlayerId === p.id)
      return pay ? { ...p, money: p.money + pay.amount } : p
    })
    // Move ao destino
    players = players.map((p) =>
      p.id === currentPlayer.id ? { ...p, spaceId: destId } : p
    )

    // 6) Se passou pela ponte sem dono, torna-se dono
    let bridgeOwnerId = s.bridgeOwnerId
    let bridgeLog: string[] = []
    if (!bridgeOwnerId && passed.some((id) => getSpace(id).type === 'toll')) {
      bridgeOwnerId = current.id
      bridgeLog.push(`🌉 ${current.name} é agora o dono do Pedágio!`)
    } else if (
      !bridgeOwnerId &&
      getSpace(destId).type === 'toll'
    ) {
      bridgeOwnerId = current.id
      bridgeLog.push(`🌉 ${current.name} chegou primeiro ao Pedágio — é agora o dono!`)
    }

    // 7) Gera evento do espaço destino
    const space = getSpace(destId)
    const pending = resolveSpaceEvent(current.id, space.type)

    // 8) Sorteia Cartão de Riqueza se parou com número exato num Dia do Pagamento
    let wealthDeck = s.wealthDeck
    let extraLog: string[] = []
    if (space.type === 'payday' && wealthDeck.length > 0) {
      const card = wealthDeck[0]
      wealthDeck = wealthDeck.slice(1)
      players = players.map((p) =>
        p.id === current.id
          ? { ...p, wealthCards: [...p.wealthCards, card] }
          : p
      )
      extraLog.push(`🎴 ${current.name} tirou cartão: ${wealthCardLabel(card.kind)}.`)
    }

    set({
      phase: pending ? 'resolving' : 'idle',
      rouletteResult: roll,
      players,
      pendingEvent: pending,
      bridgeOwnerId,
      wealthDeck,
      bets: [],
      log: [
        ...s.log,
        `🎲 ${current.name} tirou ${roll}.`,
        ...betsLog,
        ...passEvents,
        ...bridgeLog,
        ...extraLog,
      ],
    })
  },

  // ========= RESOLVE EVENTO DO ESPAÇO =========
  resolveEvent: () => {
    if (routeAsIntent(get(), 'resolveEvent', [])) return
    const s = get()
    const pe = s.pendingEvent
    if (!pe) return
    const idx = s.players.findIndex((p) => p.id === pe.playerId)
    if (idx < 0) return
    const current = s.players[idx]
    let players = s.players
    let log = [...s.log]
    let phase: GameState['phase'] = 'idle'
    let pending: PendingEvent | null = null
    let bridgeOwnerId = s.bridgeOwnerId

    const replace = (p: Player) =>
      players.map((x) => (x.id === p.id ? p : x))

    switch (pe.kind) {
      case 'payday': {
        const updated = { ...current, money: current.money + current.salary }
        players = replace(updated)
        log.push(`💰 ${current.name} recebeu $${current.salary.toLocaleString('pt-BR')}.`)
        break
      }
      case 'payday-interest': {
        const interest = current.promissoryNotes * LOAN_INTEREST
        const updated = {
          ...current,
          money: current.money + current.salary - interest,
        }
        players = replace(updated)
        log.push(
          `💰 ${current.name} recebeu $${current.salary.toLocaleString('pt-BR')} e pagou $${interest.toLocaleString('pt-BR')} de juros.`
        )
        break
      }
      case 'lucky-day': {
        // Apresenta opção: apostar ou guardar
        pending = { kind: 'lucky-day-bet', playerId: current.id }
        phase = 'resolving'
        break
      }
      case 'gain': {
        const space = getSpace(current.spaceId)
        const amount = space.amount ?? 0
        const updated = { ...current, money: current.money + amount }
        players = replace(updated)
        log.push(`➕ ${current.name} ganhou $${amount.toLocaleString('pt-BR')}.`)
        break
      }
      case 'loss': {
        const space = getSpace(current.spaceId)
        const amount = space.amount ?? 0
        const updated = { ...current, money: current.money - amount }
        players = replace(updated)
        log.push(`➖ ${current.name} pagou $${amount.toLocaleString('pt-BR')}.`)
        break
      }
      case 'baby': {
        const gender: Gender = Math.random() < 0.5 ? 'blue' : 'pink'
        const totalPay = (countActive(s.players) - 1) * BIRTH_PAYOUT
        players = s.players.map((p) => {
          if (p.id === current.id)
            return {
              ...p,
              children: [...p.children, { id: uid('ch'), gender }],
              money: p.money + totalPay,
            }
          return p.status === 'active' && p.id !== current.id
            ? { ...p, money: p.money - BIRTH_PAYOUT }
            : p
        })
        log.push(`👶 ${current.name} teve um filho! +$${totalPay.toLocaleString('pt-BR')}.`)
        break
      }
      case 'twins': {
        const totalPay = (countActive(s.players) - 1) * TWINS_PAYOUT
        players = s.players.map((p) => {
          if (p.id === current.id)
            return {
              ...p,
              children: [
                ...p.children,
                { id: uid('ch'), gender: 'blue' },
                { id: uid('ch'), gender: 'pink' },
              ],
              money: p.money + totalPay,
            }
          return p.status === 'active' && p.id !== current.id
            ? { ...p, money: p.money - TWINS_PAYOUT }
            : p
        })
        log.push(`👶👶 ${current.name} teve GÊMEOS! +$${totalPay.toLocaleString('pt-BR')}.`)
        break
      }
      case 'wedding': {
        const spouseGender: Gender = current.gender === 'blue' ? 'pink' : 'blue'
        const updated = { ...current, spouse: spouseGender }
        players = replace(updated)
        log.push(`💍 ${current.name} casou-se!`)
        pending = { kind: 'wedding', playerId: current.id, data: { giftsRolled: true } }
        phase = 'resolving'
        break
      }
      case 'profession': {
        const space = getSpace(current.spaceId)
        if (space.profession) {
          const updated = {
            ...current,
            profession: space.profession.name,
            salary: space.profession.salary,
          }
          players = replace(updated)
          log.push(
            `🎓 ${current.name} é ${space.profession.name} ($${space.profession.salary.toLocaleString('pt-BR')}).`
          )
        }
        break
      }
      case 'toll': {
        // Se há dono, cobra do jogador
        if (s.bridgeOwnerId && s.bridgeOwnerId !== current.id) {
          const owner = s.players.find((p) => p.id === s.bridgeOwnerId)
          if (owner) {
            players = s.players.map((p) => {
              if (p.id === current.id) return { ...p, money: p.money - TOLL_AMOUNT }
              if (p.id === owner.id) return { ...p, money: p.money + TOLL_AMOUNT }
              return p
            })
            log.push(`🌉 ${current.name} pagou $${TOLL_AMOUNT.toLocaleString('pt-BR')} de pedágio para ${owner.name}.`)
          }
        }
        break
      }
      case 'stocks-play': {
        pending = pe
        phase = 'resolving'
        break
      }
      case 'revenge':
      case 'buy-insurance':
      case 'buy-stocks':
      case 'judgment-day':
      case 'tycoon-bet':
      case 'branch': {
        pending = pe
        phase = 'resolving'
        break
      }
      case 'millionaire-reached': {
        const luckyNumber = spinRoulette()
        const updated: Player = {
          ...current,
          money: current.money + MILLIONAIRE_BONUS,
          status: 'millionaire',
          finished: true,
          luckyNumber,
        }
        players = replace(updated)
        log.push(
          `🏆 ${current.name} virou MILIONÁRIO! +$${MILLIONAIRE_BONUS.toLocaleString('pt-BR')}. Número da sorte: ${luckyNumber}.`
        )
        break
      }
      default:
        break
    }
    set({ phase, players, pendingEvent: pending, log, bridgeOwnerId })
  },

  // ========= SEGUROS =========
  buyInsurance: (kind) => {
    if (routeAsIntent(get(), 'buyInsurance', [kind])) return
    const s = get()
    const pe = s.pendingEvent
    if (!pe) return
    const current = s.players.find((p) => p.id === pe.playerId)!
    const price = 10000
    if (current.money < price || current.insurances.includes(kind)) return
    const updated: Player = {
      ...current,
      money: current.money - price,
      insurances: [...current.insurances, kind],
    }
    set({
      players: s.players.map((p) => (p.id === current.id ? updated : p)),
      pendingEvent: null,
      phase: 'idle',
      log: [...s.log, `🛡️ ${current.name} comprou seguro de ${kind}.`],
    })
  },
  skipInsurance: () => {
    if (routeAsIntent(get(), 'skipInsurance', [])) return
    set({ pendingEvent: null, phase: 'idle' })
  },

  buyStocks: () => {
    if (routeAsIntent(get(), 'buyStocks', [])) return
    const s = get()
    const pe = s.pendingEvent
    if (!pe) return
    const current = s.players.find((p) => p.id === pe.playerId)!
    const price = 10000
    if (current.money < price) return
    const updated = {
      ...current,
      money: current.money - price,
      shares: current.shares + 1,
    }
    set({
      players: s.players.map((p) => (p.id === current.id ? updated : p)),
      pendingEvent: null,
      phase: 'idle',
      log: [...s.log, `📈 ${current.name} comprou 1 ação.`],
    })
  },
  skipStocks: () => {
    if (routeAsIntent(get(), 'skipStocks', [])) return
    set({ pendingEvent: null, phase: 'idle' })
  },

  // ========= BOLSA =========
  playStocks: () => {
    if (routeAsIntent(get(), 'playStocks', [])) return
    set((s) => {
      const pe = s.pendingEvent
      if (!pe) return s
      const current = s.players.find((p) => p.id === pe.playerId)!
      if (current.shares <= 0) return s
      const roll = spinRoulette()
      let delta = 0
      let msg = ''
      if (roll <= 3) {
        delta = -STOCKS_LOSS
        msg = `📉 Bolsa em baixa (${roll}). ${current.name} perdeu $${STOCKS_LOSS.toLocaleString('pt-BR')}.`
      } else if (roll <= 6) {
        msg = `📊 Bolsa estável (${roll}). Nada acontece.`
      } else {
        delta = STOCKS_GAIN
        msg = `📈 Bolsa em alta (${roll}). ${current.name} ganhou $${STOCKS_GAIN.toLocaleString('pt-BR')}.`
      }
      return {
        players: s.players.map((p) =>
          p.id === current.id ? { ...p, money: p.money + delta } : p
        ),
        pendingEvent: null,
        phase: 'idle',
        rouletteResult: roll,
        log: [...s.log, msg],
      }
    })
  },

  // ========= EMPRÉSTIMOS =========
  takeLoan: (units) => {
    if (routeAsIntent(get(), 'takeLoan', [units])) return
    set((s) => {
      const idx = s.currentPlayerIndex
      const c = s.players[idx]
      const updated: Player = {
        ...c,
        money: c.money + units * LOAN_UNIT,
        promissoryNotes: c.promissoryNotes + units,
      }
      return {
        players: s.players.map((p, i) => (i === idx ? updated : p)),
        log: [
          ...s.log,
          `🏦 ${c.name} pegou ${units} empréstimo(s) = $${(units * LOAN_UNIT).toLocaleString('pt-BR')}.`,
        ],
      }
    })
  },

  repayLoan: (units) => {
    if (routeAsIntent(get(), 'repayLoan', [units])) return
    set((s) => {
      const idx = s.currentPlayerIndex
      const c = s.players[idx]
      const u = Math.min(units, c.promissoryNotes)
      if (c.money < u * LOAN_UNIT) return s
      const updated: Player = {
        ...c,
        money: c.money - u * LOAN_UNIT,
        promissoryNotes: c.promissoryNotes - u,
      }
      return {
        players: s.players.map((p, i) => (i === idx ? updated : p)),
        log: [...s.log, `🏦 ${c.name} pagou ${u} empréstimo(s).`],
      }
    })
  },

  // ========= VINGANÇA =========
  applyRevenge: (targetId, mode) => {
    if (routeAsIntent(get(), 'applyRevenge', [targetId, mode])) return
    set((s) => {
      const idx = s.currentPlayerIndex
      const c = s.players[idx]
      const target = s.players.find((p) => p.id === targetId)
      if (!target) return s
      let players = s.players
      let log = [...s.log]
      if (mode === 'money' && target.money >= REVENGE_DEMAND) {
        players = players.map((p) => {
          if (p.id === c.id) return { ...p, money: p.money + REVENGE_DEMAND }
          if (p.id === target.id) return { ...p, money: p.money - REVENGE_DEMAND }
          return p
        })
        log.push(
          `⚔️ ${c.name} cobrou $${REVENGE_DEMAND.toLocaleString('pt-BR')} de ${target.name}.`
        )
      } else {
        const newPos = Math.max(0, target.spaceId - 10)
        players = players.map((p) =>
          p.id === target.id ? { ...p, spaceId: newPos } : p
        )
        log.push(`⚔️ ${c.name} mandou ${target.name} voltar 10 espaços.`)
      }
      return { players, pendingEvent: null, phase: 'idle', log }
    })
  },

  rollWeddingGifts: () => {
    if (routeAsIntent(get(), 'rollWeddingGifts', [])) return
    set((s) => {
      const pe = s.pendingEvent
      if (!pe) return s
      const current = s.players.find((p) => p.id === pe.playerId)!
      const roll = spinRoulette()
      const perPlayer =
        roll <= 3 ? WEDDING_PAYOUT_HIGH : roll <= 6 ? WEDDING_PAYOUT_MID : 0
      const others = s.players.filter(
        (p) => p.id !== current.id && p.status === 'active'
      )
      const total = perPlayer * others.length
      const players = s.players.map((p) => {
        if (p.id === current.id) return { ...p, money: p.money + total }
        if (others.some((o) => o.id === p.id))
          return { ...p, money: p.money - perPlayer }
        return p
      })
      return {
        players,
        pendingEvent: null,
        phase: 'idle',
        rouletteResult: roll,
        log: [
          ...s.log,
          `🎁 Presentes (roleta ${roll}): ${current.name} ganhou $${total.toLocaleString('pt-BR')}.`,
        ],
      }
    })
  },

  decideJudgmentDay: (choice) => {
    if (routeAsIntent(get(), 'decideJudgmentDay', [choice])) return
    set((s) => {
      const pe = s.pendingEvent
      if (!pe) return s
      // Aplica ganhos/perdas do Dia do Juízo primeiro
      const current = s.players.find((p) => p.id === pe.playerId)!
      const childBonus = current.children.length * JUDGMENT_CHILD_BONUS
      const loanCost = current.promissoryNotes * 25000
      const updated: Player = {
        ...current,
        money: current.money + childBonus - loanCost,
        promissoryNotes: 0,
      }
      const players = s.players.map((p) => (p.id === current.id ? updated : p))
      if (choice === 'millionaire') {
        return {
          players,
          pendingEvent: null,
          phase: 'idle',
          log: [
            ...s.log,
            `⚖️ ${current.name} vai buscar MILIONÁRIO. +$${childBonus.toLocaleString('pt-BR')} (filhos) −$${loanCost.toLocaleString('pt-BR')} (dívida).`,
          ],
        }
      }
      return {
        players,
        pendingEvent: { kind: 'tycoon-bet', playerId: pe.playerId },
        phase: 'resolving',
        log: [...s.log, `⚖️ ${current.name} vai tentar ser MAGNATA!`],
      }
    })
  },

  tycoonBet: (number) => {
    if (routeAsIntent(get(), 'tycoonBet', [number])) return
    set((s) => {
      const pe = s.pendingEvent
      if (!pe || pe.kind !== 'tycoon-bet') return s
      const c = s.players.find((p) => p.id === pe.playerId)!
      const roll = spinRoulette()
      if (roll === number) {
        const updated: Player = { ...c, status: 'tycoon', finished: true }
        return {
          players: s.players.map((p) => (p.id === c.id ? updated : p)),
          pendingEvent: null,
          phase: 'game-over',
          rouletteResult: roll,
          log: [...s.log, `👑 ${c.name} virou MAGNATA! (apostou ${number}, saiu ${roll})`],
        }
      }
      const updated: Player = { ...c, money: 0, status: 'bankrupt', finished: true }
      return {
        players: s.players.map((p) => (p.id === c.id ? updated : p)),
        pendingEvent: null,
        phase: 'idle',
        rouletteResult: roll,
        log: [...s.log, `💥 ${c.name} foi à falência. (apostou ${number}, saiu ${roll})`],
      }
    })
  },

  collectToll: () => {
    // noop — pedágio é resolvido automaticamente no movimento
  },

  chooseBranch: (targetSpaceId) => {
    if (routeAsIntent(get(), 'chooseBranch', [targetSpaceId])) return
    set((s) => {
      const pe = s.pendingEvent
      if (!pe || pe.kind !== 'branch') return s
      const remaining = (pe.data?.remainingSteps as number) ?? 0
      const current = s.players.find((p) => p.id === pe.playerId)!
      // Continua a andar `remaining` passos a partir do targetSpaceId
      const { destId, passed } = walkFrom(targetSpaceId, remaining)
      let { updatedPlayer, passEvents, ownerPayments } = collectPassThroughEvents(
        { ...current, spaceId: targetSpaceId - 1 }, // para contar "passou" o target
        [targetSpaceId, ...passed],
        s.bridgeOwnerId,
        s.players
      )
      updatedPlayer = { ...updatedPlayer, spaceId: destId }
      const players = s.players.map((p) => {
        if (p.id === updatedPlayer.id) return updatedPlayer
        const pay = ownerPayments.find((o) => o.toPlayerId === p.id)
        return pay ? { ...p, money: p.money + pay.amount } : p
      })
      const space = getSpace(destId)
      const pending = resolveSpaceEvent(current.id, space.type)
      return {
        players,
        pendingEvent: pending,
        phase: pending ? 'resolving' : 'idle',
        log: [...s.log, `🔀 ${current.name} escolheu seguir para #${targetSpaceId}.`, ...passEvents],
      }
    })
  },

  // ========= CARTÕES DE RIQUEZA =========
  useShareProfit: (targetId) => {
    if (routeAsIntent(get(), 'useShareProfit', [targetId])) return
    set((s) => {
      const c = s.players[s.currentPlayerIndex]
      const cardIdx = c.wealthCards.findIndex((w) => w.kind === 'share-profit')
      if (cardIdx < 0) return s
      const target = s.players.find((p) => p.id === targetId)
      if (!target) return s
      // Assume o target acabou de receber — toma metade do seu dinheiro último ganho.
      // Simplificação: transfere 50% de um pagamento "hipotético" = metade do salário.
      const transfer = Math.floor(target.salary / 2)
      const players = s.players.map((p) => {
        if (p.id === c.id) {
          const cards = [...p.wealthCards]
          cards.splice(cardIdx, 1)
          return { ...p, wealthCards: cards, money: p.money + transfer }
        }
        if (p.id === target.id) return { ...p, money: p.money - transfer }
        return p
      })
      return {
        players,
        log: [...s.log, `🎴 ${c.name} usou "Dividindo Lucros" em ${target.name} (+$${transfer.toLocaleString('pt-BR')}).`],
      }
    })
  },

  useShareExpense: (targetId) => {
    if (routeAsIntent(get(), 'useShareExpense', [targetId])) return
    set((s) => {
      const c = s.players[s.currentPlayerIndex]
      const cardIdx = c.wealthCards.findIndex((w) => w.kind === 'share-expense')
      if (cardIdx < 0) return s
      const target = s.players.find((p) => p.id === targetId)
      if (!target) return s
      // Transfere metade de uma despesa hipotética padrão
      const transfer = 5000
      const players = s.players.map((p) => {
        if (p.id === c.id) {
          const cards = [...p.wealthCards]
          cards.splice(cardIdx, 1)
          return { ...p, wealthCards: cards, money: p.money + transfer }
        }
        if (p.id === target.id) return { ...p, money: p.money - transfer }
        return p
      })
      return {
        players,
        log: [...s.log, `🎴 ${c.name} usou "Dividindo Despesa" em ${target.name}.`],
      }
    })
  },

  useExemption: () => {
    if (routeAsIntent(get(), 'useExemption', [])) return
    set((s) => {
      const c = s.players[s.currentPlayerIndex]
      const cardIdx = c.wealthCards.findIndex((w) => w.kind === 'exemption')
      if (cardIdx < 0) return s
      const players = s.players.map((p) => {
        if (p.id === c.id) {
          const cards = [...p.wealthCards]
          cards.splice(cardIdx, 1)
          return { ...p, wealthCards: cards }
        }
        return p
      })
      return {
        players,
        log: [...s.log, `🎴 ${c.name} usou "Isenção".`],
      }
    })
  },

  // ========= APOSTAS NA ROLETA =========
  placeBet: (playerId, number, amount) => {
    if (routeAsIntent(get(), 'placeBet', [playerId, number, amount])) return
    set((s) => {
      const player = s.players.find((p) => p.id === playerId)!
      const limited = Math.min(amount, MAX_ROULETTE_BET, player.money)
      if (limited <= 0) return s
      // Substitui aposta anterior deste jogador
      const bets = s.bets.filter((b) => b.playerId !== playerId)
      bets.push({ playerId, number, amount: limited })
      return { bets }
    })
  },

  removeBet: (playerId) => {
    if (routeAsIntent(get(), 'removeBet', [playerId])) return
    set((s) => ({ bets: s.bets.filter((b) => b.playerId !== playerId) }))
  },

  // ========= DIA DE SORTE (aposta opcional) =========
  luckyDayBet: (n1, n2) => {
    if (routeAsIntent(get(), 'luckyDayBet', [n1, n2])) return
    set((s) => {
      const pe = s.pendingEvent
      if (!pe) return s
      const c = s.players.find((p) => p.id === pe.playerId)!
      const roll = spinRoulette()
      const win = roll === n1 || roll === n2
      const delta = win ? LUCKY_DAY_BET_WIN : 0
      return {
        players: s.players.map((p) =>
          p.id === c.id ? { ...p, money: p.money + delta } : p
        ),
        pendingEvent: null,
        phase: 'idle',
        rouletteResult: roll,
        log: [
          ...s.log,
          win
            ? `🍀 ${c.name} acertou no Dia de Sorte (${roll})! +$${LUCKY_DAY_BET_WIN.toLocaleString('pt-BR')}.`
            : `🍀 ${c.name} errou no Dia de Sorte (saiu ${roll}).`,
        ],
      }
    })
  },

  luckyDayKeep: () => {
    if (routeAsIntent(get(), 'luckyDayKeep', [])) return
    set((s) => {
      const pe = s.pendingEvent
      if (!pe) return s
      const c = s.players.find((p) => p.id === pe.playerId)!
      return {
        players: s.players.map((p) =>
          p.id === c.id ? { ...p, money: p.money + LUCKY_DAY_REWARD } : p
        ),
        pendingEvent: null,
        phase: 'idle',
        log: [...s.log, `🍀 ${c.name} guardou $${LUCKY_DAY_REWARD.toLocaleString('pt-BR')}.`],
      }
    })
  },

  // ========= FIM DE JOGO =========
  computeFinalScores: () => {
    const s = get()
    return s.players
      .map((p) => ({
        id: p.id,
        name: p.name,
        total:
          p.money +
          p.shares * STOCKS_FINAL_VALUE +
          (p.insurances.includes('life') ? LIFE_INSURANCE_FINAL_VALUE : 0),
      }))
      .sort((a, b) => b.total - a.total)
  },

  // ========= PRÓXIMO TURNO =========
  nextTurn: () => {
    if (routeAsIntent(get(), 'nextTurn', [])) return
    set((s) => {
      // Verifica fim de jogo: todos finalizados?
      const allDone = s.players.every(
        (p) => p.finished || p.status === 'bankrupt' || p.status === 'tycoon'
      )
      if (allDone || s.phase === 'game-over') {
        return { phase: 'game-over' as const }
      }
      const total = s.players.length
      let i = s.currentPlayerIndex
      for (let k = 0; k < total; k++) {
        i = (i + 1) % total
        const p = s.players[i]
        if (!p.finished && p.status === 'active') {
          return { currentPlayerIndex: i, rouletteResult: null, bets: [] }
        }
      }
      return { phase: 'game-over' as const }
    })
  },
}))

// ========= SUBSCRIÇÃO DE SNAPSHOT (host publica mudanças) =========
useGame.subscribe((state, prev) => {
  if (_hydrating) return
  const o = state.online
  if (!o) return
  if (o.myProfileId !== o.hostProfileId) return
  // Só publica se algo relevante mudou
  if (
    state.players === prev.players &&
    state.phase === prev.phase &&
    state.pendingEvent === prev.pendingEvent &&
    state.currentPlayerIndex === prev.currentPlayerIndex &&
    state.rouletteResult === prev.rouletteResult &&
    state.log === prev.log &&
    state.bets === prev.bets &&
    state.bridgeOwnerId === prev.bridgeOwnerId &&
    state.wealthDeck === prev.wealthDeck
  ) return

  if (_publishTimer) clearTimeout(_publishTimer)
  _publishTimer = setTimeout(() => {
    const snap = snapshotOf(useGame.getState())
    const json = JSON.stringify(snap)
    if (json === _lastSnapshotJson) return
    _lastSnapshotJson = json
    publishSnapshot(o.roomId, snap, o.myProfileId)
  }, 60)
})

// ================ FUNÇÕES AUXILIARES ================

const findName = (players: Player[], id: string) =>
  players.find((p) => p.id === id)?.name ?? '?'

const countActive = (players: Player[]) =>
  players.filter((p) => p.status === 'active').length

const wealthCardLabel = (kind: WealthCardKind) =>
  kind === 'share-profit'
    ? 'Dividindo Lucros'
    : kind === 'share-expense'
    ? 'Dividindo Despesa'
    : 'Isenção'

/**
 * Caminha N passos. Se encontrar bifurcação mid-path, pausa e retorna branchedAt.
 */
function walk(
  player: Player,
  steps: number,
  _players: Player[]
): { destId: number; passed: number[]; branchedAt: number | null } {
  let cur = player.spaceId
  const passed: number[] = []
  for (let i = 0; i < steps; i++) {
    const sp = getSpace(cur)
    // Saída inicial
    if (cur === 0) {
      cur = player.path === 'business' ? BUSINESS_START_ID : UNIVERSITY_START_ID
    } else if (sp.next.length === 0) {
      break
    } else if (sp.next.length === 1) {
      cur = sp.next[0]
    } else {
      // bifurcação
      return { destId: cur, passed, branchedAt: cur }
    }
    if (i < steps - 1) passed.push(cur)
  }
  return { destId: cur, passed, branchedAt: null }
}

function walkFrom(
  fromId: number,
  steps: number
): { destId: number; passed: number[] } {
  let cur = fromId
  const passed: number[] = []
  for (let i = 0; i < steps; i++) {
    const sp = getSpace(cur)
    if (sp.next.length === 0) break
    cur = sp.next[0] // ao sair da bifurcação, escolhe caminho linear
    if (i < steps - 1) passed.push(cur)
  }
  return { destId: cur, passed }
}

function passedRemaining(
  _player: Player,
  passed: number[],
  _totalSteps: number,
  _branchedAt: number
): number {
  // passos já andados = passed.length + 1 (saída ou primeiro movimento)
  const already = passed.length + 1
  // Na bifurcação, o jogador acabou de chegar → ainda precisa andar (total - already) passos
  // Simplificação conservadora: assume ≥1 passo restante
  return Math.max(0, _totalSteps - already)
}

function collectPassThroughEvents(
  player: Player,
  passed: number[],
  bridgeOwnerId: string | null,
  allPlayers: Player[]
): {
  updatedPlayer: Player
  passEvents: string[]
  ownerPayments: { toPlayerId: string; amount: number }[]
} {
  let updated = { ...player }
  const passEvents: string[] = []
  const ownerPayments: { toPlayerId: string; amount: number }[] = []
  for (const id of passed) {
    const sp = getSpace(id)
    if (sp.type === 'payday') {
      updated = { ...updated, money: updated.money + updated.salary }
      passEvents.push(
        `🔴 Passou por Pagamento: +$${updated.salary.toLocaleString('pt-BR')}`
      )
    } else if (sp.type === 'payday-interest') {
      const interest = updated.promissoryNotes * LOAN_INTEREST
      updated = {
        ...updated,
        money: updated.money + updated.salary - interest,
      }
      passEvents.push(
        `🔴 Passou por Pagamento c/ juros: +$${updated.salary.toLocaleString('pt-BR')} −$${interest.toLocaleString('pt-BR')}`
      )
    } else if (
      sp.type === 'toll' &&
      bridgeOwnerId &&
      bridgeOwnerId !== updated.id
    ) {
      const owner = allPlayers.find((p) => p.id === bridgeOwnerId)
      if (owner) {
        updated = { ...updated, money: updated.money - TOLL_AMOUNT }
        ownerPayments.push({ toPlayerId: owner.id, amount: TOLL_AMOUNT })
        passEvents.push(
          `🌉 Passou pelo Pedágio: −$${TOLL_AMOUNT.toLocaleString('pt-BR')} para ${owner.name}`
        )
      }
    }
  }
  return { updatedPlayer: updated, passEvents, ownerPayments }
}

/**
 * Resolve apostas dos adversários após a roleta sair.
 * Cada aposta acertada paga 10x. Erradas vão pro "banco" (sai do pool).
 */
function resolveBets(
  players: Player[],
  bets: RouletteBet[],
  roll: number,
  _currentId: string
): Player[] {
  let updated = [...players]
  for (const bet of bets) {
    const idx = updated.findIndex((p) => p.id === bet.playerId)
    if (idx < 0) continue
    const p = updated[idx]
    // Deduz aposta
    let newMoney = p.money - bet.amount
    if (bet.number === roll) {
      newMoney += bet.amount * ROULETTE_PAYOUT_MULTIPLIER
    }
    updated[idx] = { ...p, money: newMoney }
  }
  return updated
}

function betsLogEntries(
  bets: RouletteBet[],
  roll: number,
  players: Player[]
): string[] {
  return bets.map((b) => {
    const p = players.find((x) => x.id === b.playerId)
    const won = b.number === roll
    return won
      ? `🎯 ${p?.name} acertou ${b.number}! +$${(b.amount * ROULETTE_PAYOUT_MULTIPLIER).toLocaleString('pt-BR')}`
      : `🎯 ${p?.name} apostou $${b.amount.toLocaleString('pt-BR')} em ${b.number} e perdeu.`
  })
}

function payMillionaireLucky(
  players: Player[],
  roll: number,
  currentId: string
): Player[] {
  const millionaires = players.filter(
    (p) => p.status === 'millionaire' && p.luckyNumber === roll && p.id !== currentId
  )
  if (millionaires.length === 0) return players
  return players.map((p) => {
    if (p.id === currentId) {
      return { ...p, money: p.money - MILLIONAIRE_LUCKY_PAYOUT * millionaires.length }
    }
    if (millionaires.some((m) => m.id === p.id)) {
      return { ...p, money: p.money + MILLIONAIRE_LUCKY_PAYOUT }
    }
    return p
  })
}

function resolveSpaceEvent(
  playerId: string,
  type: string
): PendingEvent | null {
  switch (type) {
    case 'payday':
    case 'payday-interest':
    case 'lucky-day':
    case 'gain':
    case 'loss':
    case 'baby':
    case 'twins':
    case 'wedding':
    case 'profession':
    case 'revenge':
    case 'judgment-day':
    case 'stocks-play':
    case 'toll':
      return { kind: type as PendingEvent['kind'], playerId }
    case 'insurance-life':
    case 'insurance-car':
    case 'insurance-house':
      return {
        kind: 'buy-insurance',
        playerId,
        data: { kind: type.replace('insurance-', '') as InsuranceKind },
      }
    case 'stocks-buy':
      return { kind: 'buy-stocks', playerId }
    case 'millionaire':
      return { kind: 'millionaire-reached', playerId }
    default:
      return null
  }
}

export const GAME_CONSTANTS = {
  MILLIONAIRE_ID,
  JUDGMENT_DAY_ID,
  STOCKS_FINAL_VALUE,
  LIFE_INSURANCE_FINAL_VALUE,
  TOLL_AMOUNT,
  MAX_ROULETTE_BET,
  ROULETTE_PAYOUT_MULTIPLIER,
}
