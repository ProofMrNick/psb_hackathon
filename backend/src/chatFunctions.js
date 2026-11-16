import db from './db.js'
import { highlightAnswer } from './otherFunctions.js'
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
    const {html, evidences = []} = highlightAnswer(aiResponse || { answer: "No response from AI service", evidence: [] })

    const evidenceReferences = (evidences || []).map(evidence => ({
        document_id: evidence.document_id,
        start_char: evidence.start_char,
        end_char: evidence.end_char,
        start_answer_char: evidence.answer_start_char,
        end_answer_char: evidence.answer_end_char
    }))

    const metadata = JSON.stringify({
        evidence: evidenceReferences
    })

    const result = db.prepare(`
        INSERT INTO messages (chat_id, user_id, role, content, metadata)
        VALUES (?, ?, ?, ?, ?)
    `).run(chatId, userId, 'assistant', html, metadata)

    return result.lastInsertRowid
}

export {createChat, saveUserMessage, saveAiMessage}