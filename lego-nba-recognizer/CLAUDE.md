# lego-nba-recognizer

macOS webcam app that identifies LEGO NBA figures by OCR-reading the jersey. Lives in the
`nba-projects` repo; user-facing docs are in the root `../README.md`.

## Commands (run from this directory)

- Setup: `python3 -m venv .venv && .venv/bin/pip install -r requirements.txt`
- Tests: `.venv/bin/python test_recognize.py` (plain asserts, no pytest; prints `ok <name>` per test)
- Score sample photos: `.venv/bin/python recognize.py --image data/*/*.jpg` (expect 10/12 correct, no wrong)
- Live demo: `.venv/bin/python recognize.py --webcam` (needs a camera and a human; don't run it unattended)

## Architecture

- `recognize.py` is the whole app. `Ocr` spawns the compiled Swift helper once and talks to it over
  stdin/stdout (image path in, JSON array of `{text, conf}` out). `match()` scores figures,
  `vote_winner()` smooths across frames, `draw_panel()` renders the overlay.
- `ocr_helper.swift` is compiled on first run to `bin/ocr_helper` (gitignored). Delete `bin/` to
  force a rebuild after editing the Swift file.
- `labels.json` maps figure key (`<team>_<number>`) to player. Team keyword and number are derived
  from the key, so key names must match the word printed on the jersey (e.g. `satx`, not `spurs`).
- `data/<key>/` folder names are the ground-truth labels `--image` mode checks against.

## Conventions

- Keep logic that can be tested without a camera or OCR (matching, voting, announcing, drawing) in
  pure functions/classes, and cover it in `test_recognize.py`.
- Match the existing style: compact, minimal comments, docstrings only where intent isn't obvious.
- Don't add dependencies beyond `opencv-python` and `numpy` without asking.

## Gotchas

- macOS only: relies on the Vision framework and `swiftc`. Don't try to port to Linux unasked.
- `test_recognize.py` runs tests at import time via a module-level loop, so importing it executes them.
- Image embeddings (CLIP-style) were tried and scored 1/12; don't reintroduce them. OCR scored 10/12.
- Adding a figure needs entries in both `labels.json` and `TEAM_FULL` in `recognize.py`, or
  `figure_info()` will raise a `KeyError`.
