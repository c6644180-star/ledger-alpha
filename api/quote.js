export default async function handler(req, res) {
  const symbol = (req.query.symbol || '').trim();
  if (!symbol) return res.status(400).json({ error: 'symbol required' });
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}.NS`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const d = await r.json();
    const price = d?.chart?.result?.[0]?.meta?.regularMarketPrice;
    if (!price) return res.status(404).json({ error: 'No price found for this symbol on NSE' });
    res.status(200).json({ price, symbol });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
