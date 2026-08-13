(() => {
  const nativeFetch = window.fetch.bind(window);
  const runs = [];

  const esc = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[char]));

  const short = (value = '', max = 260) => {
    const text = String(value || '').replace(/\s+/g, ' ').trim();
    return text.length > max ? `${text.slice(0, max - 1).trim()}…` : text;
  };

  function installFounderChrome() {
    document.title = 'Council v5.3 — Founder View';
    if (!document.querySelector('link[data-founder-css]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/founder.css';
      link.dataset.founderCss = 'true';
      document.head.appendChild(link);
    }
    const brandVersion = document.querySelector('.brand-row span');
    if (brandVersion) brandVersion.textContent = 'company os · v5.3';
    const heroEyebrow = document.querySelector('.hero .hero-top .eyebrow');
    if (heroEyebrow) heroEyebrow.textContent = 'COUNCIL v5.3 · FOUNDER VIEW';
    const heroTitle = document.querySelector('.hero-copy h2');
    if (heroTitle) heroTitle.innerHTML = 'One decision.<br/>Everything else is audit.';
    const heroCopy = document.querySelector('.hero-copy p');
    if (heroCopy) heroCopy.textContent = 'Council can think in detail. You see the answer first, then open the reasoning only when you want it.';
    const chatTitle = document.querySelector('.chat-head h3');
    if (chatTitle) chatTitle.textContent = 'Founder view';
    const composerHint = document.querySelector('.composer-bottom span');
    if (composerHint) composerHint.textContent = 'Enter to send · Council thinks deeply, founder view stays concise';
  }

  function auditAgent(agent = {}) {
    const status = agent.status === 'failed' ? 'failed' : agent.status === 'skipped' ? 'skipped' : 'spoke';
    const body = agent.status === 'failed'
      ? `${agent.error || 'No visible output.'}${agent.attempts ? ` Tried ${agent.attempts}×.` : ''}`
      : agent.content || 'No visible contribution.';
    return `<details class="fv-agent-audit">
      <summary><span>${esc(agent.avatar || '·')}</span><b>${esc(agent.name || 'Agent')}</b><em>${esc(status)}</em></summary>
      <div>${esc(body).replace(/\n/g, '<br>')}</div>
    </details>`;
  }

  function auditTools(data = {}) {
    const toolRuns = data.toolRuns || [];
    if (!toolRuns.length) return '<p class="fv-audit-empty">No external tools were required.</p>';
    return toolRuns.map((run) => {
      const ok = run.status === 'success';
      let detail = run.error || '';
      if (run.tool === 'github.portfolio.scan' && ok) {
        detail = `${run.summary?.count || 0} repos · ${run.summary?.scope || run.scope || 'unknown'} · ${run.summary?.privateCount || 0} private`;
      }
      if (run.tool === 'github.repo.snapshot' && ok) detail = run.summary?.fullName || 'repository snapshot';
      return `<div class="fv-tool"><span>${ok ? '✓' : '!'}</span><b>${esc(run.tool)}</b><small>${esc(detail)}</small></div>`;
    }).join('');
  }

  function founderCard(run) {
    const data = run.original;
    const view = data.founderView || {};
    const portfolio = view.portfolio;
    const confidence = Number.isFinite(view.confidence) ? view.confidence : null;
    const confidenceLabel = confidence === null ? '—' : `${confidence}%`;
    const next = (view.nextActions || [])[0] || '';
    const secondNext = (view.nextActions || [])[1] || '';
    const evidence = view.evidencePassed ? 'Evidence passed' : 'Evidence incomplete';
    const critic = view.criticSucceeded === true ? 'Critic challenged' : view.criticSucceeded === false ? 'Critic failed' : '';
    const meta = [
      portfolio?.repos ? `${portfolio.repos} repos` : '',
      portfolio?.privateRepos ? `${portfolio.privateRepos} private` : '',
      view.agents ? `${view.agents} agents` : '',
      critic,
      evidence
    ].filter(Boolean);

    const auditAgents = (data.audit?.replies || []).map(auditAgent).join('');
    const fullSynthesis = data.audit?.synthesis?.content || data.synthesis?.content || '';

    return `<article class="founder-result" data-founder-key="${esc(run.key)}">
      <div class="fv-topline"><span>✦ COUNCIL DECISION</span><small>${esc(meta.join(' · '))}</small></div>
      <div class="fv-decision-row">
        <div class="fv-decision-copy">
          <h2>${esc(view.title || 'Council completed the run.')}</h2>
          ${view.why ? `<p>${esc(short(view.why, 300))}</p>` : ''}
        </div>
        <div class="fv-confidence" style="--fv-confidence:${confidence ?? 0}">
          <strong>${esc(confidenceLabel)}</strong><span>confidence</span>
        </div>
      </div>
      ${next ? `<div class="fv-next"><span>NEXT MOVE</span><strong>${esc(next)}</strong></div>` : ''}
      <div class="fv-actions">
        <details class="fv-why">
          <summary>Why this?</summary>
          <div class="fv-why-grid">
            ${view.why ? `<div><span>Decisive reason</span><p>${esc(view.why)}</p></div>` : ''}
            ${view.alternative ? `<div><span>Best alternative</span><p>${esc(view.alternative)}</p></div>` : ''}
            ${view.falsification ? `<div><span>Change our mind if…</span><p>${esc(view.falsification)}</p></div>` : ''}
            ${secondNext ? `<div><span>Then</span><p>${esc(secondNext)}</p></div>` : ''}
          </div>
        </details>
        <details class="fv-audit">
          <summary>Audit log <span>${esc(meta.slice(0, 3).join(' · '))}</span></summary>
          <div class="fv-audit-body">
            <section><h4>Evidence trace</h4>${auditTools(data)}</section>
            <section><h4>Agent room</h4>${auditAgents || '<p class="fv-audit-empty">No agent transcript.</p>'}</section>
            <details class="fv-full-synthesis"><summary>Full Council synthesis</summary><p>${esc(fullSynthesis).replace(/\n/g, '<br>')}</p></details>
          </div>
        </details>
      </div>
    </article>`;
  }

  function findRun(text = '') {
    const normalized = String(text).replace(/\s+/g, ' ').trim().toLowerCase();
    for (let i = runs.length - 1; i >= 0; i--) {
      const run = runs[i];
      const title = String(run.compactTitle || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (title && normalized.includes(title)) return run;
    }
    return runs[runs.length - 1] || null;
  }

  function upgradeFounderResults() {
    installFounderChrome();
    const chat = document.querySelector('#chat');
    if (!chat) return;
    chat.querySelectorAll('.message.orchestrator:not([data-founder-upgraded])').forEach((article) => {
      const text = article.textContent || '';
      if (!/decision:/i.test(text)) return;
      const run = findRun(text);
      if (!run?.original?.founderView) return;
      const wrapper = document.createElement('div');
      wrapper.innerHTML = founderCard(run).trim();
      const card = wrapper.firstElementChild;
      article.replaceWith(card);
      const previous = card.previousElementSibling;
      if (previous?.classList?.contains('trace-message')) previous.classList.add('fv-trace-hidden');
    });
  }

  window.fetch = async (...args) => {
    const response = await nativeFetch(...args);
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
    if (!url.includes('/api/council') || !response.ok) return response;

    try {
      const original = await response.clone().json();
      if (!original?.founderView) return response;

      const key = `fv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const audit = {
        replies: original.replies || [],
        synthesis: original.synthesis || {},
        toolRuns: original.toolRuns || [],
        failedAgents: original.failedAgents || []
      };
      original.audit = audit;
      original.replies = [];

      const view = original.founderView;
      const compactTitle = view.title || 'Council completed the run';
      original.synthesis = {
        ...(original.synthesis || {}),
        content: `Decision: ${compactTitle}${view.confidence !== null && view.confidence !== undefined ? `\nConfidence: ${view.confidence}%` : ''}`
      };
      runs.push({ key, compactTitle, original: structuredClone(original) });
      if (runs.length > 40) runs.shift();

      const headers = new Headers(response.headers);
      headers.set('content-type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify(original), {
        status: response.status,
        statusText: response.statusText,
        headers
      });
    } catch {
      return response;
    }
  };

  const observer = new MutationObserver(() => queueMicrotask(upgradeFounderResults));
  const start = () => {
    installFounderChrome();
    observer.observe(document.documentElement, { childList:true, subtree:true });
    upgradeFounderResults();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once:true });
  else start();
})();
