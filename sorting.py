"""
sorting.py
──────────
Custom implementations of three classic sorting algorithms.
Each function returns (sorted_list, elapsed_seconds) measured with
time.perf_counter() for sub-millisecond precision.
Built-in sort() / sorted() are intentionally NOT used.
"""

import time


# ── Bubble Sort ────────────────────────────────────────────────────────────────
def bubble_sort(arr: list) -> tuple[list, float]:
    """
    Compare adjacent elements and swap them if out of order.
    Optimised with an early-exit flag: stops as soon as a full
    pass produces no swaps (already sorted input = O(n)).

    Time  : O(n) best · O(n²) average / worst
    Space : O(1) — sorts in-place on a copy
    """
    data = arr.copy()
    n = len(data)

    start = time.perf_counter()

    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if data[j] > data[j + 1]:
                data[j], data[j + 1] = data[j + 1], data[j]
                swapped = True
        if not swapped:          # already sorted — short-circuit
            break

    elapsed = time.perf_counter() - start
    return data, elapsed


# ── Merge Sort ─────────────────────────────────────────────────────────────────
def merge_sort(arr: list) -> tuple[list, float]:
    """
    Divide-and-conquer: split the list in half recursively until
    single elements remain, then merge sorted halves back together.

    Time  : O(n log n) best / average / worst
    Space : O(n) — requires auxiliary arrays during merging
    """
    start = time.perf_counter()
    sorted_data = _merge_sort_recursive(arr.copy())
    elapsed = time.perf_counter() - start
    return sorted_data, elapsed


def _merge_sort_recursive(arr: list) -> list:
    if len(arr) <= 1:
        return arr

    mid   = len(arr) // 2
    left  = _merge_sort_recursive(arr[:mid])
    right = _merge_sort_recursive(arr[mid:])
    return _merge(left, right)


def _merge(left: list, right: list) -> list:
    result = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            result.append(left[i]);  i += 1
        else:
            result.append(right[j]); j += 1
    result.extend(left[i:])
    result.extend(right[j:])
    return result


# ── Insertion Sort ─────────────────────────────────────────────────────────────
def insertion_sort(arr: list) -> tuple[list, float]:
    """
    Build a sorted sub-list one element at a time by inserting each
    new element into its correct position within the sorted portion.

    Time  : O(n) best · O(n²) average / worst
    Space : O(1) — sorts in-place on a copy
    """
    data = arr.copy()
    n = len(data)

    start = time.perf_counter()

    for i in range(1, n):
        key = data[i]
        j   = i - 1
        while j >= 0 and data[j] > key:
            data[j + 1] = data[j]
            j -= 1
        data[j + 1] = key

    elapsed = time.perf_counter() - start
    return data, elapsed
