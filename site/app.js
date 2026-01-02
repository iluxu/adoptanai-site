const state = {
  fixtures: [],
  spotlight: null,
  busy: false,
  polymarketBusy: false,
};

const els = {
  fixturesList: document.getElementById("fixturesList"),
  fixturesMeta: document.getElementById("fixturesMeta"),
  analysisTitle: document.getElementById("analysisTitle"),
  analysisStatus: document.getElementById("analysisStatus"),
  analysisSummary: document.getElementById("analysisSummary"),
  analysisSpinner: document.getElementById("analysisSpinner"),
  probHome: document.getElementById("probHome"),
  probDraw: document.getElementById("probDraw"),
  probAway: document.getElementById("probAway"),
  xgHome: document.getElementById("xgHome"),
  xgAway: document.getElementById("xgAway"),
  likelyScore: document.getElementById("likelyScore"),
  expertText: document.getElementById("expertText"),
  warningsBlock: document.getElementById("warningsBlock"),
  warningsList: document.getElementById("warningsList"),
  expertGrid: document.getElementById("expertGrid"),
  spotlightTitle: document.getElementById("spotlightTitle"),
  spotlightStatus: document.getElementById("spotlightStatus"),
  spotlightHome: document.getElementById("spotlightHome"),
  spotlightDraw: document.getElementById("spotlightDraw"),
  spotlightAway: document.getElementById("spotlightAway"),
  spotlightNote: document.getElementById("spotlightNote"),
  tweetText: document.getElementById("tweetText"),
  tweetLink: document.getElementById("tweetLink"),
  toast: document.getElementById("toast"),
  polyQuery: document.getElementById("polyQuery"),
  polyLimit: document.getElementById("polyLimit"),
  polyScanBtn: document.getElementById("polyScanBtn"),
  polyStatus: document.getElementById("polyStatus"),
  polyCount: document.getElementById("polyCount"),
  polyAlerts: document.getElementById("polyAlerts"),
  polyScored: document.getElementById("polyScored"),
  polyList: document.getElementById("polyList"),
};

const API_BASE = "/api";
const ANALYSIS_PENDING_TEXT = "Analysis in progress...";
const SPECIALISTS = [
  { key: "Specialist-Model", label: "Model desk" },
  { key: "Specialist-Form", label: "Form scout" },
  { key: "Specialist-Tactics", label: "Tactics board" },
  { key: "Specialist-Market", label: "Market watch" },
  { key: "Specialist-Players-Home", label: "Home squad" },
  { key: "Specialist-Players-Away", label: "Away squad" },
  { key: "Specialist-Players-League", label: "League players" },
  { key: "Specialist-Players", label: "Players" },
];

const formatPercent = (value) => {
  if (value === null || value === undefined) return "--";
  return `${Math.round(value * 100)}%`;
};

const formatEdge = (value) => {
  if (value === null || value === undefined) return "--";
  const sign = value > 0 ? "+" : "";
  return `${sign}${(value * 100).toFixed(1)}%`;
};

const formatNumber = (value) => {
  if (value === null || value === undefined) return "--";
  const num = Number(value);
  if (Number.isNaN(num)) return "--";
  return new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 }).format(num);
};

const formatTime = (iso) => {
  if (!iso) return "--";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatDate = (iso) => {
  if (!iso) return "--";
  const date = new Date(iso);
  return date.toISOString().slice(0, 10);
};

const showToast = (message) => {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2200);
};

const setBusy = (value) => {
  state.busy = value;
  if (value) {
    els.analysisStatus.textContent = "Analyzing";
  }
  if (els.analysisSpinner) {
    els.analysisSpinner.classList.toggle("active", value);
  }
};

const setPolymarketBusy = (value) => {
  state.polymarketBusy = value;
  if (els.polyStatus) {
    els.polyStatus.textContent = value ? "Scanning..." : "Ready";
  }
  if (els.polyScanBtn) {
    els.polyScanBtn.disabled = value;
  }
};

const resetTweet = () => {
  if (!els.tweetLink || !els.tweetText) return;
  els.tweetText.textContent = "Generate an analysis to unlock your shareable tweet.";
  els.tweetLink.href = "https://x.com/intent/tweet";
  els.tweetLink.classList.add("disabled");
  els.tweetLink.setAttribute("aria-disabled", "true");
};

