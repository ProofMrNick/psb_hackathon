import express from "express";
import db from '../db.js'
import bki_db from '../../mockDatabase/bki_db.js'
import fns_db from '../../mockDatabase/fns_db.js'
import { rescoreUser } from "../scoringServices.js";
const router = express.Router()

router.get("/applications", (req, res) => {

    const getApplication = db.prepare("SELECT * FROM applications")
    const application = getApplication.all()

    res.json(application)
})

router.get("/applications/:applId", (req, res) => {
    const { applId } = req.params


    const getApplication = db.prepare("SELECT * FROM applications WHERE global_id = ? ")
    const application = getApplication.get(applId)
    if(!application) { return res.status(404).send({ message: "Application not found" }) }

    res.json(application)
})

router.post("/applications/:applId/decision", (req, res) => {
    const {applId} = req.params
    const {type, approvedAmount = null, approvedTermMonths = null, approvedRate = null, missingFields = null, reason = null, comment = null} = req.body 



    const getApplication = db.prepare("SELECT * FROM applications WHERE global_id = ?")
    const application = getApplication.get(applId)
    const user_id = application.user_id
    if(!application) { return res.status(404).send({ message: "Application not found" }) }

    if (type == "APPROVE" || type == "COUNTEROFFER"){
        const updateStatus = db.prepare("UPDATE applications SET status = ?, loan_sum = ?, loan_interest = ?, loan_duration = ? WHERE global_id == ?")
        updateStatus.run(type, approvedAmount, approvedRate, approvedTermMonths, applId)
        console.log(`Decision for application ${req.params.applId}: ${type}`)
        const addComment = db.prepare(`UPDATE applications_logs
                    SET comment = ?
                    WHERE id = (
                        SELECT id FROM applications_logs 
                        WHERE application_global_id = ? 
                        ORDER BY timestamp DESC 
                        LIMIT 1
                    )`)
        addComment.run(comment, applId)
    }

    else if(type == "REQUEST_INFO"){
        const updateStatus = db.prepare("UPDATE applications SET status = ? WHERE global_id == ?")
        updateStatus.run(type, applId)

        const addCommentAndMetadata = db.prepare(`UPDATE applications_logs
                    SET comment = ?, metadata = ?
                    WHERE id = (
                        SELECT id FROM applications_logs 
                        WHERE application_global_id = ? 
                        ORDER BY timestamp DESC 
                        LIMIT 1
                    )`)
        addCommentAndMetadata.run(comment, `{missingFields: ${missingFields}}`, applId)

    }
    
    else if(type == "DECLINE"){
        const updateStatus = db.prepare("UPDATE applications SET status = ? WHERE global_id == ?")
        updateStatus.run(type, applId)

        const addCommentAndMetadata = db.prepare(`UPDATE applications_logs
                    SET comment = ?, metadata = ?
                    WHERE id = (
                        SELECT id FROM applications_logs 
                        WHERE application_global_id = ? 
                        ORDER BY timestamp DESC 
                        LIMIT 1
                    )`)
        addCommentAndMetadata.run(comment, `{reason: ${reason}}`, applId)
    }
    else{
        return res.status(400).send({ message: "Invalid decision type" })
    }
    res.sendStatus(200)
    rescoreUser(user_id, applId, type)
})
router.get('/applications/:global_id/history', (req, res) => {
    const { global_id } = req.params

    
    if(!global_id) { return res.status(404).send({ message: "Application not found" }) }

    const getApplicationLogs = db.prepare(`SELECT * FROM applications_logs WHERE application_global_id = ?`)
    const applicationLogs = getApplicationLogs.all(global_id)
    if(!applicationLogs) { return res.status(404).send({ message: "Application history not found" }) }

    res.json(applicationLogs)

})

router.get('/clients/:inn', (req, res) => {
    const {inn} = req.params
    const user_info = db.prepare(`SELECT * FROM user_info WHERE inn = ?`).get(inn)
    const bki     = bki_db.prepare('SELECT * FROM bki WHERE inn = ?').get(inn);
    const fns     = fns_db.prepare('SELECT * FROM fns WHERE inn = ?').get(inn);
    const internal_registry = db.prepare('SELECT * FROM registry_internal WHERE inn = ?').get(inn);
    const risk_score_history = db.prepare(`
        SELECT scoring_results.*
        FROM scoring_results
        JOIN applications ON applications.global_id = scoring_results.application_id
        WHERE applications.inn = ?
        ORDER BY scoring_results.created_at DESC
    `).all(inn)
    res.json({ user_info, bki, fns, internal_registry, risk_score_history })
})
export default router
