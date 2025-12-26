import { getEls } from "./dom.js";
import { loadStorage, saveStorage } from "./storage.js";
import { clamp, shuffleInPlace, uid, formatDate, formatBytes, dataUrlBytes } from "./utils.js";
import { drawWheel, getWinnerIndex } from "./wheel.js";
import { initCollapsibles, applyPanelState } from "./panels.js";
import { createAudioController, LIMITS } from "./audio.js";
import { createZipTransfer } from "./zipTransfer.js";

const els = getEls();

// état
let names = ["Antoine", "Julie", "Max", "Sarah"];
let rotation = 0;
let spinning = false;
let lastWinner = null;

// tabs
let activeTab = "wheel"; // "wheel" | "teams"

// teams
let lastTeams = []; // [{name, members:[]}]
let canGenerateTeams = false;

// storage ref (mutable)
const storageRef = { value: loadStorage() };

// audio + zip
const audio = createAudioController(storageRef);
const zipTransfer = createZipTransfer(storageRef);

const wheelCanvas = els.wheelCanvas;
const ctx = wheelCanvas.getContext("2d");

/* ---------------- Utils ---------------- */

function setResult(name){ els.resultNameEl.textContent = name; }
function cleanNames(arr){ return arr.map(x => (x||"").trim()).filter(Boolean); }

function getSpinDurationMs(){
  const raw = storageRef.value.settings?.spinDurationMs;
  const v = Number(raw ?? 2800);
  return clamp(v, 800, 15000);
}

/* ---------------- Tabs ---------------- */

function setTab(tab){
  activeTab = tab;

  els.tabWheel.classList.toggle("active", tab === "wheel");
  els.tabTeams.classList.toggle("active", tab === "teams");

  els.viewWheel.style.display = (tab === "wheel") ? "block" : "none";
  els.viewTeams.style.display = (tab === "teams") ? "block" : "none";

  updateStats();

  if(tab === "teams"){
    validateTeamsUI();
    renderTeams();
  }else{
    redraw();
  }
}

/* ---------------- Wheel rendering ---------------- */

function redraw(){ drawWheel(ctx, wheelCanvas, names, rotation); }

function updateStats(){
  const clean = cleanNames(names);

  els.statsPill.textContent = `${clean.length} nom${clean.length>1?"s":""}`;

  if(activeTab === "wheel"){
    els.mainInfo.textContent = clean.length >= 2 ? "Prêt ✅" : (clean.length === 1 ? "Ajoute au moins 2 noms" : "Ajoute des noms");
  }else{
    els.mainInfo.textContent = clean.length >= 2 ? "Prêt ✅" : "Ajoute des noms";
  }

  // Wheel availability
  const wheelDisabled = spinning || clean.length < 2;
  els.spinBtn.disabled = wheelDisabled;

  // ✅ GO uniquement visible en mode roue et si >=2 noms (évite overlap avec texte sur canvas)
  if(activeTab === "wheel"){
    els.centerGo.style.display = (clean.length < 2) ? "none" : "grid";
    els.centerGo.style.opacity = wheelDisabled ? "0.5" : "1";
    els.centerGo.style.pointerEvents = wheelDisabled ? "none" : "auto";
  }

  // Teams availability
  validateTeamsUI();
}

/* ---------------- Names UI ---------------- */

function renderNames(){
  els.namesListEl.innerHTML = "";

  names.forEach((n, idx) => {
    const row = document.createElement("div");
    row.className = "name-item";

    const input = document.createElement("input");
    input.type = "text";
    input.value = n;
    input.placeholder = "Nom";
    input.addEventListener("input", () => {
      names[idx] = input.value;
      if(activeTab === "wheel") redraw();
      updateStats();
      if(activeTab === "teams") validateTeamsUI();
    });

    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Suppr.";
    del.type = "button";
    del.addEventListener("click", () => {
      names.splice(idx, 1);
      if(activeTab === "wheel") redraw();
      renderNames();
      updateStats();
      if(activeTab === "teams") validateTeamsUI();
    });

    row.appendChild(input);
    row.appendChild(del);
    els.namesListEl.appendChild(row);
  });

  if(names.length === 0){
    const empty = document.createElement("div");
    empty.className = "small";
    empty.textContent = "Ajoute des noms pour pouvoir lancer la roue.";
    els.namesListEl.appendChild(empty);
  }
}

/* ---------------- Teams logic ---------------- */

function getTeamSize(){
  return clamp(Number(els.teamSizeInput.value || 2), 2, 20);
}

