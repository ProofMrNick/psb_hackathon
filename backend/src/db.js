import { DatabaseSync } from 'node:sqlite'
const db = new DatabaseSync(':memory:')

db.exec(`
    CREATE TABLE chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,                -- UUID
    user_id INTEGER NOT NULL,
    title TEXT,                         
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chat_id INTEGER NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,                      -- JSON: {tokens, model, latency_ms}
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(chat_id) REFERENCES chats(id)
);
`)


db.prepare(`
    INSERT INTO chats (user_id, title, created_at, updated_at)
    VALUES (0, 'Консультация по кредиту', '2026-11-10 10:00:00', '2026-11-10 10:05:00')
`).run()

db.prepare(`
    INSERT INTO messages (chat_id, role, content, metadata, created_at)
    VALUES 
        (1, 'user', 'Какие у вас есть кредиты для малого бизнеса?', '{"tokens": 12, "model": "ml-v1"}', '2026-11-10 10:00:00'),
        (1, 'assistant', 'Для малого бизнеса у нас есть три продукта: "Бизнес-старт", "Оборотный" и "Овердрафт". Рассказать подробнее о каждом?', '{"tokens": 45, "model": "ml-v1"}', '2026-11-10 10:00:03'),
        (1, 'user', 'Расскажи про "Бизнес-старт"', '{"tokens": 8, "model": "ml-v1"}', '2026-11-10 10:02:00'),
        (1, 'assistant', 'Кредит "Бизнес-старт": до 3 млн ₽, срок до 3 лет, ставка от 12%. Решение за 1 день.', '{"tokens": 38, "model": "ml-v1"}', '2026-11-10 10:02:02')
`).run()

db.prepare(`
    INSERT INTO chats (user_id, title, created_at, updated_at)
    VALUES (0, 'Помощь с заявкой', '2026-11-11 14:00:00', '2026-11-11 14:10:00')
`).run()

db.prepare(`
    INSERT INTO messages (chat_id, role, content, metadata, created_at)
    VALUES 
        (2, 'user', 'Помоги подать заявку на кредит', '{"tokens": 10, "model": "ml-v1"}', '2026-11-11 14:00:00'),
        (2, 'assistant', 'Конечно! Перейдите в раздел "Заявки" и нажмите "Подать заявку". Система автоматически запросит данные из ФНС и БКИ.', '{"tokens": 52, "model": "ml-v1"}', '2026-11-11 14:00:03'),
        (2, 'user', 'Какие документы нужны?', '{"tokens": 6, "model": "ml-v1"}', '2026-11-11 14:05:00'),
        (2, 'assistant', 'Паспорт, СНИЛС и налоговая декларация. Остальные данные получим автоматически.', '{"tokens": 31, "model": "ml-v1"}', '2026-11-11 14:05:02')
`).run()


export default db