const buildTweetText = ({ matchLabel, summary, probs, score }) => {
  const parts = [];
  parts.push(`Football: ${matchLabel}`);
  if (summary) {
    parts.push(`Lean: ${summary}`);
  }
  if (probs) {
    const home = formatPercent(probs.home);
    const draw = formatPercent(probs.draw);
    const away = formatPercent(probs.away);
    if (home !== "--" || draw !== "--" || away !== "--") {
      parts.push(`1X2 ${home}/${draw}/${away}`);
    }
  }
  if (score && score.length === 2) {
    parts.push(`Likely ${score[0]}-${score[1]}`);
  }
  parts.push("Powered by AdoptanAI #football");
  return parts.join(" | ");
};

const clampTweet = (text, max) => {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 3).trim()}...`;
};

const updateTweet = ({ matchLabel, summary, probs, score }) => {
  if (!els.tweetLink || !els.tweetText) return;
  if (!matchLabel || !summary) {
    resetTweet();
    return;
  }
  let tweet = buildTweetText({ matchLabel, summary, probs, score });
  tweet = clampTweet(tweet, 275);
  els.tweetText.textContent = tweet;
  els.tweetLink.href = `https://x.com/intent/tweet?text=${encodeURIComponent(tweet)}`;
  els.tweetLink.classList.remove("disabled");
  els.tweetLink.removeAttribute("aria-disabled");
};

const updateSpotlight = (analysis) => {
  if (!state.spotlight) return;
  const { home, away } = state.spotlight.teams;
  els.spotlightTitle.textContent = `${home.name} vs ${away.name}`;
  if (!analysis) {
    els.spotlightStatus.textContent = "Standby";
    els.spotlightHome.textContent = "--";
    els.spotlightDraw.textContent = "--";
    els.spotlightAway.textContent = "--";
    return;
  }
  const probs = analysis?.predictions?.poisson_model?.["1x2_probabilities"] || {};
  els.spotlightStatus.textContent = "Analysis ready";
  els.spotlightHome.textContent = formatPercent(probs.home);
  els.spotlightDraw.textContent = formatPercent(probs.draw);
  els.spotlightAway.textContent = formatPercent(probs.away);
};

const renderWarnings = (warnings) => {
  if (!warnings || warnings.length === 0) {
    els.warningsBlock.style.display = "none";
    els.warningsList.innerHTML = "";
    return;
  }
  els.warningsBlock.style.display = "block";
  els.warningsList.innerHTML = warnings.map((item) => `<li>${item}</li>`).join("");
};

const parseExpertAnalysis = (text) => {
  if (!text) return {};
  const parsed = {};
  text.split("\n").forEach((line) => {
    const idx = line.indexOf(":");
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key && value) parsed[key] = value;
  });
  return parsed;
};

const renderExpertGrid = (parsed) => {
  if (!els.expertGrid) return;
  const cards = SPECIALISTS.filter((item) => parsed[item.key]).map((item) => {
    return `
      <div class="expert-card">
        <h5>${item.label}</h5>
        <p>${parsed[item.key]}</p>
      </div>
    `;
  });

  const presenter = parsed.Presenter
    ? `<div class="expert-card"><h5>Host</h5><p>${parsed.Presenter}</p></div>`
    : "";

  if (!cards.length && !presenter) {
    els.expertGrid.innerHTML = "<div class=\"expert-empty\">Expert panel standing by.</div>";
    return;
  }

  els.expertGrid.innerHTML = presenter + cards.join("");
};

const renderAnalysis = (analysis, matchLabel) => {
  els.analysisTitle.textContent = matchLabel;
  const probs = analysis?.predictions?.poisson_model?.["1x2_probabilities"] || {};
  const expected = analysis?.predictions?.poisson_model?.expected_goals || {};
  const score = analysis?.predictions?.poisson_model?.most_likely_score || [];
  const expert = analysis?.expert_analysis || "AI analysis unavailable.";
  const parsed = parseExpertAnalysis(expert);
  const finalAdvice = parsed.Selector || parsed.Conseil || parsed.Final || "";

  const summary =
    finalAdvice ||
    analysis?.predictions?.api_sport?.advice ||
    analysis?.predictions?.api_sport?.prediction ||
    "Signals from the Poisson model, form data, and market context.";

  els.analysisSummary.textContent = summary;
  els.analysisStatus.textContent = "Complete";

  els.probHome.textContent = formatPercent(probs.home);
  els.probDraw.textContent = formatPercent(probs.draw);
  els.probAway.textContent = formatPercent(probs.away);
  els.xgHome.textContent = expected.home ?? "--";
  els.xgAway.textContent = expected.away ?? "--";
  els.likelyScore.textContent = score.length === 2 ? `${score[0]} - ${score[1]}` : "--";
  els.expertText.textContent = expert;
  renderExpertGrid(parsed);
  renderWarnings(analysis?.data_quality_warnings || []);
  updateTweet({ matchLabel, summary, probs, score });
};

