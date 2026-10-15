import {
  FREQUENCY_LABELS,
  calcHolding,
  calcSummary,
  type Holding,
  type Plan,
  type Rates,
} from './calc'

export async function exportExcel(
  clientName: string,
  holdings: Holding[],
  rates: Rates,
  plan: Plan,
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('配息試算')
  const s = calcSummary(holdings, rates, plan)

  ws.addRow([`基金月配息退休試算 - ${clientName || '客戶'}`]).font = { bold: true, size: 14 }
  ws.addRow([`試算日期：${new Date().toLocaleDateString('zh-TW')}`])
  ws.addRow([])

  const header = ws.addRow([
    '基金代碼', '基金名稱', '幣別', '配息頻率', '投資金額(原幣)', '市價(淨值)',
    '持有單位數', '每單位配息', '單次配息(原幣)', '平均月配息(原幣)',
    '匯率', '平均月配息(台幣)', '年化配息率',
  ])
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } }
  header.eachCell((c) => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F6F5C' } }
    c.alignment = { horizontal: 'center' }
  })

  for (const h of holdings) {
    const r = calcHolding(h, rates)
    ws.addRow([
      h.code, h.name, h.currency, FREQUENCY_LABELS[h.frequency], h.amount, h.price,
      r.units, h.dividendPerUnit, r.perPayment, r.monthly,
      rates[h.currency], r.monthlyTWD, r.yieldRate,
    ])
  }
  const lastRow = ws.lastRow!.number
  for (let i = header.number + 1; i <= lastRow; i++) {
    const row = ws.getRow(i)
    ;[5, 7, 9, 10, 12].forEach((c) => (row.getCell(c).numFmt = '#,##0.00'))
    row.getCell(6).numFmt = '0.0000'
    row.getCell(8).numFmt = '0.0000'
    row.getCell(11).numFmt = '0.0000'
    row.getCell(13).numFmt = '0.00%'
  }

  ws.addRow([])
  const rows: [string, number | string, string?][] = [
    ['投資總額(台幣)', s.totalAmountTWD, '#,##0'],
    ['預估每月配息合計(台幣)', s.monthlyIncomeTWD, '#,##0'],
    ['預估年配息合計(台幣)', s.annualIncomeTWD, '#,##0'],
    ['整體年化配息率', s.yieldRate, '0.00%'],
    ['退休每月生活費(今日幣值)', plan.monthlyNeed, '#,##0'],
    ['預估通膨率(%)', plan.inflation, '0.0'],
    ['距離退休年數', plan.yearsToRetire, '0'],
    ['通膨調整後每月所需', s.adjustedNeed, '#,##0'],
    ['配息覆蓋率', s.coverage, '0.0%'],
    [s.gap > 0 ? '每月缺口' : '每月結餘', s.gap > 0 ? s.gap : s.monthlyIncomeTWD - s.adjustedNeed, '#,##0'],
    ['結論', s.coverage >= 1 ? '配息足以支應退休生活所需' : '配息尚不足以支應退休生活所需'],
  ]
  if (s.gap > 0) rows.push(['達標約需再投入(台幣)', s.extraInvestNeeded, '#,##0'])
  for (const [label, value, fmt] of rows) {
    const row = ws.addRow([label, value])
    row.getCell(1).font = { bold: true }
    if (fmt) row.getCell(2).numFmt = fmt
    row.getCell(2).alignment = { horizontal: 'left' }
  }
  ws.addRow([])
  ws.addRow(['備註：試算結果假設配息金額維持不變且不含稅費、匯率波動，僅供參考，實際配息以基金公司公告為準。'])

  ws.columns.forEach((col, i) => (col.width = i === 1 ? 36 : i === 0 ? 24 : 16))

  const buf = await wb.xlsx.writeBuffer()
  const url = URL.createObjectURL(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
  const a = document.createElement('a')
  a.href = url
  a.download = `基金配息試算_${clientName || '客戶'}_${new Date().toISOString().slice(0, 10)}.xlsx`
  a.click()
  URL.revokeObjectURL(url)
}
