// Caches AI scan results (per region+category) so all users share results instead of
// every user re-triggering a fresh AI search for the same combo. Backed by Upstash Redis.

const BASE = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const PREFIX = "scoutly_cache:";

async function redisGet(key) {
  const r = await fetch(`${BASE}/get/${encodeURIComponent(key)}`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  const data = await r.json();
  return data.result;
}
async function redisSet(key, value) {
  await fetch(`${BASE}/set/${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'text/plain' },
    body: value
  });
}

export default async function handler(req, res) {
  if (!BASE || !TOKEN) {
    return res.status(500).json({ error: 'Server is missing UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN environment variables.' });
  }
  try {
    if (req.method === 'GET') {
      const key = PREFIX + (req.query.key || '');
      const raw = await redisGet(key);
      return res.status(200).json({ data: raw ? JSON.parse(raw) : null });
    }
    if (req.method === 'POST') {
      const { key, data } = req.body || {};
      if (!key) return res.status(400).json({ error: 'Missing key' });
      await redisSet(PREFIX + key, JSON.stringify(data));
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Storage error', details: String(err) });
  }
}
