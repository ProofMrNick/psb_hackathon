import db from './db.js'

function createChat(userId, firstMessage){
    const title = firstMessage // later we'll cut the string so that title would be of an appropriate length

    const createChat = db.prepare('INSERT INTO chats (user_id, title) VALUES (?, ?)')
    const result = createChat.run(userId, title)

    saveMessage(result.lastInsertRowid, 'user', firstMessage)
    
    return result.lastInsertRowid
}


function saveMessage(chatId, role, content) {
    db.prepare(`
        INSERT INTO messages (chat_id, role, content)
        VALUES (?, ?, ?)
    `).run(chatId, role, content)

    return chatId
}



export {createChat, saveMessage}