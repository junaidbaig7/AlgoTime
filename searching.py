"""
searching.py
──────────────────────────────────────────────────────────────
Custom implementations of BFS, Greedy Best-First Search (GBFS),
and A* Search on a predefined weighted directed graph.

Graph:  A → B, C  |  B → D, E  |  C → F  |  D, E, F → G
Start:  A          |  Goal: G

Each function returns:
  path, visited (expansion order), nodes_visited,
  path_length, path_cost, time (seconds via perf_counter)
"""

import time
import heapq
from collections import deque


# ── Predefined Graph Data ──────────────────────────────────────────────────────

GRAPH = {
    'A': ['B', 'C'],
    'B': ['D', 'E'],
    'C': ['F'],
    'D': ['G'],
    'E': ['G'],
    'F': ['G'],
    'G': [],
}

# h(n): admissible heuristic — estimated remaining cost to goal G
HEURISTICS = {
    'A': 7, 'B': 6, 'C': 4,
    'D': 4, 'E': 2, 'F': 1, 'G': 0,
}

# Directed edge weights for g-cost calculation in A*
WEIGHTS = {
    ('A', 'B'): 2, ('A', 'C'): 1,
    ('B', 'D'): 3, ('B', 'E'): 1,
    ('C', 'F'): 2,
    ('D', 'G'): 2, ('E', 'G'): 3,
    ('F', 'G'): 1,
}

START = 'A'
GOAL  = 'G'


# ── Helper ────────────────────────────────────────────────────────────────────

def _path_cost(path: list, weights: dict = None) -> float:
    w = weights or WEIGHTS
    return sum(w.get((path[i], path[i + 1]), 1) for i in range(len(path) - 1))


# ── BFS ───────────────────────────────────────────────────────────────────────

def bfs(graph: dict, start: str, goal: str, weights: dict = None) -> dict:
    """
    Breadth-First Search.
    Explores nodes level-by-level via FIFO queue.
    Guarantees the path with the fewest edges (not necessarily lowest cost).
    Time: O(V+E)  |  Space: O(V)
    """
    w = weights or WEIGHTS
    start_time = time.perf_counter()

    frontier      = deque([[start]])
    visited_order = []
    seen          = {start}

    while frontier:
        path = frontier.popleft()
        node = path[-1]
        visited_order.append(node)

        if node == goal:
            elapsed = time.perf_counter() - start_time
            return {
                'path'         : path,
                'visited'      : visited_order,
                'nodes_visited': len(visited_order),
                'path_length'  : len(path),
                'path_cost'    : round(_path_cost(path, w), 4),
                'time'         : round(elapsed, 6),
            }

        for neighbor in graph.get(node, []):
            if neighbor not in seen:
                seen.add(neighbor)
                frontier.append(path + [neighbor])

    elapsed = time.perf_counter() - start_time
    return {
        'path': [], 'visited': visited_order,
        'nodes_visited': len(visited_order),
        'path_length': 0, 'path_cost': -1, 'time': round(elapsed, 6),
    }


# ── GBFS ──────────────────────────────────────────────────────────────────────

def gbfs(graph: dict, start: str, goal: str,
         heuristics: dict = None, weights: dict = None) -> dict:
    """
    Greedy Best-First Search.
    Expands the node with the lowest h(n) at each step.
    Fast but not guaranteed to find the optimal-cost path.
    Time: O(V+E)  |  Space: O(V)
    """
    h = heuristics or HEURISTICS
    w = weights    or WEIGHTS
    start_time = time.perf_counter()

    counter  = 0
    frontier = [(h.get(start, 0), counter, start, [start])]
    visited_order = []
    seen     = set()

    while frontier:
        _, _, node, path = heapq.heappop(frontier)

        if node in seen:
            continue
        seen.add(node)
        visited_order.append(node)

        if node == goal:
            elapsed = time.perf_counter() - start_time
            return {
                'path'         : path,
                'visited'      : visited_order,
                'nodes_visited': len(visited_order),
                'path_length'  : len(path),
                'path_cost'    : round(_path_cost(path, w), 4),
                'time'         : round(elapsed, 6),
            }

        for neighbor in graph.get(node, []):
            if neighbor not in seen:
                counter += 1
                heapq.heappush(frontier, (
                    h.get(neighbor, 0), counter, neighbor, path + [neighbor]
                ))

    elapsed = time.perf_counter() - start_time
    return {
        'path': [], 'visited': visited_order,
        'nodes_visited': len(visited_order),
        'path_length': 0, 'path_cost': -1, 'time': round(elapsed, 6),
    }


