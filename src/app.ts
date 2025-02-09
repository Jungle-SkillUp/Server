import dotenv from 'dotenv'
dotenv.config()

import cors, { CorsOptions } from 'cors'
import express, { Express } from 'express'
import cookieParser from 'cookie-parser'
import routes from './routes'
import { initSocket } from './socket'
import { Server } from 'socket.io'
import { connectMongoDB } from './db/mongoose'
import { connectRedisDB } from './db/redis'

const port = process.env.PORT
const corsOption: CorsOptions = { origin: '*' }

const app: Express = express()
app.use(cors(corsOption))
app.use(cookieParser())
app.use(express.json())
app.use('/user', routes.user)
app.use('/game', routes.game)

async function startServer() {
    try {
        await connectRedisDB()
        console.log('[1] RedisDB Connected')

        await connectMongoDB()
        console.log('[2] MongoDB Connected')

        const server = app.listen(port, () => {
            console.log('Server Ready!!')
            console.log(`Server runs at <http://localhost>:${port}`)
        })

        const io = new Server(server, { cors: corsOption })
        initSocket(io)
    } catch (err) {
        console.error('[Error] Server run failed:', err)
    }
}

startServer()
