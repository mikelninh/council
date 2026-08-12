import { runCouncil } from '../lib/council.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const result = await runCouncil(req.body || {});
    // v4 API compatibility: the canonical backend field is `memory`, while an
    // early v4 client read `note`. Return both until all deployments converge.
    result.memoryUpdates = (result.memoryUpdates || []).map((update) => ({
      ...update,
      note: update.note ?? update.memory
    }));
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(error?.status || 500).json({ error: error?.message || 'Council failed.' });
  }
}
