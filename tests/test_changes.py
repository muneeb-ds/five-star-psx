import copy, json, os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "jobs"))
from parse_notice import parse_notice, five_star
from changes import compute_changes, baseline

PDF = os.path.join(os.path.dirname(__file__), "..", "fixtures", "PSX-N-1402.pdf")
ROWS = parse_notice(PDF)["rows"]


def test_baseline_is_the_21_tickers():
    t = {r["ticker"] for r in five_star(ROWS)}
    assert len(t) == 21 and {"SWL", "DCR", "IREIT", "NNAR", "SRR", "CWHC"} <= t
    assert not t & {"MEBL", "BIPL", "FABL"}  # banks excluded
    assert len(baseline(ROWS)) == 21


def test_one_drop_one_new():
    new = copy.deepcopy(ROWS)
    for r in new:
        if r["ticker"] == "ASC":
            r["star_rating"] = "4"
        if r["ticker"] == "ABOT":
            r["star_rating"], r["is_financial_flag"] = "5", False
    ch = compute_changes(ROWS, new)
    assert [(c["ticker"], c["kind"], c["new_status"]) for c in ch if c["kind"] != "stayed"] == [
        ("ASC", "dropped", "4"), ("ABOT", "new", "5")]
    assert compute_changes(ROWS, new) == ch  # idempotent


def test_missing_row_and_returned_and_alias():
    new = [r for r in ROWS if r["ticker"] != "SITC"]
    ch = {c["ticker"]: c for c in compute_changes(ROWS, new)}
    assert ch["SITC"]["new_status"] == "Not in notice"
    ch = compute_changes(new, ROWS, history=[{"SITC"}])
    assert [c["kind"] for c in ch if c["ticker"] == "SITC"] == ["returned"]
    renamed = copy.deepcopy(ROWS)
    for r in renamed:
        if r["ticker"] == "CWHC":
            r["ticker"] = "CWHX"
    ch = compute_changes(ROWS, renamed, aliases={"CWHC": "CWHX"})
    assert all(c["kind"] == "stayed" for c in ch)
