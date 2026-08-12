import { scanGitHubPortfolio } from '../lib/tools.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });
  try {
    const username = String(req.query?.username || process.env.GITHUB_USERNAME || 'mikelninh').trim();
    if (!/^[a-zA-Z0-9-]{1,39}$/.test(username)) return res.status(400).json({ error: 'Invalid GitHub username.' });
    const result = await scanGitHubPortfolio({ username });
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(error?.status || 500).json({ error: error?.message || 'GitHub portfolio scan failed.' });
  }
}
