"""Ingest a PSX notice PDF: store ratings, then compute changes against the previous review.
Usage: python jobs/ingest.py path/to.pdf [--url PDF_URL]"""
import argparse, hashlib, json, os, sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(__file__))
from changes import baseline, compute_changes
from db import DB
from parse_notice import five_star, parse_notice

REIT = {"DCR", "IREIT", "NNAR", "SRR"}


def iso(s):
    return datetime.strptime(s, "%B %d, %Y").date().isoformat() if s else None


def ingest(db, pdf, url=None):
    n = parse_notice(pdf)
    if len(n["rows"]) < 200:
        raise RuntimeError(f"parse looks wrong: only {len(n['rows'])} rows")
    h = hashlib.sha256(open(pdf, "rb").read()).hexdigest()
    if db.query("SELECT 1 FROM reviews WHERE pdf_hash=?", (h,)):
        print("already ingested"); return
    prev = db.query("SELECT * FROM reviews WHERE state!='needs_check' ORDER BY effective_date DESC LIMIT 1")
    rev_no = db.query("SELECT COALESCE(MAX(revision)+1,0) AS r FROM reviews WHERE notice_no=?", (n["notice_no"],))[0]["r"]
    eff = iso(n["effective_date"])
    state = "final" if eff and eff <= datetime.now(timezone.utc).date().isoformat() else "provisional"
    if int(rev_no) > 0: state = "revised"
    db.batch([("INSERT INTO reviews(notice_no,notice_date,effective_date,accounts_period,state,is_baseline,pdf_url,pdf_hash,revision) VALUES(?,?,?,?,?,?,?,?,?)",
               (n["notice_no"], iso(n["notice_date"]), eff, "June 2026" if "2026" in (n["effective_date"] or "") else None,
                state, 0 if prev else 1, url, h, int(rev_no)))])
    rid = int(db.query("SELECT id FROM reviews WHERE pdf_hash=?", (h,))[0]["id"])
    stmts = []
    for r in n["rows"]:
        stmts.append(("INSERT OR IGNORE INTO companies(ticker,name,is_financial,is_reit) VALUES(?,?,?,?)",
                      (r["ticker"], r["name"], int(r["is_financial_flag"]), int(r["ticker"] in REIT))))
        stmts.append(("INSERT OR REPLACE INTO ratings(ticker,review_id,star_rating,shariah_status,debt_ratio,investment_ratio,income_ratio,illiquid_ratio,nla_per_share,price_jun30) VALUES(?,?,?,?,?,?,?,?,?,?)",
                      (r["ticker"], rid, r["star_rating"], r["shariah_status"], r["debt_ratio"], r["investment_ratio"],
                       r["income_ratio"], r["illiquid_ratio"], r["nla_per_share"], r["price_jun30"])))
    if prev:
        pid = int(prev[0]["id"])
        load = lambda i: [{"ticker": x["ticker"], "name": x["ticker"], "is_financial_flag": x["debt_ratio"] is None,
                           "star_rating": x["star_rating"], "shariah_status": x["shariah_status"], "debt_ratio": x["debt_ratio"],
                           "investment_ratio": x["investment_ratio"], "income_ratio": x["income_ratio"]}
                          for x in db.query("SELECT * FROM ratings WHERE review_id=?", (i,))]
        older = [r["id"] for r in db.query("SELECT id FROM reviews WHERE id<?", (pid,))]
        hist = [{r["ticker"] for r in five_star(load(i))} for i in older]
        aliases = {a["old_ticker"]: a["new_ticker"] for a in db.query("SELECT * FROM ticker_aliases")}
        ex = {c["ticker"] for c in db.query("SELECT ticker FROM companies WHERE excluded_by_user=1")}
        ch = compute_changes(load(pid), n["rows"], hist, aliases, ex)
    else:
        ch = baseline(n["rows"])
    for c in ch:
        stmts.append(("INSERT OR REPLACE INTO changes(review_id,ticker,kind,old_status,new_status,detail) VALUES(?,?,?,?,?,?)",
                      (rid, c["ticker"], c["kind"], c["old_status"], c["new_status"], json.dumps(c.get("detail")))))
    db.batch(stmts)
    print(f"ingested {n['notice_no']}: {len(n['rows'])} rows, {sum(c['kind'] in ('baseline','stayed','new','returned') for c in ch)} five-star")


if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("pdf"); ap.add_argument("--url")
    a = ap.parse_args()
    os.makedirs("data", exist_ok=True)
    d = DB(); d.init(); ingest(d, a.pdf, a.url)
