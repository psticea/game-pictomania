// Logica tablei Pictomania.
// 3 cărți (A, B, C). Fiecare are dificultate proprie (usor/mediu) și buton de
// reîmprospătare. Butonul global "Cărți noi" schimbă toate cele 3 cărți.

const SLOTS = ["A", "B", "C"];
const DEFAULT_DIFF = "usor";

// Starea curentă a fiecărei cărți: dificultatea aleasă și indexul temei afișate.
const state = SLOTS.map(() => ({ diff: DEFAULT_DIFF, index: null }));

const board = document.getElementById("board");

function randomIndex(diff, exclude) {
  const n = CARDS[diff].length;
  if (n <= 1) return 0;
  let i;
  do { i = Math.floor(Math.random() * n); } while (i === exclude);
  return i;
}

function buildCard(slotIdx) {
  const el = document.createElement("section");
  el.className = "card";
  el.dataset.slot = slotIdx;
  el.innerHTML = `
    <div class="card-head">
      <div class="diffseg" role="group" aria-label="Dificultate">
        <button data-diff="usor">Ușor</button>
        <button data-diff="mediu">Mediu</button>
      </div>
      <button class="btn-refresh" title="Carte nouă" aria-label="Carte nouă">⟳</button>
    </div>
    <div class="slip">
      <div class="theme"></div>
      <div class="words"></div>
    </div>
    <div class="card-foot"><div class="slot-letter">${SLOTS[slotIdx]}</div></div>
  `;

  el.querySelectorAll(".diffseg button").forEach((b) => {
    b.addEventListener("click", () => {
      state[slotIdx].diff = b.dataset.diff;
      refreshCard(slotIdx, true);
    });
  });
  el.querySelector(".btn-refresh").addEventListener("click", (e) => {
    refreshCard(slotIdx, true);
    const btn = e.currentTarget;
    btn.classList.remove("spin");
    void btn.offsetWidth; // restart animația
    btn.classList.add("spin");
  });

  return el;
}

function renderCard(slotIdx) {
  const s = state[slotIdx];
  const card = CARDS[s.diff][s.index];
  const el = board.querySelector(`.card[data-slot="${slotIdx}"]`);
  el.dataset.diff = s.diff;

  el.querySelectorAll(".diffseg button").forEach((b) => {
    b.classList.toggle("active", b.dataset.diff === s.diff);
  });

  el.querySelector(".theme").textContent = card.tema;
  const words = el.querySelector(".words");
  words.innerHTML = "";
  card.cuvinte.forEach((w, i) => {
    const row = document.createElement("div");
    row.className = "word";
    row.style.animationDelay = `${i * 35}ms`;
    row.textContent = w;
    words.appendChild(row);
  });
}

function refreshCard(slotIdx, forceNew) {
  const s = state[slotIdx];
  s.index = randomIndex(s.diff, forceNew ? s.index : null);
  renderCard(slotIdx);
}

function refreshAll() {
  SLOTS.forEach((_, i) => refreshCard(i, true));
}

function init() {
  SLOTS.forEach((_, i) => board.appendChild(buildCard(i)));

  // Numere și pe partea dreaptă (oglindă a coloanei din stânga)
  const rightNums = board.querySelector(".rownums").cloneNode(true);
  board.appendChild(rightNums);

  refreshAll();

  document.getElementById("refreshAll").addEventListener("click", refreshAll);
  document.getElementById("dbCount").textContent =
    `${CARDS.usor.length} cărți ușoare · ${CARDS.mediu.length} cărți medii · ${(CARDS.usor.length + CARDS.mediu.length) * 7} cuvinte`;
}

init();
