import {Gun, Melee} from './calculator.js';

async function loadJson(filename) {
    let response = await fetch("public/data/" + filename);
    return await response.json();
}

const enemySelect = document.getElementById("enemySelect"); // dropdown for selecting enemy
const weaponSelect = document.getElementById("weaponSelect"); // dropdown for selecting weapon

const weaponTitle = document.getElementById("weaponTitle"); // used to display the selected weapon
const weaponStatsRows = document.getElementById("weaponStatsRows"); // div for weapon stats
const enemyTitle = document.getElementById("enemyTitle"); // used to display the selected enemy
const enemyStatsRows = document.getElementById("enemyStatsRows"); // div for enemy stats
let activeWeapon = null; // active weapon object is saved here
let activeEnemy = null; // active enemy object is saved here

const distanceContainer = document.getElementById("distanceContainer"); // distance related stuff is stored in this div
const distanceSlider = document.getElementById("distanceSlider");
const distanceLabel = document.getElementById("distanceLabel");
let allowedDistanceMin = 0;
let allowedDistanceMax = 100; // this is the highest falloff end that any vanilla weapon has

const chargeContainer = document.getElementById("chargeContainer"); // charge related stuff is stored in this div
const chargeSlider = document.getElementById("chargeSlider");
const chargeLabel = document.getElementById("chargeLabel");

const boosterSlider = document.getElementById("boosterSlider"); // booster related stuff is stored in this div
const boosterLabel = document.getElementById("boosterLabel");

const resultsContainer = document.getElementById("resultsContainer"); // results are put in this div

const ONESHOT_COLOR = "#ff7070"; // used for oneshot charge for melee, and oneshot distance for guns
const STAGGER_COLOR = "#5496ff"; // used for stagger damage
const DAMAGE_RANGE_COLOR = "#6effa3"; // used for the range of damages based on charge/distance

/**
 * Populates the dropdowns for both weapons and enemies based on the contents of enemies.json, melee.json, guns.json,
 * and tools.json.
 * The enemies dropdown is sorted based on their position in enemies.json
 * The weapons dropdown puts melees at the top, then guns, then sentries, with each group in alphabetical order.
 * These files are read asynchronously, and then onChangeWeapon and onChangeEnemy are called to show the initial results.
 * After this is run, the selected enemy will be the Striker, and the selected weapon will be the Bat as these are the
 * first options in their respective dropdowns.
 */
function createDropdowns() {
    // Start by loading the melee weapons, since these are at the top of the weapons list
    loadJson("melee.json").then(melees => {
        melees.sort((a, b) => a.name.localeCompare(b.name)).forEach(melee => {
            // Create the new option
            const option = document.createElement("option");
            melee.type = "melee";
            option.value = melee.name;
            option.textContent = melee.name;
            option.info = melee;
            weaponSelect.appendChild(option);
        });
        // Add a listener for weapon changes. This *will* be called when anything from the dropdown is selected, it
        // will not do anything unless the selected weapon was a melee.
        weaponSelect.addEventListener("change", () => {
            let selected = weaponSelect.selectedOptions[0].textContent;
            let weapon = melees.find(m => m.name === selected);
            if (weapon !== undefined) onChangeWeaponMelee(weapon);
        });
        // Set the active weapon to the first melee (the Bat)
        onChangeWeaponMelee(melees[0]);

        // Next, load the guns, since these are next in the weapons list.
        loadJson("guns.json").then(guns => {
            guns.sort((a, b) => a.name.localeCompare(b.name)).forEach(gun => {
                // Create the new option
                const option = document.createElement("option");
                gun.type = "gun";
                option.value = gun.name;
                option.textContent = gun.name;
                weaponSelect.appendChild(option);
            });
            // Add a listener for weapon changes. This *will* be called when anything from the dropdown is selected, it
            // will not do anything unless the selected weapon was a gun.
            weaponSelect.addEventListener("change", () => {
                let selected = weaponSelect.selectedOptions[0].textContent;
                let weapon = guns.find(g => g.name === selected);
                if (weapon !== undefined) onChangeWeaponGun(weapon);
            });
            // Next, load the tools, since these are at the bottom of the weapons list
            loadJson("tools.json").then(sentries => {
                sentries.forEach(sentry => {
                    // Create the new option
                    const option = document.createElement("option");
                    sentry.type = "tool";
                    option.value = sentry.name;
                    option.textContent = sentry.name;
                    weaponSelect.appendChild(option);
                });
                // Add a listener for weapon changes. This *will* be called when anything from the dropdown is selected,
                // it will not do anything unless the selected weapon was a sentry, although sentries and guns are
                // treated identically in this section of the code.
                weaponSelect.addEventListener("change", () => {
                    let selected = weaponSelect.selectedOptions[0].textContent;
                    let weapon = sentries.find(g => g.name === selected);
                    if (weapon !== undefined) onChangeWeaponGun(weapon);
                });
                // Lastly, load the enemies.
                loadJson("enemies.json").then(enemies => {
                    enemies.forEach(enemy => {
                        // Create the new option
                        const option = document.createElement("option");
                        option.value = enemy.name;
                        option.textContent = enemy.name;
                        option.info = enemy;
                        enemySelect.appendChild(option);
                    });
                    // Add a listener for enemy changes.
                    enemySelect.addEventListener("change", () => {
                        let selected = enemySelect.selectedOptions[0].textContent;
                        let enemy = enemies.find(e => e.name === selected);
                        if (enemy !== undefined) onChangeEnemy(enemy);
                    });
                    onChangeEnemy(enemies[0]);
                });
            });

        });
    });
}

