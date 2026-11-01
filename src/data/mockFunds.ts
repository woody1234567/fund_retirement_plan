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
    code: '3047',
    name: '元大台灣高股息ETF連結基金B配息',
    currency: 'TWD',
    frequency: 4,
    amount: 1000000,
    price: 22.79,
    dividendPerUnit: 0.52,
  },
  {
    code: '2054',
    name: '國泰台灣高股息基金-B配息',
    currency: 'TWD',
    frequency: 12,
    amount: 1000000,
    price: 52.23,
    dividendPerUnit: 0.48,
  },
  {
    code: '7004',
    name: '路博邁台灣5G股票基金T月配型',
    currency: 'TWD',
    frequency: 12,
    amount: 1000000,
    price: 52.99,
    dividendPerUnit: 0.4655,
  },
  {
    code: '9004',
    name: '路博邁台灣5G股票基金N月配型',
    currency: 'TWD',
    frequency: 12,
    amount: 1000000,
    price: 64.71,
    dividendPerUnit: 0.569,
  },
  {
    code: 'AGF9',
    name: '貝萊德世界能源基金A10美元',
    currency: 'USD',
    frequency: 12,
    amount: 1000000,
    price: 13.78,
    dividendPerUnit: 0.0695,
  },
  {
    code: 'CC53',
    name: '摩根基金-環球天然資源基金A股',
    currency: 'EUR',
    frequency: 1,
    amount: 1000000,
    price: 25.77,
    dividendPerUnit: 0.15,
  },
]
