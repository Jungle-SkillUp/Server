import { SocketEmitEvtDataGameState } from 'socket/types/emit'
import { Character, Position } from '../objects/player'

const GROUND_POS = {
    x: 0,
    y: -1, // y축에서 바닥이 약간 아래로 설정됩니다.
    z: 0,
}

const MIN_DISTANCE = 2

export type MapInitialType = { remainRunningTime: number }
export type MapStartLoopType = {
    handleGameState: (data: SocketEmitEvtDataGameState) => void
    handleGameOver: () => void
}

export class CommonMap {
    private updateInterval = 1 / 60 // 60 FPS
    private remainRunningTime = 0
    private loopIdToReduceTime?: NodeJS.Timeout
    private loopIdToUpdateGameState?: NodeJS.Timeout

    characters: Character[] = []

    constructor({ remainRunningTime }: MapInitialType) {
        this.remainRunningTime = remainRunningTime
    }

    init() {}

    private generateRandomPosition(): Position {
        // TODO: 안겹치게 생성되도록
        let position: Position
        do {
            position = {
                x: GROUND_POS.x + Math.random() * 10,
                y: GROUND_POS.y + 2,
                z: GROUND_POS.z + Math.random() * 10,
            }
        } while (!this.isValidPosition(position))

        return position
    }

    private isValidPosition(newPos: Position): boolean {
        // 기존 캐릭터 위치들과의 충돌 검사
        for (const character of this.characters) {
            const distance = this.calculateDistance(newPos, character.position)
            if (distance < MIN_DISTANCE) {
                return false
            }
        }
        return true
    }

    public calculateDistance(pos1: Position, pos2: Position): number {
        const dx = pos1.x - pos2.x
        const dz = pos1.z - pos2.z
        return Math.sqrt(dx * dx + dz * dz)
    }

    findCharacter(id: string) {
        return this.characters.find((char) => char.id === id)
    }

    addCharacter(id: string) {
        const position = this.generateRandomPosition()
        const character = new Character(id, position)
        this.characters.push(character)
    }

    removeCharacter(id: string) {
        this.characters = this.characters.filter((char) => char.id !== id)
    }

    convertGameState(): SocketEmitEvtDataGameState {
        return {
            remainRunningTime: this.remainRunningTime,
            characters: this.characters.map((char) => ({
                id: char.id,
                position: char.position,
                bodyColor: char.bodyColor,
                hairColor: char.hairColor,
                bellyColor: char.bellyColor,
                velocity: char.velocity,
                hasTail: char.hasTail,
            })),
        }
    }

    updateGameState() {
        // TODO: 검증로직
    }

    startGameLoop({
        handleGameState: handleGameStateV2,
        handleGameOver,
    }: MapStartLoopType) {
        this.loopIdToReduceTime = setInterval(() => {
            this.remainRunningTime -= 1

            if (this.isGameOver()) {
                handleGameOver()
                this.stopGameLoop()
            }
        }, 1000)

        this.loopIdToUpdateGameState = setInterval(() => {
            this.updateGameState()

            const gameStateV2 = this.convertGameState()
            handleGameStateV2(gameStateV2)
        }, 1000 * this.updateInterval)
    }

    stopGameLoop() {
        if (this.loopIdToReduceTime) {
            clearInterval(this.loopIdToReduceTime)
            this.loopIdToReduceTime = undefined
        }

        if (this.loopIdToUpdateGameState) {
            clearInterval(this.loopIdToUpdateGameState)
            this.loopIdToUpdateGameState = undefined
        }
    }

    private isGameOver(): boolean {
        const cond1 = this.remainRunningTime <= 0
        const cond2 = this.characters.length == 1
        return cond1 || cond2
    }
}
