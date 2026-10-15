import { describe, expect, it } from 'vitest'
import { DEFAULT_RATES, calcHolding, calcSummary, type Holding } from '../utils/calc'

const h: Holding = {
  id: '1', code: 'AGF9', name: 'test', currency: 'USD',
  amount: 10000, price: 10, dividendPerUnit: 0.05, frequency: 12,
}

describe('calc', () => {
  it('computes monthly dividend', () => {
    const r = calcHolding(h, DEFAULT_RATES)
    expect(r.units).toBe(1000)
    expect(r.monthly).toBeCloseTo(50)
    expect(r.monthlyTWD).toBeCloseTo(1600)
    expect(r.yieldRate).toBeCloseTo(0.06)
  })
  it('converts quarterly to monthly average', () => {
    expect(calcHolding({ ...h, frequency: 4 }, DEFAULT_RATES).monthly).toBeCloseTo(50 * 12 / 12 / 3)
  })
  it('handles zero price safely', () => {
    expect(calcHolding({ ...h, price: 0 }, DEFAULT_RATES).monthly).toBe(0)
  })
  it('summarizes coverage and gap', () => {
    const s = calcSummary([h], DEFAULT_RATES, { monthlyNeed: 3200, inflation: 0, yearsToRetire: 0 })
    expect(s.coverage).toBeCloseTo(0.5)
    expect(s.gap).toBeCloseTo(1600)
  })
})
