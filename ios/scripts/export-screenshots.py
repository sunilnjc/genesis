#!/usr/bin/env python3
"""Export named sample screenshots from a completed XCTest result bundle."""
import json
import pathlib
import shutil
import subprocess
import sys
import tempfile

result, destination = map(pathlib.Path, sys.argv[1:3])
destination.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory() as temporary:
    subprocess.run(["xcrun", "xcresulttool", "export", "attachments", "--path", str(result), "--output-path", temporary], check=True)
    entries = json.loads((pathlib.Path(temporary) / "manifest.json").read_text())
    for entry in entries:
        for attachment in entry["attachments"]:
            name = attachment.get("suggestedHumanReadableName", "")
            if name.startswith(("01-Decide_", "02-Inventory_", "03-Cuts_")):
                source = pathlib.Path(temporary) / attachment["exportedFileName"]
                target = destination / (name.split("_")[0] + ".png")
                shutil.copyfile(source, target)
                print(target)
