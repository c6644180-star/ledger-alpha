export default async function handler(req, res) {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q required' });
  try {
    const r = await fetch(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=15&newsCount=0`,
      { headers: { 'User-Agent': 'Mozilla/5.0' } }
    );
    const d = await r.json();
    const found = (d.quotes || [])
      .filter(x => x.exchange === 'NSI' || x.exchange === 'BSE')
      .map(x => ({
        name: x.shortname || x.longname || x.symbol,
        symbol: (x.symbol || '').replace(/\.(NS|BO)$/, ''),
        type: 'stock'
      }));
    res.status(200).json({ results: found });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
