import express from 'express'
import cors from 'cors'
import path, { dirname } from 'path'
import { fileURLToPath } from 'url'

import chatRoutes from './routes/chatRoutes.js'

export const app = express()
const PORT = Number(process.env.PORT || 5003)

// Get the file path from the URL of the current module
const __filename = fileURLToPath(import.meta.url)
// Get the directory name from the file path
const __dirname = dirname(__filename)

// разрешить запросы с фронта
app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));


// Middleware
app.use(express.json())
app.use(express.static(path.join(__dirname, '../public')))
app.get('/api/openapi.yaml', (_req, res) => res.sendFile(path.join(__dirname, '../openapi.yaml')))


// Routes
app.use('/api/v1', chatRoutes)

//app.use('/api/mocks', mocksRoutes)
//app.use('/api/health', healthRoutes)

export function startServer(port = PORT) {
  //fill_db()
  const server = app.listen(port, () => {
    console.log(`Server has started on port: ${server.address().port}`)
    if (process.env.SIMULATE_ACTIVITY === 'true') {
      setTimeout(async () => {
            const { simulateActivity } = await import('./simulateActivity.js');
            await simulateActivity();
      }, 1500)
    }
  })
  return server
}

if (path.resolve(process.argv[1] || '') === path.resolve(__filename)) {
  startServer()
}
