import express from 'express'
import db from '../db.js'

const router = express.Router()
router.get('/', (req, res) => {
    try {
        db.prepare('SELECT 1').get()
        
        res.json({ 
            status: 'ok',
            database: 'connected',
            uptime: Math.floor(process.uptime()) + 's',
            timestamp: new Date().toISOString()
        })
    } catch (err) {
        res.status(503).json({ 
            status: 'error',
            database: 'disconnected',
            error: err.message
        })
    }
})

export default router