"""Market job: screener (price, change, market cap, P/E) + per-company page (52w range, free float,
annual financials, announcements, payouts) for every company that has ever been five-star."""
import re
import sys
import time
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

import httpx
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(__file__))
from db import DB

BASE = "https://dps.psx.com.pk"
HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def num(text):
    """'(2,384)' -> -2384.0, '32.97%' -> 32.97, 'N/A' -> None"""
    t = text.strip().replace(",", "").replace("%", "").replace("Rs.", "")
    neg = t.startswith("(") and t.endswith(")")
    v = _f(t.strip("()"))
    return -v if neg and v is not None else v


def parse_screener(html):
    """-> {symbol: {sector_code, market_cap, close, change_pct, pe, free_float_shares, volume_30d}}"""
    out = {}
    soup = BeautifulSoup(html, "html.parser")
    for tr in soup.select("#screenerTable tbody tr"):
        tds = tr.find_all("td")
        if len(tds) < 11:
            continue
        sym = tds[0].get("data-order") or tds[0].get_text(strip=True)
        out[sym] = {
            "sector_code": tds[1].get_text(strip=True),
            "market_cap": _f(tds[3].get("data-order")),
            "close": _f(tds[4].get("data-order")),
            "change_pct": _f(tds[5].get("data-order")),
            "change_1y": _f(tds[6].get("data-order")),
            "pe": _f(tds[7].get("data-order")),
            "div_yield": _f(tds[8].get("data-order")),
            "free_float_shares": _f(tds[9].get("data-order")),
            "volume_30d": _f(tds[10].get("data-order")),
        }
    return out


def parse_company(html):
    soup = BeautifulSoup(html, "html.parser")
    res = {"sector": None, "psx_tag": None, "low_52w": None, "high_52w": None, "free_float_pct": None,
           "financials": [], "announcements": [], "payouts": []}
    sec = soup.select_one(".quote__sector span")
    res["sector"] = sec.get_text(strip=True) if sec else None
    tag = soup.select_one(".quote__name .tag")
    res["psx_tag"] = tag.get_text(strip=True) if tag else None
    for item in soup.select("#statsTab .stats_item"):
        label = item.select_one(".stats_label")
        if label and "52-WEEK" in label.get_text().upper():
            m = re.search(r"([\d,.]+)\s*—\s*([\d,.]+)", item.select_one(".stats_value").get_text())
            if m:
                res["low_52w"], res["high_52w"] = num(m.group(1)), num(m.group(2))
    for item in soup.select("#equity .stats_item"):
        label = item.select_one(".stats_label")
        val = item.select_one(".stats_value")
        if label and val and "Free Float" in label.get_text() and "%" in val.get_text():
            res["free_float_pct"] = num(val.get_text())
    ann = soup.select_one("#financialTab .tabs__panel[data-name=Annual]")
    if ann:
        years = [th.get_text(strip=True) for th in ann.select("th.right")]
        for tr in ann.select("tbody tr"):
            tds = tr.find_all("td")
            if not tds:
                continue
            for y, td in zip(years, tds[1:]):
                if y.isdigit() and num(td.get_text()) is not None:
                    res["financials"].append((int(y), "Annual", tds[0].get_text(strip=True), num(td.get_text())))
    for panel in soup.select("#announcementsTab .tabs__panel"):
        for tr in panel.select("tbody tr"):
            tds = tr.find_all("td")
            if len(tds) >= 2:
                d = datetime.strptime(tds[0].get_text(strip=True), "%b %d, %Y").date().isoformat()
                res["announcements"].append((d, tds[1].get_text(" ", strip=True)))
    for tr in soup.select("#payouts tbody tr"):
        res["payouts"].append([td.get_text(" ", strip=True) for td in tr.find_all("td")])
    return res