function validateTeamsUI(){
  if(activeTab !== "teams") return;

  const clean = cleanNames(names);
  const perTeam = getTeamSize();

  // Reset
  els.teamsAlert.style.display = "none";
  els.teamsAlert.textContent = "";

  if(clean.length < 2){
    canGenerateTeams = false;
    els.genTeamsBtn.disabled = true;
    els.reshuffleTeamsBtn.disabled = true;
    els.teamsHint.textContent = "Ajoute au moins 2 noms pour générer des équipes.";
    lastTeams = [];
    renderTeams();
    return;
  }

  if(clean.length % perTeam !== 0){
    canGenerateTeams = false;
    els.genTeamsBtn.disabled = true;
    els.reshuffleTeamsBtn.disabled = true;

    els.teamsAlert.style.display = "block";
    els.teamsAlert.textContent =
      `Impossible: ${clean.length} joueur(s) n'est pas divisible par ${perTeam}. ` +
      `Modifie “personnes par équipe” ou la liste de noms.`;

    const rest = clean.length % perTeam;
    els.teamsHint.textContent =
      `Actuellement: ${clean.length} joueur(s) • ${perTeam}/équipe • reste ${rest} joueur(s).`;

    lastTeams = [];
    renderTeams();
    return;
  }

  // OK
  canGenerateTeams = true;
  els.genTeamsBtn.disabled = false;
  els.reshuffleTeamsBtn.disabled = false;

  const teamCount = clean.length / perTeam;
  els.teamsHint.textContent = `${clean.length} joueur(s) • ${teamCount} équipe(s) • ${perTeam} / équipe`;
}

