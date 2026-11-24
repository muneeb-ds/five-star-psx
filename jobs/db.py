"""Tiny DB layer: local SQLite file, or Turso over its HTTP API when TURSO_DATABASE_URL is set."""
import os
import sqlite3

import httpx


class DB:
    def __init__(self):
        self.url = os.environ.get("TURSO_DATABASE_URL")
        if self.url:
            self.http = self.url.replace("libsql://", "https://").rstrip("/") + "/v2/pipeline"
            self.token = os.environ["TURSO_AUTH_TOKEN"]
        else:
            self.conn = sqlite3.connect(os.environ.get("DB_PATH", "data/app.db"))
            self.conn.row_factory = sqlite3.Row

    @staticmethod
    def _arg(v):
        if v is None: return {"type": "null"}
        if isinstance(v, int): return {"type": "integer", "value": str(v)}
        if isinstance(v, float): return {"type": "float", "value": v}
        return {"type": "text", "value": str(v)}

    def batch(self, stmts):
        """stmts: list of (sql, params). Runs atomically."""
        if not self.url:
            with self.conn:
                for sql, p in stmts:
                    self.conn.execute(sql, p)
            return
        reqs = [{"type": "execute", "stmt": {"sql": "BEGIN"}}]
        reqs += [{"type": "execute", "stmt": {"sql": s, "args": [self._arg(x) for x in p]}} for s, p in stmts]
        reqs += [{"type": "execute", "stmt": {"sql": "COMMIT"}}, {"type": "close"}]
        r = httpx.post(self.http, json={"requests": reqs}, headers={"Authorization": f"Bearer {self.token}"}, timeout=60)
        r.raise_for_status()
        for res in r.json()["results"]:
            if res["type"] == "error":
                raise RuntimeError(res["error"]["message"])

    def query(self, sql, params=()):
        if not self.url:
            return [dict(r) for r in self.conn.execute(sql, params)]
        body = {"requests": [{"type": "execute", "stmt": {"sql": sql, "args": [self._arg(x) for x in params]}}, {"type": "close"}]}
        r = httpx.post(self.http, json=body, headers={"Authorization": f"Bearer {self.token}"}, timeout=60)
        r.raise_for_status()
        res = r.json()["results"][0]
        if res["type"] == "error":
            raise RuntimeError(res["error"]["message"])
        rs = res["response"]["result"]
        cols = [c["name"] for c in rs["cols"]]
        return [{c: (v.get("value") if v["type"] != "null" else None) for c, v in zip(cols, row)} for row in rs["rows"]]

    def init(self):
        here = os.path.dirname(__file__)
        sql = open(os.path.join(here, "schema.sql")).read()
        self.batch([(s.strip(), ()) for s in sql.split(";") if s.strip()])
