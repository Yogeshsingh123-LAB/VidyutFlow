#!/usr/bin/env python3
"""Phase 12 Telemetry Simulator entry point wrapper."""
from pathlib import Path
import sys

script_path = Path(__file__).resolve().parent / "simulate_telemetry.py"
if __name__ == "__main__":
    import runpy
    runpy.run_path(str(script_path), run_name="__main__")

