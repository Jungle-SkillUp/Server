import dotenv from 'dotenv'
dotenv.config()

import cors from 'cors'
import express, { Express } from 'express'
import cookieParser from 'cookie-parser'
import routes from './routes'
import { connectDB } from './schemas'
import swaggerUi from 'swagger-ui-express'
import swaggerDocument from './docs/swagger-output.json'
import { initSocket } from './socket'
import { Server, ServerOptions } from 'socket.io'

const port = process.env.PORT
const socketClientUrl = process.env.SOCKET_CLIENT_URL
const socketCorsOption: Partial<ServerOptions> = {
    cors: {
        origin: socketClientUrl,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    transports: ['websocket', 'polling'],
}

const app: Express = express()
app.use(cors())
app.use(cookieParser())
app.use(express.json())
app.use('/example', routes.example)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument))

connectDB()
    .then(() => console.log('[1] DB Connected'))
    .then(() => {
        console.log('[1] (mongoDB) DB Connected')
        app.listen(port, () => {
            console.log(`[2] Server runs at <http://localhost>:${port}`)
        })

        const io = new Server(server, socketCorsOption)
        initSocket(io)
    })
    .catch((err) => {
        console.error('[Error] DB Connection Failed:', err)
    })
