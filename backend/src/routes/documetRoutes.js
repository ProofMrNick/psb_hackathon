import express, { json } from 'express'

const mlurl = process.env.ML_SERVICE_URL || 'http://localhost:5000'
const router = express.Router()

router.get
