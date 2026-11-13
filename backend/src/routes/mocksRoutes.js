import express from 'express'
import bki_db from '../../mockDatabase/bki_db.js'
import fns_db from '../../mockDatabase/fns_db.js'

const router = express.Router()

router.get('/bki/:inn', (req, res) => {
    const { inn } = req.params

    try {
        const getInfo = bki_db.prepare('SELECT * FROM bki WHERE inn = ?')
        const resultGetInfo = getInfo.get(inn)
        if(!resultGetInfo) {return res.status(404).send({ message: "User info not found" })}
        res.json(resultGetInfo)
    } catch (err) {
        console.log(err.message)
        res.sendStatus(503)
    }
    
})

router.get('/fns/:inn', (req, res) => {
    const { inn } = req.params

    try {
        const company = fns_db.prepare('SELECT * FROM fns WHERE inn = ?').get(inn)
        if (!company) {
            return res.status(404).json({ message: 'Company not found' })
        }
        res.json(company)
    } catch (err) {
        console.error('Failed to read FNS mock:', err.message)
        res.status(503).json({ message: 'FNS registry is unavailable' })
    }
})


export default router
