#!/usr/bin/env python3
"""Offline verifier for the Declassified Government Records Research module."""

from __future__ import annotations

import json
import py_compile
import re
import sys
from pathlib import Path
from typing import Any

MODULE = Path(__file__).resolve().parent

REQUIRED_FILES = {
    "README.md",
    "department-charter.md",
    "source-map.md",
    "source-index.json",
    "collections-roadmap.md",
    "collections.json",
    "catalog-contract.md",
    "document-record.schema.json",
    "example-document-record.json",
    "research-playbook.md",
    "rights-safety-and-ethics.md",
    "HANDOFF.md",
    "verify_module.py",
}

SOURCE_ID_RE = re.compile(r"DGR-SRC-[A-Z0-9][A-Z0-9-]+")
COLLECTION_ID_RE = re.compile(r"DGR-COLL-\d{3}")
DOCUMENT_ID_RE = re.compile(r"DGR-DOC-[A-Z0-9][A-Z0-9-]{5,}")
MARKDOWN_LINK_RE = re.compile(r"\[[^\]]+\]\(([^)]+)\)")

ALLOWED_AUTHORITIES = {
    "primary_official",
    "official_context",
    "secondary_discovery",
    "secondary_preservation",
}
ALLOWED_COLLECTION_STATUSES = {"research_first", "seed_ready", "future_phase", "watch"}
ALLOWED_PRIORITIES = {"P0", "P1", "P2", "P3"}
ALLOWED_RISK_TIERS = {
    "standard",
    "enhanced_privacy",
    "hazardous_technical",
    "restricted_metadata_only", "ongoing_or_contested",
}
ALLOWED_PAYLOAD_POLICIES = {
    "metadata_and_link_only",
    "official_public_copy_after_review",
    "description_only_until_review",
}
PROHIBITED_EXTENSIONS = {
    ".pdf", ".zip", ".7z", ".rar", ".tar", ".gz", ".sqlite", ".db",
    ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
}
SECRET_PATTERNS = {
    "private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    "GitHub token": re.compile(r"\bgh[pousr]_[A-Za-z0-9]{20,}\b"),
    "AWS access key": re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
}


class VerificationError(RuntimeError):
    pass


def require(condition: bool, message: str) -> None:
    if not condition:
        raise VerificationError(message)


def text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def data(name: str) -> Any:
    return json.loads(text(MODULE / name))


def nonempty(value: Any) -> bool:
    return isinstance(value, str) and bool(value.strip())


def check_files() -> int:
    actual = {p.name for p in MODULE.iterdir() if p.is_file()}
    missing = sorted(REQUIRED_FILES - actual)
    require(not missing, f"missing required files: {missing}")
    for path in MODULE.rglob("*"):
        if not path.is_file() or "__pycache__" in path.parts:
            continue
        require(path.suffix.lower() not in PROHIBITED_EXTENSIONS,
                f"payload/archive file is not allowed: {path.relative_to(MODULE)}")
        if path.suffix.lower() in {".md", ".json", ".py"}:
            text(path)
    return len(actual)


