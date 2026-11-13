import re
from src.processing.dialogue import parse_dialogue
from .prompts import SYSTEM_PROMPT

def generate_answer(question, chunks, client, settings):
    """Генерируем ответ через LLM."""
    if not chunks:
        return "В базе знаний нет сведений, достаточных для ответа на этот вопрос."
    
    # Формируем контекст
    context = "\n\n".join(f"[S{i+1}] {c['title']}\n{c['text'][:1200]}" for i, c in enumerate(chunks))
    
    history, last, _ = parse_dialogue(question)
    if history:
        user_part = f"<dialog_history>\n{history}\n</dialog_history>\n\nПоследний вопрос: {last}"
    else:
        user_part = f"Вопрос: {question}"
    
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": f"<context>\n{context}\n</context>\n\n{user_part}"}
    ]
    
    # Параметры для Ollama
    extra = {}
    if settings.is_ollama:
        extra = {"keep_alive": "30m", "options": {"num_ctx": 4096, "num_predict": settings.max_tokens}}
    
    try:
        resp = client.chat.completions.create(
            model=settings.model,
            messages=messages,
            temperature=settings.temperature,
            max_tokens=settings.max_tokens,
            extra_body=extra
        )
        answer = resp.choices[0].message.content or ""
    except Exception as e:
        print(f"Ошибка генерации: {e}")
        return "Ошибка при генерации ответа."
    
    # Чистим ответ от служебных меток
    answer = re.sub(r"</?(context|dialog_history)>", "", answer, flags=re.I)
    answer = re.sub(r"\[S\d+\]", "", answer)
    answer = re.sub(r"Ссылка:\s*", "", answer)
    answer = re.sub(r"[ \t]{2,}", " ", answer)
    answer = re.sub(r"\s+([.,;:])", r"\1", answer)
    answer = re.sub(r"\n{3,}", "\n\n", answer)
    
    return answer.strip()[:9500]
