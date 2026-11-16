import express, { json } from 'express'
import db from '../db.js'
import {createChat, saveMessage} from '../chatFunctions.js'
import callMLService from '../mlServices.js'

const mlurl = process.env.ML_SERVICE_URL || 'http://localhost:5000'
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

    saveUserMessage(chat_id, userId, message)

    const history = db.prepare(`
        SELECT role, content FROM messages
        WHERE chat_id = ?
        ORDER BY created_at DESC
        LIMIT 20
    `).all(chat_id).reverse()
    
    const aiResponse = await fetch(`${mlurl}/answer`, {
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


    saveAiMessage(chat_id, userId, aiResponse)

    res.json({
        chat_id: chat_id,
        message: aiResponse.answer,
        metadata: aiResponse.metadata
    })
})

export default router
