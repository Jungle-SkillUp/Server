import {
    EmitEventName,
    SocketEmitEvtDataGameOver,
    SocketEmitEvtDataGameState,
} from 'socket/types/emit'
import { Character, CharacterCommonProps, Position } from '../objects/player'
import { RabbitCharacter } from '../objects/rabbit'
import { SantaCharacter } from '../objects/santa'
import { GhostCharacter } from '../objects/ghost'
import { Item, ItemType } from '../objects/item'
import scaledObjects from '../utils/mapObjects'
import ITEM from '../objects/item.const'
import { CHARACTER_COLORS } from '../../game/objects/player.constant'
import mapPositon from '../utils/positionUtils'
import { getIO } from '../../socket'

export enum CharacterType {
    RABBIT = 1,
    SANTA = 2,
    GHOST = 3,
}

export const updateInterval = 1 / 5

export type MapInitialType = { roomId: string; remainRunningTime: number }
export type MapStartLoopType = {
    handleGameState: (data: SocketEmitEvtDataGameState) => void
    handleGameOver: (data: SocketEmitEvtDataGameOver) => void
}

export class CommonMap {
    private roomId = ''
    private remainRunningTime = 0
    private loopIdToReduceTime?: NodeJS.Timeout
    private loopIdToUpdateGameState?: NodeJS.Timeout
    private availablePositions: Position[] = [
        ...mapPositon.PREDEFINED_POSITIONS,
    ]
    private log: {
        highest: { character: Character | null; maxPosY: number }
    } = { highest: { character: null, maxPosY: 0 } }

    characters: Character[] = []
    items: Item[] = []

    constructor({ roomId, remainRunningTime }: MapInitialType) {
        this.roomId = roomId
        this.remainRunningTime = remainRunningTime
    }

    init() {
        this.spawnInitialItems()
    }

    getRoomId() {
        return this.roomId
    }

    broadcast(emitMessage: EmitEventName, data: unknown) {
        const io = getIO()
        const roomId = this.getRoomId()
        io.to(roomId).emit<EmitEventName>(emitMessage, data)
    }

    private spawnInitialItems() {
        for (let i = 0; i < 8; i++) {
            this.spawnNewItem()
        }
    }

    private spawnNewItem() {
        const id = this.generateItemId()
        const type = this.getRandomItemType()
        const position = this.getRandomItemPosition()

        const item = new Item(id, type, position)
        this.items.push(item)
    }

    private generateItemId(): string {
        return `item-${Date.now()}-${Math.random()}`
    }

    private getRandomItemType(): ItemType {
        const randonNum = Math.random()
        if (randonNum <= ITEM.BOOST_PROB / ITEM.TOTAL_PROB) {
            return ItemType.BOOST
        } else if (
            randonNum <=
            (ITEM.BOOST_PROB + ITEM.SHIELD_PROB) / ITEM.TOTAL_PROB
        ) {
            return ItemType.SHIELD
        } else if (
            randonNum <=
            (ITEM.BOOST_PROB + ITEM.SHIELD_PROB + ITEM.THUNDER_PROB) /
                ITEM.TOTAL_PROB
        ) {
            return ItemType.THUNDER
        } else {
            return ItemType.GIFT
        }
    }

    private getRandomItemPosition(): Position {
        let position: Position
        let isValidPosition = false

        while (!isValidPosition) {
            // x, z 좌표는 맵의 범위 내에서 랜덤하게 생성 (예: -MAX_GROUND ~ MAX_GROUND)
            const x = (Math.random() - 0.5) * (mapPositon.MAX_GROUND - 10)
            const y = (Math.random() + 0.1) * ITEM.ITEM_MAX_POS_Y
            const z = (Math.random() - 0.5) * (mapPositon.MAX_GROUND - 10)

            position = { x, y, z }

            // mapObject와 겹치지 않는지 확인
            if (this.isValidItemPosition(position)) {
                isValidPosition = true
            }
        }

        return position
    }

    private isValidItemPosition(position: Position): boolean {
        // mapObject와 겹치지 않는지 확인하는 로직
        for (const obj of scaledObjects) {
            const min = obj.boundingBox.min
            const max = obj.boundingBox.max

            if (
                position.x >= min.x &&
                position.x <= max.x &&
                position.y >= min.y &&
                position.y <= max.y &&
                position.z >= min.z &&
                position.z <= max.z
            ) {
                return false
            }
        }

        return true
    }

