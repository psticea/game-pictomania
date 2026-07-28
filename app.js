/* ============================================================
   Pictomania — logica tablei
   3 coloane (A, B, C) × 7 rânduri. Fiecare coloană are propria
   dificultate și se împarte independent.
   Zero dependențe: tabla trebuie să meargă și fără internet,
   pe o tabletă din mijlocul mesei.
   ============================================================ */

const SLOTS = ["A", "B", "C"];
const STORE_KEY = "pictomania.diff";

const board = document.getElementById("board");
const tpl = document.getElementById("colTpl");
const live = document.getElementById("live");

const state = SLOTS.map(() => ({ diff: "usor", index: null }));
const views = [];

restoreDifficulty();

/* ------------------------------------------------------------------ date */

function themesInUse(exceptSlot) {
  const used = new Set();
  state.forEach((s, i) => {
    if (i !== exceptSlot && s.index !== null) used.add(CARDS[s.diff][s.index].tema);
  });
  return used;
}

// Două coloane cu aceeași temă ar strica runda, deci temele nu se repetă
// niciodată pe tablă — și nici cartea proprie nu se repetă la reîmpărțire.
function pickIndex(slot) {
  const s = state[slot];
  const pool = CARDS[s.diff];
  const taken = themesInUse(slot);
  const current = s.index !== null ? pool[s.index]?.tema : null;
  const all = pool.map((_, i) => i);

  let choices = all.filter((i) => !taken.has(pool[i].tema) && pool[i].tema !== current);
  if (!choices.length) choices = all.filter((i) => !taken.has(pool[i].tema));
  if (!choices.length) choices = all;

  return choices[Math.floor(Math.random() * choices.length)];
}

function restoreDifficulty() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (Array.isArray(saved)) {
      saved.forEach((d, i) => {
        if (state[i] && CARDS[d]) state[i].diff = d;
      });
    }
  } catch { /* prima rulare sau storage blocat — rămân valorile implicite */ }
}

function saveDifficulty() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state.map((s) => s.diff)));
  } catch { /* modul privat poate refuza scrierea; nu e critic */ }
}

/* ---------------------------------------------------------------- randare */

function buildColumn(slot) {
  const el = tpl.content.firstElementChild.cloneNode(true);
  el.setAttribute("aria-label", `Cartea ${SLOTS[slot]}`);
  el.querySelector(".col-letter").textContent = SLOTS[slot];

  const list = el.querySelector(".list");
  for (let i = 0; i < 7; i++) {
    const li = document.createElement("li");
    li.className = "row";
    li.style.setProperty("--i", i);
    li.innerHTML = '<span class="idx"></span><span class="w"></span>';
    li.querySelector(".idx").textContent = i + 1;
    list.appendChild(li);
  }

  const segButtons = [...el.querySelectorAll(".seg-btn")];
  segButtons.forEach((b) => {
    b.addEventListener("click", () => {
      if (state[slot].diff === b.dataset.diff) return;
      state[slot].diff = b.dataset.diff;
      saveDifficulty();
      deal(slot);
    });
  });

  const dealBtn = el.querySelector(".deal");
  dealBtn.addEventListener("click", () => deal(slot));

  board.appendChild(el);
  views[slot] = {
    el,
    segButtons,
    dealBtn,
    theme: el.querySelector(".col-theme"),
    words: [...el.querySelectorAll(".w")],
    list,
  };
}

function render(slot) {
  const s = state[slot];
  const v = views[slot];
  const card = CARDS[s.diff][s.index];

  v.el.dataset.diff = s.diff;
  v.theme.textContent = card.tema;
  v.segButtons.forEach((b) =>
    b.setAttribute("aria-pressed", String(b.dataset.diff === s.diff))
  );
  card.cuvinte.forEach((word, i) => { v.words[i].textContent = word; });

  // Repornește animația de împărțire.
  v.list.classList.remove("dealing");
  void v.list.offsetWidth;
  v.list.classList.add("dealing");
}

function deal(slot, announce = true) {
  const s = state[slot];
  s.index = pickIndex(slot);
  render(slot);

  const btn = views[slot].dealBtn;
  btn.classList.remove("spin");
  void btn.offsetWidth;
  btn.classList.add("spin");

  if (announce) {
    live.textContent = `Cartea ${SLOTS[slot]}: ${CARDS[s.diff][s.index].tema}`;
  }
}

function dealAll() {
  SLOTS.forEach((_, i) => deal(i, false));
  live.textContent = "Trei cărți noi împărțite.";
}

/* ------------------------------------------------- ecran complet + veghe */

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { /* iOS Safari nu permite fullscreen pe document; ignorăm */ }
}

// Tableta din mijlocul mesei nu are voie să adoarmă în mijlocul rundei.
let wakeLock = null;
async function keepAwake() {
  if (!("wakeLock" in navigator)) return;
  try {
    wakeLock = await navigator.wakeLock.request("screen");
    wakeLock.addEventListener("release", () => { wakeLock = null; });
  } catch { /* refuzat sau baterie critică — jocul merge oricum */ }
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && !wakeLock) keepAwake();
});

/* -------------------------------------------------------------- pornire */

SLOTS.forEach((_, i) => buildColumn(i));
SLOTS.forEach((_, i) => deal(i, false));

document.getElementById("dealAll").addEventListener("click", dealAll);
document.getElementById("fullscreen").addEventListener("click", toggleFullscreen);

document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.target.closest("input, textarea")) return;

  if (e.key >= "1" && e.key <= "3") { deal(Number(e.key) - 1); return; }
  const k = e.key.toLowerCase();
  if (k === "r") { dealAll(); return; }
  if (k === "f") { toggleFullscreen(); }
});

// Wake Lock cere un gest al utilizatorului în majoritatea browserelor.
document.addEventListener("pointerdown", keepAwake, { once: true });
