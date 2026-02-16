// =========================
// assets/app.js  (FULL)
// =========================

// ---- helpers ----
function g(id){ return document.getElementById(id); }
function num(id){ const v = parseFloat(g(id)?.value); return isNaN(v)?0:v; }
function toFixed(n,d=2){ return (+n).toFixed(d); }

// -------------------------------------------------------------
// 造成傷害：一次計算（供 damage-result.html 即時計算）
// 公式：
// Result = [ (攻擊力 + 平傷Σ) + (攻擊力 × %段Σ) ] × (1+爆%) × (1+克%) × (1+終%) × 係數
// UI 對應：
// 「○○傷害提高」→ 平傷；「○○傷害%」→ %段；臨時類型% → 加到 %段；普攻吃武器、技能吃技能。
// -------------------------------------------------------------
function __calcOnce(payload){
  const act   = payload?.act || 'normal';      // 'normal' | 'skill'
  const atk   = +payload.atk || 0;
  const coeff = +payload.coeff || 1;

  // 平傷段 Σ
  let flat = 0;
  flat += atk;
  flat += (+payload.dmgF     || 0);
  flat += (+payload.elemF    || 0);
  flat += (+payload.classF   || 0);
  flat += (+payload.forestF  || 0);
  if (act === 'normal') flat += (+payload.wpnF || 0);
  if (act === 'skill')  flat += (+payload.skF  || 0);

  // % 段 Σ（百分比 → 小數）
  let pct = 0;
  pct += (+payload.dmgP       || 0)/100;
  pct += (+payload.elemP      || 0)/100;
  pct += (+payload.classP     || 0)/100;
  pct += (+payload.classTempP || 0)/100;   // 例：遠程 +15%
  pct += (+payload.forestP    || 0)/100;
  if (act === 'normal') pct += (+payload.wpnP || 0)/100;
  if (act === 'skill')  pct += (+payload.skP  || 0)/100;

  // 乘區
  const crit     = 1 + ((+payload.crit     || 0)/100);
  const restrain = 1 + ((+payload.elemRes  || 0)/100);
  const finalMul = 1 + ((+payload.finalMul || 0)/100);

  const base   = flat + (atk * pct);
  const result = base * crit * restrain * finalMul * coeff;

  return { result, flat, pct, atk, base, crit, restrain, finalMul, coeff };
}

// -------------------------------------------------------------
// 承受傷害：calcTaken
// 公式：Taken = Incoming × [1000/(1000+DEF)] × Π(1-Resist_i%)
// 抗性輸入為百分比數字（10 表示 10%）。
// -------------------------------------------------------------
function calcTaken(payload){
  const incoming = payload?.incoming ?? (parseFloat(g('inDmg')?.value) || 0);
  const def      = payload?.def      ?? (parseFloat(g('def')?.value)   || 0);

  // 收集抗性輸入（百分比）
  const resists = payload?.resists ?? [...document.querySelectorAll('#resists input')]
    .map(inp => parseFloat(inp.value) || 0);

  // 疊乘
  let mult = 1;
  for (const p of resists) mult *= (1 - (p/100));

  // 防禦修正（防禦力不得為負）
  const defMul = 1000 / (1000 + Math.max(0, def));

  const taken = incoming * defMul * mult;

  // 儲存（供 taken-result.html 顯示）
  try{
    localStorage.setItem('taken_result_value', toFixed(taken,2));
    localStorage.setItem('taken_breakdown', JSON.stringify({
      incoming,
      def,
      defMul: +toFixed(defMul,6),
      mult:   +toFixed(mult,6)
    }));
  }catch(e){ /* ignore quota */ }

  return taken;
}

// -------------------------------------------------------------
// 承受傷害頁：新增一條抗性輸入
// -------------------------------------------------------------
function addResistRow(val=0){
  const wrap = g('resists');
  if(!wrap) return;
  const row = document.createElement('div');
  row.className = 'row';
  const id = 'res' + Math.random().toString(36).slice(2,7);
  row.innerHTML = `
    <label for="${id}">抗性%</label>
    <input id="${id}" type="number" step="0.01" value="${val}">
  `;
  wrap.appendChild(row);
}

// -------------------------------------------------------------
// DPS（依你規則）
// 普通 100%/秒；重擊 40%/秒；技能 60%/秒
// -------------------------------------------------------------
function calcDPS(custom){
  const normal = custom?.normal ?? (parseFloat(g('dpsN')?.value) || 0);
  const heavy  = custom?.heavy  ?? (parseFloat(g('dpsH')?.value) || 0);
  const skill  = custom?.skill  ?? (parseFloat(g('dpsS')?.value) || 0);
  const total  = (normal || 0) + (heavy || 0) + (skill || 0);

  try{
    localStorage.setItem('dps_result_value', toFixed(total,2));
    localStorage.setItem('dps_breakdown', JSON.stringify({normal,heavy,skill}));
  }catch(e){ /* ignore quota */ }

  return total;
}

// -------------------------------------------------------------
// 全域綁定（確保 HTML 直接可用）
// -------------------------------------------------------------
window.__calcOnce   = __calcOnce;
window.calcTaken    = calcTaken;
window.addResistRow = addResistRow;
window.calcDPS      = calcDPS;