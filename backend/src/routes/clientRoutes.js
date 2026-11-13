import express, { json } from 'express'
import db from '../db.js'
import bki_db from '../../mockDatabase/bki_db.js'
import fns_db from '../../mockDatabase/fns_db.js'
const router = express.Router()

// Get the dashboard data for the authenticated user: user_info, applications, latestApplicationsLog, recommended_loans
router.get('/dashboard', (req, res) => {
    
    const userId = req.userId
    console.log(`Getting dashboard data for user with id: ${userId}`)
    const getUserInfo = db.prepare(`SELECT * FROM user_info WHERE user_id = ?`)
    const userInfo = getUserInfo.get(userId)

    const getApplications = db.prepare(`SELECT * FROM applications WHERE user_id = ?`)
    const applications = getApplications.all(userId)    

    let latestApplicationsLog = []
    for (const application of applications) {
        const getApplicationLog = db.prepare(`SELECT * FROM applications_logs WHERE application_global_id = ? ORDER BY timestamp DESC LIMIT 1`)
        const applicationLog = getApplicationLog.get(application.global_id)
        latestApplicationsLog.push(applicationLog)
    }

    const inn = userInfo.inn

    //for now, we will retun a random loan recommendation for the user, in the future we will implement a more complex recommendation system
    // const getRecommendedloans = askML_ad_recommendations(json.stringify({applications, fns_info, bki_info}))
    const getRecommendedloans = db.prepare(`SELECT * FROM loans ORDER BY RANDOM() LIMIT 3`)
    const recommendations = getRecommendedloans.all()

    res.json({ userInfo, applications, latestApplicationsLog, recommendations })
})

router.get('/recommendations', (req, res) => {
    const userId = req.userId
    const {loan_sum, loan_interest, loan_duration} = req.body

    const userInfo = db.aggregate(`SELECT * FROM user_info WHERE user_id = ?`, [userId])
    const inn = userInfo.inn
    const fns_info = fns_db.aggregate(`SELECT * FROM fns WHERE inn = ?`, [inn])
    const bki_info = bki_db.aggregate(`SELECT * FROM bki WHERE inn = ?`, [inn])    
    
    const {user_risk_score, recommendedLoans} =  askML(json.stringify({loan_sum, loan_interest, loan_duration, fns_info, bki_info}))
    //const user_risk_score =  900
    const updateRiskScore = db.prepare(`UPDATE user_info SET risk_score = ? WHERE user_id = ? `)
    updateRiskScore.run(user_risk_score, userId)

    //remember recomended_loans for later use
    db.prepare()
    res.json(recommendedLoans)
})


export default router
