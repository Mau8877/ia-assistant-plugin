from tutor import hooks

hooks.Filters.CONFIG_DEFAULTS.add_item(
    ("OPENROUTER_API_KEY", "")
)

OPENROUTER_SETTINGS = """
# IA Assistant Plugin
OPENROUTER_API_KEY = "{{ OPENROUTER_API_KEY }}"
"""

hooks.Filters.ENV_PATCHES.add_items([
    ("openedx-lms-common-settings", OPENROUTER_SETTINGS),
    ("openedx-cms-common-settings", OPENROUTER_SETTINGS),
])
