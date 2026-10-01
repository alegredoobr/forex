export function createChart(container) {
  const chart = LightweightCharts.createChart(container, {
    width: container.clientWidth || 640, height: 420,
    layout: { background: { color: '#0d1117' }, textColor: '#aab4c0' },
    grid: { vertLines: { color: '#1d2630' }, horzLines: { color: '#1d2630' } },
    rightPriceScale: { borderColor: '#26313c' },
    timeScale: { borderColor: '#26313c', timeVisible: true, secondsVisible: false }
  });
  const series = chart.addCandlestickSeries();
  const resize = () => chart.applyOptions({ width: Math.max(280, container.clientWidth || 280) });
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(container);
  else window.addEventListener('resize', resize);
  return { setCandles(candles) { series.setData(candles); chart.timeScale().fitContent(); } };
}
