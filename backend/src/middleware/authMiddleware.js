import jwt from 'jsonwebtoken'
import db from '../db.js'

const authMiddleware = (requiredRole) => {
    return (req, res, next) => {
        const authHeader = req.headers['authorization']

        if (!authHeader) {
            return res.status(401).json({ message: "No token provided" })
        }

        // фронт шлёт "Bearer <token>", .rest шлёт "<token>" — поддерживаем оба
        const token = authHeader.startsWith('Bearer ')
            ? authHeader.slice(7)
            : authHeader

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key_for_hackathon')

            req.userId = decoded.id
            const user = db.prepare('SELECT role FROM users WHERE id = ?').get(req.userId)
            
            

            if (!user) {
                return res.status(404).json({ message: "User not found" })
            }

            // Если роль не передана в middleware, пропускаем любого авторизованного
            if (!requiredRole || user.role === requiredRole) {
                if (requiredRole == 'CLIENT'){req.inn = db.prepare(`select * FROM user_info WHERE user_id = ?`).get(req.userId).inn}
                next()
                
            } else {
                return res.status(403).json({ message: "Not enough permissions" })
            }

        } catch (err) {
            return res.status(401).json({ message: "Invalid or expired token" })
        }
    }
}

export default authMiddleware