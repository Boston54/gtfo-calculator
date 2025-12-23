export class Gun {
    constructor(slot, technicalName, name, damage, staggerMul, precMul, falloffStart, falloffEnd) {
        this.slot = slot;
        this.technicalName = technicalName;
        this.name = name;
        this.damage = damage;
        this.staggerMul = staggerMul;
        this.precMul = precMul;
        this.falloffStart = falloffStart;
        this.falloffEnd = falloffEnd;
    }

    getBaseDamageForDistance(distance) {
        if (distance <= this.falloffStart) return this.damage;
        if (distance >= this.falloffEnd) return this.damage * 0.1;
        let falloff = 1 - (distance - this.falloffStart) / (this.falloffEnd - this.falloffStart);
        if (falloff < 0.1) falloff = 0.1;
        return this.damage * falloff;
    }

    getDamage(distance, enemyPrecMul, enemyBackMul, isPrec, isBack, boosterDamageModifier, isStaggerDamage = false) {
        let prec = !isPrec || enemyPrecMul == null ? 1 : this.precMul * enemyPrecMul;
        if (prec < 1) prec = 1;
        const back = !isBack || enemyBackMul == null ? 1 : enemyBackMul;
        const stag = !isStaggerDamage ? 1 : this.staggerMul;
        const dist = this.getBaseDamageForDistance(distance);
        return (dist * prec * back * stag * boosterDamageModifier).toFixed(2);
    }

    getOneshotDistance(enemyHealth, enemyPrecMul, enemyBackMul, isPrec, isBack, boosterDamageModifier) {
        const damage = this.getDamage(0, enemyPrecMul, enemyBackMul, isPrec, isBack, boosterDamageModifier);
        if (enemyHealth <= damage * 0.1) return "∞";
        return (this.falloffStart + (this.falloffEnd - this.falloffStart) * (1 - (enemyHealth / damage))).toFixed(2);
    }
}

export class Melee {
    constructor(name, lDamage, cDamage, lPrecMul, cPrecMul, lStaggerMul, cStaggerMul, lEnvMul, cEnvMul, lBackMul, cBackMul, lSleepMul, cSleepMul, lStamCost, cStamCost, shoveStamCost, chargeTime, autoAttackTime) {
        this.name = name;
        this.lDamage = lDamage;
        this.cDamage = cDamage;
        this.lPrecMul = lPrecMul;
        this.cPrecMul = cPrecMul;
        this.lStaggerMul = lStaggerMul;
        this.cStaggerMul = cStaggerMul;
        this.lEnvMul = lEnvMul;
        this.cEnvMul = cEnvMul;
        this.lBackMul = lBackMul;
        this.cBackMul = cBackMul;
        this.lSleepMul = lSleepMul;
        this.cSleepMul = cSleepMul;
        this.lStamCost = lStamCost;
        this.cStamCost = cStamCost;
        this.shoveStamCost = shoveStamCost;
        this.chargeTime = chargeTime;
    }

    getBaseDamageForCharge(charge) {
        return (this.cDamage - this.lDamage) * (charge**3) + this.lDamage;
    }

    getDamage(charge, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier, isStaggerDamage = false) {
        let prec = !isPrec || enemyPrecMul == null ? 1 : enemyPrecMul * ((this.cPrecMul - this.lPrecMul) * (charge**3) + this.lPrecMul);
        if (prec < 1) prec = 1;
        const back = !isBack || enemyBackMul == null ? 1 : enemyBackMul * ((this.cBackMul - this.lBackMul) * (charge**3) + this.lBackMul);
        const sleep = !isSleeping ? 1 : (this.cSleepMul - this.lSleepMul) * (charge**3) + this.lSleepMul;
        const stag = !isStaggerDamage ? 1 : (this.cStaggerMul - this.lStaggerMul) * (charge**3) + this.lStaggerMul;
        const baseDamage = this.getBaseDamageForCharge(charge);
        return (baseDamage * prec * back * sleep * stag * boosterDamageModifier).toFixed(2);
    }

    getOneshotCharge(enemyHealth, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier) {
        const lightDamage = this.getDamage(0, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier);
        const chargedDamage = this.getDamage(1, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier);
        const charge = ((enemyHealth - lightDamage) / (chargedDamage - lightDamage)) ** (1 / 3);
        return isNaN(charge) ? 0 : charge;
    }
}