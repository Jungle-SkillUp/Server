import roomService, { Player } from '../../service/rooms'
import { Socket } from 'socket.io'
import { EmitEventName } from 'socket/types/emit'
import { OnEventData } from 'socket/types/on'

export abstract class BaseController {
    socket: Socket
    player: Player
    roomId: string

    constructor({ socket }: { socket: Socket }) {
        this.socket = socket
        const userId = socket.data.clientId
        const nickName = socket.data.nickName
        const isGuest = socket.data.isGuest
        this.player = new Player({ userId, nickName, isGuest })
        this.roomId = socket.data.roomId

        if (this.roomId) {
            // 재접속 시 재연결
            const room = roomService.findGameRoomById(this.roomId)
            if (room) {
                room.gameMap.registerSocket(this.getSocket())
            }
        }
    }
    abstract register(): void
    abstract disconnect(): void

    getSocket(): Socket {
        return this.socket
    }

    getSocketId(): string {
        return this.socket.id
    }

    getUserId(): string {
        return this.socket.data.clientId
    }

    getPlayer(): Player {
        return this.player
    }

    getRoomId() {
        return this.roomId
    }

    updateRoomId(roomId: string) {
        this.roomId = roomId
    }

    broadcast(roomId: string, emitMessage: EmitEventName, data: unknown) {
        // self
        this.socket.emit<EmitEventName>(emitMessage, data)
        // the other
        this.socket.to(roomId).emit<EmitEventName>(emitMessage, data)
    }
    logger = (msg: string, args?: OnEventData) => {
        console.log(
            `[${this.socket.id}] ${msg} ${args ? JSON.stringify(args) : ''}`
        )
    }
}
