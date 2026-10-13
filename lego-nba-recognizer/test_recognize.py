"""Plain-assert checks for the recognizer's decision logic: .venv/bin/python test_recognize.py"""
import collections, contextlib, io
import recognize as r

def test_figure_info():
    assert r.figure_info("houston_7") == ("Kevin Durant", "Houston Rockets", "7")
    assert r.figure_info("satx_1") == ("Victor Wembanyama", "San Antonio Spurs", "1")
    assert r.figure_info(None) is None

def test_vote_winner():
    assert r.vote_winner([None, None]) is None
    assert r.vote_winner(["a", None, "a", "b"]) == "a"

def test_announce_once_per_change():
    a, out = r.Announcer(), io.StringIO()
    seq = ["houston_7"] * 4 + [None] + ["houston_7"] + ["dallas_11"] * 3
    with contextlib.redirect_stdout(out):
        for k in seq:
            a.update(k)
    lines = out.getvalue().splitlines()
    assert lines == ["Recognized: Kevin Durant - Houston Rockets #7",
                     "Recognized: Kevin Durant - Houston Rockets #7",   # re-announced after leaving the frame
                     "Recognized: Kyrie Irving - Dallas Mavericks #11"], lines

def test_panel_draws_without_error():
    import numpy as np
    for key in ("bucks_34", None):
        f = np.zeros((720, 1280, 3), np.uint8); before = f.copy()
        assert (r.draw_panel(f, key) != before).any()

for name, fn in list(globals().items()):
    if name.startswith("test_"):
        fn(); print("ok", name)
