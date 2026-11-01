import type { Currency, Frequency } from '@/utils/calc'

/**
 * 僅供介面展示與試算流程使用的示範基金資料，並非即時或正式行情。
 */
export interface MockFund {
  code: string
  name: string
  currency: Currency
  frequency: Frequency
  amount: number
  price: number
  dividendPerUnit: number
}

export const MOCK_FUNDS: MockFund[] = [
  {
    code: 'MOCK-001',
    name: '全球多元收益示範基金',
    currency: 'USD',
    frequency: 12,
    amount: 10_000,
    price: 10.25,
    dividendPerUnit: 0.065,
  },
  {
    code: 'MOCK-002',
    name: '台灣高股息示範基金',
    currency: 'TWD',
    frequency: 4,
    amount: 300_000,
    price: 18.6,
    dividendPerUnit: 0.42,
  },
  {
    code: 'MOCK-003',
    name: '亞洲債券月配示範基金',
    currency: 'USD',
    frequency: 12,
    amount: 8_000,
    price: 9.8,
    dividendPerUnit: 0.045,
  },
  {
    code: 'MOCK-004',
    name: '歐洲平衡收益示範基金',
    currency: 'EUR',
    frequency: 2,
    amount: 6_000,
    price: 12.4,
    dividendPerUnit: 0.28,
  },
]
