import express from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import db from '../db.js'

const router = express.Router()

// Register a new user endpoing /auth/register
router.post('/register', (req, res) => {
    console.log(`Registering a new user with username: ${req.body.username}`)
    const { username, password, inn, email, companyName } = req.body

    const hashedPassword = bcrypt.hashSync(password, 8)

    try {
        const insertUser = db.prepare(`INSERT INTO users (username, password) VALUES (?, ?)`)
        const result = insertUser.run(username, hashedPassword)

        const insertUserInfo = db.prepare(`INSERT INTO user_info (user_id, email, name, inn, company_name) VALUES (?, ?, ?, ?, ?)`)
        insertUserInfo.run(result.lastInsertRowid, email, username, inn, companyName)

        // create a token, take JWT secret from .env file, and set the expiration time to 24 hours
        const token = jwt.sign({ id: result.lastInsertRowid }, process.env.JWT_SECRET, { expiresIn: '24h' })
        const getUser = db.prepare('SELECT * FROM users WHERE username = ?')
        const user = getUser.get(username)

        const userId = user.id
        const user_info = db.prepare(`SELECT * FROM user_info WHERE user_id = ?`).get(userId)
        const role = user.role
        res.json({ token, role, user_info})
    } catch (err) {
        console.log(err.message)
        res.sendStatus(503)
    }

    //console.log(db.prepare(`SELECT * FROM user_info`).all())
})

router.post('/login', (req, res) => {

    const { username, password } = req.body

    try {
        const getUser = db.prepare('SELECT * FROM users WHERE username = ?')
        const user = getUser.get(username)


        // if we cannot find a user associated with that username, return out from the function
        if (!user) { return res.status(404).send({ message: "User not found" }) }

        const passwordIsValid = bcrypt.compareSync(password, user.password)
        // if the password does not match, return out of the function
        if (!passwordIsValid) { return res.status(401).send({ message: "Invalid password" }) }
        // then we have a successful authentication
        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '24h' })
        const role = user.role
        const getUserInfo = db.prepare(`SELECT * FROM user_info WHERE user_id = ?`)
        const user_info = getUserInfo.get(user.id)
        res.json({ token, role, user_info})
    } catch (err) {
        console.log(err.message)
        res.sendStatus(503)
    }

})


export default router
