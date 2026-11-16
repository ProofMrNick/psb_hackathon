import express, { json } from 'express'
import db from '../db.js'
import {createChat, saveAiMessage, saveUserMessage} from '../chatFunctions.js'
import {highlightAnswer} from '../otherFunctions.js'
import callMLService from '../mlServices.js'

const mlurl = process.env.ML_API_URL || process.env.LLM_BASE_URL || 'http://localhost:8001'
const router = express.Router()

router.post('/new_chat', (req, res) => {
    const {message} = req.body
    const chat_id = createChat(0, message) // for now user_id is 0 because we only have 1 user
    res.json({chat_id}) 
})

router.get('/chats', (req, res) => {
    //returns id's and titles of all chats in the form of array

    const getChats = db.prepare('SELECT id, title FROM chats WHERE user_id = ?')
    const chat_names = getChats.all(0) // user_id is still 0

    
    res.json({chat_names})
})

router.get('/:chat_id/history', (req, res) => {
    const {chat_id} = req.params

    const getChatHistory = db.prepare('SELECT * FROM messages WHERE chat_id = ?')
    const result = getChatHistory.all(chat_id)

    res.send(result)
})

router.post('/:chat_id/user_message', async (req, res) => {

    const {chat_id} = req.params
    const userId = 0
    const { question } = req.body

    saveUserMessage(chat_id, userId, question)

    const history = db.prepare(`
        SELECT role, content FROM messages
        WHERE chat_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    `).all(chat_id).reverse()
    
    const aiResponse = await fetch(`${mlurl}/api/v1/answer`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            question: question,
            history: history,
            top_k: 6
        })
    })


    const aiMessageId = saveAiMessage(chat_id, userId, aiResponse)
    
    const output = db.prepare('SELECT chat_id, content, metadata FROM messages WHERE id = ?').get(aiMessageId)
    res.json({
        output: {
            chat_id: output.chat_id,
            msg_id: aiMessageId,
            content: output.content,
            metadata: JSON.parse(output.metadata)
        }
    })
})

router.get('/:chat_id/:msg_id/?document_id=?', async (req, res) => {
    const {chat_id, msg_id, document_id} = req.params

    const getMessage = db.prepare('SELECT * FROM messages WHERE id = ?')
    const result = getMessage.all(msg_id)

    const document_text = await fetch(`${mlurl}/api/v1/document?document_id=${document_id}`, {
        method: 'GET'
    })

    const { text } = await document_text.json()

    res.send({
        message: result,
        document_text: text
    })
})
export default router