/**
 * Initialises the distance, booster, and charge sliders that are used for various weapons. These will be enabled or
 * disabled elsewhere as required, but are all initialised here.
 */
function initResultsPanel() {
    // Define a listener for the distance slider
    distanceSlider.addEventListener("input", () => {
        let value = Number(distanceSlider.value);
        // Clamp the value to be between the active weapon's falloff start and end
        let clampedValue = Math.min(Math.max(value, allowedDistanceMin), allowedDistanceMax);
        distanceSlider.value = clampedValue
        distanceLabel.textContent = `Distance: ${clampedValue}m`;
        // Update the results panel with the new distance value
        updateResults();
    });

    // Define a listener for the booster slider
    boosterSlider.addEventListener("input", () => {
        let value = Number(boosterSlider.value);
        boosterLabel.textContent = `Damage Booster: ${Math.round(value * 100)}%`;
        // Update the results panel with the new booster value
        updateResults();
    });
    // Initialise the booster slider to 0%
    boosterSlider.value = 0;
    boosterLabel.textContent = `Damage Booster: 0%`;

    // Define a listener for the charge slider
    chargeSlider.addEventListener("input", () => {
        let value = Number(chargeSlider.value);
        chargeLabel.textContent = `Melee Charge: ${Math.round(value * 100)}%`;
        // Update the results panel with the new charge value
        updateResults();
    })
    // Initialise the charge slider to 100% (fully charged)
    chargeSlider.value = 100;
    chargeLabel.textContent = "Melee Charge: 100%"
}

/**
 * Creates a new row in the stats panel.
 * @param parent The div to set the new row to be a child of (weaponStatsRows or enemyStatsRows, generally)
 * @param labelText The label for the entry (displayed on the left)
 * @param valueText The value for the entry (displayed on the right)
 */
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

/**
 * Updates the allowed distance for the selected gun's start and end falloff ranges.
 * @param start The falloff start of the weapon
 * @param end The falloff end of the weapon
 */
function setAllowedDistance(start, end) {
    allowedDistanceMin = start;
    allowedDistanceMax = end;

    distanceSlider.style.setProperty("--startPct", `${allowedDistanceMin}%`);
    distanceSlider.style.setProperty("--endPct", `${allowedDistanceMax}%`);

    distanceSlider.value = allowedDistanceMin;
    distanceLabel.textContent = `Distance: ${allowedDistanceMin}m`;
}

function setAllowedDistanceCustom(custom_type) {
    if (custom_type === "mine_deployer") {
        setAllowedDistance(3, 15);
    } else if (custom_type === "explosive_tripmine") {
        setAllowedDistance(2.5, 12);
    }
}

/**
 * Called when the user changes the selected weapon and the new weapon is a gun (main or special weapon) or a tool.
 * This function will clear and regenerate the entire results panel, and will update the distance slider to the new
 * falloff start and end values.
 * This function takes the json object directly from guns.json or tools.json, and will convert it into a Gun object.
 * @param gun The object for this gun/tool, as represented in guns.json or tools.json.
 */
