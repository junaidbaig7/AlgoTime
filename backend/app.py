"""
app.py  —  AlgoTime Analyzer Flask backend
Endpoints:
  GET  /               → health check
  POST /compare        → sorting comparison
  POST /search_compare → search comparison (accepts custom heuristics + weights)
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

from sorting import bubble_sort, merge_sort, insertion_sort
from searching import (
    bfs, gbfs, astar, determine_winner,
    GRAPH, HEURISTICS, WEIGHTS, START, GOAL,
)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})


# ── Health ─────────────────────────────────────────────────────────────────────

@app.route("/", methods=["GET"])
def index():
    return jsonify({"status": "AlgoTime Analyzer API is running."})


# ── Sorting ────────────────────────────────────────────────────────────────────

@app.route("/compare", methods=["POST"])
def compare():
    body = request.get_json(silent=True)
    if not body or "numbers" not in body:
        return jsonify({"error": 'JSON body must contain a "numbers" key.'}), 400

    raw = body["numbers"]
    if not isinstance(raw, list) or len(raw) < 2:
        return jsonify({"error": '"numbers" must be a list with at least 2 elements.'}), 400

    try:
        numbers = [float(n) for n in raw]
    except (TypeError, ValueError):
        return jsonify({"error": 'All elements in "numbers" must be numeric.'}), 400

    if len(numbers) > 100_000:
        return jsonify({"error": "Dataset too large. Maximum is 100 000 elements."}), 400

    _, bt = bubble_sort(numbers)
    _, mt = merge_sort(numbers)
    _, it = insertion_sort(numbers)

    winner = min({"Bubble Sort": bt, "Merge Sort": mt, "Insertion Sort": it}, key=lambda k: {"Bubble Sort": bt, "Merge Sort": mt, "Insertion Sort": it}[k])

    return jsonify({
        "bubble_time"   : round(bt, 6),
        "merge_time"    : round(mt, 6),
        "insertion_time": round(it, 6),
        "winner"        : winner,
        "complexities"  : {
            "Bubble Sort"   : "O(n²)",
            "Merge Sort"    : "O(n log n)",
            "Insertion Sort": "O(n²)",
        },
    })


# ── Search ─────────────────────────────────────────────────────────────────────

@app.route("/search_compare", methods=["POST"])
def search_compare():
    """
    Accepts optional body:
      {
        "heuristics": {"A": 7, "B": 6, ..., "G": 0},
        "weights":    {"A-B": 2, "A-C": 1, ...}
      }
    Falls back to defaults when keys are missing or body is absent.
    """
    body = request.get_json(silent=True) or {}

    # ── Parse heuristics ───────────────────────────────────────────────────────
    raw_h = body.get("heuristics")
    if raw_h and isinstance(raw_h, dict):
        required = set(GRAPH.keys())
        if required.issubset(set(raw_h.keys())):
            try:
                heuristics = {k: float(v) for k, v in raw_h.items()}
            except (TypeError, ValueError):
                heuristics = HEURISTICS
        else:
            heuristics = HEURISTICS
    else:
        heuristics = HEURISTICS

    # ── Parse edge weights ─────────────────────────────────────────────────────
    raw_w = body.get("weights")
    if raw_w and isinstance(raw_w, dict):
        try:
            weights = {}
            for key, val in raw_w.items():
                src, dst = key.split("-", 1)
                weights[(src, dst)] = float(val)
            if not weights:
                weights = WEIGHTS
        except (ValueError, AttributeError):
            weights = WEIGHTS
    else:
        weights = WEIGHTS

    # ── Run algorithms ─────────────────────────────────────────────────────────
    bfs_r   = bfs(GRAPH,   START, GOAL, weights)
    gbfs_r  = gbfs(GRAPH,  START, GOAL, heuristics, weights)
    astar_r = astar(GRAPH, START, GOAL, heuristics, weights)

    winner_key, winner_reason = determine_winner({
        'BFS': bfs_r, 'GBFS': gbfs_r, 'A*': astar_r
    })

    # Serialise weights for JSON (tuple keys → "A-B")
    weights_json = {f"{s}-{d}": w for (s, d), w in weights.items()}

    return jsonify({
        "bfs"  : {k: bfs_r[k]   for k in ('path','visited','nodes_visited','path_length','path_cost','time')},
        "gbfs" : {k: gbfs_r[k]  for k in ('path','visited','nodes_visited','path_length','path_cost','time')},
        "astar": {k: astar_r[k] for k in ('path','visited','nodes_visited','path_length','path_cost','time')},
        "winner"       : winner_key,
        "winner_reason": winner_reason,
        "heuristics"   : heuristics,
        "weights"      : weights_json,
        "start"        : START,
        "goal"         : GOAL,
    })


# ── Entry ──────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
