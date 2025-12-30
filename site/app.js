const state = {
  fixtures: [],
  spotlight: null,
  busy: false,
};

const els = {
  fixturesList: document.getElementById("fixturesList"),
  fixturesMeta: document.getElementById("fixturesMeta"),
  analysisTitle: document.getElementById("analysisTitle"),
  analysisStatus: document.getElementById("analysisStatus"),
  analysisSummary: document.getElementById("analysisSummary"),
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
  toast: document.getElementById("toast"),
};

const API_BASE = "/api";
const SPECIALISTS = [
  { key: "Specialist-Model", label: "Modele" },
  { key: "Specialist-Form", label: "Forme" },
  { key: "Specialist-Tactics", label: "Tactique" },
  { key: "Specialist-Market", label: "Marche" },
  { key: "Specialist-Players-Home", label: "Joueurs domicile" },
  { key: "Specialist-Players-Away", label: "Joueurs exterieur" },
  { key: "Specialist-Players-League", label: "Joueurs ligue" },
  { key: "Specialist-Players", label: "Joueurs" },
];

const formatPercent = (value) => {
  if (value === null || value === undefined) return "--";
  return `${Math.round(value * 100)}%`;
};

const formatTime = (iso) => {
  if (!iso) return "--";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("fr-FR", {
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
    els.analysisStatus.textContent = "Analyse en cours";
  } else {
    els.analysisStatus.textContent = "Pret";
  }
};

const updateSpotlight = (analysis) => {
  if (!state.spotlight) return;
  const { home, away } = state.spotlight.teams;
  els.spotlightTitle.textContent = `${home.name} vs ${away.name}`;
  if (!analysis) {
    els.spotlightStatus.textContent = "En attente";
    els.spotlightHome.textContent = "--";
    els.spotlightDraw.textContent = "--";
    els.spotlightAway.textContent = "--";
    return;
  }
  const probs = analysis?.predictions?.poisson_model?.["1x2_probabilities"] || {};
  els.spotlightStatus.textContent = "Analyse OK";
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
    ? `<div class="expert-card"><h5>Presenter</h5><p>${parsed.Presenter}</p></div>`
    : "";

  if (!cards.length && !presenter) {
    els.expertGrid.innerHTML = "<div class=\"expert-empty\">Panel d'experts en attente.</div>";
    return;
  }

  els.expertGrid.innerHTML = presenter + cards.join("");
};

const renderAnalysis = (analysis, matchLabel) => {
  els.analysisTitle.textContent = matchLabel;
  const probs = analysis?.predictions?.poisson_model?.["1x2_probabilities"] || {};
  const expected = analysis?.predictions?.poisson_model?.expected_goals || {};
  const score = analysis?.predictions?.poisson_model?.most_likely_score || [];
  const expert = analysis?.expert_analysis || "Analyse IA indisponible.";
  const parsed = parseExpertAnalysis(expert);
  const finalAdvice = parsed.Selector || parsed.Conseil || parsed.Final || "";

  els.analysisSummary.textContent = finalAdvice ||
    analysis?.predictions?.api_sport?.advice ||
    analysis?.predictions?.api_sport?.prediction ||
    "Predictions basees sur le modele Poisson et les statistiques recentes.";

  els.probHome.textContent = formatPercent(probs.home);
  els.probDraw.textContent = formatPercent(probs.draw);
  els.probAway.textContent = formatPercent(probs.away);
  els.xgHome.textContent = expected.home ?? "--";
  els.xgAway.textContent = expected.away ?? "--";
  els.likelyScore.textContent = score.length === 2 ? `${score[0]} - ${score[1]}` : "--";
  els.expertText.textContent = expert;
  renderExpertGrid(parsed);
  renderWarnings(analysis?.data_quality_warnings || []);
};

const renderExpertProgress = (panel) => {
  if (!panel) return;
  renderExpertGrid(panel);
  if (panel.Selector && els.analysisSummary.textContent === "Analyse en cours...") {
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
      <button>Analyser</button>
    </div>
  `;

  card.querySelector("button").addEventListener("click", () => analyzeFixture(fixture));
  return card;
};

const renderFixtures = () => {
  els.fixturesList.innerHTML = "";
  if (!state.fixtures.length) {
    els.fixturesList.innerHTML = "<p>Aucun match trouve pour aujourd'hui.</p>";
    return;
  }
  state.fixtures.forEach((fixture) => {
    els.fixturesList.appendChild(buildMatchCard(fixture));
  });
};

const fetchFixtures = async () => {
  els.fixturesMeta.textContent = "Chargement des fixtures...";
  try {
    const response = await fetch(`${API_BASE}/fixtures/today`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.fixtures = (data.response || []).sort((a, b) => {
      return new Date(a.fixture.date) - new Date(b.fixture.date);
    });
    const count = state.fixtures.length;
    els.fixturesMeta.textContent = `${count} matchs disponibles aujourd'hui.`;
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
    els.fixturesMeta.textContent = "Impossible de charger les matchs. Verifie l'API.";
    showToast("Erreur de chargement des fixtures");
  }
};

const analyzeFixture = async (fixture) => {
  if (state.busy) return;
  setBusy(true);
  const home = fixture.teams.home;
  const away = fixture.teams.away;
  const matchLabel = `${home.name} vs ${away.name}`;
  els.analysisTitle.textContent = matchLabel;
  els.analysisSummary.textContent = "Analyse en cours...";
  els.expertText.textContent = "Chargement...";
  if (els.expertGrid) {
    els.expertGrid.innerHTML = "<div class=\"expert-empty\">Analyse en cours...</div>";
  }

  const payload = {
    competition_id: String(fixture.league.id),
    team_a_id: String(home.id),
    team_b_id: String(away.id),
    season_id: String(fixture.league.season),
    match_date: formatDate(fixture.fixture.date),
    language: "fr",
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
          showToast("Analyse terminee");
          setBusy(false);
          return;
        }
        if (data.status === "error") {
          throw new Error(data.error || "Analyse echouee.");
        }
        setTimeout(poll, 2000);
      } catch (err) {
        console.error(err);
        els.analysisSummary.textContent = "Erreur pendant l'analyse. Reessaye plus tard.";
        els.expertText.textContent = "--";
        if (els.expertGrid) {
          els.expertGrid.innerHTML = "<div class=\"expert-empty\">Aucune analyse disponible.</div>";
        }
        showToast("Erreur d'analyse");
        setBusy(false);
      }
    };

    setTimeout(poll, 1500);
  } catch (err) {
    console.error(err);
    els.analysisSummary.textContent = "Erreur pendant l'analyse. Reessaye plus tard.";
    els.expertText.textContent = "--";
    if (els.expertGrid) {
      els.expertGrid.innerHTML = "<div class=\"expert-empty\">Aucune analyse disponible.</div>";
    }
    showToast("Erreur d'analyse");
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
      api_sport: { advice: "Victoire domicile avec prudence." },
    },
    expert_analysis: [
      "Presenter: Analyse multi-angles basee sur les donnees du jour.",
      "Specialist-Model: Avantage domicile sur la distribution des buts.",
      "Specialist-Form: Equipe domicile en dynamique positive, defense stable.",
      "Specialist-Tactics: Pressing haut et couloirs exploites, match controle.",
      "Specialist-Market: Cotes encore jouables, edge modere.",
      "Specialist-Players: Effectif domicile plus complet, impact key players.",
      "Selector: Victoire domicile ou 1X en couverture.",
    ].join("\\n"),
  };
  renderAnalysis(sample, "Exemple: Lyon vs Marseille");
  updateSpotlight(sample);
};

const analyzeSpotlight = () => {
  if (!state.spotlight) {
    showToast("Aucun match disponible");
    return;
  }
  analyzeFixture(state.spotlight);
};

// Event bindings

document.getElementById("refreshBtn").addEventListener("click", fetchFixtures);
document.getElementById("analyzeFirstBtn").addEventListener("click", analyzeSpotlight);
document.getElementById("openSampleBtn").addEventListener("click", loadSample);

fetchFixtures();
