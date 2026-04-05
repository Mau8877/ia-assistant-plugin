from tutor import hooks

hooks.Filters.ENV_PATCHES.add_item((
    "openedx-lms-common-settings",
    'OPENROUTER_API_KEY = "{{ OPENROUTER_API_KEY }}"'
))

hooks.Filters.ENV_PATCHES.add_item((
    "openedx-cms-common-settings",
    'OPENROUTER_API_KEY = "{{ OPENROUTER_API_KEY }}"'
))