FROM python:3.11-slim

WORKDIR /app

# Копируем зависимости и устанавливаем
COPY ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
# Для API нужны дополнительные зависимости
RUN pip install --no-cache-dir fastapi uvicorn python-dotenv

# Копируем код
COPY ml/ ./ml/

# Копируем данные (база знаний)
COPY data/ ./data/

EXPOSE 8001

CMD ["python", "ml/run_api.py"]