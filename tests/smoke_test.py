from __future__ import annotations

import importlib.util
import json
import sys
import tomllib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

REQUIRED_FILES = [
    "__init__.py",
    "pyproject.toml",
    "LICENSE",
    "README.md",
    "js/theme_lab.js",
    "js/theme_lab.css",
    "js/lib/theme_runtime_adapter.js",
    "js/lib/theme_lab_panel.js",
    "js/themes/manifest.json",
    "theme_storage.py",
    "examples/ZY_02.json",
]


def check_required_files() -> None:
    missing = [name for name in REQUIRED_FILES if not (ROOT / name).is_file()]
    if missing:
        raise AssertionError(f"Missing required files: {missing}")


def check_python_entrypoint() -> None:
    spec = importlib.util.spec_from_file_location("workspacekit_theme", ROOT / "__init__.py")
    if spec is None or spec.loader is None:
        raise AssertionError("Unable to load __init__.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    assert module.WEB_DIRECTORY == "./js"
    assert module.NODE_CLASS_MAPPINGS == {}
    assert module.NODE_DISPLAY_NAME_MAPPINGS == {}


def check_pyproject() -> None:
    with (ROOT / "pyproject.toml").open("rb") as handle:
        data = tomllib.load(handle)
    assert data["project"]["name"] == "workspacekit-theme-lab"
    assert data["project"]["version"] == "0.1.0"
    assert data["tool"]["comfy"]["PublisherId"] == "ZiYao00"


def check_example_theme() -> None:
    data = json.loads((ROOT / "examples/ZY_02.json").read_text(encoding="utf-8"))
    assert isinstance(data.get("colors"), dict)
    for section in ("node_slot", "litegraph_base", "comfy_base"):
        assert isinstance(data["colors"].get(section), dict)


def check_theme_manifest() -> None:
    data = json.loads((ROOT / "js/themes/manifest.json").read_text(encoding="utf-8"))
    assert isinstance(data.get("groups"), list)
    wk = next(group for group in data["groups"] if group.get("id") == "wk")
    assert isinstance(wk.get("items"), list)


def check_source_encoding() -> None:
    for path in ROOT.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".py", ".js", ".css", ".md", ".toml", ".json"}:
            path.read_text(encoding="utf-8")


def main() -> int:
    checks = [
        check_required_files,
        check_python_entrypoint,
        check_pyproject,
        check_example_theme,
        check_theme_manifest,
        check_source_encoding,
    ]
    for check in checks:
        check()
        print(f"PASS {check.__name__}")
    print("All smoke tests passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
