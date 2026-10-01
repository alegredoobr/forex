export function initRisk({ bankroll, riskPct, out }) {
  const fmt = new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
  const update=()=>{ const b=Number(bankroll.value), p=Number(riskPct.value); out.textContent=Number.isFinite(b)&&Number.isFinite(p)&&b>=0&&p>=0&&p<=100?fmt.format(b*p/100):'—'; };
  bankroll.addEventListener('input',update); riskPct.addEventListener('input',update); update();
}
