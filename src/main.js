import {Gun, Melee} from './calculator.js';

async function loadJson(filename) {
    let response = await fetch("public/data/" + filename);
    return await response.json();
}

const enemySelect = document.getElementById("enemySelect");
const weaponSelect = document.getElementById("weaponSelect");

const weaponTitle = document.getElementById("weaponTitle");
const weaponStatsRows = document.getElementById("weaponStatsRows");
const enemyTitle = document.getElementById("enemyTitle");
const enemyStatsRows = document.getElementById("enemyStatsRows");
let activeWeapon = null;
let activeEnemy = null;

const distanceContainer = document.getElementById("distanceContainer");
const distanceSlider = document.getElementById("distanceSlider");
const distanceLabel = document.getElementById("distanceLabel");
let allowedDistanceMin = 0;
let allowedDistanceMax = 100;

const chargeContainer = document.getElementById("chargeContainer");
const chargeSlider = document.getElementById("chargeSlider");
const chargeLabel = document.getElementById("chargeLabel");

const boosterSlider = document.getElementById("boosterSlider");
const boosterLabel = document.getElementById("boosterLabel");

const resultsContainer = document.getElementById("resultsContainer");

const ONESHOT_COLOR = "#ff7070";
const STAGGER_COLOR = "#5496ff";
const DAMAGE_RANGE_COLOR = "#6effa3";


function createDropdowns() {
    loadJson("melee.json").then(melees => {
        melees.sort((a, b) => a.name.localeCompare(b.name)).forEach(melee => {
            const option = document.createElement("option");
            melee.type = "melee";
            option.value = melee.name;
            option.textContent = melee.name;
            option.info = melee;
            weaponSelect.appendChild(option);
        });
        weaponSelect.addEventListener("change", () => {
            let selected = weaponSelect.selectedOptions[0].textContent;
            let weapon = melees.find(m => m.name === selected);
            if (weapon !== undefined) onChangeWeaponMelee(weapon);
        });
        onChangeWeaponMelee(melees[0]);
        loadJson("guns.json").then(guns => {
            guns.sort((a, b) => a.name.localeCompare(b.name)).forEach(gun => {
                const option = document.createElement("option");
                gun.type = "gun";
                option.value = gun.name;
                option.textContent = gun.name;
                weaponSelect.appendChild(option);
            });
            weaponSelect.addEventListener("change", () => {
                let selected = weaponSelect.selectedOptions[0].textContent;
                let weapon = guns.find(g => g.name === selected);
                if (weapon !== undefined) onChangeWeaponGun(weapon);
            });
            loadJson("enemies.json").then(enemies => {
                enemies.forEach(enemy => {
                    const option = document.createElement("option");
                    option.value = enemy.name;
                    option.textContent = enemy.name;
                    option.info = enemy;
                    enemySelect.appendChild(option);
                });
                enemySelect.addEventListener("change", () => {
                    let selected = enemySelect.selectedOptions[0].textContent;
                    let enemy = enemies.find(e => e.name === selected);
                    if (enemy !== undefined) onChangeEnemy(enemy);
                });
                onChangeEnemy(enemies[0]);
            });
        });
    });
}

function initResultsPanel() {
    distanceSlider.addEventListener("input", () => {
        let value = Number(distanceSlider.value);
        let clampedValue = Math.min(Math.max(value, allowedDistanceMin), allowedDistanceMax);
        distanceSlider.value = clampedValue
        distanceLabel.textContent = `Distance: ${clampedValue}m`;
        updateResults();
    });

    boosterSlider.addEventListener("input", () => {
        let value = Number(boosterSlider.value);
        boosterLabel.textContent = `Damage Booster: ${Math.round(value * 100)}%`;
        updateResults();
    });
    boosterSlider.value = 0;
    boosterLabel.textContent = `Damage Booster: 0%`;

    chargeSlider.addEventListener("input", () => {
        let value = Number(chargeSlider.value);
        chargeLabel.textContent = `Melee Charge: ${Math.round(value * 100)}%`;
        updateResults();
    })
    chargeSlider.value = 100;
    chargeLabel.textContent = "Melee Charge: 100%"
}

