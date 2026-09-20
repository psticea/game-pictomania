const test = require("node:test");
const assert = require("node:assert/strict");
const CARDS = require("../data.js");
const { createGame, BoardError, normalize } = require("../game.js");

function seeded(seed = 20260920) {
  return () => {
    seed = (Math.imul(1664525, seed) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function assertDistinct(game, board) {
  const cards = board.map((entry) => game.getCard(entry.cardId));
  assert.equal(new Set(cards.map((card) => normalize(card.tema))).size, 3);
  assert.equal(new Set(cards.flatMap((card) => card.cuvinte.map(normalize))).size, 21);
  assert.deepEqual(game.validateBoard(board), board);
}

function fixture(id, word = id) {
  return { id, tema: id, cuvinte: Array.from({ length: 7 }, (_, i) => `${word}-${i}`) };
}

test("catalog has permanent unique IDs and seven distinct prompts per card", () => {
  const game = createGame(CARDS);
  const cards = Object.values(CARDS).flat();
  assert.equal(cards.length, 100);
  assert.equal(new Set(cards.map((card) => card.id)).size, 100);
  cards.forEach((card) => assert.equal(game.getCard(card.id).words.length, 7));
});

test("normalization handles Unicode, Romanian case and whitespace without removing accents", () => {
  assert.equal(normalize("  BROASCA\u0306   T\u0326ESTOASA\u0306 "), "broască țestoasă");
  assert.notEqual(normalize("fată"), normalize("fata"));
});

test("30,000 atomic redeals across all eight difficulty configurations have no collisions or previous cards", () => {
  const game = createGame(CARDS, seeded());
  for (let mask = 0; mask < 8; mask++) {
    const diffs = [0, 1, 2].map((slot) => mask & (1 << slot) ? "mediu" : "usor");
    let session = game.createSession(diffs);
    for (let i = 0; i < 3750; i++) {
      const previous = session.board;
      session = game.deal(session);
      assertDistinct(game, session.board);
      assert.deepEqual(session.previous, previous);
      assert.ok(session.board.every((entry) => !previous.some((old) => old.cardId === entry.cardId)));
    }
  }
});

test("single-column deals and difficulty switches preserve both neighboring columns", () => {
  const game = createGame(CARDS, seeded(7));
  let session = game.createSession();
  for (let i = 0; i < 1200; i++) {
    const slot = i % 3;
    const previous = structuredClone(session);
    const diffs = session.board.map((entry) => entry.diff);
    if (i % 2) diffs[slot] = diffs[slot] === "usor" ? "mediu" : "usor";
    session = game.deal(session, [slot], diffs);
    assertDistinct(game, session.board);
    for (const neighbor of [0, 1, 2].filter((value) => value !== slot)) {
      assert.deepEqual(session.board[neighbor], previous.board[neighbor]);
    }
    assert.equal(session.board[slot].diff, diffs[slot]);
    assert.notEqual(session.board[slot].cardId, previous.board[slot].cardId);
    assert.deepEqual(game.undo(session).board, previous.board);
  }
});

test("one-step undo restores order and difficulty for single, all, and difficulty changes", () => {
  const game = createGame(CARDS, seeded());
  const initial = game.createSession(["usor", "mediu", "usor"]);
  const original = structuredClone(initial);
  for (const next of [
    game.deal(initial),
    game.deal(initial, [1]),
    game.deal(initial, [2], ["usor", "mediu", "mediu"]),
  ]) {
    const undone = game.undo(next);
    assert.deepEqual(undone, initial);
    assert.throws(() => game.undo(undone), { code: "no-undo" });
  }
  assert.deepEqual(initial, original);
});

test("save and restore retain locked board, table view and exact undo across catalog reordering", () => {
  const game = createGame(CARDS, seeded());
  const previous = game.createSession(["mediu", "usor", "mediu"]);
  const session = game.setTableView(game.deal(previous), true);
  const reordered = Object.fromEntries(Object.entries(CARDS).map(([diff, cards]) => [diff, [...cards].reverse()]));
  const reload = createGame(reordered).restoreSession(JSON.parse(JSON.stringify(session)));
  assert.deepEqual(reload, session);
  assert.deepEqual(game.undo(game.setLocked(reload, false)), previous);
});

test("lock gates every board mutation; table view locks and explicit unlock returns to setup", () => {
  const game = createGame(CARDS, seeded());
  const session = game.setLocked(game.deal(game.createSession()), true);
  const original = structuredClone(session);
  assert.throws(() => game.deal(session), { code: "locked" });
  assert.throws(() => game.deal(session, [0], ["mediu", "usor", "usor"]), { code: "locked" });
  assert.throws(() => game.undo(session), { code: "locked" });
  assert.deepEqual(session, original);
  const table = game.setTableView(session, true);
  assert.equal(table.locked, true);
  assert.equal(game.setTableView(table, false).locked, true);
  assert.equal(game.setLocked(table, false).tableView, false);
});

test("backtracking finds a compatible triple after a greedy dead end", () => {
  const a = fixture("a");
  const b = fixture("b");
  const c = fixture("c");
  const x = fixture("x");
  x.cuvinte[0] = b.cuvinte[0];
  x.cuvinte[1] = c.cuvinte[0];
  const game = createGame({ easy: [x, a, b, c] }, () => 0.999);
  const board = game.selectBoard(["easy", "easy", "easy"]);
  assertDistinct(game, board);
  assert.deepEqual(board.map((entry) => entry.cardId), ["a", "b", "c"]);
});

test("impossible selection is explicit and never mutates the board or relaxes uniqueness", () => {
  const game = createGame({ usor: [fixture("a"), fixture("b"), fixture("c")], mediu: [fixture("d", "a")] });
  const session = game.createSession();
  const original = structuredClone(session);
  assert.throws(() => game.deal(session), { code: "no-compatible-board" });
  assert.throws(() => game.deal(session, [1]), { code: "no-compatible-board" });
  assert.deepEqual(session, original);
  const impossible = createGame({ usor: [fixture("a", "shared"), fixture("b", "shared"), fixture("c", "shared")] });
  assert.throws(() => impossible.createSession(), { code: "no-compatible-board" });
});

test("cross-difficulty duplicates, case, and composed/decomposed prompts are rejected", () => {
  const a = fixture("a");
  const b = fixture("b");
  a.cuvinte[0] = "ȚESTOASĂ";
  b.cuvinte[0] = " t\u0326estoasa\u0306 ";
  const game = createGame({ usor: [a, fixture("c")], mediu: [b] });
  assert.throws(() => game.createSession(["usor", "mediu", "usor"]), { code: "no-compatible-board" });
});

test("saved state rejects invalid IDs, differences, collisions, versions and unsafe table mode", () => {
  const game = createGame(CARDS, seeded());
  const valid = game.createSession();
  const changed = (callback) => { const copy = structuredClone(valid); callback(copy); return copy; };
  const corrupt = [
    null, {}, { ...valid, version: 99 }, { ...valid, locked: "false" },
    { ...valid, tableView: true, locked: false },
    { ...valid, board: [] }, { ...valid, previous: undefined },
    changed((s) => { s.board[1] = null; }),
    changed((s) => { s.board[1] = s.board[0]; }),
    changed((s) => { s.board[1].cardId = "removed-card"; }),
    changed((s) => { s.board[1].diff = "__proto__"; }),
    changed((s) => { s.previous = [{}, {}, {}]; }),
  ];
  corrupt.forEach((value) => assert.throws(() => game.restoreSession(value), BoardError));
  assert.throws(() => game.selectBoard(["usor", "usor", "usor"], valid.board, [3]), BoardError);
  assert.throws(() => game.selectBoard(["usor", "usor", "usor"], valid.board, [0, 0]), BoardError);
});
