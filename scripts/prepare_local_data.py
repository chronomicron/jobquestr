#!/usr/bin/env python3
"""Build JobQuestR's ignored local JSON file from a Markdown application log.

The source Markdown remains unchanged. Only applications with a real submitted
date are imported; companies are grouped so they produce one map pin each.
"""

from __future__ import annotations

import argparse
import json
import re
import unicodedata
from datetime import datetime
from pathlib import Path


DEFAULT_SOURCE = Path("data/source_snapshot/jobhunt_2026/applications.md")
DEFAULT_OUTPUT = Path("data/private/jobquestr.json")
DEFAULT_OVERRIDES = Path("data/private/location-overrides.json")

AREA_COORDINATES = {
    "longueuil": [-73.5107, 45.5312],
    "saint-laurent": [-73.6837, 45.4992],
    "st-laurent": [-73.6837, 45.4992],
    "dorval": [-73.75, 45.45],
    "laval": [-73.7452, 45.6066],
    "mount royal": [-73.6435, 45.516],
    "mont-royal": [-73.6435, 45.516],
    "montreal": [-73.5673, 45.5017],
    "montréal": [-73.5673, 45.5017],
}


def slug(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_value = normalized.encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", ascii_value.lower()).strip("-")


def parse_date(value: str) -> str | None:
    value = value.strip()
    iso = re.search(r"\b(20\d{2}-\d{2}-\d{2})\b", value)
    if iso:
        return iso.group(1)
    date_match = re.search(
        r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(20\d{2})\b",
        value,
        re.IGNORECASE,
    )
    if date_match:
        parsed = datetime.strptime(
            f"{date_match.group(1)} {date_match.group(2)} {date_match.group(3)}",
            "%B %d %Y",
        )
        return parsed.date().isoformat()
    return None


def fields_from_markdown(path: Path) -> list[dict[str, str]]:
    records: list[dict[str, str]] = []
    section = ""
    current: dict[str, str] | None = None

    def save_current() -> None:
        if current:
            current["section"] = section
            records.append(current.copy())

    for line in path.read_text(encoding="utf-8").splitlines():
        section_match = re.match(r"^##\s+(.+?)\s*$", line)
        if section_match:
            save_current()
            current = None
            section = section_match.group(1)
            continue

        heading_match = re.match(r"^###\s+(.+?)\s*$", line)
        if heading_match:
            save_current()
            heading = heading_match.group(1)
            if " — " in heading:
                company, role = heading.split(" — ", 1)
            else:
                company, role = heading, heading
            current = {"heading": heading, "company": company.strip(), "role": role.strip()}
            continue

        if current:
            field_match = re.match(r"^-\s+\*\*(.+?):\*\*\s*(.*)$", line)
            if field_match:
                current[field_match.group(1).strip().casefold()] = field_match.group(2).strip()

    save_current()
    return records


def is_applied(record: dict[str, str]) -> bool:
    date_text = record.get("submitted", "") or record.get("applied", "")
    if not parse_date(date_text):
        return False
    return not re.search(r"\b(TBD|not yet applied|to prepare)\b", date_text, re.IGNORECASE)


def normalize_status(value: str) -> str:
    if re.search(r"not moving forward|not selected|rejected|declined", value, re.IGNORECASE):
        return "Not selected"
    if re.search(r"interview|offer", value, re.IGNORECASE):
        return "Interview"
    if re.search(r"review|in their system for review|awaiting review", value, re.IGNORECASE):
        return "In review"
    return "Applied"


def posting_url(value: str) -> str:
    link = re.search(r"\[[^\]]*\]\((https?://[^)]+)\)", value)
    return link.group(1).strip() if link else ""


def location_text(record: dict[str, str]) -> str:
    return record.get("location / work mode", "") or record.get("location", "")


def location_score(value: str) -> int:
    score = len(value)
    if re.search(r"\b[A-Z]\d[A-Z]\s?\d[A-Z]\d\b", value, re.IGNORECASE):
        score += 500
    if re.search(r"\b\d{1,5}\s+[\wÀ-ÿ'’.-]+", value):
        score += 300
    if re.search(r"\b(street|rue|boulevard|boul\.?|avenue|av\.?|chemin|route)\b", value, re.IGNORECASE):
        score += 200
    return score


def area_coordinates(value: str) -> list[float] | None:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii").casefold()
    for area in ("longueuil", "saint-laurent", "st-laurent", "dorval", "laval", "mount royal", "mont-royal", "montreal"):
        if area in normalized:
            return AREA_COORDINATES[area]
    return None


def load_overrides(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def build_data(source: Path, overrides_path: Path) -> dict:
    source_records = [record for record in fields_from_markdown(source) if is_applied(record)]
    companies: dict[str, dict] = {}
    overrides = load_overrides(overrides_path)

    for record in source_records:
        name = record["company"].strip()
        company_id = slug(name)
        company = companies.setdefault(
            company_id,
            {
                "id": company_id,
                "name": name,
                "sector": "",
                "website": "",
                "glassdoorUrl": "",
                "address": "",
                "locationPrecision": "area",
                "coordinates": None,
                "applications": [],
            },
        )

        raw_status = record.get("status", "")
        submitted_text = record.get("submitted", "") or record.get("applied", "")
        applied_at = parse_date(submitted_text)
        raw_location = location_text(record)
        posting = record.get("posting", "")
        position = record.get("position id", "") or record.get("requisition", "")
        app_id = f"{company_id}-{slug(record['role'])}"

        application = {
            "id": app_id,
            "role": record["role"],
            "status": normalize_status(raw_status),
            "sourceStatus": raw_status,
            "appliedAt": applied_at,
            "location": raw_location,
            "workMode": next(
                (mode for mode in ("Hybrid", "On-site", "Remote") if re.search(mode, raw_location, re.IGNORECASE)),
                "",
            ),
            "postingUrl": posting_url(posting),
            "postingLabel": re.sub(r"\[[^\]]*\]\([^)]*\)", "", posting).strip(),
            "jobDescription": record.get("job description", "") or record.get("description", ""),
            "positionId": position,
            "nextAction": "",
            "notes": "",
            "events": [
                {
                    "date": applied_at,
                    "type": "Applied",
                    "title": "Application submitted",
                    "detail": f"{record['role']} · {name}",
                }
            ],
        }
        company["applications"].append(application)

        if raw_location and location_score(raw_location) > location_score(company["address"]):
            company["address"] = raw_location
            company["coordinates"] = area_coordinates(raw_location)

    for company_id, company in companies.items():
        override = overrides.get(company_id, {})
        if override.get("address"):
            company["address"] = override["address"]
        if override.get("coordinates"):
            company["coordinates"] = override["coordinates"]
        if override.get("locationPrecision"):
            company["locationPrecision"] = override["locationPrecision"]
        if override.get("locationNote"):
            company["locationNote"] = override["locationNote"]
        for field in ("website", "photoUrl", "photoAttribution", "logoUrl", "glassdoorUrl", "streetViewUrl", "summary"):
            if override.get(field):
                company[field] = override[field]
        company["applications"].sort(key=lambda app: app["appliedAt"] or "")

    return {
        "label": "Personal applications · local file",
        "companies": sorted(companies.values(), key=lambda company: company["name"].casefold()),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="Markdown application log")
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT, help="Ignored local JSON output")
    parser.add_argument("--overrides", type=Path, default=DEFAULT_OVERRIDES, help="Optional private location overrides")
    args = parser.parse_args()

    data = build_data(args.source, args.overrides)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    role_count = sum(len(company["applications"]) for company in data["companies"])
    pin_count = sum(company["coordinates"] is not None for company in data["companies"])
    print(f"Prepared {role_count} applications across {len(data['companies'])} companies; {pin_count} have area coordinates.")
    print(f"Saved local data to {args.output}")


if __name__ == "__main__":
    main()
