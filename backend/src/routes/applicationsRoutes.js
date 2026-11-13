import express from 'express'
import db from '../db.js'
import bkiDb from '../../mockDatabase/bki_db.js'
import fnsDb from '../../mockDatabase/fns_db.js'
import { ACTIVE_STATUSES, APPLICATION_STATUS } from '../applicationContract.js'
import { runApplicationWorkflow, setApplicationStatus } from '../applicationWorkflow.js'

const router = express.Router()

function parseJson(value, fallback) {
    if (value == null) return fallback
    try { return JSON.parse(value) } catch { return fallback }
}

function presentApplication(row) {
    if (!row) return row
    const decision = row.approved_amount != null || row.approved_term_months != null || row.approved_rate != null
        ? {
            approved_amount: row.approved_amount,
            approved_term_months: row.approved_term_months,
            approved_rate: row.approved_rate,
            comment: row.decision_comment,
        }
        : null
    return {
        ...row,
        missing_fields: parseJson(row.missing_fields, []),
        decision,
        decline_reason: row.decision_reason,
    }
}

router.get('/', (req, res) => {
    const applications = db.prepare(`
        SELECT applications.*, loans.name AS loan_name
        FROM applications LEFT JOIN loans ON loans.id = applications.loan_id
        WHERE applications.user_id = ? ORDER BY applications.time_of_application DESC
    `).all(req.userId).map(presentApplication)
    res.json(applications)
})

