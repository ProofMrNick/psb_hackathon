import db from './db.js'

function createChat(userId, firstMessage){
    const title = firstMessage // later we'll cut the string so that title would be of an appropriate length

    const createChat = db.prepare('INSERT INTO chats (user_id, title) VALUES (?, ?)')
    const result = createChat.run(userId, title)

    saveMessage(result.lastInsertRowid, 'user', firstMessage)
    
    return result.lastInsertRowid
}


function saveUserMessage(chatId, userId, message) {
    db.prepare(`
        INSERT INTO messages (chat_id, user_id, role, content)
        VALUES (?, ?, ?, ?)
    `).run(chatId, userId, 'user', message)

    return chatId
}

function saveAiMessage(chatId, userId, aiResponse) {
    const message = aiResponse.answer || "No response from AI service."

    db.prepare(`
        INSERT INTO messages (chat_id, user_id, role, content, metadata)
        VALUES (?, ?, ?, ?, ?)
    `).run(chatId, userId, 'assistant', message)

    return chatId
}

export {createChat, saveUserMessage, saveAiMessage}