def dividend_event(title):
    """('interim'|'final'|'other', 'credit'|'declaration'|'notice') for dividend announcements, else None."""
    t = title.lower()
    if "dividend" not in t:
        return None
    kind = "interim" if "interim" in t else "final" if "final" in t else "other"
    stage = "credit" if "credit" in t else "declaration" if "declar" in t else "notice"
    return kind, stage


def get(client, url, tries=4):
    for i in range(tries):
        try:
            r = client.get(url)
        except httpx.TransportError:
            time.sleep(3 * (i + 1))
            continue
        if r.status_code in (403, 429, 503):
            time.sleep(5 * (i + 1))
            continue
        r.raise_for_status()
        return r.text
    raise RuntimeError(f"blocked or throttled: {url}")


def run(db):
    started = datetime.now(timezone.utc).isoformat(timespec="seconds")
    tracked = [r["ticker"] for r in db.query("SELECT DISTINCT ticker FROM changes")]
    today = datetime.now(timezone.utc).date().isoformat()
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    errors = []
    with httpx.Client(headers=HEADERS, timeout=40, follow_redirects=True) as client:
        screener = parse_screener(get(client, f"{BASE}/screener"))
        if len(screener) < 300:
            raise RuntimeError(f"screener parse looks wrong: {len(screener)} rows")
        stmts = []
        for t in tracked:
            s = screener.get(t)
            if not s:
                errors.append(f"{t}: not in screener")
                continue
            stmts.append(("INSERT OR REPLACE INTO prices_daily(ticker,session_date,close,change_pct,avg_volume_30d) VALUES(?,?,?,?,?)",
                          (t, today, s["close"], s["change_pct"], s["volume_30d"])))
        db.batch(stmts)

        def fetch(t):
            try:
                return t, parse_company(get(client, f"{BASE}/company/{t}"))
            except Exception as e:  # noqa: BLE001
                return t, e

        with ThreadPoolExecutor(max_workers=4) as ex:
            results = list(ex.map(fetch, tracked))
    for t, c in results:
        if isinstance(c, Exception):
            errors.append(f"{t}: {c}")
            continue
        s = screener.get(t, {})
        st = [
            ("UPDATE companies SET sector=COALESCE(?,sector), psx_tag=? WHERE ticker=?", (c["sector"], c["psx_tag"], t)),
            ("INSERT OR REPLACE INTO company_snapshot(ticker,fetched_at,market_cap,pe,free_float,high_52w,low_52w,div_yield,change_1y) VALUES(?,?,?,?,?,?,?,?,?)",
             (t, now, s.get("market_cap"), s.get("pe"), c["free_float_pct"], c["high_52w"], c["low_52w"], s.get("div_yield"), s.get("change_1y"))),
        ]
        for y, sec, item, v in c["financials"]:
            st.append(("INSERT OR REPLACE INTO financials(ticker,year,section,item,value,unit) VALUES(?,?,?,?,?,?)", (t, y, sec, item, v, "000 PKR (EPS in PKR)")))
        for d, title in c["announcements"][:60]:
            st.append(("INSERT OR IGNORE INTO announcements(ticker,date,title,url) VALUES(?,?,?,?)", (t, d, title, f"{BASE}/company/{t}#announcements")))
        for d, title in c["announcements"]:
            ev = dividend_event(title)
            if ev:
                st.append(("INSERT OR IGNORE INTO dividend_events(ticker,event_date,kind,stage,title) VALUES(?,?,?,?,?)", (t, d, ev[0], ev[1], title)))
        db.batch(st)
    try:
        from dividends import import_manual
        import_manual(db)
    except Exception as e:  # noqa: BLE001
        errors.append(f"dividends.csv: {e}")
    db.batch([("INSERT INTO job_runs(job,started_at,ok,message) VALUES(?,?,?,?)",
               ("market", started, int(not errors), "; ".join(errors)[:900] or f"ok: {len(tracked)} companies"))])
    print("done", len(tracked), "companies;", len(errors), "problems", errors[:10])


if __name__ == "__main__":
    d = DB()
    d.init()
    run(d)