const renderExpertProgress = (panel) => {
  if (!panel) return;
  renderExpertGrid(panel);
  if (panel.Selector && els.analysisSummary.textContent === ANALYSIS_PENDING_TEXT) {
    els.analysisSummary.textContent = panel.Selector;
  }
};

const buildMatchCard = (fixture) => {
  const card = document.createElement("div");
  card.className = "match-card";
  const home = fixture.teams.home.name;
  const away = fixture.teams.away.name;
  const league = fixture.league.name;
  const time = formatTime(fixture.fixture.date);
  const round = fixture.league.round ? ` - ${fixture.league.round}` : "";

  card.innerHTML = `
    <div class="match-info">
      <div class="match-teams">${home} vs ${away}</div>
      <div class="match-meta">${league}${round} | ${time}</div>
    </div>
    <div class="match-actions">
      <button>Analyze</button>
    </div>
  `;

  card.querySelector("button").addEventListener("click", () => analyzeFixture(fixture));
  return card;
};

const renderFixtures = () => {
  els.fixturesList.innerHTML = "";
  if (!state.fixtures.length) {
    els.fixturesList.innerHTML = "<p>No matches found today.</p>";
    return;
  }
  state.fixtures.forEach((fixture) => {
    els.fixturesList.appendChild(buildMatchCard(fixture));
  });
};

