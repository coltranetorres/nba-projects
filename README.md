# nba-projects

A collection of small NBA-themed projects. Each project lives in its own folder.

## Projects

| Project | Description |
|---|---|
| [lego-nba-recognizer](lego-nba-recognizer/) | Webcam app that identifies LEGO NBA figures by reading the team name and jersey number with macOS Vision OCR |

## lego-nba-recognizer

Point a webcam at a LEGO NBA figure and see who it is. The app reads the team name and jersey
number printed on the figure's jersey, matches them to a small set of known figures, and overlays
the player, team and number on the live video.

### How it works

1. **Capture** – OpenCV grabs a webcam frame every 0.5 s (`--every`).
2. **Read text** – the frame goes to `ocr_helper.swift`, a small Swift process that runs the macOS
   Vision text recognizer and returns the recognized strings as JSON.
3. **Match** – `recognize.py` fuzzy-matches the tokens against each figure's team keyword
   (e.g. `CELTICS`, `SATX`) with `difflib`, and adds a bonus when the jersey number is also seen.
4. **Smooth** – the last 5 reads (`--window`) vote, so one bad frame doesn't flicker the display.
5. **Display** – a panel on the video shows player, team and number, and the console prints a line
   each time the recognized figure changes.

**Why OCR instead of image embeddings:** whole-image embeddings matched on photo lighting and angle
rather than the print, scoring 1/12 on leave-one-out tests. Reading the text scored 10/12 on the
same photos with no wrong answers.

### Supported figures

| Key | Player | Team |
|---|---|---|
| `celtics_0` | Jayson Tatum | Boston Celtics |
| `timberwolves_5` | Anthony Edwards | Minnesota Timberwolves |
| `bucks_34` | Giannis Antetokounmpo | Milwaukee Bucks |
| `houston_7` | Kevin Durant | Houston Rockets |
| `dallas_11` | Kyrie Irving | Dallas Mavericks |
| `satx_1` | Victor Wembanyama | San Antonio Spurs |

### Requirements

- macOS (uses the Vision framework)
- Xcode command line tools for `swiftc` (`xcode-select --install`)
- Python 3 and a webcam

### Setup

```bash
cd lego-nba-recognizer
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

### Usage

Run from `lego-nba-recognizer/`:

```bash
.venv/bin/python recognize.py --webcam               # live view, press q to quit
.venv/bin/python recognize.py --image data/*/*.jpg   # score still photos against their folder labels
.venv/bin/python test_recognize.py                   # logic tests
```

Webcam options: `--camera N` (device index, default 0), `--every SECONDS` (OCR interval, default
0.5), `--window N` (frames to vote over, default 5).

The first run compiles `ocr_helper.swift` into `bin/`. Allow camera access for your terminal when
macOS asks. For best results hold the figure close, square to the camera, with the jersey well lit.

### Project layout

| Path | Purpose |
|---|---|
| `recognize.py` | Matching, voting, overlay, webcam and image modes |
| `ocr_helper.swift` | Vision OCR helper (image paths on stdin, JSON on stdout) |
| `labels.json` | Figure key → player name |
| `data/<key>/` | Labeled sample photos, two per figure |
| `test_recognize.py` | Plain-assert tests for matching and display logic |

### Adding a figure

1. Add `"<team>_<number>": "Player Name"` to `labels.json`. The team part must be the word printed
   on the jersey (e.g. `satx`).
2. Add the upper-cased team keyword to `TEAM_FULL` in `recognize.py`.
3. Optionally add photos in `data/<key>/` and check them with `--image`.

### Limitations

- macOS only.
- Only recognizes figures whose jersey shows a team word or number the OCR can read.
- Accuracy depends on lighting, distance and angle; the sample set scores 10/12 offline.
