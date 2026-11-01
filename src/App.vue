<script setup lang="ts">
import { computed, ref } from 'vue'
import { usePlanStore } from '@/stores/plan'
import { MOCK_FUNDS } from '@/data/mockFunds'
import { CURRENCIES, FREQUENCY_LABELS, type Frequency, type Holding } from '@/utils/calc'
import { exportExcel } from '@/utils/exportExcel'

const store = usePlanStore()
const currentStep = ref(1)
const selectedMockFunds = ref<Record<string, string>>({})
const frequencies = Object.keys(FREQUENCY_LABELS).map(Number) as Frequency[]
const foreignCurrencies = computed(() =>
  CURRENCIES.filter((c) => c !== 'TWD' && store.holdings.some((h) => h.currency === c)),
)
const steps = [
  { number: 1, label: '客戶與退休目標' },
  { number: 2, label: '持有基金' },
  { number: 3, label: '試算結果' },
]
const stepTitle = computed(() => steps[currentStep.value - 1]?.label ?? '')
const enough = computed(() => store.summary.coverage >= 1)
const barWidth = computed(() => Math.min(100, store.summary.coverage * 100) + '%')
const fmt = (n: number, d = 0) =>
  n.toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d })
const pct = (n: number, d = 2) => (n * 100).toFixed(d) + '%'
function goNext() {
  if (currentStep.value < 3) currentStep.value += 1
}
function goBack() {
  if (currentStep.value > 1) currentStep.value -= 1
}
function onExport() {
  exportExcel(store.clientName, store.holdings, store.rates, store.plan)
}
function onReset() {
  if (confirm('確定要清空所有基金資料嗎？')) {
    store.reset()
    currentStep.value = 1
    selectedMockFunds.value = {}
  }
}
function applyMockFund(holding: Holding, fundCode: string) {
  const fund = MOCK_FUNDS.find((item) => item.code === fundCode)
  if (!fund) return
  Object.assign(holding, fund)
  selectedMockFunds.value[holding.id] = ''
}
</script>

