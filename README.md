# Pictomania word board

A Romanian companion board for a game at the table: three cards (A/B/C), seven
words each, with independent easy/medium difficulty. The 100-card library is
included locally; there are no build dependencies.

## Run locally

From this directory on Windows:

```powershell
py -3 -m http.server 4173 --bind 127.0.0.1
```

Open <http://127.0.0.1:4173>. Stop the server with Ctrl+C.
The already-loaded board can deal without a connection, but reopening the site
offline is not guaranteed. Google Fonts are still external; the small-phone
fallback keeps the original mixed-case words when the display font is unavailable.

## Prepare and protect a round

- **Cărți noi** replaces all three cards; each column's arrow replaces only that
  card. Changing a difficulty also deals a new card in that column.
- **Anulează** restores the exact previous board, including the difficulties.
  There is one undo step, saved across reloads. Locking does not consume it.
- **Blochează tabla** disables dealing, difficulty changes, undo, and dealing
  shortcuts. **Deblochează tabla** returns to preparation without changing words.
- **Vedere de masă** enlarges the display, hides preparation controls, and locks
  the round automatically. Leaving that view does not unlock the board;
  explicitly unlocking also exits table view.
- `1`, `2`, and `3` replace A, B, and C; `R` replaces all three; `F` toggles
  fullscreen. Holding a key does not repeatedly deal. Typing in editable controls
  does not trigger these shortcuts.

The current board, undo step, lock, and display mode are saved in this browser
under `pictomania.board.v1`. Reload restores the board rather than dealing again.
Existing `pictomania.diff` preferences are migrated on first use of the new state.
If storage is unavailable, a visible warning explains that the board cannot
survive a reload and offers a retry. Invalid saved boards are not silently
replaced: the host must choose to start a new board.

## Compatible cards and stable identity

Each card has a permanent `id` in `data.js`. Keep it when reordering or editing
that card; never renumber or reuse an ID for an unrelated card. Saved boards
reference IDs rather than array positions. A removed card or incompatible saved
board requires explicit recovery.

Dealing is atomic and searches for three different themes with 21 distinct
prompts. Comparison normalizes Unicode to NFC, whitespace, and Romanian case,
while preserving accents. Exact homonyms are excluded even if their themes
differ. Synonyms and inflections remain an editorial concern; the dealer does
not invent concepts or rewrite the seven-word cards.

An all-card deal excludes all three previously visible cards. A single-card
replacement preserves its neighbors and must remain compatible with them.
If no eligible replacement exists, the board and undo step stay unchanged and
the host is prompted to choose another difficulty or deal all cards. The
uniqueness rule is never silently relaxed. There is not yet a session-wide
no-repeat queue.

## Display expectations

Use a tablet or laptop for shared reading from across a table. Phones retain
all three columns as a close-up view and show guidance to use a larger screen.
Row numbers have an 18px minimum and a consistent gutter; words have a 16px
minimum in the supported layouts. Table view allocates more space to the board
and increases the word scale on larger screens.

The responsive regression sweep covers 1440×900, 1024×768, 768×1024, 720×450,
390×844, 320×568, and 844×390 in preparation and table modes, including missing
web fonts. This is not proof of physical one-metre legibility: confirm it on the
intended display with players, evening lighting, and oblique viewing angles.
For arbitrary tiny windows or enlarged system text, use a larger viewport.

## Validation

```powershell
node --check app.js
node --check game.js
node --test tests\game.test.js
```

The dependency-free Node tests cover all difficulty combinations, 30,000
collision-free redeals, independent changes, exact undo, lock gates, restoration
after catalog reordering, corrupt saves, normalized collisions, backtracking,
and exhausted pools. Browser validation should additionally exercise actual
buttons/shortcuts, reload, storage denial, and the full-deck viewport sweep.

The original evaluation is preserved in `reviews/2026-09-20/index.html` as a
historical review, not a description of the updated implementation.