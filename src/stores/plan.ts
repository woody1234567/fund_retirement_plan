import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import {
  DEFAULT_RATES,
  calcHolding,
  calcSummary,
  type Holding,
  type Plan,
  type Rates,
} from '@/utils/calc'

const STORAGE_KEY = 'fund-retirement-plan-v1'

let seq = 0
const newId = () => `${Date.now().toString(36)}-${seq++}`

export const emptyHolding = (): Holding => ({
  id: newId(),
  code: '',
  name: '',
  currency: 'USD',
  amount: 0,
  price: 0,
  dividendPerUnit: 0,
  frequency: 12,
})

export const usePlanStore = defineStore('plan', () => {
  const clientName = ref('')
  const holdings = ref<Holding[]>([])
  const rates = ref<Rates>({ ...DEFAULT_RATES })
  const plan = ref<Plan>({ monthlyNeed: 50000, inflation: 0, yearsToRetire: 0 })

  // 還原先前資料
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const d = JSON.parse(raw)
      clientName.value = d.clientName ?? ''
      holdings.value = d.holdings ?? []
      rates.value = { ...DEFAULT_RATES, ...d.rates }
      plan.value = { ...plan.value, ...d.plan }
    }
  } catch {
    /* 忽略損毀資料 */
  }
  if (holdings.value.length === 0) holdings.value.push(emptyHolding())

  watch(
    [clientName, holdings, rates, plan],
    () => {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            clientName: clientName.value,
            holdings: holdings.value,
            rates: rates.value,
            plan: plan.value,
          }),
        )
      } catch {
        /* ignore */
      }
    },
    { deep: true },
  )

  const results = computed(() => holdings.value.map((h) => calcHolding(h, rates.value)))
  const summary = computed(() => calcSummary(holdings.value, rates.value, plan.value))

  function addHolding() {
    holdings.value.push(emptyHolding())
  }
  function removeHolding(id: string) {
    holdings.value = holdings.value.filter((h) => h.id !== id)
  }
  function reset() {
    holdings.value = [emptyHolding()]
  }

  return { clientName, holdings, rates, plan, results, summary, addHolding, removeHolding, reset }
})