const fetchFixtures = async () => {
  els.fixturesMeta.textContent = "Loading fixtures...";
  try {
    const response = await fetch(`${API_BASE}/fixtures/today`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.fixtures = (data.response || []).sort((a, b) => {
      return new Date(a.fixture.date) - new Date(b.fixture.date);
    });
    const count = state.fixtures.length;
    els.fixturesMeta.textContent = `${count} matches available today.`;
    renderFixtures();
    state.spotlight = state.fixtures[0] || null;
    if (state.spotlight) {
      const league = state.spotlight.league.name;
      const time = formatTime(state.spotlight.fixture.date);
      els.spotlightNote.textContent = `${league} | ${time}`;
    }
    updateSpotlight();
  } catch (err) {
    console.error(err);
    els.fixturesMeta.textContent = "Unable to load matches. Check the API.";
    showToast("Fixture load failed");
  }
};

const analyzeFixture = async (fixture) => {
  if (state.busy) return;
  setBusy(true);
  resetTweet();
  const home = fixture.teams.home;
  const away = fixture.teams.away;
  const matchLabel = `${home.name} vs ${away.name}`;
  els.analysisTitle.textContent = matchLabel;
  els.analysisSummary.textContent = ANALYSIS_PENDING_TEXT;
  els.analysisStatus.textContent = "Analyzing";
  els.expertText.textContent = "Loading panel output...";
  if (els.expertGrid) {
    els.expertGrid.innerHTML = "<div class=\"expert-empty\">Panel is warming up...</div>";
  }

  const payload = {
    competition_id: String(fixture.league.id),
    team_a_id: String(home.id),
    team_b_id: String(away.id),
    season_id: String(fixture.league.season),
    match_date: formatDate(fixture.fixture.date),
    language: "en",
  };

  try {
    const response = await fetch(`${API_BASE}/match-analysis/live`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const job = await response.json();
    const jobId = job.job_id;

    const poll = async () => {
      try {
        const res = await fetch(`${API_BASE}/match-analysis/live/${jobId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (data.panel) renderExpertProgress(data.panel);

        if (data.status === "done") {
          renderAnalysis(data.result, matchLabel);
          if (state.spotlight && fixture.fixture.id === state.spotlight.fixture.id) {
            updateSpotlight(data.result);
          }
          showToast("Analysis complete");
          setBusy(false);
          return;
        }
        if (data.status === "error") {
          throw new Error(data.error || "Analysis failed.");
        }
        setTimeout(poll, 2000);
      } catch (err) {
        console.error(err);
        els.analysisSummary.textContent = "Analysis failed. Try again soon.";
        els.analysisStatus.textContent = "Error";
        els.expertText.textContent = "--";
        if (els.expertGrid) {
          els.expertGrid.innerHTML = "<div class=\"expert-empty\">No analysis available.</div>";
        }
        resetTweet();
        showToast("Analysis error");
        setBusy(false);
      }
    };

    setTimeout(poll, 1500);
  } catch (err) {
    console.error(err);
    els.analysisSummary.textContent = "Analysis failed. Try again soon.";
    els.analysisStatus.textContent = "Error";
    els.expertText.textContent = "--";
    if (els.expertGrid) {
      els.expertGrid.innerHTML = "<div class=\"expert-empty\">No analysis available.</div>";
    }
    resetTweet();
    showToast("Analysis error");
    setBusy(false);
  }
};

const loadSample = () => {
  const sample = {
    predictions: {
      poisson_model: {
        expected_goals: { home: 1.7, away: 1.2 },
        "1x2_probabilities": { home: 0.46, draw: 0.28, away: 0.26 },
        most_likely_score: [2, 1],
      },
      api_sport: { advice: "Home win with coverage (1X) looks safe." },
    },
    expert_analysis: [
      "Presenter: Multi-angle briefing based on today's data.",
      "Specialist-Model: Home edge in goal distribution and xG.",
      "Specialist-Form: Home side trending up with stable defense.",
      "Specialist-Tactics: High press + wide overloads should control tempo.",
      "Specialist-Market: Price still playable, moderate edge detected.",
      "Specialist-Players: Home squad closer to full strength.",
      "Selector: Home win or 1X as a cover.",
    ].join("\n"),
  };
  renderAnalysis(sample, "Sample: Lyon vs Marseille");
  updateSpotlight(sample);
};

const renderPolymarketResults = (data) => {
  if (!els.polyList) return;
  const rows = data?.top || [];
  els.polyCount.textContent = data?.markets_scanned ?? "--";
  els.polyAlerts.textContent = data?.alerts?.length ?? "--";
  if (els.polyScored) {
    els.polyScored.textContent = data?.outcomes_scored ?? "--";
  }
  if (data?.note && els.polyStatus) {
    els.polyStatus.textContent = data.note;
  }
  if (!rows.length) {
    els.polyList.innerHTML = "<div class=\"poly-empty\">No markets matched that scan.</div>";
    return;
  }
  els.polyList.innerHTML = rows
    .map((row) => {
      const title = row.title || "Polymarket market";
      const outcome = row.outcome || "";
      return `
        <article class="poly-card">
          <div class="poly-header">
            <div>
              <div class="poly-title">${title}</div>
              <div class="poly-sub">Outcome: ${outcome}</div>
            </div>
            <div class="poly-score">${formatEdge(row.score)}</div>
          </div>
          <div class="poly-grid">
            <div><span>Implied</span><strong>${formatPercent(row.implied_prob)}</strong></div>
            <div><span>Edge</span><strong>${formatEdge(row.edge)}</strong></div>
            <div><span>1h move</span><strong>${formatEdge(row.momentum_1h)}</strong></div>
            <div><span>Spread</span><strong>${formatEdge(row.spread)}</strong></div>
            <div><span>Liquidity</span><strong>${formatNumber(row.liquidity)}</strong></div>
          </div>
        </article>
      `;
    })
    .join("");
};

const scanPolymarket = async () => {
  if (state.polymarketBusy) return;
  setPolymarketBusy(true);
  if (els.polyList) {
    els.polyList.innerHTML = "<div class=\"poly-empty\">Scanning Polymarket...</div>";
  }
  const query = els.polyQuery?.value?.trim() || null;
  const limitValue = parseInt(els.polyLimit?.value || "12", 10);
  const payload = {
    query,
    limit: Number.isNaN(limitValue) ? 12 : limitValue,
    max_markets: 80,
  };
  try {
    const response = await fetch(`${API_BASE}/polymarket/scan`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    renderPolymarketResults(data);
    showToast("Polymarket scan ready");
  } catch (err) {
    console.error(err);
    if (els.polyList) {
      els.polyList.innerHTML = "<div class=\"poly-empty\">Scan failed. Try again.</div>";
    }
    showToast("Polymarket scan failed");
  } finally {
    setPolymarketBusy(false);
  }
};

const analyzeSpotlight = () => {
  if (!state.spotlight) {
    showToast("No matches available");
    return;
  }
  analyzeFixture(state.spotlight);
};

document.getElementById("refreshBtn").addEventListener("click", fetchFixtures);
document.getElementById("analyzeFirstBtn").addEventListener("click", analyzeSpotlight);
document.getElementById("openSampleBtn").addEventListener("click", loadSample);
if (els.polyScanBtn) {
  els.polyScanBtn.addEventListener("click", scanPolymarket);
}
if (els.polyQuery) {
  els.polyQuery.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      scanPolymarket();
    }
  });
}

resetTweet();
fetchFixtures();
