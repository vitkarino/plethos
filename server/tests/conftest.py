from __future__ import annotations

import os
import sys
from pathlib import Path


# Ensure `import app` works when running pytest from any directory.
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

# Tests assume local `.env` / ambient shell env do not enable optional features.
for name in (
    "QUALITY_MODEL_PATH",
    "QUALITY_MODEL_TYPE",
    "QUALITY_MODEL_NAME",
    "QUALITY_MODEL_VERSION",
    "LLM_ENABLED",
    "LLM_PROVIDER",
    "LLM_BASE_URL",
    "LLM_API_KEY",
    "LLM_MODEL",
):
    os.environ.pop(name, None)

