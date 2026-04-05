import os
from setuptools import setup

def package_data(pkg, roots):
    """Función genérica para encontrar y empaquetar archivos estáticos."""
    data = []
    for root in roots:
        for dirname, _, files in os.walk(os.path.join(pkg, root)):
            for fname in files:
                data.append(os.path.relpath(os.path.join(dirname, fname), pkg))
    return {pkg: data}

setup(
    name='ia-assistant-plugin',
    version='0.1.0',
    description='Asistente Inteligente para Open edX - UAGRM',
    packages=[
        'ia_assistant',
    ],
    install_requires=[
        'XBlock',
        'openai',
        'python-dotenv',
    ],
    entry_points={
        'xblock.v1': [
            'ia_assistant = ia_assistant.ia_assistant:IAAssistantXBlock',
        ]
    },
    package_data=package_data("ia_assistant", ["static", "public"]),
)