import json
import unittest

from ia_assistant.services.student_review_service import (
    _prepare_components_for_ai,
    generate_student_review,
)


class FakeClient(object):
    def __init__(self, payload):
        self.payload = payload

    def generate_text(self, system_prompt, user_prompt):
        return json.dumps(self.payload, ensure_ascii=False)


def build_quiz_component(
    puntaje,
    correct_ids,
    opciones=None,
    component_id="quiz_1",
):
    return {
        "id": component_id,
        "tipo": "quiz_multiple",
        "nombre": "Quiz",
        "puntaje": puntaje,
        "data": {
            "pregunta": "Pregunta",
            "opciones": opciones
            or [
                {"id": "a", "texto": "A", "feedback": ""},
                {"id": "b", "texto": "B", "feedback": ""},
                {"id": "c", "texto": "C", "feedback": ""},
            ],
            "respuestas_correctas": correct_ids,
        },
    }


class StudentReviewScoringTests(unittest.TestCase):
    def test_prepare_components_for_ai_includes_puntaje_maximo(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(5, ["a"])],
        }

        components_for_ai, _ = _prepare_components_for_ai(unit, {})

        self.assertEqual(components_for_ai[0]["puntaje_maximo"], 5)

    def test_single_answer_quiz_correct_gets_full_score(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(5, ["a"])],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": "a",
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "quiz_1",
                    "tipo": "quiz_multiple",
                    "estado": "revisar",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                }
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        review = result["review"]
        component = review["componentes"][0]

        self.assertTrue(result["ok"])
        self.assertEqual(component["estado"], "bien")
        self.assertEqual(component["puntaje_obtenido"], 5)
        self.assertEqual(component["puntaje_maximo"], 5)

    def test_single_answer_quiz_incorrect_gets_zero_score(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(5, ["a"])],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": "b",
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "quiz_1",
                    "tipo": "quiz_multiple",
                    "estado": "bien",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                }
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        component = result["review"]["componentes"][0]

        self.assertEqual(component["estado"], "revisar")
        self.assertEqual(component["puntaje_obtenido"], 0)
        self.assertEqual(component["puntaje_maximo"], 5)

    def test_single_answer_quiz_without_response_gets_zero(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(5, ["a"])],
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [],
            "recomendaciones": [],
        }

        result = generate_student_review(unit, {}, client=FakeClient(ai_payload))
        component = result["review"]["componentes"][0]

        self.assertEqual(component["estado"], "sin_respuesta")
        self.assertEqual(component["puntaje_obtenido"], 0)
        self.assertEqual(component["puntaje_maximo"], 5)

    def test_multi_answer_quiz_partial_score_for_partial_correct_selection(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(10, ["a", "b"])],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": ["a"],
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        component = result["review"]["componentes"][0]

        self.assertEqual(component["estado"], "parcial")
        self.assertEqual(component["puntaje_obtenido"], 5)
        self.assertEqual(component["puntaje_maximo"], 10)

    def test_multi_answer_quiz_penalizes_incorrect_selected_option(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [build_quiz_component(10, ["a", "b"])],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": ["a", "c"],
                "metadata": {},
            }
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        component = result["review"]["componentes"][0]

        self.assertEqual(component["estado"], "revisar")
        self.assertEqual(component["puntaje_obtenido"], 0)
        self.assertEqual(component["puntaje_maximo"], 10)

    def test_review_includes_total_obtenido_and_total_maximo(self):
        unit = {
            "version": 1,
            "titulo": "Unidad",
            "componentes": [
                build_quiz_component(5, ["a"]),
                {
                    "id": "pregunta_1",
                    "tipo": "pregunta_abierta",
                    "nombre": "Pregunta",
                    "puntaje": 3,
                    "data": {"enunciado": "Explica", "rubrica": "Criterio"},
                },
                {
                    "id": "codigo_1",
                    "tipo": "codigo",
                    "nombre": "Codigo",
                    "puntaje": 7,
                    "data": {
                        "enunciado": "Resuelve",
                        "lenguaje": "python",
                        "instrucciones": "Sigue",
                        "codigo_base": "",
                    },
                },
            ],
        }
        answers = {
            "quiz_1": {
                "componentId": "quiz_1",
                "tipo": "quiz_multiple",
                "value": "a",
                "metadata": {},
            },
            "pregunta_1": {
                "componentId": "pregunta_1",
                "tipo": "pregunta_abierta",
                "value": "Respuesta",
                "metadata": {},
            },
            "codigo_1": {
                "componentId": "codigo_1",
                "tipo": "codigo",
                "value": "print('hola')",
                "metadata": {},
            },
        }
        ai_payload = {
            "status": "ai",
            "resumen_general": "Resumen",
            "componentes": [
                {
                    "componentId": "pregunta_1",
                    "tipo": "pregunta_abierta",
                    "estado": "parcial",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                },
                {
                    "componentId": "codigo_1",
                    "tipo": "codigo",
                    "estado": "bien",
                    "comentario": "Comentario",
                    "sugerencia": "Sugerencia",
                },
            ],
            "recomendaciones": [],
        }

        result = generate_student_review(
            unit, answers, client=FakeClient(ai_payload)
        )
        review = result["review"]
        component_map = {
            component["componentId"]: component
            for component in review["componentes"]
        }

        self.assertEqual(review["puntaje_total_obtenido"], 5)
        self.assertEqual(review["puntaje_total_maximo"], 15)
        self.assertEqual(component_map["pregunta_1"]["puntaje_obtenido"], 0)
        self.assertEqual(component_map["pregunta_1"]["puntaje_maximo"], 3)
        self.assertEqual(component_map["codigo_1"]["puntaje_obtenido"], 0)
        self.assertEqual(component_map["codigo_1"]["puntaje_maximo"], 7)


if __name__ == "__main__":
    unittest.main()
