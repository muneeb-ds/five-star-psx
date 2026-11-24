CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  notice_no TEXT NOT NULL, notice_date TEXT, effective_date TEXT, accounts_period TEXT,
  state TEXT NOT NULL DEFAULT 'provisional',  -- provisional|final|revised|needs_check
  is_baseline INTEGER NOT NULL DEFAULT 0,
  pdf_url TEXT, pdf_hash TEXT, revision INTEGER NOT NULL DEFAULT 0,
  UNIQUE(notice_no, revision)
);
CREATE TABLE IF NOT EXISTS companies (
  ticker TEXT PRIMARY KEY, name TEXT, former_names TEXT, sector TEXT,
  is_financial INTEGER NOT NULL DEFAULT 0, is_reit INTEGER NOT NULL DEFAULT 0,
  excluded_by_user INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS ratings (
  ticker TEXT NOT NULL, review_id INTEGER NOT NULL, star_rating TEXT, shariah_status TEXT,
  debt_ratio REAL, investment_ratio REAL, income_ratio REAL, illiquid_ratio REAL,
  nla_per_share REAL, price_jun30 REAL, purification_rate REAL,
  PRIMARY KEY (ticker, review_id)
);
CREATE TABLE IF NOT EXISTS ticker_aliases (old_ticker TEXT PRIMARY KEY, new_ticker TEXT NOT NULL, from_review INTEGER);
CREATE TABLE IF NOT EXISTS changes (
  review_id INTEGER NOT NULL, ticker TEXT NOT NULL,
  kind TEXT NOT NULL,  -- dropped|new|returned|baseline|stayed
  old_status TEXT, new_status TEXT, detail TEXT, superseded_by INTEGER,
  PRIMARY KEY (review_id, ticker)
);
CREATE TABLE IF NOT EXISTS prices_daily (ticker TEXT, session_date TEXT, close REAL, change_pct REAL, avg_volume_30d REAL, PRIMARY KEY (ticker, session_date));
CREATE TABLE IF NOT EXISTS company_snapshot (ticker TEXT, fetched_at TEXT, market_cap REAL, pe REAL, free_float REAL, high_52w REAL, low_52w REAL, PRIMARY KEY (ticker, fetched_at));
CREATE TABLE IF NOT EXISTS financials (ticker TEXT, year INTEGER, section TEXT, item TEXT, value REAL, unit TEXT, PRIMARY KEY (ticker, year, section, item));
CREATE TABLE IF NOT EXISTS dividends (id INTEGER PRIMARY KEY AUTOINCREMENT, ticker TEXT, announced_on TEXT, book_closure TEXT, amount_per_share REAL, source TEXT, confirmed INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS announcements (ticker TEXT, date TEXT, title TEXT, url TEXT, PRIMARY KEY (ticker, date, title));
CREATE TABLE IF NOT EXISTS alhilal_status (ticker TEXT, report_period TEXT, status TEXT, failed_ratio TEXT, pdf_url TEXT, PRIMARY KEY (ticker, report_period));
CREATE TABLE IF NOT EXISTS job_runs (id INTEGER PRIMARY KEY AUTOINCREMENT, job TEXT, started_at TEXT, ok INTEGER, message TEXT);
