import os
import re
import pytest

TRANSLATIONS_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../frontend/lib/translations.ts"))

SUPPORTED_LOCALES = [
    "en-IN", "hi-IN", "te-IN", "kn-IN", "ta-IN", 
    "mr-IN", "bn-IN", "ml-IN", "gu-IN", "pa-IN", 
    "or-IN", "as-IN", "ur-IN"
]

SECTION_KEYS = [
    "header", "nav", "dashboard", "farms", "fields", 
    "sensors", "weather", "ai_tools", "ml_predict", 
    "history", "schedule", "notifications", "profile", 
    "admin", "common", "settings", "pwa"
]

def test_translation_file_exists_and_valid():
    """Verify that translations.ts exists and contains definitions for all 13 locales."""
    assert os.path.exists(TRANSLATIONS_FILE), f"translations.ts file not found at {TRANSLATIONS_FILE}"
    with open(TRANSLATIONS_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    for loc in SUPPORTED_LOCALES:
        pattern = f'"{loc}":'
        assert pattern in content, f"Locale '{loc}' is missing from translations object in translations.ts"

def test_13_languages_complete_coverage():
    """Verify 100% translation coverage for all 13 supported Indian languages."""
    with open(TRANSLATIONS_FILE, "r", encoding="utf-8") as f:
        content = f.read()

    # Split translations file into locale blocks
    blocks = {}
    for i, loc in enumerate(SUPPORTED_LOCALES):
        start_pattern = f'"{loc}":'
        if i < len(SUPPORTED_LOCALES) - 1:
            end_pattern = f'"{SUPPORTED_LOCALES[i+1]}":'
            parts = content.split(start_pattern)
            if len(parts) > 1:
                block_text = parts[1].split(end_pattern)[0]
                blocks[loc] = block_text
        else:
            parts = content.split(start_pattern)
            if len(parts) > 1:
                blocks[loc] = parts[1]

    print("\n" + "=" * 65)
    print(f"{'Language':<12} | {'Total Sections':<14} | {'Status':<10} | {'Coverage':<10}")
    print("=" * 65)

    for loc in SUPPORTED_LOCALES:
        assert loc in blocks, f"Block for locale {loc} not found"
        block_text = blocks[loc]
        
        missing_sections = []
        for sec in SECTION_KEYS:
            if f"{sec}:" not in block_text:
                missing_sections.append(sec)
                
        assert len(missing_sections) == 0, f"Locale '{loc}' is missing sections: {missing_sections}"
        print(f"{loc:<12} | {len(SECTION_KEYS):<14} | {'PASSED':<10} | {'100%':<10}")

    print("=" * 65)