function onChangeWeaponGun(gun) {
    // Convert the json object into a Gun object.
    activeWeapon = new Gun(gun.slot, gun.technicalName, gun.name, gun.damage, gun.staggerMultiplier, gun.precisionMultiplier, gun.hasBackDamage, gun.falloffStart, gun.falloffEnd);

    // Show the distance slider and hide the charge slider.
    distanceContainer.style.display = "block";
    chargeContainer.style.display = "none";

    // Clear all existing rows from the results panel
    weaponStatsRows.replaceChildren();
    // Update the selected weapon text
    weaponTitle.textContent = gun.name;
    if (gun.technicalName !== null) weaponTitle.textContent += " (" + gun.technicalName + ")"

    for (const [label, value] of Object.entries(gun)) {
        if (value === null) continue; // Ignore any null values
        if (label === "name" || label === "type" || label === "technicalName") continue; // These are displayed elsewhere already
        if (label === "staggerMultiplier" && value === 1) continue; // If the stagger multiplier is 1, then don't display anything for it
        if (label === "hasBackDamage" || (label === "falloffStart" && typeof value === "string") || (label === "falloffEnd" && typeof value === "string")) continue;

        // Convert the label from camel case to sentence case to make it look better when displayed
        const niceLabel = label.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

        // Create the new row for this stat
        createStatsRow(weaponStatsRows, niceLabel, value);
    }

    // Update te allowed range on the distance slider
    if (gun.falloffStart === null || gun.falloffEnd === null) {
        distanceContainer.style.display = "none";
    } else if (typeof gun.falloffStart === "string") {
        distanceContainer.style.display = "block";
        setAllowedDistanceCustom(gun.falloffStart);
    } else {
        distanceContainer.style.display = "block";
        setAllowedDistance(gun.falloffStart, gun.falloffEnd);
    }

    // Update the results panel with the new information
    updateResults();
}

/**
 * Called when the user changes the selected weapon and the new weapon is a melee.
 * This function will clear and regenerate the entire stats panel.
 * This function takes the json object directly from melee.json, and will convert it into an actual Melee object.
 * @param melee The object for this melee, as represented in melee.json.
 */
function onChangeWeaponMelee(melee) {
    // Convert the json object into a Melee object
    activeWeapon = new Melee(melee.name, melee.lightDamage, melee.chargedDamage, melee.lightPrecisionMultiplier, melee.chargedPrecisionMultiplier, melee.lightStaggerMultiplier, melee.chargedStaggerMultiplier, melee.lightEnvironmentMultiplier, melee.chargedEnvironmentMultiplier, melee.lightBackstabMultiplier, melee.chargedBackstabMultiplier, melee.lightSleepingMultiplier, melee.chargedSleepingMultiplier, melee.lightStaminaCost, melee.chargedStaminaCost, melee.shoveStaminaCost, melee.chargeTime, melee.autoAttackTime);

    // Show the charge slider and hide the distance slider
    chargeContainer.style.display = "block";
    distanceContainer.style.display = "none";

    // Clear all existing rows from the results panel
    weaponStatsRows.replaceChildren();
    // Update the selected weapon text
    weaponTitle.textContent = melee.name;

    let grouped = new Map();
    for (let [label, value] of Object.entries(melee)) {
        if (value === null) continue; // Ignore any null values
        if (label === "name" || label === "type") continue; // These are displayed elsewhere already

        if (label.startsWith("light")) {
            // If the label starts with 'light' then assume it will have a corresponding 'charged' value.
            // Remember this value until the matching 'charged' value is found.
            grouped.set(label.substring(5), value);
            continue;
        } else if (label.startsWith("charged")) {
            // If the label starts with 'charged' then assume it had a corresponding 'light' value.
            // Note that this method assumes 'light' values are always above the corresponding 'charged' value in the
            // json data.
            label = label.substring(7); // don't display the 'charged' part of the label, only the relevant part
            // Get the 'light' value from earlier
            let light = grouped.get(label);
            // If a 'light' value was found, then set the value variable as "lightValue - chargedValue"
            if (light !== value) value = light + " - " + value;
        }

        // Convert the label from camel case to sentence case to make it look better when displayed
        const niceLabel = label.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

        // Create the new row for this stat
        createStatsRow(weaponStatsRows, niceLabel, value);
    }

    // Update the results panel with the new information
    updateResults();
}

/**
 * Called when the user changes the selected enemy.
 * This function will clear and regenerate the entire stats panel.
 * This function takes the json object directly from enemies.json, and uses it as-is (does NOT convert it).
 * @param enemy The object for this enemy, as represented in enemies.json.
 */
