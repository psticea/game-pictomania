const Pictomania = (() => {
  const VERSION = 1;
  const SLOTS = [0, 1, 2];
  const normalize = (word) => word.normalize("NFC").trim().replace(/\s+/gu, " ").toLocaleLowerCase("ro");
  const copyBoard = (board) => board.map(({ diff, cardId }) => ({ diff, cardId }));

  class BoardError extends Error {
    constructor(code) {
      super(code);
      this.name = "BoardError";
      this.code = code;
    }
  }

  function createGame(data, random = Math.random) {
    const cards = new Map();
    const pools = new Map();
    for (const [diff, pool] of Object.entries(data)) {
      pools.set(diff, []);
      for (const card of pool) {
        if (typeof card.id !== "string" || !card.id || cards.has(card.id) ||
            typeof card.tema !== "string" || !card.tema.trim() ||
            !Array.isArray(card.cuvinte) || card.cuvinte.length !== 7 ||
            card.cuvinte.some((word) => typeof word !== "string" || !word.trim())) {
          throw new BoardError("invalid-catalog");
        }
        const words = card.cuvinte.map(normalize);
        if (new Set(words).size !== 7) throw new BoardError("invalid-catalog");
        cards.set(card.id, { ...card, diff, words, theme: normalize(card.tema) });
        pools.get(diff).push(card.id);
      }
    }

    function getCard(cardId) {
      const card = cards.get(cardId);
      if (!card) throw new BoardError("invalid-card");
      return card;
    }

    function compatible(card, others) {
      return others.every((other) =>
        card.theme !== other.theme && !card.words.some((word) => other.words.includes(word))
      );
    }

    function validateBoard(board) {
      if (!Array.isArray(board) || board.length !== 3) throw new BoardError("invalid-board");
      const selected = [];
      // Array holes are invalid too; JSON nulls must never reach the renderer.
      for (const slot of SLOTS) {
        const entry = board[slot];
        if (!entry || typeof entry.cardId !== "string" || typeof entry.diff !== "string") {
          throw new BoardError("invalid-board");
        }
        const card = getCard(entry.cardId);
        if (card.diff !== entry.diff || !compatible(card, selected)) throw new BoardError("invalid-board");
        selected.push(card);
      }
      return copyBoard(board);
    }

    function shuffled(ids) {
      const result = [...ids];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    function selectBoard(difficulties, current = null, slots = SLOTS) {
      if (!Array.isArray(difficulties) || difficulties.length !== 3 ||
          !SLOTS.every((i) => pools.has(difficulties[i])) ||
          !Array.isArray(slots) || !slots.length || new Set(slots).size !== slots.length ||
          !slots.every((slot) => SLOTS.includes(slot))) {
        throw new BoardError("invalid-request");
      }
      if (current) validateBoard(current);
      if (!current && slots.length !== 3) throw new BoardError("invalid-request");
      const selected = current ? copyBoard(current) : Array(3).fill(null);
      const replaced = new Set(slots);
      for (const slot of SLOTS) {
        if (!replaced.has(slot) && difficulties[slot] !== current[slot].diff) {
          throw new BoardError("invalid-request");
        }
      }
      const previousIds = new Set((current || []).map((entry) => entry.cardId));
      const candidates = slots.map((slot) => shuffled(
        pools.get(difficulties[slot]).filter((id) => !previousIds.has(id))
      ));
      const fixed = SLOTS.filter((slot) => !replaced.has(slot)).map((slot) => getCard(selected[slot].cardId));

      // Backtrack as a transaction: a dead end never partially replaces the visible board.
      function search(depth, used) {
        if (depth === slots.length) return true;
        const slot = slots[depth];
        for (const id of candidates[depth]) {
          const card = getCard(id);
          if (!compatible(card, used)) continue;
          selected[slot] = { diff: difficulties[slot], cardId: id };
          if (search(depth + 1, [...used, card])) return true;
        }
        return false;
      }
      if (!search(0, fixed)) throw new BoardError("no-compatible-board");
      return selected;
    }

    function createSession(difficulties = ["usor", "usor", "usor"]) {
      return { version: VERSION, board: selectBoard(difficulties), previous: null, locked: false, tableView: false };
    }

    function restoreSession(value) {
      if (!value || value.version !== VERSION ||
          typeof value.locked !== "boolean" || typeof value.tableView !== "boolean" ||
          (value.tableView && !value.locked)) {
        throw new BoardError("invalid-session");
      }
      return {
        version: VERSION,
        board: validateBoard(value.board),
        previous: value.previous === null ? null : validateBoard(value.previous),
        locked: value.locked,
        tableView: value.tableView,
      };
    }

    function deal(session, slots = SLOTS, difficulties = session.board.map((entry) => entry.diff)) {
      if (session.locked) throw new BoardError("locked");
      return {
        ...session,
        board: selectBoard(difficulties, session.board, slots),
        previous: copyBoard(session.board),
      };
    }

    function undo(session) {
      if (session.locked) throw new BoardError("locked");
      if (!session.previous) throw new BoardError("no-undo");
      return { ...session, board: validateBoard(session.previous), previous: null };
    }

    function setLocked(session, locked) {
      return { ...session, locked, tableView: locked && session.tableView };
    }

    function setTableView(session, tableView) {
      return { ...session, tableView, locked: tableView || session.locked };
    }

    return { getCard, validateBoard, selectBoard, createSession, restoreSession, deal, undo, setLocked, setTableView };
  }

  return { createGame, BoardError, normalize };
})();

if (typeof module !== "undefined") { module.exports = Pictomania; }
