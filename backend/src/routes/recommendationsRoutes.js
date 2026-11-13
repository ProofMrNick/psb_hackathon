import express from 'express'
import db from '../db.js'
import bki_db from '../../mockDatabase/bki_db.js'
import fns_db from '../../mockDatabase/fns_db.js'
import { enrichRecommendationsWithLlm, LLM_MODEL } from '../llmService.js'

const router = express.Router()
const SCORING_URL = process.env.SCORING_URL || 'http://127.0.0.1:8000'

const PURPOSE_LABELS = {
    WORKING_CAPITAL: 'Пополнение оборотных средств',
    EQUIPMENT: 'Закупка оборудования',
    CURRENT_ACTIVITY: 'Финансирование текущей деятельности',
}

const PRODUCT_PURPOSES = {
    1: ['WORKING_CAPITAL', 'CURRENT_ACTIVITY'],
    2: ['EQUIPMENT', 'CURRENT_ACTIVITY'],
    3: ['EQUIPMENT'],
    4: ['WORKING_CAPITAL', 'CURRENT_ACTIVITY'],
}

router.post('/products', async (req, res) => {
    const { purpose, amount, termMonths, inn } = req.body
    const requestedAmount = Number(amount)
    const requestedTerm = Number(termMonths)

    if (!PURPOSE_LABELS[purpose]) {
        return res.status(400).json({ message: 'Неизвестная цель кредита' })
    }
    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
        return res.status(400).json({ message: 'Сумма кредита должна быть больше нуля' })
    }
    if (!Number.isInteger(requestedTerm) || requestedTerm <= 0) {
        return res.status(400).json({ message: 'Срок кредита должен быть целым числом месяцев' })
    }
    if (String(inn) !== String(req.inn)) {
        return res.status(403).json({ message: 'Можно подбирать продукты только для своей компании' })
    }

    const fns = fns_db.prepare('SELECT * FROM fns WHERE inn = ?').get(inn)
    if (!fns) {
        return res.status(404).json({ message: 'Компания с таким ИНН не найдена' })
    }

    const bki = bki_db.prepare('SELECT * FROM bki WHERE inn = ?').get(inn) || null
    const internal = db.prepare('SELECT * FROM registry_internal WHERE inn = ?').get(inn) || null
    const loans = db.prepare('SELECT * FROM loans ORDER BY id').all()
    const products = loans.map((loan) => ({
        id: loan.id,
        name: loan.name,
        min_amount: loan.min_amount,
        max_amount: loan.max_amount,
        min_term_months: 3,
        max_term_months: loan.duration,
        base_rate: loan.interest_rate,
        allowed_purposes: PRODUCT_PURPOSES[loan.id] || Object.keys(PURPOSE_LABELS),
    }))

    const payload = {
        trigger: 'SMART_SELECTION',
        fns,
        bki,
        internal,
        application: {
            requested_amount: requestedAmount,
            requested_term_months: requestedTerm,
            purpose,
            declared_annual_revenue: internal?.avg_monthly_inflow
                ? internal.avg_monthly_inflow * 12
                : null,
        },
        products,
    }

    try {
        const response = await fetch(`${SCORING_URL}/v1/evaluate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        })
        const result = await response.json()

        if (!response.ok) {
            console.error('Scoring rejected recommendation request:', result)
            return res.status(502).json({ message: 'Сервис подбора не смог обработать данные' })
        }

        const loanById = new Map(loans.map((loan) => [String(loan.id), loan]))
        const calculatedRecommendations = result.recommendations
            .filter((item) => item.eligible)
            .map((item) => {
                const loan = loanById.get(String(item.product_id))
                const monthlyPayment = item.estimated_monthly_payment
                return {
                    product_id: item.product_id,
                    product_name: item.product_name,
                    description: PURPOSE_LABELS[purpose],
                    interest_rate: loan?.interest_rate ?? null,
                    preliminary_limit: item.preliminary_limit,
                    term_months: requestedTerm,
                    monthly_payment: monthlyPayment,
                    overpayment: monthlyPayment == null
                        ? null
                        : Math.max(0, Math.round(monthlyPayment * requestedTerm - requestedAmount)),
                    approval_probability: item.approval_probability,
                    reasons: item.reasons,
                    warnings: item.warnings,
                    model_version: item.model_version,
                }
            })
        const recommendations = await enrichRecommendationsWithLlm(calculatedRecommendations, {
            purposeLabel: PURPOSE_LABELS[purpose],
            amount: requestedAmount,
            termMonths: requestedTerm,
        })

        res.json({
            recommendations,
            risk: result.risk,
            validation_warnings: result.validation_warnings,
            llm: {
                enabled: recommendations.some((item) => item.llm_used),
                model: LLM_MODEL,
            },
        })
    } catch (err) {
        console.error('Recommendation service request failed:', err.message)
        res.status(502).json({ message: 'Сервис подбора временно недоступен' })
    }
})

export default router