def check_sources() -> tuple[set[str], int]:
    index = data("source-index.json")
    require(isinstance(index, dict), "source-index.json must be an object")
    require(index.get("record_type") == "declassified_government_source_index",
            "wrong source-index record_type")
    require(index.get("schema_version") == "0.1.0", "wrong source-index version")
    for field in ("observed_at", "scope_note", "publication_boundary"):
        require(nonempty(index.get(field)), f"source index needs {field}")
    sources = index.get("sources")
    require(isinstance(sources, list) and len(sources) >= 30,
            "source index needs at least 30 systems")

    required = (
        "id", "name", "owner", "jurisdiction", "source_class", "authority",
        "custody_role", "locator", "locator_status", "update_model",
        "limitations", "rights_note", "safety_note", "observed_at",
    )
    ids: set[str] = set()
    official = 0
    secondary = 0
    for i, source in enumerate(sources):
        require(isinstance(source, dict), f"sources[{i}] must be an object")
        for field in required:
            require(nonempty(source.get(field)), f"sources[{i}].{field} is empty")
        source_id = source["id"]
        require(SOURCE_ID_RE.fullmatch(source_id) is not None,
                f"invalid source id: {source_id}")
        require(source_id not in ids, f"duplicate source id: {source_id}")
        ids.add(source_id)
        require(source["authority"] in ALLOWED_AUTHORITIES,
                f"invalid authority: {source_id}")
        require(source["locator"].startswith("https://"),
                f"non-HTTPS locator: {source_id}")
        require(source["locator_status"] == "verified",
                f"source is not explicitly verified: {source_id}")
        require(isinstance(source.get("official"), bool),
                f"official must be boolean: {source_id}")
        for field in ("access_modes", "release_mechanisms", "use_for"):
            values = source.get(field)
            require(isinstance(values, list) and values
                    and all(nonempty(v) for v in values),
                    f"{source_id}.{field} must be a non-empty string array")
        machine = source.get("machine_access")
        require(isinstance(machine, dict)
                and nonempty(machine.get("status"))
                and nonempty(machine.get("notes")),
                f"{source_id}.machine_access is incomplete")
        if source["official"]:
            official += 1
            require(source["authority"] in {"primary_official", "official_context"},
                    f"official source has secondary authority: {source_id}")
        else:
            secondary += 1
            require(source["authority"] in {
                "secondary_discovery", "secondary_preservation"},
                f"secondary source is mislabeled: {source_id}")

    require(official >= 25, "need at least 25 official systems")
    require(secondary >= 3, "need at least three secondary aids")
    source_map = text(MODULE / "source-map.md")
    require(ids <= set(SOURCE_ID_RE.findall(source_map)),
            "source-map.md omits source IDs")
    return ids, official


def check_collections(source_ids: set[str]) -> set[str]:
    ledger = data("collections.json")
    require(isinstance(ledger, dict), "collections.json must be an object")
    require(ledger.get("record_type") ==
            "declassified_government_collection_roadmap",
            "wrong collections record_type")
    require(nonempty(ledger.get("scope_note")), "collections need scope_note")
    collections = ledger.get("collections")
    require(isinstance(collections, list) and len(collections) >= 24,
            "need at least 24 collection programmes")

    ids: set[str] = set()
    scalar_fields = (
        "id", "title", "theme", "status", "priority", "scope",
        "payload_policy", "risk_tier", "promotion_gate",
    )
    array_fields = (
        "research_questions", "source_ids", "required_artifact_types",
    )
    for i, collection in enumerate(collections):
        require(isinstance(collection, dict), f"collections[{i}] must be object")
        for field in scalar_fields:
            require(nonempty(collection.get(field)),
                    f"collections[{i}].{field} is empty")
        cid = collection["id"]
        require(COLLECTION_ID_RE.fullmatch(cid) is not None,
                f"invalid collection id: {cid}")
        require(cid not in ids, f"duplicate collection id: {cid}")
        ids.add(cid)
        require(collection["status"] in ALLOWED_COLLECTION_STATUSES,
                f"invalid collection status: {cid}")
        require(collection["priority"] in ALLOWED_PRIORITIES,
                f"invalid priority: {cid}")
        require(collection["risk_tier"] in ALLOWED_RISK_TIERS,
                f"invalid risk tier: {cid}")
        require(collection["payload_policy"] in ALLOWED_PAYLOAD_POLICIES,
                f"invalid payload policy: {cid}")
        for field in array_fields:
            values = collection.get(field)
            require(isinstance(values, list), f"{cid}.{field} must be an array")
            require(values, f"{cid}.{field} must not be empty")
            require(all(nonempty(v) for v in values),
                    f"{cid}.{field} entries must be strings")
        unknown = sorted(set(collection["source_ids"]) - source_ids)
        require(not unknown, f"{cid} cites unknown sources: {unknown}")

    roadmap = text(MODULE / "collections-roadmap.md")
    require(ids <= set(COLLECTION_ID_RE.findall(roadmap)),
            "collections-roadmap.md omits collection IDs")
    return ids


