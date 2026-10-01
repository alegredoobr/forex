export function renderAnalysisPlaceholder(container) {
  const rows = [['Tendência','—'],['Região','—'],['Confirmação','—'],['Volatilidade','—'],['Notícias','—'],['Risco/Retorno','—']];
  container.replaceChildren();
  for (const [label,value] of rows) {
    const dt=document.createElement('dt'), dd=document.createElement('dd');
    dt.textContent=label; dd.textContent=value; container.append(dt,dd);
  }
}