function generateTeams(){
  validateTeamsUI();
  if(!canGenerateTeams) return;

  const clean = cleanNames(names);
  const perTeam = getTeamSize();

  // shuffle pool
  const pool = [...clean];
  for(let i=pool.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const teamCount = clean.length / perTeam;
  const teams = [];
  for(let t=0; t<teamCount; t++){
    teams.push({ name: `Team ${t+1}`, members: [] });
  }

  let idx = 0;
  for(const p of pool){
    teams[Math.floor(idx / perTeam)].members.push(p);
    idx++;
  }

  lastTeams = teams;
  renderTeams();
}

function renderTeams(){
  els.teamsBoard.innerHTML = "";

  if(!lastTeams.length){
    const empty = document.createElement("div");
    empty.className = "small";
    empty.textContent = "Aucune équipe générée (conditions non remplies).";
    els.teamsBoard.appendChild(empty);
    return;
  }

  for(const t of lastTeams){
    const card = document.createElement("div");
    card.className = "team-card";

    const head = document.createElement("div");
    head.className = "team-title";

    const nameEl = document.createElement("div");
    nameEl.className = "name";
    nameEl.textContent = t.name;

    const countEl = document.createElement("div");
    countEl.className = "count";
    countEl.textContent = `${t.members.length} joueur(s)`;

    head.appendChild(nameEl);
    head.appendChild(countEl);

    const members = document.createElement("div");
    members.className = "team-members";

    for(const m of t.members){
      const row = document.createElement("div");
      row.className = "member";
      row.textContent = m;
      members.appendChild(row);
    }

    card.appendChild(head);
    card.appendChild(members);

    els.teamsBoard.appendChild(card);
  }
}

/* ---------------- Spin logic ---------------- */

function spin(){
  const clean = cleanNames(names);
  if(clean.length < 2 || spinning) return;

  audio.ensureAudio();

  spinning = true;
  updateStats();

  const duration = getSpinDurationMs();
  const start = performance.now();
  const startRot = rotation;

  const extraTurns = 6 + Math.random()*4;
  const targetOffset = Math.random() * Math.PI*2;
  const targetRot = startRot + extraTurns * Math.PI*2 + targetOffset;

  function easeOutCubic(t){ return 1 - Math.pow(1-t, 3); }

  let lastTickAt = start;
  const tickMin = 45;
  const tickMax = 190;

  const tick = (now) => {
    const t = clamp((now - start)/duration, 0, 1);
    const eased = easeOutCubic(t);

    rotation = startRot + (targetRot - startRot) * eased;
    redraw();

    const tickInterval = tickMin + (tickMax - tickMin) * eased;
    if(storageRef.value.settings?.spinSound !== "none"){
      if(now - lastTickAt >= tickInterval){
        audio.playSpinSound();
        lastTickAt = now;
      }
    }

    if(t < 1){
      requestAnimationFrame(tick);
    }else{
      spinning = false;
      updateStats();

      const winnerIdx = getWinnerIndex(clean, rotation);
      const winner = clean[winnerIdx];
      lastWinner = winner;
      setResult(winner);

      const effectiveWin = audio.getEffectiveWinSoundValue(
        els.winSoundSelect.value,
        Array.from(els.winSoundSelect.options)
      );
      audio.playWinSound(effectiveWin, Array.from(els.winSoundSelect.options));
    }
  };

  requestAnimationFrame(tick);
}

/* ---------------- Saved wheels (inchangé) ---------------- */

function renderSaved(){
  const storage = storageRef.value;
  els.savedListEl.innerHTML = "";

  if(storage.wheels.length === 0){
    const empty = document.createElement("div");
    empty.className = "small";
    empty.textContent = "Aucune roue sauvegardée pour l’instant.";
    els.savedListEl.appendChild(empty);
    return;
  }

  const wheels = [...storage.wheels].sort((a,b)=> (b.updatedAt||0) - (a.updatedAt||0));
  wheels.forEach(w => {
    const item = document.createElement("div");
    item.className = "saved-item";

    const meta = document.createElement("div");
    meta.className = "meta";

    const title = document.createElement("div");
    title.className = "n";
    title.textContent = w.name || "(Sans nom)";

    const count = document.createElement("div");
    count.className = "c";
    count.textContent = `${(w.names||[]).length} nom(s) • modifié ${formatDate(w.updatedAt || Date.now())}`;

    meta.appendChild(title);
    meta.appendChild(count);

    const actions = document.createElement("div");
    actions.style.display="flex";
    actions.style.gap="8px";

    const loadBtn = document.createElement("button");
    loadBtn.textContent = "Charger";
    loadBtn.type = "button";
    loadBtn.addEventListener("click", () => {
      names = (w.names || []).slice(0, 200);
      els.wheelNameInput.value = w.name || "";
      lastWinner = null;
      setResult("—");
      rotation = 0;

      renderNames();
      updateStats();
      redraw();

      // teams
      lastTeams = [];
      if(activeTab === "teams") validateTeamsUI();
    });

    const delBtn = document.createElement("button");
    delBtn.className = "danger";
    delBtn.textContent = "Suppr.";
    delBtn.type = "button";
    delBtn.addEventListener("click", () => {
      storageRef.value.wheels = storageRef.value.wheels.filter(x => x.id !== w.id);
      saveStorage(storageRef.value);
      renderSaved();
    });

    actions.appendChild(loadBtn);
    actions.appendChild(delBtn);

    item.appendChild(meta);
    item.appendChild(actions);
    els.savedListEl.appendChild(item);
  });
}

/* ---------------- Sounds UI (inchangé globalement, gardé) ---------------- */

function rebuildWinSoundSelect(keepValue){
  const storage = storageRef.value;
  const current = keepValue ?? els.winSoundSelect.value;

  els.winSoundSelect.innerHTML = "";

  const base = [
    ["none", "Aucun"],
    ["chime", "Chime (ding)"],
    ["pop", "Pop"],
  ];
  for(const [v, label] of base){
    const o = document.createElement("option");
    o.value = v;
    o.textContent = label;
    els.winSoundSelect.appendChild(o);
  }

  const customs = storage.settings.customSounds || [];
  if(customs.length){
    for(const s of customs){
      const o = document.createElement("option");
      o.value = `custom:${s.id}`;
      o.textContent = `🎵 ${s.name}`;
      els.winSoundSelect.appendChild(o);
    }
  }

  const addOpt = document.createElement("option");
  addOpt.value = "__add__";
  addOpt.textContent = "Ajouter un son…";
  els.winSoundSelect.appendChild(addOpt);

  const exists = Array.from(els.winSoundSelect.options).some(o => o.value === current);
  els.winSoundSelect.value = exists ? current : (els.winSoundSelect.options[0]?.value || "none");
}

function renderCustomSoundsList(){
  const storage = storageRef.value;
  const list = storage.settings.customSounds || [];

  els.customSoundsListEl.innerHTML = "";

  const totalBytes = list.reduce((sum, s) => sum + (Number(s.bytes) || dataUrlBytes(s.dataUrl || "")), 0);

  const info = document.createElement("div");
  info.className = "small";
  info.textContent = `Sons persos: ${list.length}/${LIMITS.MAX_CUSTOM_SOUNDS} • total ~${formatBytes(totalBytes)} (limite ${formatBytes(LIMITS.MAX_TOTAL_CUSTOM_BYTES)}).`;
  els.customSoundsListEl.appendChild(info);

  if(!list.length){
    const empty = document.createElement("div");
    empty.className = "small";
    empty.style.marginTop = "6px";
    empty.textContent = "Aucun son perso ajouté.";
    els.customSoundsListEl.appendChild(empty);
    return;
  }

  const sorted = [...list].sort((a,b)=> (b.addedAt||0) - (a.addedAt||0));
  for(const s of sorted){
    const item = document.createElement("div");
    item.className = "sound-item";

    const meta = document.createElement("div");
    meta.className = "sound-meta";

    const t = document.createElement("div");
    t.className = "t";
    t.textContent = `🎵 ${s.name}`;

    const bytes = Number(s.bytes) || dataUrlBytes(s.dataUrl || "");
    const sub = document.createElement("div");
    sub.className = "s";
    sub.textContent = `${formatBytes(bytes)} • id: ${s.id.slice(0,6)}…`;

    meta.appendChild(t);
    meta.appendChild(sub);

    const actions = document.createElement("div");
    actions.style.display = "flex";
    actions.style.gap = "8px";

    const del = document.createElement("button");
    del.className = "danger";
    del.textContent = "Suppr.";
    del.type = "button";
    del.addEventListener("click", () => {
      if(!confirm(`Supprimer le son "${s.name}" ?`)) return;

      const current = els.winSoundSelect.value;
      audio.deleteCustomSound(s.id);

      const deletedValue = `custom:${s.id}`;
      const nextValue = (current === deletedValue) ? (els.winSoundSelect.options[0]?.value || "none") : current;

      rebuildWinSoundSelect(nextValue);

      if(els.winSoundSelect.value === "__add__"){
        els.winSoundSelect.value = els.winSoundSelect.options[0]?.value || "none";
      }
      storageRef.value.settings.winSound = els.winSoundSelect.value;
      saveStorage(storageRef.value);

      renderCustomSoundsList();
      els.customSoundStatus.textContent = `Son supprimé ✅`;
    });

    actions.appendChild(del);
    item.appendChild(meta);
    item.appendChild(actions);
    els.customSoundsListEl.appendChild(item);
  }
}

function applySoundSettingsToUI(){
  const storage = storageRef.value;

  els.spinSoundSelect.value = storage.settings.spinSound || "tick";
  els.volumeRange.value = String(storage.settings.volume ?? 65);

  audio.rebuildCustomPlayers();
  rebuildWinSoundSelect(storage.settings.winSound || "chime");

  if(els.winSoundSelect.value === "__add__"){
    els.winSoundSelect.value = els.winSoundSelect.options[0]?.value || "none";
    storage.settings.winSound = els.winSoundSelect.value;
    saveStorage(storage);
  }

  els.customSoundStatus.textContent =
    `“Ajouter un son…” sert uniquement à importer. Limites: ${LIMITS.MAX_CUSTOM_SOUNDS} sons, ${formatBytes(LIMITS.MAX_CUSTOM_SOUND_BYTES)} max/son, ${formatBytes(LIMITS.MAX_TOTAL_CUSTOM_BYTES)} total.`;

  renderCustomSoundsList();
}

/* ---------------- ZIP UI (inchangé) ---------------- */
/* (Ton bloc ZIP existant dans ton app.js peut rester comme avant.
   Je ne le ré-écris pas ici si tu l’avais déjà — sinon dis-moi et je te le recolle complet.) */

/* ---------------- Events ---------------- */

els.tabWheel.addEventListener("click", () => setTab("wheel"));
els.tabTeams.addEventListener("click", () => setTab("teams"));

els.addNameBtn.addEventListener("click", () => {
  const v = (els.newNameInput.value || "").trim();
  if(!v) return;
  names.push(v);
  els.newNameInput.value = "";
  renderNames();
  updateStats();
  if(activeTab === "wheel") redraw();
  if(activeTab === "teams") validateTeamsUI();
  els.newNameInput.focus();
});

els.newNameInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter") els.addNameBtn.click();
});

