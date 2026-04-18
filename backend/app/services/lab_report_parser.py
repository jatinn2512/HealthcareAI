"""Regex-based extraction of common vitals from free-text medical records.

Not used for ML prediction — structured capture only. Dataset
``ai_ml/datasets/ekacare/medical_records_parsing_validation_set`` can be used
offline to tune patterns; runtime parsing stays lightweight.
"""

from __future__ import annotations

import re
from dataclasses import dataclass


@dataclass
class LabReportParseResult:
    systolic_bp: int | None = None
    diastolic_bp: int | None = None
    heart_rate: int | None = None
    blood_glucose_mg_dl: float | None = None
    temperature_c: float | None = None
    diagnosis: str | None = None
    matched_snippets: list[str] | None = None

    def has_any_vital(self) -> bool:
        return any(
            [
                self.systolic_bp is not None and self.diastolic_bp is not None,
                self.heart_rate is not None,
                self.blood_glucose_mg_dl is not None,
                self.temperature_c is not None,
            ]
        )


def parse_lab_report_text(raw: str) -> LabReportParseResult:
    text = (raw or "").strip()
    if not text:
        return LabReportParseResult(matched_snippets=[])

    snippets: list[str] = []
    sys_bp: int | None = None
    dia_bp: int | None = None
    hr: int | None = None
    glucose: float | None = None
    temp_c: float | None = None
    diagnosis: str | None = None

    for m in re.finditer(r"\b(\d{2,3})\s*/\s*(\d{2,3})\b", text):
        s, d = int(m.group(1)), int(m.group(2))
        if 60 <= s <= 250 and 40 <= d <= 180:
            sys_bp, dia_bp = s, d
            snippets.append(m.group(0))
            break

    for pattern in (
        r"heart\s*rate\s*[:\-]?\s*(\d{2,3})\b",
        r"\bHR\s*[:\-]?\s*(\d{2,3})\b",
        r"pulse\s*[:\-]?\s*(\d{2,3})\b",
    ):
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            v = int(m.group(1))
            if 20 <= v <= 260:
                hr = v
                snippets.append(m.group(0))
                break

    for pattern in (
        r"(?:blood\s*glucose|glucose|sugar|RBS|FBS|PPBS)\s*[:\-]?\s*(\d{2,3}(?:\.\d)?)\s*(?:mg/dl|mg/dL)?",
        r"(\d{2,3}(?:\.\d)?)\s*mg/dl",
    ):
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            g = float(m.group(1))
            if 20 <= g <= 800:
                glucose = g
                snippets.append(m.group(0))
                break

    m = re.search(r"(?:temp|temperature)\s*[:\-]?\s*(\d{2}(?:\.\d)?)\s*°?\s*C", text, re.IGNORECASE)
    if not m:
        m = re.search(r"\b(\d{2}(?:\.\d)?)\s*°\s*C\b", text, re.IGNORECASE)
    if m:
        t = float(m.group(1))
        if 30.0 <= t <= 45.0:
            temp_c = t
            snippets.append(m.group(0))

    for pattern in (
        r"(?:diagnosis|impression)\s*[:\-]\s*(.+?)(?:\n\n|\n[A-Z]|\Z)",
        r"(?:ICD[-\s]?10)\s*[:\-]?\s*([A-Z0-9\.\,\s\-]{4,80})",
    ):
        m = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
        if m:
            diagnosis = " ".join(m.group(1).split())[:500]
            snippets.append(m.group(0)[:120])
            break

    return LabReportParseResult(
        systolic_bp=sys_bp,
        diastolic_bp=dia_bp,
        heart_rate=hr,
        blood_glucose_mg_dl=glucose,
        temperature_c=temp_c,
        diagnosis=diagnosis,
        matched_snippets=snippets or None,
    )
