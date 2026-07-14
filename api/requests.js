// Stores the shared list of user access requests (name + approval status) so every
// user's browser and the admin panel all see the same data. Backed by Upstash Redis
// (a free hosted key-value store that works over plain HTTP — no npm packages needed).

const BASE = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY = "scoutly_user_requests";

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
      const raw = await redisGet(KEY);
      const requests = raw ? JSON.parse(raw) : [];
      return res.status(200).json({ requests });
    }
    if (req.method === 'POST') {
      const requests = req.body?.requests || [];
      await redisSet(KEY, JSON.stringify(requests));
      return res.status(200).json({ ok: true });
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    return res.status(500).json({ error: 'Storage error', details: String(err) });
  }
}
