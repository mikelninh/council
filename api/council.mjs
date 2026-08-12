import { runCouncil } from '../lib/council.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    return res.status(200).json(await runCouncil(req.body || {}));
  } catch (error) {
    console.error(error);
    return res.status(error?.status || 500).json({ error: error?.message || 'Council failed.' });
  }
}