function createStatsRow(parent, labelText, valueText) {
    const row = document.createElement("div");
    row.className = "statsRow";
    const label = document.createElement("div");
    label.className = "statsLabel";
    label.textContent = labelText;
    const value = document.createElement("div");
    value.className = "statsValue";
    value.textContent = valueText;

    row.append(label, value)
    parent.appendChild(row);
}

function setAllowedDistance(start, end) {
    allowedDistanceMin = start;
    allowedDistanceMax = end;

    distanceSlider.style.setProperty("--startPct", `${allowedDistanceMin}%`);
    distanceSlider.style.setProperty("--endPct", `${allowedDistanceMax}%`);

    distanceSlider.value = allowedDistanceMin;
    distanceLabel.textContent = `Distance: ${allowedDistanceMin}m`;
}

function onChangeWeaponGun(gun) {
    activeWeapon = new Gun(gun.slot, gun.technicalName, gun.name, gun.damage, gun.staggerMultiplier, gun.precisionMultiplier, gun.falloffStart, gun.falloffEnd);

    distanceContainer.style.display = "block";
    chargeContainer.style.display = "none";

    weaponStatsRows.replaceChildren();
    weaponTitle.textContent = gun.name + " (" + gun.technicalName + ")";

    for (const [label, value] of Object.entries(gun)) {
        if (value === null) continue;
        if (label === "name" || label === "type" || label === "technicalName") continue;
        if (label === "staggerMultiplier" && value === 1) continue;

        const niceLabel = label.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

        createStatsRow(weaponStatsRows, niceLabel, value);
    }

    setAllowedDistance(gun.falloffStart, gun.falloffEnd);

    updateResults();
}

function onChangeWeaponMelee(melee) {
    activeWeapon = new Melee(melee.name, melee.lightDamage, melee.chargedDamage, melee.lightPrecisionMultiplier, melee.chargedPrecisionMultiplier, melee.lightStaggerMultiplier, melee.chargedStaggerMultiplier, melee.lightEnvironmentMultiplier, melee.chargedEnvironmentMultiplier, melee.lightBackstabMultiplier, melee.chargedBackstabMultiplier, melee.lightSleepingMultiplier, melee.chargedSleepingMultiplier, melee.lightStaminaCost, melee.chargedStaminaCost, melee.shoveStaminaCost, melee.chargeTime, melee.autoAttackTime);

    chargeContainer.style.display = "block";
    distanceContainer.style.display = "none";

    weaponStatsRows.replaceChildren();
    weaponTitle.textContent = melee.name;

    let grouped = new Map();
    for (let [label, value] of Object.entries(melee)) {
        if (value === null) continue;
        if (label === "name") continue;
        if (label === "type") continue;

        if (label.startsWith("light")) {
            grouped.set(label.substring(5), value);
            continue;
        } else if (label.startsWith("charged")) {
            label = label.substring(7);
            let light = grouped.get(label);
            if (light !== value) value = light + " - " + value;
        }

        const niceLabel = label.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

        createStatsRow(weaponStatsRows, niceLabel, value);
    }

    updateResults();
}

function onChangeEnemy(enemy) {
    activeEnemy = enemy;

    enemyStatsRows.replaceChildren();
    enemyTitle.textContent = enemy.name;

    for (const [label, value] of Object.entries(enemy)) {
        if (value === null) continue;
        if (label === "name" || label === "hasHead") continue;
        if (label === "backMultiplier" && value === 1) continue;
        if (label === "precisionMultiplier" && value === 1) continue;
        if (label === "hasTumors") continue;

        const niceLabel = label.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

        createStatsRow(enemyStatsRows, niceLabel, value);
    }

    updateResults();
}

function createResultsRow(labelText, valueText, hitsToKill = "", color = null) {
    const row = document.createElement("div");
    row.className = "resultsRow";
    const label = document.createElement("div");
    label.className = "resultsLabel";
    label.textContent = labelText;
    if (color) label.style.color = color;
    const value = document.createElement("div");
    value.className = "resultsValue";
    value.textContent = valueText;
    if (color) value.style.color = color;
    const hits = document.createElement("div");
    hits.className = "resultsHits";
    hits.textContent = hitsToKill;
    if (color) hits.style.color = color;

    row.append(label, value, hits);
    resultsContainer.appendChild(row);
}

