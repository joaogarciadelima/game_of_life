import type { Player, WealthCard, Gender } from '../types/game'
import { STARTING_MONEY, WEALTH_CARDS_PER_KIND } from './constants'

let _id = 0
export const uid = (prefix = 'id') => `${prefix}_${++_id}_${Date.now().toString(36)}`

export const spinRoulette = (): number => Math.floor(Math.random() * 10) + 1

export const buildWealthDeck = (): WealthCard[] => {
  const deck: WealthCard[] = []
  for (let i = 0; i < WEALTH_CARDS_PER_KIND; i++) {
    deck.push({ id: uid('wc'), kind: 'share-profit' })
    deck.push({ id: uid('wc'), kind: 'share-expense' })
  }
  // Menos cartões de isenção (mais raros)
  for (let i = 0; i < Math.ceil(WEALTH_CARDS_PER_KIND / 2); i++) {
    deck.push({ id: uid('wc'), kind: 'exemption' })
  }
  return shuffle(deck)
}

export const shuffle = <T>(arr: T[]): T[] => {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export const createPlayer = (
  name: string,
  gender: Gender,
  color: string,
  profileId: string | null = null
): Player => ({
  id: uid('p'),
  profileId,
  name,
  gender,
  color,
  money: STARTING_MONEY,
  spaceId: 0,
  path: null,
  salary: 0,
  profession: null,
  spouse: null,
  children: [],
  promissoryNotes: 0,
  insurances: [],
  shares: 0,
  wealthCards: [],
  status: 'active',
  luckyNumber: null,
  finished: false,
})

export const formatMoney = (value: number): string =>
  `$${value.toLocaleString('pt-BR')}`