function onChangeEnemy(enemy) {
    activeEnemy = enemy;

    // Clear all existing rows from the results panel
    enemyStatsRows.replaceChildren();
    // Update the selected enemy text
    enemyTitle.textContent = enemy.name;

    for (const [label, value] of Object.entries(enemy)) {
        if (value === null) continue; // Ignore any null values
        if (label === "name") continue; // This is displayed elsewhere already
        if (label === "backMultiplier" && value === 1) continue; // If the stagger multiplier is 1, then don't display anything for it
        if (label === "precisionMultiplier" && value === 1) continue; // If the precision multiplier is 1, then don't display anything for it
        if (label === "hasTumors" || label === "hasHead" || label === "wholeBodyArmor") continue; // These are only used for deciding what to display

        // Convert the label from camel case to sentence case to make it look better when displayed
        const niceLabel = label.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());

        // Create the new row for this stat
        createStatsRow(enemyStatsRows, niceLabel, value);
    }

    // Update the results panel with the new information
    updateResults();
}

/**
 * Adds a new row to the results panel. The color of the text in the row will be set to the given color value.
 * @param labelText The label of the row (displayed on the left; first column).
 * @param valueText The value to be displayed (second column).
 * @param hitsToKill Additional text to be displayed (displayed on the right; third column).
 * @param color The color to be used for this row. Generally, one of ONESHOT_COLOR, STAGGER_COLOR, or DAMAGE_RANGE_COLOR
 */
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

/**
 * Updates the results panel to contain the new information. Will redo all relevant calculations based on the selected
 * weapon and enemy, or will do nothing if either is null.
 */
