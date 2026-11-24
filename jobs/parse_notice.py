"""Parse Annexure B of a PSX-KMI All Share Islamic Index recomposition notice."""
import json
import re
import sys

import pdfplumber

ROW = re.compile(
    r"^(?P<name>.+?)\s+(?P<obj>Compliant|Non-Compliant)\s+"
    r"(?P<debt>[\d.]+%|N/A)\s+(?P<inv>[\d.]+%|N/A)\s+(?P<inc>[\d.]+%|N/A)\s+"
    r"(?P<illiq>[\d.]+%)\s+(?P<nla>\(?-?[\d,.]+\)?)\s+(?P<price>[\d,.]+)\s+"
    r"(?P<status>Compliant|Non-Compliant)(?:\s+\d)?\s+(?P<rating>★{1,5}|NR|N/A)$"
)


def _pct(s):
    return None if s == "N/A" else float(s.rstrip("%"))


def _num(s):
    neg = s.startswith("(")
    v = float(s.strip("()").replace(",", ""))
    return -v if neg else v


def parse_rows(text):
    rows = {}
    for line in text.split("\n"):
        toks = line.strip().split()
        i = 0
        while i < len(toks) and toks[i].isdigit():  # row number, may be split: "1 0"
            i += 1
        if i == 0 or i >= len(toks):
            continue
        ticker, rest = toks[i], " ".join(toks[i + 1:])
        m = ROW.match(rest)
        if not m:
            continue
        g = m.groupdict()
        name = re.sub(r"\s*[*^]+$", "", g["name"]).strip()
        rows[ticker] = {
            "ticker": ticker,
            "name": name,
            "is_financial_flag": g["debt"] == "N/A",
            "objective_status": g["obj"],
            "debt_ratio": _pct(g["debt"]),
            "investment_ratio": _pct(g["inv"]),
            "income_ratio": _pct(g["inc"]),
            "illiquid_ratio": _pct(g["illiq"]),
            "nla_per_share": _num(g["nla"]),
            "price_jun30": _num(g["price"]),
            "shariah_status": g["status"],
            "star_rating": {"★★★★★": "5", "★★★★": "4", "★★★": "3", "★★": "2", "★": "1"}.get(
                g["rating"], g["rating"]
            ),
        }
    return rows


def parse_notice(pdf_path):
    with pdfplumber.open(pdf_path) as pdf:
        text = "\n".join((p.extract_text() or "") for p in pdf.pages[2:])
        head = pdf.pages[0].extract_text() or ""
    notice = re.search(r"PSX/N-\d+", head)
    date = re.search(r"([A-Z][a-z]+ \d{1,2}, \d{4})", head)
    effective = re.search(r"take effect from \w+, ([A-Z][a-z]+ \d{1,2}, \d{4})", head.replace("\n", " "))
    return {
        "notice_no": notice.group(0) if notice else None,
        "notice_date": date.group(1) if date else None,
        "effective_date": effective.group(1) if effective else None,
        "rows": sorted(parse_rows(text).values(), key=lambda r: r["ticker"]),
    }


def five_star(rows, excluded=()):
    """Five stars and not a financial institution (ratios N/A) and not user-excluded."""
    return [
        r for r in rows
        if r["star_rating"] == "5" and not r["is_financial_flag"] and r["ticker"] not in excluded
    ]


if __name__ == "__main__":
    out = parse_notice(sys.argv[1])
    json.dump(out, sys.stdout, indent=1, ensure_ascii=False)