els.clearNamesBtn.addEventListener("click", () => {
  names = [];
  lastWinner = null;
  setResult("—");
  rotation = 0;
  lastTeams = [];
  renderNames();
  updateStats();
  if(activeTab === "wheel") redraw();
  if(activeTab === "teams") validateTeamsUI();
});

els.shuffleNamesBtn.addEventListener("click", () => {
  shuffleInPlace(names);
  renderNames();
  updateStats();
  if(activeTab === "wheel") redraw();
  if(activeTab === "teams") validateTeamsUI();
});

els.spinBtn.addEventListener("click", spin);
els.centerGo.addEventListener("click", spin);

els.resetResultBtn.addEventListener("click", () => {
  lastWinner = null;
  setResult("—");
});

// teams
els.teamSizeInput.addEventListener("input", () => {
  validateTeamsUI();
});
els.teamSizeInput.addEventListener("keydown", (e) => {
  if(e.key === "Enter") generateTeams();
});
els.genTeamsBtn.addEventListener("click", generateTeams);
els.reshuffleTeamsBtn.addEventListener("click", generateTeams);

// duration
els.spinDurationRange.addEventListener("input", () => {
  const sec = Number(els.spinDurationRange.value);
  els.spinDurationValue.textContent = `${sec.toFixed(1)}s`;
  storageRef.value.settings.spinDurationMs = Math.round(sec * 1000);
  saveStorage(storageRef.value);
});

