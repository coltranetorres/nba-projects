# LEGO NBA figure recognizer

Point a webcam at a LEGO NBA figure and it shows who it is. It reads the team name and jersey
number printed on the figure's jersey with the macOS Vision text recognizer, fuzzy-matches them
to the known figures, and shows player, team and number on the video window.

Why OCR and not image embeddings: whole-image embeddings matched on photo lighting and angle, not
on the print, and scored 1/12 on leave-one-out tests. Reading the text got 10/12 on the same photos
with no wrong answers.

macOS only (Vision framework + `swiftc`).

## Setup
    python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

## Run
    .venv/bin/python recognize.py --webcam                 # live, q to quit
    .venv/bin/python recognize.py --image data/*/*.jpg     # score still photos
    .venv/bin/python test_recognize.py                     # logic tests

The first run compiles `ocr_helper.swift` into `bin/`. Allow camera access for your terminal when
macOS asks. Hold the figure close, square to the camera, with the jersey lit.

## Figures
Defined in `labels.json` (folder-style key -> player). Add a figure by adding its key there, a
`TEAM_FULL` entry in `recognize.py`, and optionally a labeled photo folder under `data/`.
