import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "jobs"))
from market import parse_screener, parse_company, num

FX = os.path.join(os.path.dirname(__file__), "..", "fixtures")


def test_num():
    assert num("(2,384)") == -2384 and num("32.97%") == 32.97 and num("N/A") is None


def test_screener():
    s = parse_screener(open(f"{FX}/screener_sample.html").read())
    assert s["AABS"]["close"] == 745.6 and s["AABS"]["market_cap"] == 12945330880 and s["AABS"]["pe"] == 17.46


def test_company():
    c = parse_company(open(f"{FX}/company_sample.html").read())
    assert (c["sector"], c["low_52w"], c["high_52w"], c["free_float_pct"], c["psx_tag"]) == ("INSURANCE", 344.7, 421.3, 32.97, "NON-COMPLIANT")
    assert c["financials"] == [(2025, "Annual", "EPS", -2.38), (2024, "Annual", "EPS", 1000.5)]
    assert c["announcements"] == [("2026-08-25", "Transmission of 2nd Quarter")]