router.post('/', async (req, res) => {
    const loanId = Number(req.body.loan_id ?? req.body.product_id)
    const loanSum = Number(req.body.loan_sum)
    const loanDuration = Number(req.body.loan_duration)
    const purpose = req.body.purpose || 'CURRENT_ACTIVITY'
    const loan = db.prepare('SELECT * FROM loans WHERE id = ?').get(loanId)
    if (!loan) return res.status(404).json({ message: 'Кредитный продукт не найден' })
    if (!Number.isFinite(loanSum) || loanSum < loan.min_amount || loanSum > loan.max_amount) {
        return res.status(400).json({ message: 'Сумма не входит в диапазон выбранного продукта' })
    }
    if (!Number.isInteger(loanDuration) || loanDuration <= 0 || loanDuration > loan.duration) {
        return res.status(400).json({ message: 'Срок не входит в диапазон выбранного продукта' })
    }

    const placeholders = ACTIVE_STATUSES.map(() => '?').join(', ')
    const duplicate = db.prepare(`
        SELECT global_id FROM applications
        WHERE user_id = ? AND loan_id = ? AND status IN (${placeholders})
    `).get(req.userId, loanId, ...ACTIVE_STATUSES)
    if (duplicate) return res.status(409).json({ message: 'По этому продукту уже есть активная заявка' })

    const localId = db.prepare(`
        SELECT COALESCE(MAX(local_id), 0) + 1 AS value FROM applications WHERE user_id = ?
    `).get(req.userId).value
    const inserted = db.prepare(`
        INSERT INTO applications
            (user_id, inn, local_id, loan_id, loan_sum, loan_interest, loan_duration, purpose, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(req.userId, req.inn, localId, loanId, loanSum, loan.interest_rate, loanDuration, purpose, APPLICATION_STATUS.DRAFT)
    const globalId = Number(inserted.lastInsertRowid)
    const workflow = await runApplicationWorkflow(globalId, 'SUBMIT')
    res.status(201).json({
        message: 'Application submitted',
        id: localId,
        application_id: localId,
        local_id: localId,
        global_id: globalId,
        status: workflow.application.status,
        warning: workflow.warning || null,
    })
})

router.get('/:local_id', (req, res) => {
    const application = db.prepare(`
        SELECT applications.*, loans.name AS loan_name
        FROM applications LEFT JOIN loans ON loans.id = applications.loan_id
        WHERE applications.local_id = ? AND applications.user_id = ?
    `).get(req.params.local_id, req.userId)
    if (!application) return res.status(404).json({ message: 'Application not found' })
    res.json(presentApplication(application))
})

router.get('/:local_id/history', (req, res) => {
    const application = db.prepare(
        'SELECT global_id FROM applications WHERE local_id = ? AND user_id = ?'
    ).get(req.params.local_id, req.userId)
    if (!application) return res.status(404).json({ message: 'Application not found' })
    const history = db.prepare(`
        SELECT * FROM applications_logs WHERE application_global_id = ? ORDER BY id
    `).all(application.global_id).map((item) => ({ ...item, metadata: parseJson(item.metadata, {}) }))
    res.json(history)
})

router.post('/:local_id/submit', async (req, res) => {
    const application = db.prepare(
        'SELECT * FROM applications WHERE local_id = ? AND user_id = ?'
    ).get(req.params.local_id, req.userId)
    if (!application) return res.status(404).json({ message: 'Application not found' })
    if (application.status !== APPLICATION_STATUS.DRAFT) {
        return res.status(409).json({ message: 'Only a draft application can be submitted' })
    }
    const workflow = await runApplicationWorkflow(application.global_id, 'SUBMIT')
    res.json({ data: presentApplication(workflow.application), warning: workflow.warning || null })
})

const FIELD_ALIASES = {
    existingDebt: 'total_debt', activeLoans: 'active_loans_count', monthlyPayment: 'monthly_payment',
    delinquencies: 'delinquencies_12m_count', maxDelinquencyDays: 'max_delinquency_days',
    companyName: 'name', registrationDate: 'registration_date', okved: 'okved_main', taxRegime: 'tax_regime',
    mspCategory: 'msp_category', hasAccount: 'has_account', avgMonthlyInflow: 'avg_monthly_inflow',
    acquiringVolume: 'acquiring_monthly_volume', monthlyRevenue: 'avg_monthly_inflow',
    annualRevenue: 'avg_monthly_inflow', annual_revenue: 'avg_monthly_inflow',
}

function updateNullFields(database, table, allowedFields, values, inn) {
    const result = { updated: [], ignored: [] }
    for (const [inputField, value] of Object.entries(values || {})) {
        const field = FIELD_ALIASES[inputField] || inputField
        if (!allowedFields.includes(field) || value === '') {
            result.ignored.push(inputField)
            continue
        }
        const normalizedValue = ['annualRevenue', 'annual_revenue'].includes(inputField)
            ? Number(value) / 12
            : value
        const info = database.prepare(`UPDATE ${table} SET ${field} = ? WHERE inn = ? AND ${field} IS NULL`).run(normalizedValue, inn)
        ;(info.changes ? result.updated : result.ignored).push(inputField)
    }
    return result
}

router.post('/:local_id/clarify', async (req, res) => {
    const application = db.prepare(
        'SELECT * FROM applications WHERE local_id = ? AND user_id = ?'
    ).get(req.params.local_id, req.userId)
    if (!application) return res.status(404).json({ message: 'Application not found' })
    if (application.status !== APPLICATION_STATUS.NEED_MORE_INFO) {
        return res.status(409).json({ message: 'Application does not require clarification' })
    }

    const updated = {
        bki: updateNullFields(bkiDb, 'bki', [
            'report_status', 'active_loans_count', 'total_debt', 'monthly_payment',
            'delinquencies_12m_count', 'max_delinquency_days', 'has_default', 'report_date',
        ], req.body.bki_data, application.inn),
        fns: updateNullFields(fnsDb, 'fns', [
            'ogrn', 'name', 'legal_form', 'registration_date', 'status', 'okved_main',
            'okved_additional', 'tax_regime', 'msp_category', 'msp_registry_date',
            'edo_participant', 'head_name', 'head_position',
        ], req.body.fns_data, application.inn),
        internal: updateNullFields(db, 'registry_internal', [
            'has_account', 'account_opened_date', 'avg_monthly_inflow', 'avg_monthly_outflow',
            'acquiring_monthly_volume', 'blocked_115fz', 'previous_products_closed_well', 'snapshot_date',
        ], req.body.internal_data, application.inn),
    }

    const workflow = await runApplicationWorkflow(application.global_id, 'CLARIFICATION', {
        comment: 'Клиент уточнил данные; заявка возвращена на рассмотрение',
        metadata: { updated },
    })
    res.json({
        message: 'Data updated and scoring restarted',
        data: presentApplication(workflow.application),
        updated,
        warning: workflow.warning || null,
    })
})

function clientDecision(expectedStatuses, newStatus) {
    return (req, res) => {
        const application = db.prepare(
            'SELECT * FROM applications WHERE local_id = ? AND user_id = ?'
        ).get(req.params.local_id, req.userId)
        if (!application) return res.status(404).json({ message: 'Application not found' })
        if (!expectedStatuses.includes(application.status)) {
            return res.status(409).json({ message: `Action is not available for status ${application.status}` })
        }
        setApplicationStatus(application.global_id, newStatus, {
            comment: newStatus === APPLICATION_STATUS.ACCEPTED
                ? 'Клиент принял предложение'
                : 'Клиент отклонил предложение',
        })
        res.json({ status: newStatus })
    }
}

router.post('/:local_id/accept', clientDecision(
    [APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.COUNTEROFFER], APPLICATION_STATUS.ACCEPTED
))
router.post('/:local_id/decline', clientDecision(
    [APPLICATION_STATUS.APPROVED, APPLICATION_STATUS.COUNTEROFFER], APPLICATION_STATUS.CANCELLED
))

export default router
