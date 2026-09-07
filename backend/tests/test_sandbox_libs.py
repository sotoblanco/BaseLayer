"""Tests for the canonical sandbox library list and missing-module help."""

from sandbox_libs import (
    SANDBOX_LIBRARIES,
    SANDBOX_LIBRARIES_TEXT,
    library_help_hint,
    missing_module,
)


class TestSandboxLibraries:
    def test_canonical_set_covers_sandbox_images(self):
        assert set(SANDBOX_LIBRARIES) == {"numpy", "torch", "matplotlib"}
        assert SANDBOX_LIBRARIES_TEXT == "numpy, torch, matplotlib"

    def test_planners_and_import_share_the_canonical_list(self):
        from course_import import INSTALLED_SANDBOX_LIBRARIES

        assert set(INSTALLED_SANDBOX_LIBRARIES) == set(SANDBOX_LIBRARIES)

    def test_missing_module_parses_tracebacks(self):
        assert (
            missing_module("ModuleNotFoundError: No module named 'sentence_transformers'")
            == "sentence_transformers"
        )
        assert missing_module("No module named 'pandas.core'") == "pandas"
        assert missing_module('No module named "sklearn"') == "sklearn"
        assert missing_module("AssertionError: 2 != 3") is None
        assert missing_module("") is None

    def test_hint_names_module_and_docs(self):
        hint = library_help_hint("sentence_transformers")
        assert "sentence_transformers" in hint
        assert "research/sandbox/Dockerfile" in hint
        assert "backend/sandbox_libs.py" in hint
        assert "docs/adding-sandbox-libraries.md" in hint