# ── A* ────────────────────────────────────────────────────────────────────────

def astar(graph: dict, start: str, goal: str, heuristics: dict, weights: dict) -> dict:
    """
    A* Search.
    Expands nodes by f(n) = g(n) + h(n).
    Guaranteed to find the optimal-cost path when h(n) is admissible.
    Time: O(E log V)  |  Space: O(V)
    """
    start_time = time.perf_counter()

    counter       = 0
    frontier      = [(heuristics.get(start, 0), counter, 0, start, [start])]
    visited_order = []
    best_g        = {}   # best known actual cost reaching each node

    while frontier:
        f, _, g, node, path = heapq.heappop(frontier)

        if node in best_g and best_g[node] <= g:
            continue
        best_g[node] = g
        visited_order.append(node)

        if node == goal:
            elapsed = time.perf_counter() - start_time
            return {
                'path'         : path,
                'visited'      : visited_order,
                'nodes_visited': len(visited_order),
                'path_length'  : len(path),
                'path_cost'    : round(g, 4),
                'time'         : round(elapsed, 6),
            }

        for neighbor in graph.get(node, []):
            edge_w = weights.get((node, neighbor), 1)
            new_g  = g + edge_w
            new_f  = new_g + heuristics.get(neighbor, 0)
            if neighbor not in best_g or best_g[neighbor] > new_g:
                counter += 1
                heapq.heappush(frontier, (
                    new_f, counter, new_g, neighbor, path + [neighbor]
                ))

    elapsed = time.perf_counter() - start_time
    return {
        'path': [], 'visited': visited_order,
        'nodes_visited': len(visited_order),
        'path_length': 0, 'path_cost': -1, 'time': round(elapsed, 6),
    }


# ── Winner Selection ───────────────────────────────────────────────────────────

def determine_winner(results: dict) -> tuple:
    """
    Rank algorithms by (in priority order):
      1. Fewest nodes visited  — search efficiency
      2. Lowest path cost      — solution quality
      3. Fastest execution time
      4. Tie-break: A* > GBFS > BFS  (A* guarantees optimality)

    Returns (winner_key, reason_string).
    """
    priority = ['A*', 'GBFS', 'BFS']

    def sort_key(item):
        key, data = item
        cost = data['path_cost'] if data['path_cost'] >= 0 else 9999
        return (
            data['nodes_visited'],
            cost,
            data['time'],
            priority.index(key) if key in priority else 99,
        )

    ranked = sorted(results.items(), key=sort_key)
    winner_key, winner_data = ranked[0]

    reasons = {
        'A*': (
            f"Optimal path found (cost {winner_data['path_cost']}) visiting only "
            f"{winner_data['nodes_visited']} node(s). A* combines actual path cost g(n) "
            "and heuristic h(n), guaranteeing the least-cost solution when h is admissible."
        ),
        'GBFS': (
            f"Heuristic-guided greedy search reached the goal visiting only "
            f"{winner_data['nodes_visited']} node(s) with path cost {winner_data['path_cost']}."
        ),
        'BFS': (
            f"Systematic breadth-first exploration guaranteed the shortest hop-count "
            f"path by visiting {winner_data['nodes_visited']} node(s)."
        ),
    }
    reason = reasons.get(winner_key, "Best overall performance.")
    return winner_key, reason
