import { runCouncil } from '../lib/council.mjs';

function clean(value = '') {
  return String(value)
    .replace(/\*\*/g, '')
    .replace(/^\s*[-*•]\s*/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function section(text = '', label = '', nextLabels = []) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const next = nextLabels.length
    ? `(?=\\n\\s*(?:#{1,6}\\s*)?(?:\\d+\\.?\\s*)?(?:${nextLabels.map((x) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b|$)`
    : '$';
  const match = String(text).match(new RegExp(`(?:^|\\n)\\s*(?:#{1,6}\\s*)?(?:\\d+\\.?\\s*)?${escaped}\\s*(?:[-—:]\\s*)?([\\s\\S]*?)${next}`, 'i'));
  return clean(match?.[1] || '');
}

function firstSentence(value = '', max = 260) {
  const text = clean(value);
  if (!text) return '';
  const sentence = text.match(/^(.+?[.!?])(?:\s|$)/)?.[1] || text;
  return sentence.slice(0, max).trim();
}

function actionLines(value = '') {
  const raw = String(value || '');
  const lines = raw
    .split(/\n+/)
    .map((line) => clean(line.replace(/^\s*\d+[.)]\s*/, '')))
    .filter(Boolean);
  if (lines.length > 1) return lines.slice(0, 2);
  const compact = clean(raw);
  if (!compact) return [];
  return compact.split(/\s+(?=\d+[.)]\s+)/).map(clean).filter(Boolean).slice(0, 2);
}

function portfolioSummary(result = {}) {
  const run = (result.toolRuns || []).find((r) => r.tool === 'github.portfolio.scan' && r.status === 'success');
  if (!run?.summary) return null;
  return {
    repos: Number(run.summary.count || 0),
    privateRepos: Number(run.summary.privateCount || 0),
    scope: run.summary.scope || run.scope || 'unknown',
    active90: Number(run.summary.active90 || 0),
    readmeCoverage: Number(run.summary.readmeCoverage || 0)
  };
}

export function buildFounderView(result = {}) {
  const text = String(result.synthesis?.content || '').trim();
  if (!text) return null;
  const isPortfolio = Boolean(result.decisionQuality?.portfolioDecision);

  const decision = section(text, 'DECISION', ['CONFIDENCE', 'FALSIFICATION TEST', 'NEXT ACTION']);
  const confidenceSection = section(text, 'CONFIDENCE', ['FALSIFICATION TEST', 'NEXT ACTION']);
  const falsification = section(text, 'FALSIFICATION TEST', ['NEXT ACTION']);
  const nextAction = section(text, 'NEXT ACTION', []);
  const redTeam = section(text, 'RED-TEAM CHALLENGE', ['DECISION', 'CONFIDENCE']);

  if (!isPortfolio && !decision) {
    const conclusion = section(text, 'CONCLUSION', ['STRONGEST UNRESOLVED TENSION', 'ONE BEST NEXT ACTION']);
    const next = section(text, 'ONE BEST NEXT ACTION', []);
    return {
      kind: 'brief',
      title: firstSentence(conclusion || text, 180),
      confidence: null,
      why: '',
      alternative: '',
      falsification: '',
      nextActions: actionLines(next).slice(0, 1),
      evidencePassed: Boolean(result.evidenceGate?.passed),
      portfolio: portfolioSummary(result),
      agents: (result.selected || []).length,
      criticSucceeded: result.decisionQuality?.criticSucceeded ?? null
    };
  }

  const confidence = Math.max(0, Math.min(100, Number(confidenceSection.match(/\b(100|[1-9]?\d)\b/)?.[1] || 0))) || null;
  const title = firstSentence(decision || text, 180)
    .replace(/^(?:exactly one )?(?:company )?priority(?: now)?\s*[:—-]\s*/i, '')
    .replace(/^recommendation\s*[:—-]\s*/i, '')
    .trim();

  let why = decision && clean(decision) !== clean(title)
    ? clean(decision).replace(clean(title), '').replace(/^[:—-]\s*/, '').trim()
    : '';
  if (!why) why = clean(confidenceSection).replace(/\b(100|[1-9]?\d)\s*\/?\s*100?\b/i, '').replace(/^[:—-]\s*/, '').trim();
  why = firstSentence(why, 280);

  const alternativeMatch = redTeam.match(/(?:strongest\s+alternative|alternative|runner[- ]?up)\s*[:—-]\s*([^.;]+[.;]?)/i);
  const alternative = clean(alternativeMatch?.[1] || firstSentence(redTeam, 220));

  return {
    kind: isPortfolio ? 'decision' : 'brief',
    title: title || firstSentence(text, 180),
    confidence,
    why,
    alternative,
    falsification: firstSentence(falsification, 360),
    nextActions: actionLines(nextAction),
    evidencePassed: Boolean(result.evidenceGate?.passed),
    portfolio: portfolioSummary(result),
    agents: (result.selected || []).length,
    criticSucceeded: result.decisionQuality?.criticSucceeded ?? null
  };
}

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
    result.founderView = buildFounderView(result);
    return res.status(200).json(result);
  } catch (error) {
    console.error(error);
    return res.status(error?.status || 500).json({ error: error?.message || 'Council failed.' });
  }
}
