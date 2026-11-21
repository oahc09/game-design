import hashlib
import json
import re
import shutil
import sys
import tarfile
from pathlib import Path, PurePosixPath

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs/proxy-evaluations/20261114-full-eight"


def digest(path):
    with path.open("rb") as file:
        return hashlib.file_digest(file, "sha256").hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def load(path):
    return json.loads(path.read_bytes())


def archive_path(name):
    parts = PurePosixPath(name).parts
    require(parts and all(re.fullmatch(r"[\w. -]+", part) and part not in {".", ".."}
                          and not part.endswith((".", " ")) for part in parts), f"Unsafe path: {name}")
    require("/".join(parts) == name, f"Noncanonical path: {name}")
    return Path(*parts)


def main(restore, backup):
    index = load(DOCS / "evidence-index.json")
    original = ROOT / index["archive"]
    manifest_name = Path(index["manifest"]).name
    require(original.stat().st_size == index["archive_bytes"], "Archive size mismatch")
    require(digest(original) == index["sha256"], "Archive digest mismatch")

    with tarfile.open(original, "r:gz") as archive:
        members = archive.getmembers()
        seen = set()
        for member in members:
            archive_path(member.name)
            key = member.name.casefold()
            require(key not in seen, f"Duplicate archive member: {member.name}")
            seen.add(key)
            require(member.isdir() or member.isreg(), f"Unsupported archive member: {member.name}")
        embedded = archive.extractfile(manifest_name).read()
        require(hashlib.sha256(embedded).hexdigest() == index["manifest_sha256"], "Manifest digest mismatch")
        manifest = json.loads(embedded)
        expected = {row["path"]: row for row in manifest["files"]}
        require(len(expected) == len(manifest["files"]) == index["source_files"], "Manifest count mismatch")
        require(set(expected) | {manifest_name} == {member.name for member in members if member.isreg()}, "Archive file list mismatch")
        require(all(member.size == expected[member.name]["bytes"] for member in members
                    if member.isreg() and member.name != manifest_name), "Archive member size mismatch")
        restore.mkdir(parents=True)
        archive.extractall(restore, members=members, filter="data")

    for name, row in expected.items():
        restored = restore / archive_path(name)
        require(restored.stat().st_size == row["bytes"] and digest(restored) == row["sha256"], f"Restored digest mismatch: {name}")

    candidates = load(DOCS / "candidate-index.json")
    seals = load(DOCS / "review-seals.json")["reports"]
    sources = references = 0
    counts = {"engine_executions": 0, "card_executions": 0}
    archive_root = restore / "full-task-20261114-01"
    for candidate in candidates:
        source = candidate["source_root"].removeprefix("output/")
        run = restore / archive_path(candidate["evidence_root"].removeprefix("output/"))
        if candidate["id"] == "gd-108":
            records_dir = run / "card-final" / candidate["arm"]
            count_key = "card_executions"
        else:
            records_dir = run / "engine-final" / candidate["arm"] / candidate["id"]
            count_key = "engine_executions"
        records = load(records_dir / "index.json")["records"]
        paths = {record["path"] for record in records}
        require(len(paths) == len(records), f"Duplicate capture: {records_dir}")
        for name in paths:
            relative = (records_dir / archive_path(name)).relative_to(restore).as_posix()
            require(relative in expected, f"Missing raw capture: {relative}")
        counts[count_key] += len(records)
        for entry in candidate["artifact"]["source_inventory"]:
            full = f"{source}/{entry['path']}"
            require(full in expected and expected[full]["sha256"] == entry["sha256"], f"Source binding mismatch: {full}")
            sources += 1
    for key, count in counts.items():
        require(count == index["selected_results"][key], f"Capture count mismatch: {key}")
    for seal in seals:
        report_path = archive_root / archive_path(seal["report"])
        report = load(report_path)
        committed = load(DOCS / "reviews" / (seal["blind_id"] + ".json"))
        require(report == committed and report["artifact_digest"] == seal["artifact_digest"], f"Report binding mismatch: {report_path}")
        for rubric in report["reviews"]:
            for answer in rubric["answers"]:
                paths = re.findall(r"(?:source|evidence)/[\w./-]+\.(?:json|mjs|html|png|md|js)\b|\bpacket\.json\b",
                                   answer["evidence_reference"])
                require(paths, f"No file reference in {report_path}")
                for name in paths:
                    require((report_path.parent / archive_path(name)).is_file(), f"Missing citation: {report_path.parent.name}/{name}")
                    references += 1

    backup.mkdir(parents=True)
    archive_copy = backup / original.name
    shutil.copyfile(original, archive_copy)
    manifest_copy = backup / manifest_name
    manifest_copy.write_bytes(embedded)
    require(digest(archive_copy) == index["sha256"] and digest(original) == index["sha256"], "Backup or original digest mismatch")
    require(digest(manifest_copy) == index["manifest_sha256"], "Backup manifest digest mismatch")
    report = {
        "scope": "OFFLINE_EVIDENCE_RESTORE_AND_BACKUP",
        "status": "PASS",
        "archive_sha256": index["sha256"],
        "manifest_sha256": index["manifest_sha256"],
        "archive_bytes": index["archive_bytes"],
        "restored_files_verified": len(expected),
        "candidate_source_bindings": sources,
        "raw_capture_references_checked": counts,
        "sealed_reports_matched": len(seals),
        "review_file_references_checked": references,
        "backup_drive": backup.drive,
        "backup_folder": backup.name,
        "formal_status": "BLOCKED",
        "formal_trials": 0,
    }
    result = json.dumps(report, indent=2) + "\n"
    (backup / "verification.json").write_text(result, encoding="utf-8")
    print(result, end="")


if __name__ == "__main__":
    main(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())
