// santa.ts
import { Character, CharacterCommonProps } from './player'
import { CHARACTER } from './player.constant'
import { CharacterType, updateInterval } from '../maps/common'

export class SantaCharacter extends Character {
    private skillDurationTime: number = 5 / updateInterval // 스킬 지속 시간 (초)
    private currentSkillDuration: number = 0 // 현재 남은 스킬 지속 시간

    constructor(params: CharacterCommonProps) {
        super({
            ...params,
            charType: CharacterType.SANTA,
            currentSkillCooldown: 0,
            totalSkillCooldown: 15 / updateInterval,
            basespeed: CHARACTER.SANTA_BASE_SPEED,
            speed: CHARACTER.SANTA_BASE_SPEED,
        })
    }

    getMaxSpeed(): number {
        return this.speed
    }

    useSkill() {
        if (this.currentSkillCooldown <= 0) {
            this.speed += CHARACTER.SANTA_SKILL_SPEED
            this.isSkillActive = true
            this.currentSkillDuration = this.skillDurationTime
            this.currentSkillCooldown = this.totalSkillCooldown
        } else {
            return
        }
    }

    update() {
        super.update()
        if (this.isSkillActive) {
            // 스턴을 길게 걸리면 스킬 종료 (선물뺏기는 당해도 스킬 안끊김)
            if (this.eventBlock > CHARACTER.ITEM_EVENT_BLOCK) {
                this.isSkillActive = false
                this.currentSkillDuration = 0
                this.speed -= CHARACTER.SANTA_SKILL_SPEED
            }
            this.currentSkillDuration -= 1
            if (this.currentSkillDuration <= 0) {
                this.isSkillActive = false
                this.currentSkillDuration = 0
                this.speed -= CHARACTER.SANTA_SKILL_SPEED
            }
        }

        if (this.currentSkillCooldown > 0) {
            this.currentSkillCooldown -= 1
        }

        if (this.isSkillInput) {
            this.useSkill()
            this.isSkillInput = false
        }
    }
    getClientData() {
        return {
            ...super.getClientData(),
            currentSkillCooldown: this.currentSkillCooldown,
            totalSkillCooldown: this.totalSkillCooldown,
        }
    }
}
