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

    /**
     * Gets the base damage for this weapon at the given distance. Does not account for any damage multipliers (back,
     * precision, armor).
     * @param distance The distance at which the enemy is hit.
     * @returns {number} The scaled damage at this range.
     */
    getBaseDamageForDistance(distance) {
        if (distance <= this.falloffStart) return this.damage;
        if (distance >= this.falloffEnd) return this.damage * 0.1;
        let falloff = 1 - (distance - this.falloffStart) / (this.falloffEnd - this.falloffStart);
        if (falloff < 0.1) falloff = 0.1;
        return this.damage * falloff;
    }

    /**
     * Calculates the damage value for an enemy hit with the given stats at the given distance. This does not account
     * for the enemy's armor, but will account for precision shots, back multipliers, and stagger multipliers, depending
     * on the arguments.
     * @param distance The distance at which the enemy is hit.
     * @param enemyPrecMul The precision multiplier of the enemy that is hit.
     * @param enemyBackMul The back multiplier of the enemy that is hit.
     * @param isPrec True if the shot is to a precision point (tumor or head), false otherwise.
     * @param isBack True if the shot is to the back of the enemy (including the occiput), false otherwise.
     * @param boosterDamageModifier A damage multiplier to apply for boosters. For a 17% booster, this will be 1.17.
     * @param isStaggerDamage True if the weapon's stagger multiplier should be applied, false otherwise.
     * @returns {string} The damage to be dealt, rounded to two decimal places.
     */
    getDamage(distance, enemyPrecMul, enemyBackMul, isPrec, isBack, boosterDamageModifier, isStaggerDamage = false) {
        let prec = !isPrec || enemyPrecMul == null ? 1 : this.precMul * enemyPrecMul;
        if (prec < 1) prec = 1;
        const back = !isBack || enemyBackMul == null ? 1 : enemyBackMul;
        const stag = !isStaggerDamage ? 1 : this.staggerMul;
        const dist = this.getBaseDamageForDistance(distance);
        return (dist * prec * back * stag * boosterDamageModifier).toFixed(2);
    }

    /**
     * Gets the maximum distance at which this weapon will oneshot an enemy with the given stats. If this will oneshot
     * at any range, then it will return ∞.
     * This function assumes that the enemy *can* be oneshot with the given arguments, and will return meaningless
     * results if not.
     * Note that this function does *not* account for enemy armor.
     * @param enemyHealth The health of the enemy that is hit.
     * @param enemyPrecMul The precision multiplier of the enemy that is hit.
     * @param enemyBackMul The back multiplier of the enemy that is hit.
     * @param isPrec True if the shot is to a precision point (tumor or head), false otherwise.
     * @param isBack True if the shot is to the back of the enemy (including the occiput), false otherwise.
     * @param boosterDamageModifier A damage multiplier (booster) to account for. For a 17% booster, this will be 1.17.
     * @returns {string} The maximum distance at which this enemy will be oneshot to the hitzone described.
     */
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

    /**
     * Gets the base damage for this weapon at the given charge. Does not account for any damage multipliers (back,
     * precision, armor).
     * @param charge The melee charge with which the enemy is hit.
     * @returns {number} The scaled damage at this charge.
     */
    getBaseDamageForCharge(charge) {
        return (this.cDamage - this.lDamage) * (charge**3) + this.lDamage;
    }

    /**
     * Calculates the damage value for an enemy hit with the given stats with the given charge. This does not account
     * for the enemy's armor, but will account for precision shots, back multipliers, and stagger multipliers, depending
     * on the arguments.
     * @param charge The charge with which the enemy is hit.
     * @param enemyPrecMul The precision multiplier of the enemy that is hit.
     * @param enemyBackMul The back multiplier of the enemy that is hit.
     * @param isPrec True if the attack is to a precision point (tumor or head), false otherwise.
     * @param isBack True if the attack is to the back of the enemy (including the occiput), false otherwise.
     * @param isSleeping True if the enemy is sleeping, false otherwise. If true, the weapon's sleeping multiplier is used.
     * @param boosterDamageModifier A damage multiplier to apply for boosters. For a 17% booster, this will be 1.17.
     * @param isStaggerDamage True if the weapon's stagger multiplier should be applied, false otherwise.
     * @returns {string} The damage to be dealt, rounded to two decimal places.
     */
    getDamage(charge, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier, isStaggerDamage = false) {
        let prec = !isPrec || enemyPrecMul == null ? 1 : enemyPrecMul * ((this.cPrecMul - this.lPrecMul) * (charge**3) + this.lPrecMul);
        if (prec < 1) prec = 1;
        const back = !isBack || enemyBackMul == null ? 1 : enemyBackMul * ((this.cBackMul - this.lBackMul) * (charge**3) + this.lBackMul);
        const sleep = !isSleeping ? 1 : (this.cSleepMul - this.lSleepMul) * (charge**3) + this.lSleepMul;
        const stag = !isStaggerDamage ? 1 : (this.cStaggerMul - this.lStaggerMul) * (charge**3) + this.lStaggerMul;
        const baseDamage = this.getBaseDamageForCharge(charge);
        return (baseDamage * prec * back * sleep * stag * boosterDamageModifier).toFixed(2);
    }

    /**
     * Gets the minimum charge at which this weapon will oneshot an enemy with the given stats. If this will oneshot
     * at any charge, then it will return 0.
     * This function assumes that the enemy *can* be oneshot with the given arguments, and will return meaningless
     * results if not.
     * Note that this function does *not* account for enemy armor.
     * @param enemyHealth The health of the enemy that is hit.
     * @param enemyPrecMul The precision multiplier of the enemy that is hit.+
     * @param enemyBackMul The back multiplier of the enemy that is hit.
     * @param isPrec True if the attack is to a precision point (tumor or head), false otherwise.
     * @param isBack True if the attack is to the back of the enemy (including the occiput), false otherwise.
     * @param isSleeping True if the enemy is sleeping, false otherwise. If true, the weapon's sleeping multiplier is used.
     * @param boosterDamageModifier A damage multiplier (booster) to account for. For a 17% booster, this will be 1.17.
     * @returns {number} The minimum charge with which this enemy will be oneshot to the hitzone described.
     */
    getOneshotCharge(enemyHealth, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier) {
        const lightDamage = this.getDamage(0, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier);
        const chargedDamage = this.getDamage(1, enemyPrecMul, enemyBackMul, isPrec, isBack, isSleeping, boosterDamageModifier);
        const charge = ((enemyHealth - lightDamage) / (chargedDamage - lightDamage)) ** (1 / 3);
        return isNaN(charge) ? 0 : charge;
    }
}