function updateResults() {
    // If either are null, then no data can be created, so don't do anything.
    if (activeEnemy == null || activeWeapon == null) return;

    // Clear all existing results rows.
    resultsContainer.replaceChildren();

    // A booster value of, 17%, for example, corresponds to 1.17x multiplier
    const boosterMultiplier = Number(boosterSlider.value) + 1;

    // If the active weapon is a Gun, then gun-related information needs to be displayed.
    if (activeWeapon instanceof Gun) {
        // Perform calculations for the results panel.
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

        // If the enemy has armor over its entire body excluding the precision points, then multiply all base/back damage by the armor value.
        if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === true) {
            baseDamageDist = (baseDamageDist * activeEnemy.armorMultiplier).toFixed(2);
            backDamageDist = (backDamageDist * activeEnemy.armorMultiplier).toFixed(2);
            baseDamageSR = (baseDamageSR * activeEnemy.armorMultiplier).toFixed(2);
            backDamageSR = (backDamageSR * activeEnemy.armorMultiplier).toFixed(2);
            baseDamageDistStag = (baseDamageDistStag * activeEnemy.armorMultiplier).toFixed(2);
            backDamageDistStag = (backDamageDistStag * activeEnemy.armorMultiplier).toFixed(2);
        }

        // Damage to each hit zone based on the variable distance.
        createResultsRow("Base Damage", baseDamageDist, Math.ceil(activeEnemy.health / baseDamageDist) + " hit(s) to kill");
        if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
            createResultsRow("Base Armor Damage", (baseDamageDist * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.health / (baseDamageDist * activeEnemy.armorMultiplier)) + " hit(s) to kill");
        }
        if (activeWeapon.hasBackDamage && activeEnemy.backMultiplier !== 1 && activeEnemy.backMultiplier !== null) {
            createResultsRow("Back Damage", backDamageDist, Math.ceil(activeEnemy.health / backDamageDist) + " hit(s) to kill");
            if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                createResultsRow("Back Armor Damage", (backDamageDist * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.health / (backDamageDist * activeEnemy.armorMultiplier)) + " hit(s) to kill");
            }
        }
        if (activeEnemy.precisionMultiplier !== null) {
            createResultsRow((activeEnemy.hasHead ? "Head" : "Tumor") + " Damage", headDamageDist, Math.ceil(activeEnemy.health / headDamageDist) + " hit(s) to kill");
        }
        if (activeWeapon.hasBackDamage && (activeEnemy.hasHead || activeEnemy.hasTumors) && activeEnemy.backMultiplier !== null) {
            createResultsRow((activeEnemy.hasTumors ? "Back Tumor" : "Occiput") + " Damage", occiputDamageDist, Math.ceil(activeEnemy.health / occiputDamageDist) + " hit(s) to kill");
        }

        // The distance at which a weapon can oneshot an enemy to each hit zone
        if (activeWeapon.falloffStart !== null && activeWeapon.falloffEnd !== null) {
            if (baseDamageSR >= activeEnemy.health) {
                const baseOneshotDistance = activeWeapon.getOneshotDistance(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, false, boosterMultiplier);
                createResultsRow("Base Oneshot Distance", baseOneshotDistance + "m", "", ONESHOT_COLOR);
            }
            if (activeWeapon.hasBackDamage && activeEnemy.backMultiplier !== 1 && activeEnemy.backMultiplier !== null && backDamageSR >= activeEnemy.health) {
                const backOneshotDistance = activeWeapon.getOneshotDistance(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, false, true, boosterMultiplier);
                createResultsRow("Back Oneshot Distance", backOneshotDistance + "m", "", ONESHOT_COLOR);
            }
            if ((activeEnemy.hasHead || activeEnemy.hasTumors) && headDamageSR >= activeEnemy.health) {
                const headOneshotDistance = activeWeapon.getOneshotDistance(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, false, boosterMultiplier);
                createResultsRow((activeEnemy.hasHead ? "Head" : "Tumor") + " Oneshot Distance", headOneshotDistance + "m", "", ONESHOT_COLOR);
            }
            if (activeWeapon.hasBackDamage && (activeEnemy.hasHead || activeEnemy.hasTumors) && activeEnemy.backMultiplier !== null && occiputDamageSR >= activeEnemy.health) {
                const occiputOneshotDistance = activeWeapon.getOneshotDistance(activeEnemy.health, activeEnemy.precisionMultiplier, activeEnemy.backMultiplier, true, true, boosterMultiplier);
                createResultsRow((activeEnemy.hasTumors ? "Back Tumor" : "Occiput") + " Oneshot Distance", occiputOneshotDistance + "m", "", ONESHOT_COLOR);
            }
        }

        // Stagger damage to each hit zone based on the variable distance (only if this enemy can be staggered).
        if (activeEnemy.staggerHp !== null) {
            createResultsRow("Base Stagger Damage", baseDamageDistStag, Math.ceil(activeEnemy.staggerHp / baseDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
            if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                createResultsRow("Base Armor Stagger Damage", (baseDamageDistStag * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.staggerHp / (baseDamageDistStag * activeEnemy.armorMultiplier)) + " hit(s) to stagger", STAGGER_COLOR);
            }
            if (activeWeapon.hasBackDamage && activeEnemy.backMultiplier !== 1 && activeEnemy.backMultiplier !== null) {
                createResultsRow("Back Stagger Damage", backDamageDistStag, Math.ceil(activeEnemy.staggerHp / backDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
                if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                    createResultsRow("Back Armor Stagger Damage", (backDamageDistStag * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.staggerHp / (backDamageDistStag * activeEnemy.armorMultiplier)) + " hit(s) to stagger", STAGGER_COLOR);
                }
            }
            if (activeEnemy.precisionMultiplier !== null) {
                createResultsRow((activeEnemy.hasHead ? "Head" : "Tumor") + " Stagger Damage", headDamageDistStag, Math.ceil(activeEnemy.staggerHp / headDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
            }
            if (activeWeapon.hasBackDamage && (activeEnemy.hasHead || activeEnemy.hasTumors) && activeEnemy.backMultiplier !== null) {
                createResultsRow((activeEnemy.hasTumors ? "Back Tumor" : "Occiput") + " Stagger Damage", occiputDamageDistStag, Math.ceil(activeEnemy.staggerHp / occiputDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
            }
        }
    } else {
        // The weapon is a melee, so melee-related information is displayed.

        // Perform all calculations for the results panel.
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

        // If the enemy has armor over its entire body excluding the precision points, then multiply all base/back damage by the armor value.
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

        // Damage to each hit zone based on the variable charge.
        if (activeWeapon.cSleepMul !== 1) {
            createResultsRow("Base Damage", baseDamage + " (" + baseDamageSleep + " sleeping)", Math.ceil(activeEnemy.health / baseDamage) + " hit(s) to kill");
            if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                createResultsRow("Base Armor Damage", (baseDamage * activeEnemy.armorMultiplier).toFixed(2) + " (" + (baseDamageSleep * activeEnemy.armorMultiplier).toFixed(2) + " sleeping)", Math.ceil(activeEnemy.health / (baseDamage * activeEnemy.armorMultiplier)) + " hit(s) to kill");
            }
        } else {
            createResultsRow("Base Damage", baseDamage, Math.ceil(activeEnemy.health / baseDamage) + " hit(s) to kill");
            if (activeEnemy.armorMultiplier !== null && activeEnemy.wholeBodyArmor === false) {
                createResultsRow("Base Armor Damage", (baseDamage * activeEnemy.armorMultiplier).toFixed(2), Math.ceil(activeEnemy.health / (baseDamage * activeEnemy.armorMultiplier)) + " hit(s) to kill");
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

        // Damage ranges (light attack to charged) for each hit zone.
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

        // The charge required to oneshot this enemy to each hit zone
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

        // Stagger damage to each hit zone based on the variable distance (only if this enemy can be staggered).
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