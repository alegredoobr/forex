# Forex Copilot (etapa 1: dados + gráfico)

Assistente de análise e disciplina para Forex. **Somente conta demo.** Não executa ordens, não conecta a corretoras, não prevê o mercado.
Esta etapa entrega apenas: EUR/USD · 15 min · candles reais (Twelve Data) · gráfico candlestick · preço atual.

## 1. Estrutura

```
api/forex.js          Endpoint GET /api/forex (Vercel Function)
lib/twelvedata.js     Cliente Twelve Data + normalização/validação (provedor isolado)
public/index.html     Interface
public/css/style.css  Tema escuro responsivo
public/js/main.js     Orquestração e estratégia de atualização
public/js/api.js      Chamada ao nosso backend (nunca à Twelve Data)
public/js/chart.js    Gráfico (Lightweight Charts)
public/js/analysis.js PLACEHOLDER do motor de análise
public/js/risk.js     Risco máximo = banca × %
public/js/trader.js   Estado do trader (local)
test/                 Testes do backend (node --test)
vercel.json           Config da função + headers (public/ é o diretório estático padrão)
.env.example          Modelo da variável de ambiente
```

Módulos futuros (indicadores, tendência, S/R, gatilhos, calendário, diário, Supabase, backtest, IA, MT5) entram como arquivos novos em `lib/` (lógica) e `api/` (endpoints), e em `public/js/` (UI), sem reescrever o que existe.

## 2. Instalar

Requer Node 18+.

```bash
npm install
```

## 3. Criar a variável TWELVE_DATA_API_KEY

- **Local:** `cp .env.example .env.local` e coloque sua chave (obtida em twelvedata.com → Dashboard → API Keys).
- **Vercel:** Project → Settings → Environment Variables → `TWELVE_DATA_API_KEY` (Production, Preview e Development). Faça novo deploy depois de criar.

Nunca commite `.env.local` (já está no `.gitignore`).

## 4. Rodar localmente

```bash
npx vercel login      # uma vez
npx vercel link       # uma vez
npm run dev           # npx vercel dev -> http://localhost:3000
npm run serve:local   # emulador offline do roteamento (sem CLI da Vercel)
npm test              # testes do backend (sem rede, sem chave)
```

## 5. Publicar na Vercel

> **Não use o Vercel Drop.** Ele publica os arquivos como estão, sem build: a pasta `api/` não vira Function (`/api/forex` dá 404) e `public/` não vira a raiz do site. Use Git ou a CLI.

**Opção A: Git (recomendada)**
1. Suba o projeto (raiz = pasta que contém `api/`, `public/`, `lib/`, `vercel.json`) para um repositório.
2. vercel.com/new → importe o repositório. Framework Preset: **Other**. Deixe Build Command, Output Directory e Install Command **vazios** (sem override).
3. Settings → Environment Variables → `TWELVE_DATA_API_KEY` (Production/Preview/Development).
4. Deploy (ou Redeploy, para a variável valer).

**Opção B: CLI**
```bash
npx vercel login
npx vercel link
npx vercel env add TWELVE_DATA_API_KEY
npx vercel --prod
```

**Verificação:** no deployment, a aba **Functions** deve listar `api/forex`; `https://SEU-DOMINIO/api/forex` deve retornar JSON (nunca a página 404 da Vercel).

## 6. Endpoints

`GET /api/forex` → 
```json
{ "symbol": "EUR/USD", "interval": "15min",
  "candles": [{ "time": 1760000000, "open": 0, "high": 0, "low": 0, "close": 0 }],
  "lastCandleTime": 1760000000, "fetchedAt": 1760000100 }
```
`time` é Unix em segundos (UTC), em ordem cronológica. Erros: `{ "error": { "code", "message", "retryAfter" } }` com status 429 (rate limit), 502 (provedor/rede/resposta inválida) ou 500 (chave ausente/erro interno). Mensagens nunca incluem a chave.

## 7. Frequência de atualização

Uma busca ao abrir e uma logo após cada fechamento de candle (xx:00, :15, :30, :45 + 10 s). Aba oculta não consulta. Redimensionar não consulta. Botão "Atualizar" tem espera de 60 s. Em erro, nova tentativa em 2 min (5 min se rate limit). Além disso, o servidor guarda o resultado por 60 s (memória + cache de CDN). Resultado: ~4 chamadas/h por aba, bem abaixo do limite do plano gratuito.

## 8. Ainda são placeholders

Análise do setup (todos os campos "—"), campos Entrada/Stop/Take (sem cálculo), cálculo de lote (não implementado de propósito), Estado do trader (só visual, sem regras), Supabase/autenticação.

## Licenças

Gráfico: TradingView Lightweight Charts™ (Apache 2.0), carregado por CDN com versão fixa; mantenha o crédito no rodapé.
