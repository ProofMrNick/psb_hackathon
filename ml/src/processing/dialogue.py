import re

def parse_dialogue(question):
    """Разбираем диалог на историю и последний вопрос."""
    marks = list(re.finditer(r"(?:^|\n)\s*(Пользователь|Ассистент)\s*:\s*", question))
    if not marks:
        return "", question.strip(), question.strip()
    
    parts = [(m.group(1), question[m.end():marks[i+1].start() if i+1 < len(marks) else len(question)].strip())
             for i, m in enumerate(marks)]
    
    last_user = next((t for role, t in reversed(parts) if role == "Пользователь"), question.strip())
    history = "\n".join(f"{r}: {t}" for r, t in parts[:-1])
    all_user = " ".join(t for r, t in parts if r == "Пользователь")
    
    return history, last_user, all_user
