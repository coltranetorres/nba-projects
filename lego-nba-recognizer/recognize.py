"""Identify LEGO NBA figures by reading the team name / jersey number off the torso.

    python recognize.py --image jpg/IMG_5589.jpg ...   # score still photos
    python recognize.py --webcam                       # live demo (q to quit)
"""
import argparse, collections, difflib, json, os, re, subprocess, sys, tempfile, time
import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
LABELS = json.load(open(os.path.join(HERE, "labels.json")))
# key -> (OCR team keyword, jersey number); keys match labels.json
TEAMS = {k: (k.rsplit("_", 1)[0].upper(), k.rsplit("_", 1)[1]) for k in LABELS}
TEAMS["timberwolves_5"] = ("TIMBERWOLVES", "5")
NAME_CUTOFF = 0.7
TEAM_FULL = {
    "CELTICS": "Boston Celtics", "TIMBERWOLVES": "Minnesota Timberwolves", "BUCKS": "Milwaukee Bucks",
    "HOUSTON": "Houston Rockets", "DALLAS": "Dallas Mavericks", "SATX": "San Antonio Spurs",
}


class Ocr:
    def __init__(self):
        exe = os.path.join(HERE, "bin", "ocr_helper")
        if not os.path.exists(exe):
            os.makedirs(os.path.dirname(exe), exist_ok=True)
            subprocess.check_call(["swiftc", "-O", os.path.join(HERE, "ocr_helper.swift"), "-o", exe])
        self.proc = subprocess.Popen([exe], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True)

    def read(self, frame):
        with tempfile.NamedTemporaryFile(suffix=".jpg") as f:
            cv2.imwrite(f.name, frame)
            self.proc.stdin.write(f.name + "\n"); self.proc.stdin.flush()
            return json.loads(self.proc.stdout.readline())


def match(texts):
    """Score each figure from OCR tokens: team-name similarity, plus a bonus if its number is also seen."""
    tokens = [t for r in texts for t in re.findall(r"[A-Z0-9]+", r["text"].upper())]
    scores = {}
    for key, (name, number) in TEAMS.items():
        best = max((difflib.SequenceMatcher(None, t, name).ratio() for t in tokens if len(t) > 2), default=0)
        name_score = best if best >= NAME_CUTOFF else 0
        number_score = 0.4 if number in tokens else 0
        if name_score or number_score:
            scores[key] = name_score + number_score
    return scores


def best(scores):
    return max(scores, key=scores.get) if scores else None


def figure_info(key):
    """(player, team, number) for a figure key, or None."""
    if key not in LABELS:
        return None
    name, number = TEAMS[key]
    return LABELS[key], TEAM_FULL[name], number


def vote_winner(votes):
    """Most common non-empty vote in the window, or None if no figure was read in it."""
    tally = collections.Counter(v for v in votes if v)
    return tally.most_common(1)[0][0] if tally else None


class Announcer:
    """Prints a line once when the recognized figure changes (not on every frame)."""
    def __init__(self):
        self.current = None

    def update(self, key):
        if key != self.current:
            self.current = key
            info = figure_info(key)
            if info:
                print(f"Recognized: {info[0]} - {info[1]} #{info[2]}", flush=True)
            return info
        return None


def draw_panel(frame, key):
    """Overlay a panel with player / team / number (or 'No figure detected') on the frame."""
    info = figure_info(key)
    lines = [("Player", info[0]), ("Team", info[1]), ("Number", "#" + info[2])] if info else None
    h, w = frame.shape[:2]
    scale = max(w / 1280, 0.6)
    x, y, pad = int(20 * scale), int(20 * scale), int(16 * scale)
    font = cv2.FONT_HERSHEY_SIMPLEX
    if lines is None:
        text, th = "No figure detected", int(2 * scale) or 1
        (tw, tht), _ = cv2.getTextSize(text, font, 0.9 * scale, th)
        box = (x, y, x + tw + 2 * pad, y + tht + 2 * pad)
    else:
        big, small = 1.4 * scale, 0.9 * scale
        (bw, bh), _ = cv2.getTextSize(lines[0][1], font, big, max(int(3 * scale), 1))
        sw = max(cv2.getTextSize(f"{k}: {v}", font, small, max(int(2 * scale), 1))[0][0] for k, v in lines[1:])
        sh = cv2.getTextSize("Ag", font, small, 2)[0][1]
        box = (x, y, x + max(bw, sw) + 2 * pad, y + bh + 2 * (sh + int(14 * scale)) + 2 * pad)
    overlay = frame.copy()
    cv2.rectangle(overlay, box[:2], box[2:], (0, 0, 0), -1)
    cv2.addWeighted(overlay, 0.65, frame, 0.35, 0, frame)
    if lines is None:
        cv2.putText(frame, text, (x + pad, y + pad + tht), font, 0.9 * scale, (200, 200, 200), th)
        return frame
    ty = y + pad + bh
    cv2.putText(frame, lines[0][1], (x + pad, ty), font, big, (0, 255, 0), max(int(3 * scale), 1))
    for k, v in lines[1:]:
        ty += sh + int(14 * scale)
        cv2.putText(frame, f"{k}: {v}", (x + pad, ty), font, small, (255, 255, 255), max(int(2 * scale), 1))
    return frame


def run_images(paths):
    ocr, ok = Ocr(), 0
    for p in paths:
        expected = os.path.basename(os.path.dirname(p))  # data/<label>/IMG.jpg; else unknown
        scores = match(ocr.read(cv2.imread(p)))
        got = best(scores)
        mark = "" if expected not in LABELS else (" OK" if got == expected else " WRONG")
        ok += mark == " OK"
        print(f"{os.path.basename(p)}: {LABELS.get(got, '?')} {scores}{mark}")
    return ok


def run_webcam(cam, every, window):
    ocr, cap = Ocr(), cv2.VideoCapture(cam)
    if not cap.isOpened():
        sys.exit("Could not open webcam (check camera permission for your terminal).")
    votes, last, key, announcer = collections.deque(maxlen=window), 0, None, Announcer()
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if time.time() - last > every:
            last = time.time()
            votes.append(best(match(ocr.read(frame))))
            key = vote_winner(votes)
            announcer.update(key)
        draw_panel(frame, key)
        cv2.imshow("LEGO NBA recognizer (q to quit)", frame)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            break
    cap.release(); cv2.destroyAllWindows()


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--image", nargs="+")
    ap.add_argument("--webcam", action="store_true")
    ap.add_argument("--camera", type=int, default=0)
    ap.add_argument("--every", type=float, default=0.5, help="seconds between OCR passes")
    ap.add_argument("--window", type=int, default=5, help="frames to vote over")
    a = ap.parse_args()
    if a.image:
        n = run_images(a.image); print(f"{n}/{len(a.image)} correct")
    elif a.webcam:
        run_webcam(a.camera, a.every, a.window)
    else:
        ap.print_help()