<template>
  <div class="app-shell">
    <header class="top">
      <div class="brand">
        <span class="brand-mark" aria-hidden="true">↗</span>
        <div>
          <p class="eyebrow">RETIREMENT PLANNER</p>
          <h1>基金月配息退休試算</h1>
        </div>
      </div>
      <button class="top-reset" type="button" @click="onReset">重新開始</button>
    </header>
    <main>
      <nav class="stepper" aria-label="試算流程">
        <div v-for="step in steps" :key="step.number" class="step-wrap">
          <div
            class="step"
            :class="{ active: currentStep === step.number, done: currentStep > step.number }"
          >
            <span class="step-number">{{ currentStep > step.number ? '✓' : step.number }}</span
            ><span>{{ step.label }}</span>
          </div>
          <span
            v-if="step.number < steps.length"
            class="step-line"
            :class="{ filled: currentStep > step.number }"
            aria-hidden="true"
          ></span>
        </div>
      </nav>
      <Transition name="slide" mode="out-in">
        <section :key="currentStep" class="page-card">
          <div class="page-heading">
            <div>
              <p class="step-kicker">STEP {{ currentStep }} OF 3</p>
              <h2>{{ stepTitle }}</h2>
              <p v-if="currentStep === 1" class="heading-copy">
                先設定客戶基本資料與退休生活目標，作為後續試算基準。
              </p>
              <p v-else-if="currentStep === 2" class="heading-copy">
                輸入目前持有的基金，系統會自動估算每月配息。
              </p>
              <p v-else class="heading-copy">以下是依照目前資料計算的退休配息規劃結果。</p>
            </div>
            <span class="page-count">{{ currentStep }} / 3</span>
          </div>
          <div v-if="currentStep === 1" class="content-body">
            <div class="form-grid">
              <label class="field full-field"
                ><span>客戶姓名 <small>選填</small></span
                ><input
                  v-model="store.clientName"
                  placeholder="例如：王小明"
                  autocomplete="name" /></label
              ><label class="field"
                ><span>退休後每月所需生活費 <small>台幣・今日幣值</small></span>
                <div class="input-with-unit">
                  <input
                    v-model.number="store.plan.monthlyNeed"
                    type="number"
                    min="0"
                    step="1000"
                    inputmode="numeric"
                  /><em>元 / 月</em>
                </div></label
              ><label class="field"
                ><span>距離退休年數 <small>0 = 已退休</small></span>
                <div class="input-with-unit">
                  <input
                    v-model.number="store.plan.yearsToRetire"
                    type="number"
                    min="0"
                    step="1"
                    inputmode="numeric"
                  /><em>年</em>
                </div></label
              ><label class="field"
                ><span>預估年通膨率</span>
                <div class="input-with-unit">
                  <input
                    v-model.number="store.plan.inflation"
                    type="number"
                    min="0"
                    step="0.1"
                    inputmode="decimal"
                  /><em>%</em>
                </div></label
              >
            </div>
            <aside class="info-note">
              <span aria-hidden="true">i</span>
              <p>退休年數與通膨率會用來推估「退休時每月所需」的生活費。</p>
            </aside>
          </div>
          <div v-else-if="currentStep === 2" class="content-body funds-body">
            <p class="hint">
              可使用示範基金快速帶入資料，也可以直接手動輸入。金額、市價與配息皆以基金計價幣別填寫。
            </p>
            <div class="scroll">
              <table class="funds-table">
                <colgroup>
                  <col class="col-mock" />
                  <col class="col-code" />
                  <col class="col-name" />
                  <col class="col-currency" />
                  <col class="col-frequency" />
                  <col class="col-amount" />
                  <col class="col-price" />
                  <col class="col-dividend" />
                  <col class="col-monthly" />
                  <col class="col-action" />
                </colgroup>
                <thead>
                  <tr>
                    <th>快速帶入</th>
                    <th>基金代碼</th>
                    <th>基金名稱</th>
                    <th>幣別</th>
                    <th>配息頻率</th>
                    <th>投資金額</th>
                    <th>市價 / 淨值</th>
                    <th>每單位配息</th>
                    <th>預估月配息 (台幣)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(h, i) in store.holdings" :key="h.id">
                    <td data-label="快速帶入">
                      <select
                        v-model="selectedMockFunds[h.id]"
                        class="mock-select"
                        aria-label="選擇示範基金"
                        @change="applyMockFund(h, selectedMockFunds[h.id] || '')"
                      >
                        <option value="">選擇示範基金</option>
                        <option v-for="fund in MOCK_FUNDS" :key="fund.code" :value="fund.code">
                          {{ fund.code }}｜{{ fund.name }}
                        </option>
                      </select>
                    </td>
                    <td data-label="基金代碼">
                      <input v-model="h.code" class="w-code" placeholder="AGF9" />
                    </td>
                    <td data-label="基金名稱">
                      <input v-model="h.name" class="w-name" placeholder="基金名稱" />
                    </td>
                    <td data-label="幣別">
                      <select v-model="h.currency" class="w-currency">
                        <option v-for="c in CURRENCIES" :key="c">{{ c }}</option>
                      </select>
                    </td>
                    <td data-label="配息頻率">
                      <select v-model.number="h.frequency" class="w-frequency">
                        <option v-for="f in frequencies" :key="f" :value="f">
                          {{ FREQUENCY_LABELS[f] }}
                        </option>
                      </select>
                    </td>
                    <td data-label="投資金額">
                      <input v-model.number="h.amount" type="number" min="0" class="w-num" />
                    </td>
                    <td data-label="市價 / 淨值">
                      <input
                        v-model.number="h.price"
                        type="number"
                        min="0"
                        step="any"
                        class="w-num"
                      />
                    </td>
                    <td data-label="每單位配息">
                      <input
                        v-model.number="h.dividendPerUnit"
                        type="number"
                        min="0"
                        step="any"
                        class="w-num"
                      />
                    </td>
                    <td data-label="預估月配息 (台幣)" class="num strong">
                      {{ fmt(store.results[i]?.monthlyTWD ?? 0) }}
                    </td>
                    <td class="td-del">
                      <button
                        class="del"
                        type="button"
                        title="刪除"
                        @click="store.removeHolding(h.id)"
                      >
                        ✕<span class="del-text"> 刪除</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button class="add-fund" type="button" @click="store.addHolding()">＋ 新增基金</button>
            <div v-if="foreignCurrencies.length" class="rates">
              <strong>匯率 <small>1 外幣 = ? 台幣</small></strong
              ><label v-for="c in foreignCurrencies" :key="c"
                >{{ c }}<input v-model.number="store.rates[c]" type="number" min="0" step="any"
              /></label>
            </div>
          </div>
          <div v-else class="content-body result-body">
            <div class="result-banner" :class="enough ? 'ok' : 'warn'">
              <span class="result-icon">{{ enough ? '✓' : '!' }}</span>
              <div>
                <strong>{{ enough ? '目前配息足以支應退休生活' : '目前配息尚有缺口' }}</strong>
                <p v-if="enough">
                  每月預估結餘
                  {{ fmt(store.summary.monthlyIncomeTWD - store.summary.adjustedNeed) }} 元
                </p>
                <p v-else>每月預估缺口 {{ fmt(store.summary.gap) }} 元</p>
              </div>
            </div>
            <div class="stats">
              <div>
                <span>投資總額 (台幣)</span><b>{{ fmt(store.summary.totalAmountTWD) }}</b
                ><small>目前基金本金</small>
              </div>
              <div>
                <span>預估每月配息</span><b>{{ fmt(store.summary.monthlyIncomeTWD) }}</b
                ><small>以目前持有基金估算</small>
              </div>
              <div>
                <span>退休時每月所需</span><b>{{ fmt(store.summary.adjustedNeed) }}</b
                ><small>已納入通膨調整</small>
              </div>
              <div>
                <span>配息覆蓋率</span><b>{{ pct(store.summary.coverage, 1) }}</b
                ><small>目標為 100%</small>
              </div>
            </div>
            <div class="coverage">
              <div class="coverage-label">
                <span>退休生活費覆蓋進度</span><strong>{{ pct(store.summary.coverage, 1) }}</strong>
              </div>
              <div class="bar"><div :style="{ width: barWidth }"></div></div>
            </div>
            <p class="hint result-hint">試算假設配息金額維持不變，未計稅費與匯率波動，僅供參考。</p>
          </div>
          <footer class="page-actions">
            <button v-if="currentStep > 1" class="back-button" type="button" @click="goBack">
              ← 上一步</button
            ><span v-else></span
            ><button v-if="currentStep < 3" class="next-button" type="button" @click="goNext">
              {{ currentStep === 2 ? '查看試算結果' : '下一步' }} <span>→</span></button
            ><button v-else class="export-button" type="button" @click="onExport">
              ⇩ 下載 Excel 結果
            </button>
          </footer>
        </section>
      </Transition>
    </main>
  </div>
