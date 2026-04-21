// ===== TIPOS PRINCIPAIS DO JOGO =====

export type Gender = 'blue' | 'pink'

export type Path = 'business' | 'university'

export type SpaceColor = 'yellow' | 'gold' | 'red' | 'white'

export type SpaceType =
  | 'start'
  | 'payday'               // vermelho — recebe salário
  | 'payday-interest'      // vermelho — salário + juros
  | 'lucky-day'            // amarelo — $20.000
  | 'revenge'              // dourado — vingança
  | 'wedding'              // amarelo obrigatório
  | 'baby'                 // amarelo — nasce 1 filho
  | 'twins'                // amarelo — nascem gêmeos
  | 'profession'           // amarelo — fim do caminho universidade
  | 'diploma'              // amarelo — caminho univ. sem profissão
  | 'insurance-life'       // branco — compra seguro de vida
  | 'insurance-car'        // branco — compra seguro de carro
  | 'insurance-house'      // branco — compra seguro de casa
  | 'stocks-buy'           // branco — compra ação
  | 'stocks-play'          // branco — joga na bolsa
  | 'gain'                 // amarelo — ganha $
  | 'loss'                 // amarelo — paga $
  | 'toll'                 // ponte do pedágio
  | 'judgment-day'         // Dia do Juízo (obrigatório)
  | 'millionaire'          // MILIONÁRIO
  | 'tycoon'               // MAGNATA
  | 'branch'               // bifurcação (escolha)

export interface Space {
  id: number
  type: SpaceType
  color: SpaceColor
  label: string
  /** IDs dos próximos espaços (mais de 1 = bifurcação). */
  next: number[]
  /** Para ganhos/perdas simples. */
  amount?: number
  /** Para profissões: nome + salário. */
  profession?: { name: string; salary: number }
  /** Para caminho Universidade. */
  path?: Path
}

export type InsuranceKind = 'life' | 'car' | 'house'

export type WealthCardKind = 'share-profit' | 'share-expense' | 'exemption'

export interface WealthCard {
  id: string
  kind: WealthCardKind
}

export interface Child {
  id: string
  gender: Gender
}

export type PlayerStatus = 'active' | 'bankrupt' | 'millionaire' | 'tycoon'

export interface Player {
  id: string
  /** Perfil online (null para jogadores locais/convidados). */
  profileId?: string | null
  name: string
  gender: Gender
  color: string
  money: number
  spaceId: number
  path: Path | null
  salary: number            // salário atual
  profession: string | null // nome da profissão, se aplicável
  spouse: Gender | null     // pino do cônjuge (null = solteiro)
  children: Child[]
  promissoryNotes: number   // quantidade de notas de $20.000
  insurances: InsuranceKind[]
  shares: number            // quantidade de ações
  wealthCards: WealthCard[]
  status: PlayerStatus
  luckyNumber: number | null // número da sorte ao virar milionário
  finished: boolean          // chegou ao fim
}

export type Phase =
  | 'setup'         // tela inicial
  | 'idle'          // aguardando ação do jogador atual
  | 'rolling'       // roleta girando
  | 'moving'        // pino animando
  | 'resolving'     // resolvendo evento do espaço
  | 'game-over'

export type PendingEventKind =
  | 'choose-path'
  | 'payday'
  | 'payday-interest'
  | 'lucky-day'
  | 'lucky-day-bet'
  | 'wedding'
  | 'baby'
  | 'twins'
  | 'profession'
  | 'revenge'
  | 'gain'
  | 'loss'
  | 'stocks-play'
  | 'buy-insurance'
  | 'buy-stocks'
  | 'toll'
  | 'judgment-day'
  | 'millionaire-reached'
  | 'tycoon-bet'
  | 'branch'
  | 'wealth-card-drawn'

export interface PendingEvent {
  kind: PendingEventKind
  playerId: string
  data?: Record<string, unknown>
}

// ===== BET (aposta na roleta por outros jogadores) =====
export interface RouletteBet {
  playerId: string
  number: number
  amount: number
}

export interface OnlineCtx {
  roomId: string
  myProfileId: string
  hostProfileId: string
}

export interface GameState {
  phase: Phase
  players: Player[]
  currentPlayerIndex: number
  spaces: Space[]
  rouletteResult: number | null
  pendingEvent: PendingEvent | null
  bridgeOwnerId: string | null    // dono do pedágio
  wealthDeck: WealthCard[]        // pilha embaralhada
  log: string[]                   // histórico de eventos
  bets: RouletteBet[]             // apostas ativas na roleta atual
  seed: number                    // seed para aleatoriedade determinística (online)
  /** Contexto online. Null para partidas locais. */
  online: OnlineCtx | null
}