function updateResults() {
    if (activeEnemy == null || activeWeapon == null) return;

    resultsContainer.replaceChildren();

    const boosterMultiplier = Number(boosterSlider.value) + 1;

    if (activeWeapon instanceof Gun) {
        const distance = Number(distanceSlider.value);
        let baseDamageDist = activeWeapon.getDamage(distance, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, boosterMultiplier);
        let backDamageDist = activeWeapon.getDamage(distance, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, boosterMultiplier);
        const headDamageDist = activeWeapon.getDamage(distance, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, boosterMultiplier);
        const occiputDamageDist = activeWeapon.getDamage(distance, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, boosterMultiplier);
        let baseDamageSR = activeWeapon.getDamage(0, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, boosterMultiplier);
        let backDamageSR = activeWeapon.getDamage(0, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, boosterMultiplier);
        const headDamageSR = activeWeapon.getDamage(0, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, boosterMultiplier);
        const occiputDamageSR = activeWeapon.getDamage(0, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, boosterMultiplier);
        let baseDamageDistStag = activeWeapon.getDamage(distance, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, boosterMultiplier, true);
        let backDamageDistStag = activeWeapon.getDamage(distance, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, boosterMultiplier, true);
        const headDamageDistStag = activeWeapon.getDamage(distance, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, boosterMultiplier, true);
        const occiputDamageDistStag = activeWeapon.getDamage(distance, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, boosterMultiplier, true);

        if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === true) {
            baseDamageDist = (baseDamageDist * activeEnemy.armorMultiplier).toFixed(2);
            backDamageDist = (backDamageDist * activeEnemy.armorMultiplier).toFixed(2);
            baseDamageSR = (baseDamageSR * activeEnemy.armorMultiplier).toFixed(2);
            backDamageSR = (backDamageSR * activeEnemy.armorMultiplier).toFixed(2);
            baseDamageDistStag = (baseDamageDistStag * activeEnemy.armorMultiplier).toFixed(2);
            backDamageDistStag = (backDamageDistStag * activeEnemy.armorMultiplier).toFixed(2);
        }

        createResultsRow("Base Damage", baseDamageDist, Math.ceil(activeEnemy.health / baseDamageDist) + " hit(s) to kill");
        if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
            createResultsRow("Base Armor Damage", (baseDamageDist * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.health / (baseDamageDist * activeEnemy.armorMultiplier)) + " hit(s) to kill");
        }
        if (activeEnemy.backMultiplier !== 1 && activeEnemy.backMultiplier !== null) {
            createResultsRow("Back Damage", backDamageDist, Math.ceil(activeEnemy.health / backDamageDist) + " hit(s) to kill");
            if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                createResultsRow("Back Armor Damage", (backDamageDist * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.health / (backDamageDist * activeEnemy.armorMultiplier)) + " hit(s) to kill");
            }
        }
        if (activeEnemy.precisionMultiplier !== null) {
            createResultsRow((activeEnemy.hasHead ? "Head" : "Tumor") + " Damage", headDamageDist, Math.ceil(activeEnemy.health / headDamageDist) + " hit(s) to kill");
        }
        if ((activeEnemy.hasHead || activeEnemy.hasTumors) && activeEnemy.backMultiplier !== null) {
            createResultsRow((activeEnemy.hasTumors ? "Back Tumor" : "Occiput") + " Damage", occiputDamageDist, Math.ceil(activeEnemy.health / occiputDamageDist) + " hit(s) to kill");
        }
        if (baseDamageSR >= activeEnemy.health) {
            const baseOneshotDistance = activeWeapon.getOneshotDistance(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, boosterMultiplier);
            createResultsRow("Base Oneshot Distance", baseOneshotDistance + "m", "", ONESHOT_COLOR);
        }
        if (activeEnemy.backMultiplier !== 1 && activeEnemy.backMultiplier !== null && backDamageSR >= activeEnemy.health) {
            const backOneshotDistance = activeWeapon.getOneshotDistance(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, boosterMultiplier);
            createResultsRow("Back Oneshot Distance", backOneshotDistance + "m", "", ONESHOT_COLOR);
        }
        if ((activeEnemy.hasHead || activeEnemy.hasTumors) && headDamageSR >= activeEnemy.health) {
            const headOneshotDistance = activeWeapon.getOneshotDistance(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, boosterMultiplier);
            createResultsRow((activeEnemy.hasHead ? "Head" : "Tumor") + " Oneshot Distance", headOneshotDistance + "m", "", ONESHOT_COLOR);
        }
        if ((activeEnemy.hasHead || activeEnemy.hasTumors) && activeEnemy.backMultiplier !== null && occiputDamageSR >= activeEnemy.health) {
            const occiputOneshotDistance = activeWeapon.getOneshotDistance(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, boosterMultiplier);
            createResultsRow((activeEnemy.hasTumors ? "Back Tumor" : "Occiput") + " Oneshot Distance", occiputOneshotDistance + "m", "", ONESHOT_COLOR);
        }
        if (activeEnemy.staggerHp !== null) {
            createResultsRow("Base Stagger Damage", baseDamageDistStag, Math.ceil(activeEnemy.staggerHp / baseDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
            if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                createResultsRow("Base Armor Stagger Damage", (baseDamageDistStag * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.staggerHp / (baseDamageDistStag * activeEnemy.armorMultiplier)) + " hit(s) to stagger", STAGGER_COLOR);
            }
            if (activeEnemy.backMultiplier !== 1 && activeEnemy.backMultiplier !== null) {
                createResultsRow("Back Stagger Damage", backDamageDistStag, Math.ceil(activeEnemy.staggerHp / backDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
                if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                    createResultsRow("Back Armor Stagger Damage", (backDamageDistStag * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.staggerHp / (backDamageDistStag * activeEnemy.armorMultiplier)) + " hit(s) to stagger", STAGGER_COLOR);
                }
            }
            if (activeEnemy.precisionMultiplier !== null) {
                createResultsRow((activeEnemy.hasHead ? "Head" : "Tumor") + " Stagger Damage", headDamageDistStag, Math.ceil(activeEnemy.staggerHp / headDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
            }
            if ((activeEnemy.hasHead || activeEnemy.hasTumors) && activeEnemy.backMultiplier !== null) {
                createResultsRow((activeEnemy.hasTumors ? "Back Tumor" : "Occiput") + " Stagger Damage", occiputDamageDistStag, Math.ceil(activeEnemy.staggerHp / occiputDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
            }
        }
    } else {
        const charge = Number(chargeSlider.value);
        let baseDamage = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, false, boosterMultiplier);
        let backDamage = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, false, boosterMultiplier);
        const headDamage = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, false, boosterMultiplier);
        const occiputDamage = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, false, boosterMultiplier);
        let baseDamageSleep = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, true, boosterMultiplier);
        let backDamageSleep = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, true, boosterMultiplier);
        const headDamageSleep = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, true, boosterMultiplier);
        const occiputDamageSleep = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, true, boosterMultiplier);
        let baseDamageSleepC = activeWeapon.getDamage(1, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, true, boosterMultiplier);
        let backDamageSleepC = activeWeapon.getDamage(1, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, true, boosterMultiplier);
        const headDamageSleepC = activeWeapon.getDamage(1, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, true, boosterMultiplier);
        const occiputDamageSleepC = activeWeapon.getDamage(1, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, true, boosterMultiplier);
        let baseDamageL = activeWeapon.getDamage(0, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, false, boosterMultiplier);
        let backDamageL = activeWeapon.getDamage(0, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, false, boosterMultiplier);
        const headDamageL = activeWeapon.getDamage(0, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, false, boosterMultiplier);
        const occiputDamageL = activeWeapon.getDamage(0, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, false, boosterMultiplier);
        let baseDamageC = activeWeapon.getDamage(1, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, false, boosterMultiplier);
        let backDamageC = activeWeapon.getDamage(1, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, false, boosterMultiplier);
        const headDamageC = activeWeapon.getDamage(1, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, false, boosterMultiplier);
        const occiputDamageC = activeWeapon.getDamage(1, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, false, boosterMultiplier);
        let baseDamageStag = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, false, boosterMultiplier, true);
        let backDamageStag = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, false, boosterMultiplier, true);
        const headDamageStag = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, false, boosterMultiplier, true);
        const occiputDamageStag = activeWeapon.getDamage(charge, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, false, boosterMultiplier, true);

        if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === true) {
            baseDamage = (baseDamage * activeEnemy.armorMultiplier).toFixed(2);
            backDamage = (baseDamage * activeEnemy.armorMultiplier).toFixed(2);
            baseDamageSleep = (baseDamage * activeEnemy.armorMultiplier).toFixed(2);
            backDamageSleep = (backDamage * activeEnemy.armorMultiplier).toFixed(2);
            baseDamageSleepC = (baseDamageSleepC * activeEnemy.armorMultiplier).toFixed(2);
            backDamageSleepC = (backDamageSleepC * activeEnemy.armorMultiplier).toFixed(2);

            baseDamageL = (baseDamageL * activeEnemy.armorMultiplier).toFixed(2);
            backDamageL = (backDamageL * activeEnemy.armorMultiplier).toFixed(2);
            baseDamageC = (baseDamageC * activeEnemy.armorMultiplier).toFixed(2);
            backDamageC = (backDamageC * activeEnemy.armorMultiplier).toFixed(2);
            baseDamageStag = (baseDamageStag * activeEnemy.armorMultiplier).toFixed(2);
            backDamageStag = (backDamageStag * activeEnemy.armorMultiplier).toFixed(2);
        }

        if (activeWeapon.cSleepMul !== 1) {
            createResultsRow("Base Damage", baseDamage + " (" + baseDamageSleep + " sleeping)", Math.ceil(activeEnemy.health / baseDamage) + " hit(s) to kill");
            if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                createResultsRow("Base Armor Damage", (baseDamage * activeEnemy.armorMultiplier).toFixed(2) + " (" + (baseDamageSleep * activeEnemy.armorMultiplier).toFixed(2) + " sleeping)", Math.ceil(activeEnemy.health / (baseDamage * activeEnemy.armorMultiplier)) + " hit(s) to kill");
            }
        } else {
            createResultsRow("Base Damage", baseDamage, Math.ceil(activeEnemy.health / baseDamage) + " hit(s) to kill");
            if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                createResultsRow("Base Damage", (baseDamage * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.health / (baseDamage * activeEnemy.armorMultiplier)) + " hit(s) to kill");
            }
        }
        if (activeEnemy.backMultiplier !== 1 && activeEnemy.backMultiplier !== null) {
            if (activeWeapon.cSleepMul !== 1) {
                createResultsRow("Back Damage", backDamage + " (" + backDamageSleep + " sleeping)", Math.ceil(activeEnemy.health / backDamage) + " hit(s) to kill");
                if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                    createResultsRow("Back Armor Damage", (backDamage * activeEnemy.armorMultiplier).toFixed(2) + " (" + (backDamageSleep * activeEnemy.armorMultiplier).toFixed(2) + " sleeping)", Math.ceil(activeEnemy.health / (backDamage * activeEnemy.armorMultiplier)) + " hit(s) to kill");
                }
            } else {
                createResultsRow("Back Damage", backDamage, Math.ceil(activeEnemy.health / backDamage) + " hit(s) to kill");
                if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                    createResultsRow("Back Armor Damage", (backDamage * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.health / (backDamage * activeEnemy.armorMultiplier)) + " hit(s) to kill");
                }
            }
        }
        if (activeEnemy.precisionMultiplier !== null) {
            if (activeWeapon.cSleepMul !== 1) {
                createResultsRow((activeEnemy.hasHead ? "Head" : "Tumor") + " Damage", headDamage + " (" + headDamageSleep + " sleeping)", Math.ceil(activeEnemy.health / headDamage) + " hit(s) to kill");
            } else {
                createResultsRow((activeEnemy.hasHead ? "Head" : "Tumor") + " Damage", headDamage, Math.ceil(activeEnemy.health / headDamage) + " hit(s) to kill");
            }
        }
        if ((activeEnemy.hasHead || activeEnemy.hasTumors) && activeEnemy.backMultiplier !== null) {
            if (activeWeapon.cSleepMul !== 1) {
                createResultsRow((activeEnemy.hasTumors ? "Back Tumors" : "Occiput") + " Damage", occiputDamage + " (" + occiputDamageSleep + " sleeping)", Math.ceil(activeEnemy.health / occiputDamage) + " hit(s) to kill");
            } else {
                createResultsRow((activeEnemy.hasTumors ? "Back Tumors" : "Occiput") + " Damage", occiputDamage, Math.ceil(activeEnemy.health / occiputDamage) + " hit(s) to kill");
            }
        }
        createResultsRow("Base Damage Range", baseDamageL + "-" + baseDamageC, "", DAMAGE_RANGE_COLOR);
        if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
            createResultsRow("Base Armor Damage Range", (baseDamageL * activeEnemy.armorMultiplier).toFixed(2) + "-" + (baseDamageC * activeEnemy.armorMultiplier).toFixed(2), "", DAMAGE_RANGE_COLOR);
        }
        if (activeEnemy.backMultiplier !== 1 && activeEnemy.backMultiplier !== null) {
            createResultsRow("Back Damage Range", backDamageL + "-" + backDamageC, "", DAMAGE_RANGE_COLOR);
            if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                createResultsRow("Back Armor Damage Range", (backDamageL * activeEnemy.armorMultiplier).toFixed(2) + "-" + (backDamageC * activeEnemy.armorMultiplier).toFixed(2), "", DAMAGE_RANGE_COLOR);
            }
        }
        if (activeEnemy.precisionMultiplier !== null) {
            createResultsRow((activeEnemy.hasHead ? "Head" : "Tumor") + " Damage Range", headDamageL + "-" + headDamageC, "", DAMAGE_RANGE_COLOR);
        }
        if ((activeEnemy.hasHead || activeEnemy.hasTumors) && activeEnemy.backMultiplier !== null) {
            createResultsRow((activeEnemy.hasTumors ? "Back Tumor" : "Occiput") + " Damage Range", occiputDamageL + "-" + occiputDamageC, "", DAMAGE_RANGE_COLOR);
        }
        if (baseDamageC >= activeEnemy.health || baseDamageSleepC >= activeEnemy.health) {
            const baseOneshotCharge = activeWeapon.getOneshotCharge(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, false, boosterMultiplier);
            if (activeWeapon.cSleepMul !== 1) {
                const baseOneshotChargeSleep = (activeWeapon.getOneshotCharge(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, true, boosterMultiplier) * 100).toFixed(2);
                let display;
                if (baseDamageC < activeEnemy.health) {
                    display = baseOneshotChargeSleep + "%* (while sleeping)"
                } else if (baseDamageSleepC < activeEnemy.health) {
                    display = (baseOneshotCharge * 100).toFixed(2) + "%"
                } else {
                    display = (baseOneshotCharge * 100).toFixed(2) + "% (" + baseOneshotChargeSleep + "% sleeping)"
                }
                createResultsRow("Base Oneshot Charge", display, "", ONESHOT_COLOR);
            } else {
                createResultsRow("Base Oneshot Charge", (baseOneshotCharge * 100).toFixed(2) + "%", "", ONESHOT_COLOR);
            }
        }
        if (activeEnemy.backMultiplier !== 1 && activeEnemy.backMultiplier !== null && (backDamageC >= activeEnemy.health || backDamageSleepC >= activeEnemy.health)) {
            const backOneshotCharge = activeWeapon.getOneshotCharge(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, false, boosterMultiplier);
            if (activeWeapon.cSleepMul !== 1) {
                const backOneshotChargeSleep = (activeWeapon.getOneshotCharge(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, true, boosterMultiplier) * 100).toFixed(2);
                let display;
                if (baseDamageC < activeEnemy.health) {
                    display = backOneshotChargeSleep + "%* (while sleeping)"
                } else if (baseDamageSleepC < activeEnemy.health) {
                    display = (backOneshotCharge * 100).toFixed(2) + "%"
                } else {
                    display = (backOneshotCharge * 100).toFixed(2) + "% (" + backOneshotChargeSleep + "% sleeping)"
                }
                createResultsRow("Back Oneshot Charge", display, "", ONESHOT_COLOR);
            } else {
                createResultsRow("Back Oneshot Charge", (backOneshotCharge * 100).toFixed(2) + "%", "", ONESHOT_COLOR);
            }
        }
        if (activeEnemy.precisionMultiplier !== null && (headDamageC >= activeEnemy.health || headDamageSleepC >= activeEnemy.health)) {
            const headOneshotCharge = activeWeapon.getOneshotCharge(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, false, boosterMultiplier);
            if (activeWeapon.cSleepMul !== 1) {
                const headOneshotChargeSleep = (activeWeapon.getOneshotCharge(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, true, boosterMultiplier) * 100).toFixed(2);
                let display;
                if (headDamageC < activeEnemy.health) {
                    display = headOneshotChargeSleep + "%* (while sleeping)"
                } else if (headDamageSleepC < activeEnemy.health) {
                    display = (headOneshotCharge * 100).toFixed(2) + "%"
                } else {
                    display = (headOneshotCharge * 100).toFixed(2) + "% (" + headOneshotChargeSleep + "% sleeping)"
                }
                createResultsRow((activeEnemy.hasTumors ? "Tumor" : "Head") + " Oneshot Charge", display, "", ONESHOT_COLOR);
            } else {
                createResultsRow((activeEnemy.hasTumors ? "Tumor" : "Head") + " Oneshot Charge", (headOneshotCharge * 100).toFixed(2) + "%", "", ONESHOT_COLOR);
            }
        }
        if ((activeEnemy.hasHead || activeEnemy.hasTumors) && activeEnemy.backMultiplier !== null && (occiputDamageC >= activeEnemy.health || occiputDamageSleepC >= activeEnemy.health)) {
            const occiputOneshotCharge = activeWeapon.getOneshotCharge(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, false, boosterMultiplier);
            if (activeWeapon.cSleepMul !== 1) {
                const occiputOneshotChargeSleep = (activeWeapon.getOneshotCharge(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, true, boosterMultiplier) * 100).toFixed(2);
                let display;
                if (headDamageC < activeEnemy.health) {
                    display = occiputOneshotChargeSleep + "%* (while sleeping)"
                } else if (headDamageSleepC < activeEnemy.health) {
                    display = (occiputOneshotCharge * 100).toFixed(2) + "%"
                } else {
                    display = (occiputOneshotCharge * 100).toFixed(2) + "% (" + occiputOneshotChargeSleep + "% sleeping)"
                }
                createResultsRow((activeEnemy.hasTumors ? "Back Tumor" : "Occiput") + " Oneshot Charge", display, "", ONESHOT_COLOR);
            } else {
                createResultsRow((activeEnemy.hasTumors ? "Back Tumor" : "Occiput") + " Oneshot Charge", (occiputOneshotCharge * 100).toFixed(2) + "%", "", ONESHOT_COLOR);
            }
        }
        if (activeEnemy.staggerHp !== null) {
            createResultsRow("Base Stagger Damage", baseDamageStag, Math.ceil(activeEnemy.staggerHp / baseDamageStag) + " hit(s) to stagger", STAGGER_COLOR);
            if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                createResultsRow("Base Armor Stagger Damage", (baseDamageStag * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.staggerHp / (baseDamageStag * activeEnemy.armorMultiplier)) + " hit(s) to stagger", STAGGER_COLOR);
            }
            if (activeEnemy.backMultiplier !== 1 && activeEnemy.backMultiplier !== null) {
                createResultsRow("Back Stagger Damage", backDamageStag, Math.ceil(activeEnemy.staggerHp / backDamageStag) + " hit(s) to stagger", STAGGER_COLOR);
                if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                    createResultsRow("Back Armor Stagger Damage", (backDamageStag * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.staggerHp / (backDamageStag * activeEnemy.armorMultiplier)) + " hit(s) to stagger", STAGGER_COLOR);
                }
            }
            if (activeEnemy.precisionMultiplier !== null) {
                createResultsRow((activeEnemy.hasHead ? "Head" : "Tumor") + " Stagger Damage", headDamageStag, Math.ceil(activeEnemy.staggerHp / headDamageStag) + " hit(s) to stagger", STAGGER_COLOR);
            }
            if ((activeEnemy.hasHead || activeEnemy.hasTumors) && activeEnemy.backMultiplier !== null) {
                createResultsRow((activeEnemy.hasTumors ? "Back Tumor" : "Occiput") + " Stagger Damage", occiputDamageStag, Math.ceil(activeEnemy.staggerHp / occiputDamageStag) + " hit(s) to stagger", STAGGER_COLOR);
            }
        }
    }
}

function setup() {
    createDropdowns();
    initResultsPanel();
}

setup();