</template>

<style>
:root {
  color-scheme: light;
  font-family: Inter, system-ui, 'Noto Sans TC', sans-serif;
}
* {
  box-sizing: border-box;
}
body {
  margin: 0;
  background: #f4f7f6;
  color: #18352e;
}
button,
input,
select {
  font: inherit;
}
button {
  cursor: pointer;
}
.app-shell {
  min-height: 100vh;
}
.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px max(24px, calc((100vw - 1120px) / 2));
  background: #fff;
  border-bottom: 1px solid #e1ebe8;
}
.brand {
  display: flex;
  gap: 12px;
  align-items: center;
}
.brand-mark {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: #fff;
  background: #16745d;
  border-radius: 12px;
  font-size: 1.35rem;
  font-weight: 800;
}
.eyebrow,
.step-kicker {
  margin: 0 0 3px;
  color: #5f8279;
  font-size: 0.68rem;
  letter-spacing: 0.13em;
  font-weight: 800;
}
.top h1 {
  margin: 0;
  font-size: 1.2rem;
  letter-spacing: 0.02em;
}
.top-reset {
  padding: 8px 14px;
  color: #52746b;
  background: transparent;
  border: 1px solid #b8d0c9;
  border-radius: 8px;
  font-size: 0.85rem;
}
main {
  width: min(1120px, calc(100% - 32px));
  margin: 42px auto;
}
.stepper {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
}
.step-wrap {
  display: flex;
  align-items: center;
}
.step {
  display: flex;
  align-items: center;
  gap: 9px;
  color: #93aaa4;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
}
.step-number {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid #c7d8d3;
  border-radius: 50%;
  font-size: 0.8rem;
}
.step.active {
  color: #16745d;
}
.step.active .step-number {
  color: #fff;
  background: #16745d;
  border-color: #16745d;
}
.step.done {
  color: #16745d;
}
.step.done .step-number {
  color: #fff;
  background: #76b6a4;
  border-color: #76b6a4;
}
.step-line {
  display: block;
  width: 74px;
  height: 1px;
  margin: 0 16px;
  background: #d5e2df;
}
.step-line.filled {
  background: #76b6a4;
}
.page-card {
  overflow: hidden;
  background: #fff;
  border: 1px solid #e1ebe8;
  border-radius: 18px;
  box-shadow: 0 12px 35px #16483a0d;
}
.page-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 34px 42px 26px;
  border-bottom: 1px solid #edf2f0;
}
.page-heading h2 {
  margin: 0;
  color: #173d33;
  font-size: 1.55rem;
}
.heading-copy {
  margin: 8px 0 0;
  color: #759088;
  font-size: 0.9rem;
}
.page-count {
  padding: 6px 10px;
  color: #6d8a82;
  background: #f1f7f5;
  border-radius: 20px;
  font-size: 0.78rem;
  font-weight: 700;
}
.content-body {
  min-height: 330px;
  padding: 34px 42px;
}
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px 28px;
  max-width: 760px;
}
.full-field {
  grid-column: 1 / -1;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #35594f;
  font-size: 0.86rem;
  font-weight: 700;
}
.field small,
.rates small {
  color: #93aaa4;
  font-weight: 400;
}
.field input,
.field select,
.rates input,
td input,
td select {
  width: 100%;
  padding: 11px 12px;
  color: #23433b;
  background: #fff;
  border: 1px solid #cadbd6;
  border-radius: 8px;
  outline: none;
}
.field input:focus,
td input:focus,
td select:focus {
  border-color: #43a48b;
  box-shadow: 0 0 0 3px #43a48b1a;
}
.input-with-unit {
  position: relative;
}
.input-with-unit input {
  padding-right: 60px;
}
.input-with-unit em {
  position: absolute;
  top: 50%;
  right: 13px;
  color: #7d9890;
  transform: translateY(-50%);
  font-size: 0.8rem;
  font-style: normal;
}
.info-note {
  display: flex;
  gap: 10px;
  align-items: center;
  max-width: 760px;
  margin-top: 34px;
  padding: 13px 15px;
  color: #58776e;
  background: #f4faf8;
  border-radius: 8px;
  font-size: 0.82rem;
}
.info-note span {
  display: grid;
  place-items: center;
  width: 19px;
  height: 19px;
  color: #fff;
  background: #71b4a0;
  border-radius: 50%;
  font-weight: 800;
}
.info-note p {
  margin: 0;
}
.funds-body {
  padding-top: 26px;
}
.hint {
  color: #78928a;
  font-size: 0.82rem;
  line-height: 1.7;
}
.scroll {
  overflow-x: auto;
}
.funds-body table {
  width: 1120px;
  min-width: 1120px;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: 0.82rem;
}
.funds-body th {
  padding: 10px 7px;
  color: #6d8980;
  background: #f5f9f8;
  text-align: left;
  font-size: 0.72rem;
  white-space: nowrap;
}
.funds-body td {
  padding: 7px;
  border-bottom: 1px solid #edf2f0;
}
.funds-body td input,
.funds-body td select {
  width: 100%;
  padding: 8px;
  font-size: 0.8rem;
}
.col-mock {
  width: 120px;
}
.col-code {
  width: 70px;
}
.col-name {
  width: 150px;
}
.col-currency {
  width: 70px;
}
.col-frequency {
  width: 70px;
}
.col-amount {
  width: 115px;
}
.col-price {
  width: 105px;
}
.col-dividend {
  width: 115px;
}
.col-monthly {
  width: 100px;
}
.col-action {
  width: 64px;
}
.mock-select {
  min-width: 0;
}
.w-code {
  width: 100%;
}
.w-name {
  width: 100%;
}
.w-num {
  width: 100%;
}
.w-currency,
.w-frequency {
  width: 100%;
}
.num {
  white-space: nowrap;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.strong {
  color: #16745d;
  font-weight: 800;
}
.del {
  padding: 5px 8px;
  color: #b86161;
  background: none;
  border: 0;
}
.del-text {
  display: none;
}
.add-fund {
  margin-top: 17px;
  padding: 9px 14px;
  color: #16745d;
  background: #eff8f5;
  border: 1px solid #b5d8ce;
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 700;
}
.rates {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 12px;
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid #edf2f0;
  color: #5d7b72;
  font-size: 0.8rem;
}
.rates label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.rates input {
  width: 85px;
  padding: 7px 8px;
}
.result-body {
  min-height: 340px;
}
.result-banner {
  display: flex;
  gap: 13px;
  align-items: center;
  width: fit-content;
  min-width: 310px;
  padding: 14px 18px;
  border-radius: 10px;
}
.result-banner.ok {
  color: #176b53;
  background: #eef9f4;
}
.result-banner.warn {
  color: #9b6815;
  background: #fff8e9;
}
.result-icon {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  color: #fff;
  background: #2e9e6e;
  border-radius: 50%;
  font-weight: 800;
}
.warn .result-icon {
  background: #e2a12d;
}
.result-banner strong {
  font-size: 0.95rem;
}
.result-banner p {
  margin: 4px 0 0;
  font-size: 0.8rem;
}
.stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
  margin-top: 34px;
}
.stats div {
  padding: 18px;
  background: #f7faf9;
  border-radius: 10px;
}
.stats span {
  color: #6f8d84;
  font-size: 0.76rem;
}
.stats b {
  display: block;
  margin: 10px 0 6px;
  color: #1a4439;
  font-size: 1.45rem;
  font-variant-numeric: tabular-nums;
}
.stats small {
  color: #98aaa5;
  font-size: 0.7rem;
}
.coverage {
  margin-top: 30px;
}
.coverage-label {
  display: flex;
  justify-content: space-between;
  color: #55776d;
  font-size: 0.82rem;
}
.coverage-label strong {
  color: #16745d;
}
.bar {
  height: 12px;
  margin-top: 9px;
  overflow: hidden;
  background: #e3eeea;
  border-radius: 8px;
}
.bar div {
  height: 100%;
  background: #42a681;
  border-radius: inherit;
  transition: width 0.3s;
}
.result-hint {
  margin-top: 28px;
}
.page-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 42px;
  background: #fbfcfc;
  border-top: 1px solid #edf2f0;
}
.back-button {
  padding: 10px 14px;
  color: #638078;
  background: transparent;
  border: 0;
  font-weight: 700;
}
.next-button,
.export-button {
  padding: 11px 20px;
  color: #fff;
  background: #16745d;
  border: 0;
  border-radius: 8px;
  font-weight: 700;
}
.next-button span {
  margin-left: 12px;
}
.export-button {
  background: #e29c25;
}
.slide-enter-active,
.slide-leave-active {
  transition:
    opacity 0.18s,
    transform 0.18s;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(14px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-14px);
}
@media (max-width: 760px) {
  .top {
    padding: 16px;
  }
  .top h1 {
    font-size: 1.05rem;
  }
  main {
    width: calc(100% - 20px);
    margin: 24px auto;
  }
  .stepper {
    justify-content: space-between;
  }
  .step {
    flex-direction: column;
    gap: 4px;
    font-size: 0.68rem;
    text-align: center;
  }
  .step-line {
    width: 34px;
    margin: 0 5px;
  }
  .page-heading,
  .content-body {
    padding: 24px 20px;
  }
  .page-heading h2 {
    font-size: 1.3rem;
  }
  .page-count {
    display: none;
  }
  .form-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .full-field {
    grid-column: auto;
  }
  .content-body {
    min-height: 380px;
  }
  .stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px;
  }
  .stats div {
    padding: 13px;
  }
  .stats b {
    font-size: 1.12rem;
  }
  .result-banner {
    min-width: 0;
    width: 100%;
  }
  .page-actions {
    padding: 16px 20px;
  }
  .next-button,
  .export-button {
    padding: 11px 15px;
  }
  .funds-body {
    padding-left: 12px;
    padding-right: 12px;
  }
  .funds-body .hint {
    padding: 0 8px;
  }
  .add-fund,
  .rates {
    margin-left: 8px;
  }
  .del-text {
    display: inline;
  }
}
@media (max-width: 400px) {
  .stats {
    grid-template-columns: 1fr;
  }
  .brand-mark {
    width: 32px;
    height: 32px;
  }
  .top-reset {
    padding: 7px 9px;
    font-size: 0.75rem;
  }
}
</style>
