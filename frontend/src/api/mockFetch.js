
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const DOCUMENTS = {
    1: {
        id: 1,
        title: '<span class="peach">Налоговый кодекс с изменениями 2026</span>',
        content: `Preamble

We the People of the United States, in Order to form a more perfect Union, establish Justice, insure domestic Tranquility, provide for the common defence, promote the general Welfare, and secure the Blessings of Liberty to ourselves and our Posterity, do ordain and establish this Constitution for the United States of America.

Article I

Section 1. All legislative Powers herein granted shall be vested in a Congress of the United States, which shall consist of a Senate and House of Representatives.

Section 2. The House of Representatives shall be composed of Members chosen every second Year by the People of the several States, and the Electors in each State shall have the Qualifications requisite for Electors of the most numerous Branch of the State Legislature.

No Person shall be a Representative who shall not have attained to the Age of twenty five Years, and been seven Years a Citizen of the United States, and who shall not, when elected, be an Inhabitant of that State in which he shall be chosen.

Representatives and <span class="yellow">direct Taxes shall be apportioned among</span> the several States which may be included within this Union, according to their respective Numbers, which shall be determined by adding to the whole Number of free Persons, including those bound to Service for a Term of Years, and excluding <span class="peach">Indians not taxed, three fifths of all other Persons. The actual Enumeration shall be made within three Years</span> after the first Meeting of the Congress of the United States, and within every subsequent Term of ten Years, in such Manner as they shall by Law direct. The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.
The Number of Representatives shall not exceed one for every thirty Thousand, but each State shall have at Least one Representative; and until such enumeration shall be made, the State of New Hampshire shall be entitled to chuse three, Massachusetts eight, Rhode Island and Providence Plantations one, Connecticut five, New York six, New Jersey four, Pennsylvania eight, Delaware one, Maryland six, Virginia ten, North Carolina five, South Carolina five, and Georgia three.

When vacancies happen in the Representation from any State, the Executive Authority thereof shall issue Writs of Election to fill such Vacancies.`,
    },
    2: {
        id: 2,
        title: '<span class="yellow">Малый бизнес в России: ключевые директивы развития</span>',
        content: `Section 3. The Senate of the United States shall be composed of two Senators from each State, chosen by the Legislature thereof, for six Years; and each Senator shall have one Vote.

Immediately after <span class="yellow">they shall be assembled in Consequence of the first Election, they shall be divided as equally as may be into three Classes. The Seats of the Senators of the first Class at the Expiration of the second Year</span>, of the second Class at the Expiration of the fourth Year, and of the third Class at the Expiration of the sixth Year, so that one third <span class="cyan">may be chosen every second Year; and if Vacancies happen by Resignation, or otherwise, during the Recess of the Legislature</span> of any State, the Executive thereof may make temporary Appointments until the next Meeting of the Legislature, which shall then fill such Vacancies.

No Person shall be a <span class="peach">Senator who shall not have attained to the Age of thirty Years, and been nine Years a Citizen of the United States, and who shall</span> not, when elected, be an Inhabitant of that State for which he shall be chosen.

The Vice President of the United States shall be President of the Senate, but shall have no Vote, unless they be equally divided.`,
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