// saved
els.saveWheelBtn.addEventListener("click", () => {
  const clean = cleanNames(names);
  if(clean.length === 0) return;

  const name = (els.wheelNameInput.value || "").trim() || "Roue";
  const existing = storageRef.value.wheels.find(w => (w.name || "").trim().toLowerCase() === name.toLowerCase());

  if(existing){
    existing.names = clean;
    existing.updatedAt = Date.now();
  }else{
    storageRef.value.wheels.push({ id: uid(), name, names: clean, updatedAt: Date.now() });
  }
  saveStorage(storageRef.value);
  renderSaved();

  // vider + focus
  els.wheelNameInput.value = "";
  els.wheelNameInput.focus();
});

els.clearSavedBtn.addEventListener("click", () => {
  storageRef.value.wheels = [];
  saveStorage(storageRef.value);
  renderSaved();
});

// sound
els.spinSoundSelect.addEventListener("change", () => {
  storageRef.value.settings.spinSound = els.spinSoundSelect.value;
  saveStorage(storageRef.value);
});

els.winSoundSelect.addEventListener("change", () => {
  const v = els.winSoundSelect.value;

  if(v === "__add__"){
    storageRef.value.settings.winSound = "__add__";
    saveStorage(storageRef.value);
    els.customSoundFile.value = "";
    els.customSoundFile.click();
    return;
  }

  storageRef.value.settings.winSound = v;
  saveStorage(storageRef.value);
});

els.customSoundFile.addEventListener("change", async () => {
  const file = els.customSoundFile.files?.[0];

  if(!file){
    if(els.winSoundSelect.value === "__add__"){
      els.winSoundSelect.value = els.winSoundSelect.options[0]?.value || "none";
      storageRef.value.settings.winSound = els.winSoundSelect.value;
      saveStorage(storageRef.value);
    }
    return;
  }

  const res = await audio.addCustomSoundFromFile(file);
  if(!res.ok){
    els.customSoundStatus.textContent = res.msg;
    if(els.winSoundSelect.value === "__add__"){
      els.winSoundSelect.value = els.winSoundSelect.options[0]?.value || "none";
      storageRef.value.settings.winSound = els.winSoundSelect.value;
      saveStorage(storageRef.value);
    }
    return;
  }

  const newValue = `custom:${res.id}`;
  rebuildWinSoundSelect(newValue);
  els.winSoundSelect.value = newValue;
  storageRef.value.settings.winSound = newValue;
  saveStorage(storageRef.value);

  els.customSoundStatus.textContent = `Ajouté: 🎵 ${res.name} ✅ (sélectionné)`;
  renderCustomSoundsList();
});

els.volumeRange.addEventListener("input", () => audio.setVolume(Number(els.volumeRange.value)));

els.testSoundBtn.addEventListener("click", () => {
  audio.ensureAudio();
  if(storageRef.value.settings?.spinSound !== "none") audio.playSpinSound();
  setTimeout(() => {
    const effective = audio.getEffectiveWinSoundValue(
      els.winSoundSelect.value,
      Array.from(els.winSoundSelect.options)
    );
    audio.playWinSound(effective, Array.from(els.winSoundSelect.options));
  }, 140);
});

/* ---------------- Init ---------------- */

function init(){
  // load latest saved wheel if any
  if(storageRef.value.wheels?.length){
    const latest = [...storageRef.value.wheels].sort((a,b)=> (b.updatedAt||0)-(a.updatedAt||0))[0];
    if(latest?.names?.length){
      names = latest.names.slice(0,200);
      els.wheelNameInput.value = latest.name || "";
    }
  }

  initCollapsibles(storageRef);
  applyPanelState(storageRef.value);

  applySoundSettingsToUI();

  // duration init
  const sec = (getSpinDurationMs()/1000);
  els.spinDurationRange.value = String(sec.toFixed(1));
  els.spinDurationValue.textContent = `${sec.toFixed(1)}s`;

  renderNames();
  renderSaved();

  rotation = 0;
  redraw();
  updateStats();
  setResult("—");

  window.addEventListener("resize", () => redraw(), { passive:true });

  setTab("wheel");
}

init();
