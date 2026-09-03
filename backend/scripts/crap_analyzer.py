#!/usr/bin/env python3
"""
CRAP (Change Risk Anti-Patterns) Analyzer for Python.

Formula:
    CRAP(m) = CC(m)^2 * (1 - cov(m))^3 + CC(m)

Where:
    CC(m)  = Cyclomatic Complexity of function m
    cov(m) = Code coverage of function m (0.0 to 1.0)

Goal: Keep CRAP(m) < 6.0 for all functions.
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

import radon.complexity as radon_cc


def run_coverage(target_files: list[str]) -> dict[str, Any]:
    """Run pytest with coverage and export JSON report."""
    cov_file = Path(".coverage_report.json")
    if cov_file.exists():
        cov_file.unlink()

    cmd = [
        "coverage",
        "run",
        "-m",
        "pytest",
        "-q",
    ]
    subprocess.run(cmd, check=True, capture_output=True)

    json_cmd = ["coverage", "json", "-o", str(cov_file)]
    subprocess.run(json_cmd, check=True, capture_output=True)

    data = json.loads(cov_file.read_text(encoding="utf-8"))
    if cov_file.exists():
        cov_file.unlink()
    return data


def get_function_coverage(
    covered_lines: set, missing_lines: set, start_line: int, end_line: int
) -> float:
    """Calculate coverage percentage for lines within start_line and end_line."""
    func_lines = set(range(start_line, end_line + 1))
    func_covered = len(func_lines.intersection(covered_lines))
    func_missing = len(func_lines.intersection(missing_lines))
    total = func_covered + func_missing

    if total == 0:
        return 1.0  # Empty or definition-only functions
    return func_covered / total


def calculate_crap(cc: int, cov: float) -> float:
    """Calculate CRAP score."""
    cov = max(0.0, min(1.0, cov))
    crap = (cc**2) * ((1.0 - cov) ** 3) + cc
    return round(crap, 2)


def extract_callable_blocks(blocks) -> list[Any]:
    """Recursively extract all functions and methods from radon complexity blocks."""
    callables = []
    for block in blocks:
        if hasattr(block, "complexity") and hasattr(block, "lineno") and hasattr(block, "endline"):
            # Radon Function/Method visitor object
            if hasattr(block, "classname") and block.classname:
                callables.append(block)
            elif not hasattr(block, "methods"):
                callables.append(block)
        if hasattr(block, "methods"):
            callables.extend(extract_callable_blocks(block.methods))
        if hasattr(block, "closures"):
            callables.extend(extract_callable_blocks(block.closures))
    return callables


def analyze_file(file_path: Path, cov_data: dict[str, Any]) -> list[dict[str, Any]]:
    """Analyze a single Python file for CC, Coverage, and CRAP."""
    code = file_path.read_text(encoding="utf-8")
    blocks = radon_cc.cc_visit(code)
    callables = extract_callable_blocks(blocks)

    # Match in coverage data
    file_cov = None
    for path_str, details in cov_data.get("files", {}).items():
        if Path(path_str).resolve() == file_path.resolve() or file_path.name in path_str:
            file_cov = details
            break

    covered_lines = set(file_cov.get("executed_lines", [])) if file_cov else set()
    missing_lines = set(file_cov.get("missing_lines", [])) if file_cov else set()

    results = []
    for block in callables:
        cc = block.complexity
        cov = get_function_coverage(covered_lines, missing_lines, block.lineno, block.endline)
        crap = calculate_crap(cc, cov)
        results.append(
            {
                "file": file_path.name,
                "function": block.fullname if hasattr(block, "fullname") else block.name,
                "lineno": block.lineno,
                "cc": cc,
                "coverage_pct": round(cov * 100, 1),
                "crap": crap,
            }
        )
    return results


def main():
    target_files = (
        sys.argv[1:]
        if len(sys.argv) > 1
        else [
            "auth.py",
            "database.py",
            "models.py",
            "routers/file_courses.py",
        ]
    )

    print(f"Running CRAP Analysis on: {', '.join(target_files)}")
    print("Threshold: CRAP < 6.0\n")

    cov_data = run_coverage(target_files)

    all_results = []
    for target in target_files:
        path = Path(target)
        if path.is_file():
            all_results.extend(analyze_file(path, cov_data))
        elif path.is_dir():
            for p in path.glob("**/*.py"):
                all_results.extend(analyze_file(p, cov_data))

    header = f"{'File':<25} {'Function':<30} {'Line':<6} {'CC':<5} {'Coverage':<10} {'CRAP':<6} {'Status'}"
    print(header)
    print("-" * len(header))

    failed = []
    for res in sorted(all_results, key=lambda x: x["crap"], reverse=True):
        status = "✅ PASS" if res["crap"] < 6.0 else "❌ CRAP >= 6"
        if res["crap"] >= 6.0:
            failed.append(res)
        print(
            f"{res['file']:<25} {res['function']:<30} {res['lineno']:<6} {res['cc']:<5} {res['coverage_pct']:<10.1f}% {res['crap']:<6.2f} {status}"
        )

    print("\n" + "=" * 70)
    print(f"Total functions analyzed: {len(all_results)}")
    print(f"Passed (CRAP < 6.0):      {len(all_results) - len(failed)}")
    print(f"Failed (CRAP >= 6.0):     {len(failed)}")

    if failed:
        print("\n❌ CRAP threshold exceeded for the following functions:")
        for f in failed:
            print(
                f"  - {f['file']}:{f['lineno']} in `{f['function']}` -> CRAP = {f['crap']} (CC={f['cc']}, Cov={f['coverage_pct']}%)"
            )
        sys.exit(1)
    else:
        print("\n🎉 ALL functions have CRAP score below 6.0!")
        sys.exit(0)


if __name__ == "__main__":
    main()
