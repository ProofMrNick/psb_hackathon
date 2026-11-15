// src/api/mockFetch.js — временная заглушка вместо сервера

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// «База данных» в памяти. Чтобы чаты переживали перезагрузку страницы —
// перенеси в localStorage (читай при старте, сохраняй после изменений)
let nextId = 1;
const chats = [];      // { id, title }
const messages = {};   // chat_id -> [ { id, role, content } ]

// объект, похожий на ответ fetch: есть ok, status и json()
const ok = (data) => ({
    ok: true,
    status: 200,
    json: async () => data,
});

const notFound = () => ({
    ok: false,
    status: 404,
    json: async () => ({ error: "mock: not found" }),
});

// простенький «мозг» ассистента — реагирует на ключевые слова
function fakeAssistantReply(userText) {
    const text = userText.toLowerCase();

    if (text.includes("привет") || text.includes("здравств")) {
        return "Здравствуйте! Чем могу помочь?";
    }
    if (text.includes("как дела") || text.includes("как ты")) {
        return "Спасибо, отлично: я же заглушка, у меня всегда всё хорошо 🙂";
    }
    if (text.includes("пока") || text.includes("до свидания")) {
        return "До свидания! Возвращайтесь, когда подключат настоящий сервер.";
    }
    return `Вы написали: «${userText}». Это временный ответ заглушки вместо сервера.`;
}

export async function mockFetch(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const body = options.body ? JSON.parse(options.body) : null;

    await delay(300);   // имитация задержки сети

    // POST .../new_chat — создать чат
    if (method === "POST" && url.endsWith("/new_chat")) {
        const id = nextId++;
        chats.push({ id, title: body.message.slice(0, 20) });
        messages[id] = [];
        return ok({ chat_id: id });
    }

    // GET .../chats — список чатов
    if (method === "GET" && url.endsWith("/chats")) {
        return ok({ chat_names: chats });
    }

    // POST .../:chat_id/user_message — сообщение пользователя + ответ ассистента
    const sendMessageMatch = url.match(/\/(\d+)\/user_message$/);
    if (method === "POST" && sendMessageMatch) {
        const chatId = Number(sendMessageMatch[1]);
        if (!messages[chatId]) return notFound();

        messages[chatId].push({ id: `${chatId}-${nextId++}`, role: "user", content: body.message });
        const reply = fakeAssistantReply(body.message);
        messages[chatId].push({ id: `${chatId}-${nextId++}`, role: "assistant", content: reply });

        return ok({ conversation_id: chatId, message: reply, metadata: {} });
    }

    // GET .../:chat_id/history — история переписки
    const historyMatch = url.match(/\/(\d+)\/history$/);
    if (method === "GET" && historyMatch) {
        const chatId = Number(historyMatch[1]);
        if (!messages[chatId]) return notFound();
        return ok(messages[chatId]);
    }

    return notFound();
}