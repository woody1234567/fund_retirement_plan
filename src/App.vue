<script setup lang="ts">
import { computed } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { CURRENCIES, FREQUENCY_LABELS, type Frequency } from '@/utils/calc'
import { exportExcel } from '@/utils/exportExcel'

const store = usePlanStore()
const frequencies = Object.keys(FREQUENCY_LABELS).map(Number) as Frequency[]
const foreignCurrencies = computed(() =>
  CURRENCIES.filter((c) => c !== 'TWD' && store.holdings.some((h) => h.currency === c)),
)

const fmt = (n: number, d = 0) =>
  n.toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (n: number, d = 2) => (n * 100).toFixed(d) + '%'

const enough = computed(() => store.summary.coverage >= 1)
const barWidth = computed(() => Math.min(100, store.summary.coverage * 100) + '%')

function onExport() {
  exportExcel(store.clientName, store.holdings, store.rates, store.plan)
}
function onReset() {
  if (confirm('確定要清空所有基金資料嗎？')) store.reset()
}
</script>

<template>
  <header class="top">
    <h1>基金月配息退休試算</h1>
    <div class="actions">
      <button class="ghost" @click="onReset">清空</button>
      <button class="primary" @click="onExport">下載 Excel</button>
    </div>
  </header>

  <main>
    <section class="card">
      <h2>客戶與退休目標</h2>
      <div class="grid">
        <label>客戶姓名<input v-model="store.clientName" placeholder="選填" /></label>
        <label>退休後每月所需生活費 (台幣，今日幣值)
          <input v-model.number="store.plan.monthlyNeed" type="number" min="0" step="1000" />
        </label>
        <label>預估年通膨率 (%)
          <input v-model.number="store.plan.inflation" type="number" min="0" step="0.1" />
        </label>
        <label>距離退休年數 (0 = 已退休)
          <input v-model.number="store.plan.yearsToRetire" type="number" min="0" step="1" />
        </label>
      </div>
    </section>

    <section class="card">
      <h2>持有基金</h2>
      <p class="hint">
        資料可參考玉山銀行基金資訊頁 (如
        <a href="https://wealth.esunbank.com/zh-tw/fund/fund-info?fundCode=AGF9" target="_blank" rel="noopener">AGF9</a>)
        之淨值與配息資料。金額、市價、配息皆以基金計價幣別輸入。
      </p>
      <div class="scroll">
        <table>
          <thead>
            <tr>
              <th>基金代碼</th><th>基金名稱</th><th>幣別</th><th>配息頻率</th>
              <th>投資金額</th><th>市價(淨值)</th><th>每單位配息(單次)</th>
              <th>持有單位</th><th>平均月配息</th><th>月配息(台幣)</th><th>年化配息率</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(h, i) in store.holdings" :key="h.id">
              <td><input v-model="h.code" class="w-code" placeholder="AGF9" /></td>
              <td><input v-model="h.name" class="w-name" placeholder="基金名稱" /></td>
              <td>
                <select v-model="h.currency"><option v-for="c in CURRENCIES" :key="c">{{ c }}</option></select>
              </td>
              <td>
                <select v-model.number="h.frequency">
                  <option v-for="f in frequencies" :key="f" :value="f">{{ FREQUENCY_LABELS[f] }}</option>
                </select>
              </td>
              <td><input v-model.number="h.amount" type="number" min="0" class="w-num" /></td>
              <td><input v-model.number="h.price" type="number" min="0" step="any" class="w-num" /></td>
              <td><input v-model.number="h.dividendPerUnit" type="number" min="0" step="any" class="w-num" /></td>
              <td class="num">{{ fmt(store.results[i]?.units ?? 0, 2) }}</td>
              <td class="num">{{ fmt(store.results[i]?.monthly ?? 0, 2) }}</td>
              <td class="num strong">{{ fmt(store.results[i]?.monthlyTWD ?? 0) }}</td>
              <td class="num">{{ pct(store.results[i]?.yieldRate ?? 0) }}</td>
              <td><button class="del" title="刪除" @click="store.removeHolding(h.id)">✕</button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <button class="ghost" @click="store.addHolding()">＋ 新增基金</button>

      <div v-if="foreignCurrencies.length" class="rates">
        <strong>匯率 (1 外幣 = ? 台幣)：</strong>
        <label v-for="c in foreignCurrencies" :key="c">
          {{ c }} <input v-model.number="store.rates[c]" type="number" min="0" step="any" />
        </label>
      </div>
    </section>

    <section class="card result" :class="enough ? 'ok' : 'warn'">
      <h2>試算結果</h2>
      <div class="stats">
        <div><span>投資總額 (台幣)</span><b>{{ fmt(store.summary.totalAmountTWD) }}</b></div>
        <div><span>預估每月配息</span><b>{{ fmt(store.summary.monthlyIncomeTWD) }}</b></div>
        <div><span>預估年配息</span><b>{{ fmt(store.summary.annualIncomeTWD) }}</b></div>
        <div><span>整體年化配息率</span><b>{{ pct(store.summary.yieldRate) }}</b></div>
        <div><span>每月所需 (通膨調整後)</span><b>{{ fmt(store.summary.adjustedNeed) }}</b></div>
        <div><span>配息覆蓋率</span><b>{{ pct(store.summary.coverage, 1) }}</b></div>
      </div>
      <div class="bar"><div :style="{ width: barWidth }"></div></div>
      <p class="verdict">
        <template v-if="store.summary.adjustedNeed <= 0">請輸入退休每月所需生活費。</template>
        <template v-else-if="enough">
          ✅ 每月配息可支應退休生活所需，每月結餘約
          {{ fmt(store.summary.monthlyIncomeTWD - store.summary.adjustedNeed) }} 元。
        </template>
        <template v-else>
          ⚠️ 每月配息尚不足，缺口約 {{ fmt(store.summary.gap) }} 元；
          以目前平均配息率估算，約需再投入 {{ fmt(store.summary.extraInvestNeeded) }} 元。
        </template>
      </p>
      <p class="hint">假設配息金額維持不變，未計稅費與匯率波動，僅供參考。</p>
    </section>
  </main>
