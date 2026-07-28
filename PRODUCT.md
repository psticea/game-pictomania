# Product

## Register

product

## Users

3–6 friends playing Pictomania around a table, in Romanian. One shared screen —
a tablet or laptop propped in the middle of the table — read simultaneously by
everyone from roughly a metre away, at an angle, in evening living-room light.

The job: during a frantic timed round every player is drawing *and* scanning the
board to guess what everyone else is drawing. They glance up mid-sketch for a
fraction of a second and must locate "column B, row 4" instantly. Between rounds
one person reaches over and deals new cards.

Success = nobody ever squints, leans in, or asks "what does C5 say?"

## Product Purpose

The physical card decks that ship with Pictomania run out — once you've played
every card, the game is dead. This replaces the three subject cards with an
infinite, refreshable digital board: 3 columns (A/B/C) × 7 rows (1–7), each
column dealt independently at a chosen difficulty.

## Brand Personality

Loud, confident, legible. It is a party game, so the screen is allowed to shout —
but it shouts with scale and colour, never with clutter. Closer to a stadium
scoreboard or an airport departure board than to a board-game app.

## Anti-references

- **Skeuomorphism.** No imitation plastic trays, card slips, drop shadows,
  paper textures or felt tables. Explicitly rejected by the operator.
- **Neon-arcade / retro-pixel / cyberpunk-glow.** The obvious second reflex once
  skeuomorphism is off the table. Not that either.
- Cute rounded "friendly app" styling, comic lettering, emoji as UI.
- Anything that trades legibility for atmosphere. Dim greys, thin weights,
  low-contrast "elegant" text — fatal at one metre.

## Design Principles

1. **The words are the interface.** Everything else is chrome and yields space
   to them. If an element isn't a word, a number, or a letter, justify it.
2. **Readable at a metre, at an angle, in half a second.** Legibility is a
   functional requirement, not a preference. It outranks every aesthetic call.
3. **Colour carries meaning, never decoration.** Each column owns a hue so a
   guesser can lock onto the right card instantly — always redundant with the
   letter, never colour alone.
4. **Never scroll, never sleep, never lose your place.** The board is furniture
   on the table: it fits the screen exactly and stays awake for the whole game.
5. **Loud through scale, quiet through restraint.** Energy comes from enormous
   type and saturated colour blocks, not from ornament or effects.

## Accessibility & Inclusion

- Body and word text ≥ 4.5:1 contrast; the large word type sits far above it.
- Column identity is always encoded twice (hue **and** letter), so the board
  works with any colour vision deficiency. The three hues (amber / azure /
  magenta) are chosen to stay distinct under deuteranopia and protanopia.
- Difficulty is encoded by label first, pattern second — never hue alone.
- Full `prefers-reduced-motion` alternative: the deal animation degrades to a
  short crossfade.
- Browser zoom is not disabled. Touch targets ≥ 44px.
- Keyboard operable throughout, with visible focus rings.
