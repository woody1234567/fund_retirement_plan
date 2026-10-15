export type Currency = 'TWD' | 'USD' | 'CNY' | 'EUR' | 'JPY' | 'AUD' | 'ZAR' | 'HKD'

export const CURRENCIES: Currency[] = ['TWD', 'USD', 'CNY', 'EUR', 'JPY', 'AUD', 'ZAR', 'HKD']

/** 每年配息次數 */
export type Frequency = 12 | 4 | 2 | 1

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  12: '月配',
  4: '季配',
  2: '半年配',
  1: '年配',
}

export interface Holding {
  id: string
  code: string
  name: string
  currency: Currency
  /** 投資金額（基金計價幣別） */
  amount: number
  /** 市價 / 淨值（基金計價幣別） */
  price: number
  /** 每單位配息金額（單次，基金計價幣別） */
  dividendPerUnit: number
  frequency: Frequency
}

export type Rates = Record<Currency, number>

/** 預設匯率（兌台幣），理專可自行調整 */
export const DEFAULT_RATES: Rates = {
  TWD: 1,
  USD: 32,
  CNY: 4.4,
  EUR: 35,
  JPY: 0.21,
  AUD: 21,
  ZAR: 1.75,
  HKD: 4.1,
}

export interface HoldingResult {
  units: number
  /** 單次配息總額（原幣） */
  perPayment: number
  /** 年配息總額（原幣） */
  annual: number
  /** 平均每月配息（原幣） */
  monthly: number
  monthlyTWD: number
  amountTWD: number
  /** 年化配息率 */
  yieldRate: number
}

const safe = (n: number) => (Number.isFinite(n) && n > 0 ? n : 0)

export function calcHolding(h: Holding, rates: Rates): HoldingResult {
  const amount = safe(h.amount)
  const price = safe(h.price)
  const dps = safe(h.dividendPerUnit)
  const units = price > 0 ? amount / price : 0
  const perPayment = units * dps
  const annual = perPayment * h.frequency
  const monthly = annual / 12
  const rate = safe(rates[h.currency] ?? 0)
  return {
    units,
    perPayment,
    annual,
    monthly,
    monthlyTWD: monthly * rate,
    amountTWD: amount * rate,
    yieldRate: amount > 0 ? annual / amount : 0,
  }
}

export interface Plan {
  /** 退休後每月所需生活費（台幣） */
  monthlyNeed: number
  /** 預估每年通膨率 (%) */
  inflation: number
  /** 距離退休年數 */
  yearsToRetire: number
}

export interface Summary {
  totalAmountTWD: number
  monthlyIncomeTWD: number
  annualIncomeTWD: number
  yieldRate: number
  /** 以通膨調整後，退休時的每月所需 */
  adjustedNeed: number
  coverage: number
  gap: number
  /** 達成目標還需要的額外投資金額（以目前平均配息率估算） */
  extraInvestNeeded: number
}

export function calcSummary(holdings: Holding[], rates: Rates, plan: Plan): Summary {
  let totalAmountTWD = 0
  let monthlyIncomeTWD = 0
  for (const h of holdings) {
    const r = calcHolding(h, rates)
    totalAmountTWD += r.amountTWD
    monthlyIncomeTWD += r.monthlyTWD
  }
  const annualIncomeTWD = monthlyIncomeTWD * 12
  const yieldRate = totalAmountTWD > 0 ? annualIncomeTWD / totalAmountTWD : 0
  const years = Math.max(0, plan.yearsToRetire || 0)
  const adjustedNeed = safe(plan.monthlyNeed) * Math.pow(1 + (plan.inflation || 0) / 100, years)
  const coverage = adjustedNeed > 0 ? monthlyIncomeTWD / adjustedNeed : 0
  const gap = Math.max(0, adjustedNeed - monthlyIncomeTWD)
  const extraInvestNeeded = yieldRate > 0 ? (gap * 12) / yieldRate : 0
  return {
    totalAmountTWD,
    monthlyIncomeTWD,
    annualIncomeTWD,
    yieldRate,
    adjustedNeed,
    coverage,
    gap,
    extraInvestNeeded,
  }
}
