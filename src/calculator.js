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
        console.log("getting base damage for distance " + distance);
        if (distance <= this.falloffStart) return this.damage;
        if (distance >= this.falloffEnd) return this.damage * 0.1;
        return this.damage * (1 - 0.9 * (distance - this.falloffStart) / (this.falloffEnd - this.falloffStart));
    }

    getDamage(distance, enemyPrecMul, enemyBackMul, isPrec, isBack, boosterDamageModifier, isStaggerDamage = false) {
        let prec = !isPrec || enemyPrecMul == null ? 1 : this.precMul * enemyPrecMul;
        let back = !isBack || enemyBackMul == null ? 1 : enemyBackMul;
        let stag = !isStaggerDamage ? 1 : this.staggerMul;
        return (this.getBaseDamageForDistance(distance) * prec * back * stag * boosterDamageModifier).toFixed(2);
    }

    getOneshotDistance(enemyHealth, enemyPrecMul, enemyBackMul, isPrec, isBack, boosterDamageModifier) {
        let damage = this.getDamage(0, enemyPrecMul, enemyBackMul, isPrec, isBack, boosterDamageModifier);
        if (damage * 0.1 > enemyHealth) return "∞";
        return (this.falloffStart + (this.falloffEnd - this.falloffStart) * ((1 - (enemyHealth / damage)) / 0.9)).toFixed(2);
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
        let back = !isBack || enemyBackMul == null ? 1 : enemyBackMul * ((this.cBackMul - this.lBackMul) * (charge**3) + this.lBackMul);
        let sleep = !isSleeping ? 1 : (this.cSleepMul - this.lSleepMul) * (charge**3) + this.lSleepMul;
        let stag = !isStaggerDamage ? 1 : (this.cStaggerMul - this.lStaggerMul) * (charge**3) + this.lStaggerMul;

        let baseDamage = this.getBaseDamageForCharge(charge);
        return (baseDamage * prec * back * sleep * stag * boosterDamageModifier).toFixed(2);
    }

    getOneshotCharge(enemyHealth, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier) {
        let lightDamage = this.getDamage(0, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier);
        let chargedDamage = this.getDamage(1, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier);
        return ((enemyHealth - lightDamage) / (chargedDamage - lightDamage)) ** (1 / 3);
    }
}