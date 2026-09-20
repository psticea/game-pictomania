/* Tabla rămâne neschimbată până când o tranzacție completă a reușit. */
const SLOTS = ["A", "B", "C"];
const STORE_KEY = "pictomania.board.v1";
const LEGACY_KEY = "pictomania.diff";
const game = Pictomania.createGame(CARDS);

const board = document.getElementById("board");
const tpl = document.getElementById("colTpl");
const live = document.getElementById("live");
const notice = document.getElementById("notice");
const noticeText = document.getElementById("noticeText");
const resetButton = document.getElementById("resetBoard");
const dismissButton = document.getElementById("dismissNotice");
const storageWarning = document.getElementById("storageWarning");
const dealAllButton = document.getElementById("dealAll");
const undoButton = document.getElementById("undo");
const lockButton = document.getElementById("lock");
const tableButton = document.getElementById("tableView");
const views = [];
let session = null;

function showNotice(message, recover = false) {
  noticeText.textContent = message;
  resetButton.hidden = !recover;
  dismissButton.hidden = recover;
  notice.hidden = false;
}

function clearNotice() {
  notice.hidden = true;
}

function saveSession() {
  if (!session) return;
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(session));
    storageWarning.hidden = true;
    storageWarning.open = false;
  } catch (error) {
    console.warn("Pictomania: salvarea tablei a eșuat.", error);
    storageWarning.hidden = false;
  }
}

function startSession(difficulties) {
  try {
    session = game.createSession(difficulties);
    clearNotice();
    renderBoard();
    saveSession();
  } catch (error) {
    if (!(error instanceof Pictomania.BoardError)) throw error;
    showNotice("Nu există trei cărți compatibile. Reîncearcă după verificarea pachetului de cuvinte.", true);
    updateControls();
  }
}

function restoreSession() {
  let saved;
  try {
    saved = localStorage.getItem(STORE_KEY);
  } catch (error) {
    console.warn("Pictomania: citirea tablei salvate a eșuat.", error);
    startSession();
    storageWarning.hidden = false;
    return;
  }
  if (saved !== null) {
    try {
      session = game.restoreSession(JSON.parse(saved));
      renderBoard();
      live.textContent = session.locked ? "Tabla blocată a fost restaurată." : "Tabla a fost restaurată.";
    } catch (error) {
      if (!(error instanceof SyntaxError) && !(error instanceof Pictomania.BoardError)) throw error;
      console.warn("Pictomania: tabla salvată nu este validă.", error);
      showNotice("Tabla salvată nu mai poate fi restaurată. Începe o tablă nouă când ești gata; salvarea veche nu a fost înlocuită.", true);
      updateControls();
    }
    return;
  }

  let difficulties;
  let invalidLegacy = false;
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy !== null) {
      difficulties = JSON.parse(legacy);
      if (!Array.isArray(difficulties) || difficulties.length !== 3 ||
          !difficulties.every((diff) => diff === "usor" || diff === "mediu")) {
        throw new Pictomania.BoardError("invalid-legacy");
      }
    }
  } catch (error) {
    console.warn("Pictomania: preferințele vechi nu au putut fi citite.", error);
    difficulties = undefined;
    invalidLegacy = true;
  }
  startSession(difficulties);
  if (invalidLegacy) showNotice("Preferințele vechi nu au putut fi citite. Tabla nouă folosește nivelul Ușor.");
}

function buildColumn(slot) {
  const el = tpl.content.firstElementChild.cloneNode(true);
  el.setAttribute("aria-label", `Cartea ${SLOTS[slot]}`);
  el.querySelector(".col-letter").textContent = SLOTS[slot];
  el.querySelector(".seg").setAttribute("aria-label", `Dificultate pentru cartea ${SLOTS[slot]}`);
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
  segButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (!session || session.board[slot].diff === button.dataset.diff) return;
      const difficulties = session.board.map((entry) => entry.diff);
      difficulties[slot] = button.dataset.diff;
      changeBoard([slot], difficulties);
    });
  });
  const dealBtn = el.querySelector(".deal");
  dealBtn.setAttribute("aria-label", `Carte nouă pentru ${SLOTS[slot]}`);
  dealBtn.addEventListener("click", () => changeBoard([slot]));
  board.appendChild(el);
  views[slot] = {
    el, segButtons, dealBtn, list,
    theme: el.querySelector(".col-theme"),
    difficulty: el.querySelector(".col-difficulty"),
    words: [...el.querySelectorAll(".w")],
  };
}

function renderBoard(changed = []) {
  board.hidden = !session;
  if (!session) return;
  session.board.forEach((entry, slot) => {
    const card = game.getCard(entry.cardId);
    const view = views[slot];
    view.el.dataset.diff = entry.diff;
    view.theme.textContent = card.tema;
    view.difficulty.textContent = entry.diff === "usor" ? "Ușor" : "Mediu";
    view.segButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.diff === entry.diff));
    });
    card.cuvinte.forEach((word, i) => { view.words[i].textContent = word; });
    view.list.classList.remove("dealing");
    if (changed.includes(slot)) {
      void view.list.offsetWidth;
      view.list.classList.add("dealing");
    }
  });
  updateControls();
}

