"""Change detection between two reviews. Pure functions; no I/O."""


def compute_changes(prev_rows, new_rows, history=(), aliases=None, excluded=()):
    """prev_rows/new_rows: all rated rows of a review (parse_notice format).
    history: iterable of ticker sets that were five-star at earlier reviews (before prev).
    Returns list of dicts: kind in dropped|new|returned|stayed, with old/new status."""
    from parse_notice import five_star

    aliases = aliases or {}
    norm = lambda t: aliases.get(t, t)
    a = {norm(r["ticker"]): r for r in five_star(prev_rows, excluded)}
    b = {norm(r["ticker"]): r for r in five_star(new_rows, excluded)}
    new_all = {norm(r["ticker"]): r for r in new_rows}
    ever = set(norm(t) for s in history for t in s)
    out = []
    for t, r in sorted(a.items()):
        if t in b:
            out.append({"ticker": t, "kind": "stayed", "old_status": "5", "new_status": "5"})
            continue
        n = new_all.get(t)
        if n is None:
            new_status, detail = "Not in notice", None
        else:
            new_status = n["star_rating"]
            detail = {"shariah_status": n["shariah_status"], "debt": n["debt_ratio"],
                      "investment": n["investment_ratio"], "income": n["income_ratio"]}
        out.append({"ticker": t, "kind": "dropped", "old_status": "5",
                    "new_status": new_status, "detail": detail})
    for t in sorted(set(b) - set(a)):
        out.append({"ticker": t, "kind": "returned" if t in ever else "new",
                    "old_status": None, "new_status": "5"})
    return out


def baseline(rows, excluded=()):
    from parse_notice import five_star
    return [{"ticker": r["ticker"], "kind": "baseline", "old_status": None, "new_status": "5"}
            for r in five_star(rows, excluded)]