</template>

<style>
:root { color-scheme: light; font-family: system-ui, 'Noto Sans TC', sans-serif; }
body { margin: 0; background: #f3f6f5; color: #1c2b27; }
.top { display: flex; justify-content: space-between; align-items: center; padding: 14px 28px; background: #1f6f5c; color: #fff; }
.top h1 { margin: 0; font-size: 1.3rem; }
main { max-width: 1250px; margin: 20px auto; padding: 0 16px; display: grid; gap: 16px; }
.card { background: #fff; border-radius: 10px; padding: 18px 22px; box-shadow: 0 1px 4px #0001; }
.card h2 { margin: 0 0 12px; font-size: 1.1rem; }
.grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
label { display: flex; flex-direction: column; gap: 4px; font-size: .85rem; color: #46605a; }
input, select { padding: 6px 8px; border: 1px solid #c4d3cf; border-radius: 6px; font-size: .95rem; }
.scroll { overflow-x: auto; margin-bottom: 10px; }
table { border-collapse: collapse; width: 100%; font-size: .9rem; }
th { text-align: left; font-weight: 600; font-size: .78rem; color: #46605a; padding: 6px 4px; white-space: nowrap; }
td { padding: 4px; }
.w-code { width: 70px; } .w-name { width: 200px; } .w-num { width: 100px; }
td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
td.strong { font-weight: 700; color: #1f6f5c; }
button { cursor: pointer; border-radius: 6px; padding: 7px 16px; font-size: .9rem; border: 1px solid transparent; }
.primary { background: #ffd24d; color: #222; font-weight: 700; }
.ghost { background: transparent; border-color: #8fb3aa; color: inherit; }
.top .ghost { border-color: #fff8; color: #fff; }
.del { background: none; color: #b33; padding: 4px 8px; }
.hint { font-size: .8rem; color: #6b7f7a; margin: 4px 0 10px; }
.rates { display: flex; flex-wrap: wrap; gap: 14px; align-items: flex-end; margin-top: 14px; font-size: .85rem; }
.rates input { width: 90px; }
.actions { display: flex; gap: 10px; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; }
.stats div { display: flex; flex-direction: column; }
.stats span { font-size: .78rem; color: #46605a; }
.stats b { font-size: 1.35rem; font-variant-numeric: tabular-nums; }
.bar { height: 12px; background: #e3ebe9; border-radius: 6px; margin: 16px 0 8px; overflow: hidden; }
.bar div { height: 100%; transition: width .3s; }
.ok .bar div { background: #2e9e6e; } .warn .bar div { background: #e08a1e; }
.result.ok { border-left: 6px solid #2e9e6e; } .result.warn { border-left: 6px solid #e08a1e; }
.verdict { font-size: 1.05rem; font-weight: 600; margin: 6px 0; }
</style>
