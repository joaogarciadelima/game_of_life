import type { Space } from '../types/game'

/**
 * Tabuleiro compacto e funcional.
 * Começa na SAÍDA (0), bifurca em Negócios (1..) e Universidade (20..),
 * converge em um caminho comum e termina em MILIONÁRIO / MAGNATA.
 *
 * IDs e próximos espaços são explícitos para simplificar renderização.
 */

const SPACES: Space[] = [
  // ========= SAÍDA (bifurcação inicial — Negócios/Universidade) =========
  { id: 0, type: 'start', color: 'white', label: 'SAÍDA', next: [1, 20] },

  // ========= CAMINHO NEGÓCIOS (curto, salário fixo $12.000) =========
  { id: 1, type: 'insurance-car', color: 'white', label: 'Seguro de Carro', next: [2] },
  { id: 2, type: 'payday', color: 'red', label: 'Dia do Pagamento', next: [3] },
  { id: 3, type: 'gain', color: 'yellow', label: 'Bônus $5.000', next: [4], amount: 5000 },
  { id: 4, type: 'baby', color: 'yellow', label: 'Nasce um filho!', next: [5] },
  { id: 5, type: 'payday', color: 'red', label: 'Dia do Pagamento', next: [6] },
  { id: 6, type: 'wedding', color: 'yellow', label: 'Dia do seu Casamento', next: [7] },
  { id: 7, type: 'insurance-life', color: 'white', label: 'Seguro de Vida', next: [8] },
  { id: 8, type: 'loss', color: 'yellow', label: 'Conserto do carro -$8.000', next: [9], amount: 8000 },
  { id: 9, type: 'payday-interest', color: 'red', label: 'Dia do Pagamento (juros)', next: [10] },
  { id: 10, type: 'lucky-day', color: 'yellow', label: 'Dia de Sorte', next: [50] },

  // ========= CAMINHO UNIVERSIDADE (longo, salário variável) =========
  { id: 20, type: 'loss', color: 'yellow', label: 'Mensalidade -$5.000', next: [21], amount: 5000 },
  { id: 21, type: 'payday', color: 'red', label: 'Dia do Pagamento', next: [22] },
  { id: 22, type: 'stocks-buy', color: 'white', label: 'Compre Ações', next: [23] },
  { id: 23, type: 'lucky-day', color: 'yellow', label: 'Dia de Sorte', next: [24] },
  { id: 24, type: 'loss', color: 'yellow', label: 'Livros -$3.000', next: [25], amount: 3000 },
  { id: 25, type: 'branch', color: 'white', label: '🔀 Escolha a profissão', next: [26, 27, 28, 29] },
  { id: 26, type: 'profession', color: 'yellow', label: 'Médico', next: [30],
    profession: { name: 'Médico', salary: 50000 }, path: 'university' },
  { id: 27, type: 'profession', color: 'yellow', label: 'Jornalista', next: [30],
    profession: { name: 'Jornalista', salary: 24000 }, path: 'university' },
  { id: 28, type: 'profession', color: 'yellow', label: 'Professor', next: [30],
    profession: { name: 'Professor', salary: 20000 }, path: 'university' },
  { id: 29, type: 'diploma', color: 'yellow', label: 'Diploma Universitário', next: [30],
    profession: { name: 'Diploma', salary: 16000 }, path: 'university' },

  // ========= CAMINHO COMUM (convergência em 30) =========
  { id: 30, type: 'payday', color: 'red', label: 'Dia do Pagamento', next: [31] },
  { id: 31, type: 'insurance-house', color: 'white', label: 'Seguro de Casa', next: [32] },
  { id: 32, type: 'wedding', color: 'yellow', label: 'Dia do seu Casamento', next: [33] },
  { id: 33, type: 'baby', color: 'yellow', label: 'Nasce um filho!', next: [34] },
  { id: 34, type: 'payday', color: 'red', label: 'Dia do Pagamento', next: [35] },
  { id: 35, type: 'revenge', color: 'gold', label: 'Vingança', next: [36] },
  { id: 36, type: 'gain', color: 'yellow', label: 'Herança $20.000', next: [37], amount: 20000 },
  { id: 37, type: 'lucky-day', color: 'yellow', label: 'Dia de Sorte', next: [38] },
  { id: 38, type: 'twins', color: 'yellow', label: 'Nascem GÊMEOS!', next: [39] },
  { id: 39, type: 'stocks-play', color: 'white', label: 'Jogando na Bolsa', next: [40] },
  { id: 40, type: 'payday', color: 'red', label: 'Dia do Pagamento', next: [41] },
  { id: 41, type: 'toll', color: 'yellow', label: 'Ponte do Pedágio', next: [42] },
  { id: 42, type: 'loss', color: 'yellow', label: 'Imposto -$12.000', next: [43], amount: 12000 },
  { id: 43, type: 'revenge', color: 'gold', label: 'Vingança', next: [44] },
  { id: 44, type: 'payday-interest', color: 'red', label: 'Dia do Pagamento (juros)', next: [45] },
  { id: 45, type: 'baby', color: 'yellow', label: 'Nasce uma filha!', next: [46] },
  { id: 46, type: 'gain', color: 'yellow', label: 'Lucro $15.000', next: [47], amount: 15000 },
  { id: 47, type: 'lucky-day', color: 'yellow', label: 'Dia de Sorte', next: [48] },
  { id: 48, type: 'payday', color: 'red', label: 'Dia do Pagamento', next: [49] },
  { id: 49, type: 'judgment-day', color: 'red', label: 'DIA DO JUÍZO', next: [50] },

  // ========= Ponto final =========
  { id: 50, type: 'millionaire', color: 'gold', label: 'MILIONÁRIO', next: [51] },
  { id: 51, type: 'tycoon', color: 'gold', label: 'MAGNATA', next: [] },
]

export const BOARD: Space[] = SPACES

export const START_ID = 0
export const BUSINESS_START_ID = 1
export const UNIVERSITY_START_ID = 20
export const JUDGMENT_DAY_ID = 49
export const MILLIONAIRE_ID = 50

export function getSpace(id: number): Space {
  const s = BOARD.find((sp) => sp.id === id)
  if (!s) throw new Error(`Space ${id} not found`)
  return s
}