def check_schema_example(source_ids: set[str], collection_ids: set[str]) -> int:
    schema = data("document-record.schema.json")
    require(isinstance(schema, dict), "schema must be an object")
    require(schema.get("$schema") ==
            "https://json-schema.org/draft/2020-12/schema",
            "schema must use JSON Schema 2020-12")
    require(schema.get("type") == "object"
            and schema.get("additionalProperties") is False,
            "schema root must be a closed object")
    required = schema.get("required")
    props = schema.get("properties")
    require(isinstance(required, list) and len(required) >= 15,
            "schema needs at least 15 required fields")
    require(isinstance(props, dict) and set(required) <= set(props),
            "schema properties do not cover required fields")

    example = data("example-document-record.json")
    require(isinstance(example, dict), "example must be an object")
    require(set(required) <= set(example), "example misses required fields")
    require(example.get("record_type") == "declassified_government_document",
            "example record_type is wrong")
    require(DOCUMENT_ID_RE.fullmatch(example.get("id", "")) is not None,
            "example document ID is invalid")
    custody = example.get("custody")
    require(isinstance(custody, dict)
            and custody.get("authoritative_source_id") in source_ids,
            "example custody cites unknown source")
    objects = example.get("digital_objects")
    require(isinstance(objects, list) and objects,
            "example needs a digital object")
    for obj in objects:
        require(isinstance(obj, dict)
                and nonempty(obj.get("url"))
                and obj["url"].startswith("https://"),
                "example object needs HTTPS")
        require(obj.get("role") != "preserved_payload",
                "example must remain metadata-only")
    for rel in example.get("relationships", []):
        target = rel.get("target") if isinstance(rel, dict) else None
        if isinstance(target, str) and target.startswith("DGR-COLL-"):
            require(target in collection_ids,
                    f"example cites unknown collection: {target}")
    encoded = json.dumps(example)
    require("not_downloaded" in encoded
            or "does not contain" in encoded
            or "does not include" in encoded,
            "example must state payload is not committed")
    return len(required)


def check_links() -> int:
    checked = 0
    for path in MODULE.glob("*.md"):
        for raw in MARKDOWN_LINK_RE.findall(text(path)):
            link = raw.strip().split()[0].strip("<>")
            if not link or link.startswith(("http://", "https://", "mailto:", "#")):
                continue
            relative = link.split("#", 1)[0]
            if not relative:
                continue
            target = (path.parent / relative).resolve()
            require(MODULE.resolve() == target or MODULE.resolve() in target.parents,
                    f"link escapes module: {path.name}: {link}")
            require(target.exists(), f"broken link: {path.name}: {link}")
            checked += 1
    return checked


def check_safety() -> int:
    scanned = 0
    for path in MODULE.rglob("*"):
        if not path.is_file() or "__pycache__" in path.parts:
            continue
        if path.suffix.lower() not in {".md", ".json", ".py"}:
            continue
        content = text(path)
        scanned += 1
        for label, pattern in SECRET_PATTERNS.items():
            require(pattern.search(content) is None,
                    f"possible {label} in {path.relative_to(MODULE)}")
    py_compile.compile(str(MODULE / "verify_module.py"), doraise=True)
    return scanned


def main() -> int:
    module_files = check_files()
    source_ids, official = check_sources()
    collection_ids = check_collections(source_ids)
    required_fields = check_schema_example(source_ids, collection_ids)
    links = check_links()
    scanned = check_safety()
    print("PASS: declassified-government-records module verifies")
    print(f"module_files={module_files}")
    print(f"sources={len(source_ids)}")
    print(f"official_sources={official}")
    print(f"collections={len(collection_ids)}")
    print(f"schema_required_fields={required_fields}")
    print("example_digital_objects=1")
    print(f"relative_links_checked={links}")
    print(f"publication_safe_files_scanned={scanned}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (VerificationError, json.JSONDecodeError, OSError,
            UnicodeDecodeError, py_compile.PyCompileError) as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
