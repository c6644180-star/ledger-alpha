export default async function handler(req, res) {
  const symbol = (req.query.symbol || '').trim();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  const tryExchange = async suffix => {
    try {
      const r = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}${suffix}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const d = await r.json();
      return d?.chart?.result?.[0]?.meta?.regularMarketPrice || null;
    } catch { return null; }
  };
  const nse = await tryExchange('.NS');
  if (nse) return res.status(200).json({ price: nse, symbol, exchange: 'NSE' });
  const bse = await tryExchange('.BO');
  if (bse) return res.status(200).json({ price: bse, symbol, exchange: 'BSE' });
  res.status(404).json({ error: 'No price found on NSE or BSE for this symbol' });
}
