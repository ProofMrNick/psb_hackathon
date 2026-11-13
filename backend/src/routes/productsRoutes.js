import express from 'express'
import db from '../db.js'

const router = express.Router()

router.get('/', (req, res) => {
    const getLoans = db.prepare('SELECT * FROM loans')
    const loans = getLoans.all()
    res.json(loans)
})

export default router