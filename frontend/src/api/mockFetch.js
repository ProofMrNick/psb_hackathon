
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DOCUMENTS = {
    1: {
        id: 1,
        title: '<span class="peach">Налоговый кодекс с изменениями 2026</span>',
    },
    2: {
        id: 2,
        title: '<span class="yellow">Малый бизнес в России: ключевые директивы развития</span>',
    },
};

const CANNED_ANSWER_CONTENT = `Ключевые изменения в налоговом законодательстве для малого и микро- бизнеса: главное

В 2026 году действительно вступил в силу масштабный пакет поправок в Налоговый кодекс (в основном через Федеральный закон № 425-ФЗ). Часть мер — это ужесточение условий, но есть и точечные послабления, так что картина смешанная.

Что изменилось

1. <span class="peach">НДС. Базовая ставка выросла с 20% до 22%.</span> При этом льготные ставки сохранились: 10% — для социально значимых товаров (продукты, детские товары, медикаменты), 0% — для экспорта. Для бизнеса на УСН ввели выбор: можно платить <span class="yellow">НДС по общей ставке 22%</span> (с правом вычета входящего НДС) или <span class="peach">выбрать пониженные ставки — 5% (при доходе до 272,5 млн руб.) или 7% (до 490,5 млн руб.)</span> — но без права вычета. Важный нюанс: порог, после которого возникает обязанность платить НДС, снижается поэтапно: в 2026 году — до 20 млн руб., в 2027 — до 15 млн руб., с 2028 — до 10 млн руб. Это значит, что часть предпринимателей, раньше работавших без НДС, теперь с ним столкнётся.
2. УСН. Общий лимит дохода для сохранения права на упрощёнку проиндексировали: в 2026 году — до <span class="yellow">490,5 млн руб.</span> (было 450 млн). <span class="yellow">Увеличили лимит стоимости основных средств — до 218 млн руб.</span>`;


let nextChatId = 1;
let nextMessageId = 1;
const chats = [];
const messages = {};

const makeUserMessage = (content) => ({
    id: nextMessageId++,
    role: "user",
    content,
    documents: [],
});

const makeAssistantMessage = () => ({
    id: nextMessageId++,
    role: "assistant",
    content: CANNED_ANSWER_CONTENT,
    documents: [DOCUMENTS[1], DOCUMENTS[2]],
});

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

export async function mockFetch(url, options = {}) {
    const method = (options.method || "GET").toUpperCase();
    const body = options.body ? JSON.parse(options.body) : null;

    await delay(400);

    // POST .../new_chat
    if (method === "POST" && url.endsWith("/new_chat")) {
        const id = nextChatId++;
        chats.push({ id, title: body.message.slice(0, 20) });
        messages[id] = [];
        return ok({ chat_id: id });
    }

    // GET .../chats
    if (method === "GET" && url.endsWith("/chats")) {
        return ok({ chat_names: chats });
    }

    // POST .../:chat_id/user_message
    const sendMatch = url.match(/\/api\/v1\/(\d+)\/user_message$/);
    if (method === "POST" && sendMatch) {
        const chatId = Number(sendMatch[1]);
        if (!messages[chatId]) return notFound();

        const userMessage = makeUserMessage(body.message);
        const assistantMessage = makeAssistantMessage();
        messages[chatId].push(userMessage, assistantMessage);

        return ok({
            conversation_id: chatId,
            user_message_id: userMessage.id,
            assistant_message: assistantMessage,
        });
    }

    // GET .../:chat_id/history
    const historyMatch = url.match(/\/api\/v1\/(\d+)\/history$/);
    if (method === "GET" && historyMatch) {
        const chatId = Number(historyMatch[1]);
        if (!messages[chatId]) return notFound();
        return ok(messages[chatId]);
    }

    // GET .../:chat_id/:msg_id/:document_id
    const splitMatch = url.match(/\/api\/v1\/(\d+)\/(\d+)\/(\d+)$/);
    if (method === "GET" && splitMatch) {
        const chatId = Number(splitMatch[1]);
        const msgId = Number(splitMatch[2]);
        const documentId = Number(splitMatch[3]);
        if (!messages[chatId]) return notFound();

        const assistantIndex = messages[chatId].findIndex((m) => m.id === msgId);
        if (assistantIndex === -1) return notFound();

        const assistantMessage = messages[chatId][assistantIndex];
        const userMessage = messages[chatId][assistantIndex - 1];
        const openedDocument = DOCUMENTS[documentId];
        if (!userMessage || !openedDocument) return notFound();

        return ok({
            user_message: userMessage,
            assistant_message: assistantMessage,
            opened_document: openedDocument,
        });
    }

    return notFound();
}