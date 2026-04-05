import os
from setuptools import setup, find_packages

def package_data(pkg, roots):
    """Función genérica para encontrar y empaquetar archivos estáticos."""
    data = []
    for root in roots:
        root_path = os.path.join(pkg, root)
        if not os.path.exists(root_path):
            continue
        for dirname, _, files in os.walk(root_path):
            for fname in files:
                data.append(os.path.relpath(os.path.join(dirname, fname), pkg))
    return {pkg: data}

setup(
    name='ia-assistant-plugin',
    version='0.1.0',
    description='Asistente Inteligente para Open edX - UAGRM',

    packages=find_packages(),

    install_requires=[
        'XBlock',
        'openai>=1.0.0',
        'python-dotenv',
        'web-fragments',
    ],

    entry_points={
        'xblock.v1': [
            'ia_assistant = ia_assistant.ia_assistant:IAAssistantXBlock',
        ],
        'tutor.v1.plugins': [
            'ia_assistant = ia_assistant.tutor_plugin',
        ],
    },

    package_data=package_data("ia_assistant", ["static"]),

    include_package_data=True,
    zip_safe=False,
)