"""Per-share dividend amounts live in manual/dividends.csv (PSX no longer serves a payouts feed).
Columns: ticker,announced_on,book_closure,amount_per_share,kind   (dates as YYYY-MM-DD)."""
import csv
import os


def import_manual(db, path=None):
    path = path or os.path.join(os.path.dirname(__file__), "..", "manual", "dividends.csv")
    if not os.path.exists(path):
        return 0
    rows = [r for r in csv.DictReader(open(path, newline="")) if (r.get("ticker") or "").strip()]
    stmts = [("DELETE FROM dividends WHERE source='manual'", ())]
    for r in rows:
        stmts.append(("INSERT INTO dividends(ticker,announced_on,book_closure,amount_per_share,source,confirmed) VALUES(?,?,?,?,?,1)",
                      (r["ticker"].strip().upper(), r["announced_on"].strip(), (r.get("book_closure") or "").strip() or None,
                       float(r["amount_per_share"]), "manual")))
    db.batch(stmts)
    return len(rows)
