import os

def load_resource(resource_path):
    """
    Carga recursos estáticos subiendo un nivel desde la carpeta 'utils'
    para encontrar la carpeta 'static'.
    """
    # 1. Obtiene la ruta de este archivo (ia_assistant/utils/load_resource.py)
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 2. SUBIR UN NIVEL: Salir de 'utils' para entrar en 'ia_assistant'
    root_dir = os.path.dirname(current_dir)

    # 3. Construir la ruta final
    full_path = os.path.join(root_dir, resource_path)
    
    # Normalizamos para Windows (\)
    full_path = os.path.normpath(full_path)

    if not os.path.exists(full_path):
        # Este mensaje nos ayudará a debuggear si falla de nuevo
        raise FileNotFoundError(f"No se encontró el archivo en: {full_path}")

    with open(full_path, 'r', encoding='utf-8') as file:
        return file.read()