function updateControls() {
  const locked = !session || session.locked;
  document.body.classList.toggle("table-view", !!session?.tableView);
  document.body.classList.toggle("board-locked", !!session?.locked);
  dealAllButton.disabled = locked;
  undoButton.disabled = locked || !session.previous;
  lockButton.disabled = !session;
  tableButton.disabled = !session;
  lockButton.setAttribute("aria-pressed", String(!!session?.locked));
  const lockLabel = session?.locked ? "Deblochează" : "Blochează";
  document.getElementById("lockLabel").textContent = lockLabel;
  lockButton.setAttribute("aria-label", `${lockLabel} tabla`);
  tableButton.setAttribute("aria-pressed", String(!!session?.tableView));
  tableButton.textContent = session?.tableView ? "Ieși din vederea de masă" : "Vedere de masă";
  document.getElementById("roundState").textContent = session?.locked ? "Tablă blocată" : "Pregătire";
  views.forEach((view) => {
    view.dealBtn.disabled = locked;
    view.segButtons.forEach((button) => { button.disabled = locked; });
  });
}

function changeBoard(slots = [0, 1, 2], difficulties) {
  if (!session) return;
  try {
    session = game.deal(session, slots, difficulties);
    clearNotice();
    renderBoard(slots);
    saveSession();
    live.textContent = slots.length === 3
      ? "Trei cărți noi împărțite. Poți anula schimbarea."
      : `Cartea ${SLOTS[slots[0]]}: ${game.getCard(session.board[slots[0]].cardId).tema}. Poți anula schimbarea.`;
  } catch (error) {
    if (!(error instanceof Pictomania.BoardError)) throw error;
    if (error.code === "locked") {
      live.textContent = "Tabla este blocată. Deblochează tabla pentru a schimba cărțile.";
    } else if (error.code === "no-compatible-board") {
      showNotice("Nu există o carte nouă compatibilă cu selecția. Tabla nu s-a schimbat. Alege altă dificultate sau schimbă toate cărțile.");
    } else {
      console.error("Pictomania: schimbarea tablei a eșuat.", error);
      showNotice("Tabla nu a putut fi schimbată. Cărțile anterioare au fost păstrate.");
    }
  }
}

function undo() {
  if (!session || session.locked || !session.previous) return;
  session = game.undo(session);
  clearNotice();
  renderBoard();
  saveSession();
  live.textContent = "Schimbarea a fost anulată. Tabla anterioară a fost restaurată.";
}

function toggleLock() {
  if (!session) return;
  session = game.setLocked(session, !session.locked);
  updateControls();
  saveSession();
  live.textContent = session.locked
    ? "Tabla este blocată pentru rundă. Cărțile și dificultățile nu pot fi schimbate."
    : "Tabla este deblocată. Poți pregăti următoarea rundă.";
}

function toggleTableView() {
  if (!session) return;
  session = game.setTableView(session, !session.tableView);
  updateControls();
  saveSession();
  live.textContent = session.tableView
    ? "Vedere de masă. Tabla este blocată pentru rundă."
    : "Vedere obișnuită. Tabla rămâne blocată până o deblochezi.";
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { /* iOS Safari nu permite fullscreen pe document; ignorăm */ }
}

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

SLOTS.forEach((_, i) => buildColumn(i));
restoreSession();

function updateFontState() {
  const faces = [...document.fonts].filter((font) => font.family === "Oswald" && font.weight === "600");
  const loaded = faces.some((font) => font.status === "loaded") &&
    faces.every((font) => font.status !== "loading" && font.status !== "error");
  document.body.classList.toggle("font-fallback", !loaded);
}
document.fonts.ready.then(updateFontState);
document.fonts.addEventListener("loading", () => document.body.classList.add("font-fallback"));
document.fonts.addEventListener("loadingdone", updateFontState);
document.fonts.addEventListener("loadingerror", updateFontState);

dealAllButton.addEventListener("click", () => changeBoard());
undoButton.addEventListener("click", undo);
lockButton.addEventListener("click", toggleLock);
tableButton.addEventListener("click", toggleTableView);
resetButton.addEventListener("click", () => startSession());
dismissButton.addEventListener("click", clearNotice);
document.getElementById("retrySave").addEventListener("click", () => {
  saveSession();
  if (storageWarning.hidden) lockButton.focus();
});
document.getElementById("fullscreen").addEventListener("click", toggleFullscreen);

document.addEventListener("keydown", (event) => {
  if (event.repeat || event.metaKey || event.ctrlKey || event.altKey || event.isComposing) return;
  if (event.target.closest("input, textarea, select, [contenteditable]:not([contenteditable='false'])")) return;
  if (event.key >= "1" && event.key <= "3") {
    event.preventDefault();
    changeBoard([Number(event.key) - 1]);
    return;
  }
  const key = event.key.toLowerCase();
  if (key === "r") { event.preventDefault(); changeBoard(); }
  if (key === "f") { event.preventDefault(); toggleFullscreen(); }
});
document.addEventListener("pointerdown", keepAwake, { once: true });