    private checkItemPickup() {
        for (const character of this.characters) {
            if (character.items.length >= 2) {
                continue // 이미 최대 아이템 소지 중인 경우 건너뜀
            }

            for (const item of this.items) {
                const distanceSquared = this.calculateDistance(
                    character.position,
                    item.position
                )

                if (distanceSquared <= ITEM.ITEM_PICKUP_DISTANCE ** 2) {
                    this.handleItemPickup(character, item)
                    break // 한 번에 하나의 아이템만 획득
                }
            }
        }
    }

    private handleItemPickup(character: Character, item: Item) {
        // 아이템을 플레이어의 인벤토리에 추가
        character.items.push(item.type)

        // 맵에서 아이템 제거 및 재생성
        this.respawnItem(item.id)
    }

    respawnItem(itemId: string) {
        // 기존 아이템 제거
        this.items = this.items.filter((item) => item.id !== itemId)

        // 15초 후에 새로운 아이템 생성
        setTimeout(() => {
            this.spawnNewItem()
        }, 15000)
    }

    handleTunderItemUse(character: Character) {
        const userItem = character.items[0]
        if (userItem === ItemType.THUNDER) {
            this.applyThunderEffect(character)
        }
    }
    private applyThunderEffect(caster: Character) {
        for (const other of this.characters) {
            if (other.id !== caster.id) {
                other.thunderEffect.push(2 / updateInterval) // 2초 시전 시간
            }
        }
    }

    private generateRandomPosition(): Position {
        if (this.availablePositions.length === 0) {
            throw new Error('할당할 수 있는 위치 더 이상 없')
        }

        const index = Math.floor(Math.random() * this.availablePositions.length)
        const position = this.availablePositions.splice(index, 1)[0]
        return position
    }

    public calculateDistance(pos1: Position, pos2: Position): number {
        const dx = pos2.x - pos1.x
        const dy = pos2.y - pos1.y
        const dz = pos2.z - pos1.z

        return dx * dx + dy * dy + dz * dz
    }

    findCharacter(id: string) {
        return this.characters.find((char) => char.id === id)
    }

    addCharacter({
        id,
        nickName,
        charType,
    }: {
        id: string
        nickName: string
        charType: CharacterType
    }) {
        const position = this.generateRandomPosition()
        const colorIdx = this.characters.length % CHARACTER_COLORS.length
        const color = CHARACTER_COLORS[colorIdx]

        let character: Character
        const initialProps: CharacterCommonProps = {
            id,
            nickName,
            position,
            color,
        }
        switch (charType) {
            case CharacterType.RABBIT:
                character = new RabbitCharacter(initialProps)
                break
            case CharacterType.SANTA:
                character = new SantaCharacter(initialProps)
                break
            case CharacterType.GHOST:
                character = new GhostCharacter(initialProps)
                break
            default:
                throw new Error('Unknown character type')
        }

        this.characters.push(character)
    }

    removeCharacter(id: string) {
        this.characters = this.characters.filter((char) => char.id !== id)
    }

    convertGameState(): SocketEmitEvtDataGameState {
        return {
            remainRunningTime: this.remainRunningTime,
            characters: this.characters.map((char) => char.getClientData()),
            mapItems: this.items.map((item) => ({
                id: item.id,
                type: item.type,
                position: item.position,
            })),
        }
    }

    updateGameState() {
        // console.time('updateGameState 실행 시간')
        this.characters.forEach((character) => {
            character.update()
            mapPositon.repositionInMapBoundary(character)
        })
        this.checkItemPickup()
        this.updateLog()
        // console.timeEnd('updateGameState 실행 시간')
    }

    private resetEventkey(): void {
        this.characters.forEach((character) => {
            character.stolen = false
            character.steal = false
        })
    }

    startGameLoop({ handleGameState, handleGameOver }: MapStartLoopType) {
        this.loopIdToReduceTime = setInterval(() => {
            this.remainRunningTime -= 1

            if (this.isGameOver()) {
                this.stopGameLoop()
                handleGameOver({
                    roomId: this.getRoomId(),
                })
            }
        }, 1000)

        this.loopIdToUpdateGameState = setInterval(() => {
            this.updateGameState()

            const gameState = this.convertGameState()
            handleGameState(gameState)
            this.resetEventkey()
        }, 1000 * updateInterval)
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

    private updateLog() {
        this.characters.forEach((character) => {
            const posY = character.position.y

            if (this.log.highest.maxPosY < posY) {
                this.log.highest.character = character
                this.log.highest.maxPosY = posY
            }
        })
    }

    getLogHighestCharacter() {
        return this.log.highest.character
    }
}
