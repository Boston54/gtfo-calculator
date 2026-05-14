import {Gun, Melee} from './calculator.js';
import {loadAllData, loadJson, OptionType, VANILLA_NAMESPACE} from './datablocks.js';
import {loadBuiltInNamespaces} from './namespaces.js';

const enemySelect = document.getElementById("enemySelect"); // dropdown for selecting enemy
const weaponSelect = document.getElementById("weaponSelect"); // dropdown for selecting weapon

const namespaceSelect = document.getElementById("namespaceSelect"); // dropdown for selecting namespace

const weaponTitle = document.getElementById("weaponTitle"); // used to display the selected weapon
const weaponStatsRows = document.getElementById("weaponStatsRows"); // div for weapon stats
const enemyTitle = document.getElementById("enemyTitle"); // used to display the selected enemy
const enemyStatsRows = document.getElementById("enemyStatsRows"); // div for enemy stats
let activeWeapon = null; // active weapon object is saved here
let activeEnemy = null; // active enemy object is saved here

const distanceContainer = document.getElementById("distanceContainer"); // distance related stuff is stored in this div
const distanceSlider = document.getElementById("distanceSlider");
const distanceLabel = document.getElementById("distanceLabel");
const FALLOFF_SLIDER_DEFAULT_MAX = 100; // this is the highest falloff end that any vanilla weapon has
let allowedDistanceMin = 0;
let allowedDistanceMax = FALLOFF_SLIDER_DEFAULT_MAX;

const chargeContainer = document.getElementById("chargeContainer"); // charge related stuff is stored in this div
const chargeSlider = document.getElementById("chargeSlider");
const chargeLabel = document.getElementById("chargeLabel");

const boosterSlider = document.getElementById("boosterSlider"); // booster related stuff is stored in this div
const boosterLabel = document.getElementById("boosterLabel");

const resultsContainer = document.getElementById("resultsContainer"); // results are put in this div

const ONESHOT_COLOR = "#ff7070"; // used for oneshot charge for melee, and oneshot distance for guns
const STAGGER_COLOR = "#5496ff"; // used for stagger damage
const DAMAGE_RANGE_COLOR = "#6effa3"; // used for the range of damages based on charge/distance

const DISPLAY_DATA_PATH = "dataDisplayConfig.json";

/**
 * Populates the dropdowns for the weapons and enemies dropdowns based on the datablocks that are present in the given
 * namespace.
 * The weapons dropdown puts melees at the top, then guns, then sentries, with each group in alphabetical order.
 * These files are read asynchronously, and then onChangeWeapon and onChangeEnemy are called to show the initial results.
 * Also reads the displayDataConfig file and saves its data in the displayData variable.
 * @param datablockNamespace The folder to get the datablock from. "vanilla" by default, meaning the vanilla datablocks.
 */
function updateDropdowns(datablockNamespace = VANILLA_NAMESPACE) {
    // Clear the dropdowns, stats, and results rows.
    weaponSelect.replaceChildren();
    enemySelect.replaceChildren();
    weaponStatsRows.replaceChildren();
    enemyStatsRows.replaceChildren();
    resultsContainer.replaceChildren();

    // The data for actually displaying the data needs to be loaded before the datablocks themselves.
    loadJson(DISPLAY_DATA_PATH).then(dispData => {
        // Load all the datablocks
        loadAllData(datablockNamespace).then(data => {
            // Add the melees
            data.melees.sort((a, b) => a.PublicName.localeCompare(b.PublicName)).forEach(melee => {
                // Create the option
                const option = document.createElement("option");
                option.value = melee.PublicName;
                option.textContent = melee.PublicName;
                option.info = melee;
                weaponSelect.appendChild(option);
            });

            // Add a listener for the weapon changes. This will be called when anything from the dropdown is selected, but
            // will only do anything if the selected weapon was a melee.
            weaponSelect.addEventListener("change", () => {
                let selected = weaponSelect.selectedOptions[0].info;
                if (selected.OptionType === OptionType.MELEE) {
                    onChangeWeaponMelee(dispData, selected);
                }
            });
            // Set the active weapon to the first entry in the melees datablock.
            onChangeWeaponMelee(dispData, data.melees[0])

            // Next, add the guns and tools
            data.weapons.sort((a, b) => a.PublicName.localeCompare(b.PublicName)).forEach(weapon => {
                // Create the option
                const option = document.createElement("option");
                option.value = weapon.PublicName;
                option.textContent = weapon.PublicName;
                option.info = weapon;
                weaponSelect.appendChild(option);
            });

            // Mines are not defined in datablocks and need to be added manually
            data.mines.forEach(mine => {
                // Create the option
                const option = document.createElement("option");
                option.value = mine.PublicName;
                option.textContent = mine.PublicName;
                option.info = mine;
                weaponSelect.appendChild(option);
            });

            // Add a listener for the weapon changes. This will be called when anything from the dropdown is selected,
            // but will only do anything if the selected weapon was a gun.
            weaponSelect.addEventListener("change", () => {
                let selected = weaponSelect.selectedOptions[0].info;
                if (selected.OptionType === OptionType.GUN) {
                    onChangeWeaponGun(dispData, selected);
                }
            });

            // Next, add the enemies
            data.enemies.sort((a, b) => a.PublicName.localeCompare(b.PublicName)).forEach(enemy => {
                // Create the new option
                const option = document.createElement("option");
                option.value = enemy.PublicName;
                option.textContent = enemy.PublicName;
                option.info = enemy;
                enemySelect.appendChild(option);
            });
            // Add a listener for enemy changes.
            enemySelect.addEventListener("change", () => {
                let selected = enemySelect.selectedOptions[0].info;
                onChangeEnemy(dispData, selected);
            });

            const initialEnemy = data.enemies[0];
            onChangeEnemy(dispData, initialEnemy);
        }).catch(error => {
            console.error("Failed while updating dropdowns:", error);
        });
    }).catch(error => {
        console.error("Failed while updating dropdowns:", error);
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
 * Loads the built-in namespaces and populates the dropdown menu to allow switching between them.
 */
function initNamespacesDropdown() {
    loadBuiltInNamespaces().then(namespaces => {
        namespaces.forEach(namespace => {
            const option = document.createElement("option");
            option.value = namespace.name;
            option.textContent = namespace.alias;
            namespaceSelect.appendChild(option);
        });

        namespaceSelect.addEventListener("change", () => {
            const newNamespace = namespaceSelect.selectedOptions[0].value;
            updateDropdowns(newNamespace);
        });
    });
}

/**
 * Creates a new row in the stats panel.
 * @param parent The div to set the new row to be a child of (weaponStatsRows or enemyStatsRows, generally)
 * @param labelText The label for the entry (displayed on the left)
 * @param valueText The value for the entry (displayed on the right)
 * @param hoverText Text to be displayed when the entry is hovered. If this is null, then no text will be displayed.
 */
function createStatsRow(parent, labelText, valueText, hoverText) {
    const row = document.createElement("div");
    row.className = "statsRow";

    if (hoverText !== null) {
        row.dataset.tooltip = hoverText;
    }

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

    const sliderMax = Math.max(FALLOFF_SLIDER_DEFAULT_MAX, end);

    distanceSlider.min = 0;
    distanceSlider.max = sliderMax;
    distanceSlider.value = start;

    distanceSlider.style.setProperty("--startPct", `${(start / sliderMax) * 100}%`);
    distanceSlider.style.setProperty("--endPct", `${(end / sliderMax) * 100}%`);

    distanceLabel.textContent = `Distance: ${allowedDistanceMin}m`;
}

/**
 * Given an object and a key, returns the value for the given key. The key can contain '.' characters that will be
 * treated as further keys for a nested object.
 * @param block The object to get the value from
 * @param key The key to use in the object
 * @returns The value associated with the given key at the appropriate depth.
 */
function getValueFromObject(block, key) {
    const firstSeparator = key.indexOf(".");
    if (firstSeparator !== -1) {
        return getValueFromObject(block[key.substring(0, firstSeparator)], key.substring(firstSeparator + 1));
    } else {
        return block[key];
    }
}

/**
 * Creates and appends a stats row in the given div that displays the data outlined in the given rowData and defined in
 * the given datablockEntry.
 * @param rowsDiv The parent for the rows where the stats will be displayed. Example, weaponStatsRows.
 * @param rowData The loaded data to be displayed on this row, as an entry from dataDisplayConfig.json.
 * @param datablockEntry The loaded datablock to extract the information from as defined in the given rowData.
 */
function createRowFromDatablock(rowsDiv, rowData, datablockEntry) {
    // Check the onlyIf condition and return if it is not met
    if (rowData.onlyIf) {
        const onlyIfKeyValue = getValueFromObject(datablockEntry, rowData.onlyIf.name);
        const condition = rowData.onlyIf.condition;
        // "bool" condition: only if the key value is true
        if (condition === "bool") {
            if (!onlyIfKeyValue) {
                return;
            }
        // "notEqual" condition: only if the key value is not equal to the provided value
        } else if (condition === "notEqual") {
            if (onlyIfKeyValue === rowData.onlyIf.value) {
                return;
            }
        }
    }

    // Gather some other data from the object and assign fallbacks for if they are not present
    const unit = rowData.units ?? "";
    const label = rowData.alias ?? rowData.name;
    const multiplier = rowData.multiplier ?? 1;
    let value;

    if (rowData.name) {
        // This is a single value to be displayed
        value = (getValueFromObject(datablockEntry, rowData.name) * multiplier) + unit;

        if (rowData.multiplyByPellets && datablockEntry.ShotgunBulletCount !== 0) {
            // handle the multiplyByPellets option
            value = value + " (" + (getValueFromObject(datablockEntry, rowData.name).toFixed(2) * multiplier * datablockEntry.ShotgunBulletCount) + " total)";
        }
    } else if (rowData.names) {
        // Get the raw values
        const values = rowData.names.map(k => {
            return getValueFromObject(datablockEntry, k);
        });

        // Turn these into a single value string to be displayed
        if (rowData.mode === "range") {
            const ranges = values.map(v => (v * multiplier) + unit);
            if (ranges.every(v => v === ranges[0])) {
                // All values in the range are the same, ignore the range and just use a single value
                value = ranges[0];
            } else {
                value = ranges.join(" - ");
            }
        } else if (rowData.mode === "sum") {
            value = (values.reduce((accumulator, currentValue) => accumulator + currentValue, 0) * multiplier) + unit;
        }
    }

    const hoverText = rowData.description ?? null;

    // Create the row
    createStatsRow(rowsDiv, label, value, hoverText);
}

/**
 * Called when the user changes the selected weapon and the new weapon is a gun.
 * This function will clear and regenerate the entire stats panel.
 * This function takes an entry of the `gun` array or the 'mine' array as returned from the loadAllData() function.
 * @param displayData The loaded json from displayDataConfig.json
 * @param weapon The object for this weapon, as constructed by loadAllData().
 */
function onChangeWeaponGun(displayData, weapon) {
    activeWeapon = new Gun(weapon, weapon.TechnicalName, weapon.PublicName, weapon.Damage, weapon.StaggerDamageMulti, weapon.PrecisionDamageMulti, weapon.DamageFalloff.x, weapon.DamageFalloff.y, weapon.ShotgunBulletCount);

    // Show the distance slider and hide the charge slider.
    distanceContainer.style.display = "block";
    chargeContainer.style.display = "none";

    // Clear all existing rows from the results panel
    weaponStatsRows.replaceChildren();
    // Update the selected weapon text
    weaponTitle.textContent = weapon.PublicName;
    if (weapon.TechnicalName !== null) weaponTitle.textContent += " (" + weapon.TechnicalName + ")"

    if (weapon.OptionType === OptionType.SENTRY) {
        displayData.sentry.forEach(rowData => {
            createRowFromDatablock(weaponStatsRows, rowData, weapon);
        });
    } else if (weapon.OptionType === OptionType.GUN) {
        displayData.gun.forEach(rowData => {
            createRowFromDatablock(weaponStatsRows, rowData, weapon);
        });
    }

    // Update the allowed range on the distance slider
    const falloffStart = weapon.DamageFalloff.x;
    const falloffEnd = weapon.DamageFalloff.y;
    if (falloffStart === null || falloffEnd === null) {
        distanceSlider.max = FALLOFF_SLIDER_DEFAULT_MAX;
        distanceContainer.style.display = "none";
    } else {
        distanceContainer.style.display = "block";
        setAllowedDistance(falloffStart, falloffEnd);
    }

    // Update the results panel with the new information
    updateResults();
}

/**
 * Called when the user changes the selected weapon and the new weapon is a melee.
 * This function will clear and regenerate the entire stats panel.
 * This function takes an entry of the `melees` array as returned from the loadAllData() function.
 * @param displayData The loaded json from displayDataConfig.json
 * @param melee The object for this melee, as constructed by loadAllData().
 */
function onChangeWeaponMelee(displayData, melee) {
    activeWeapon = new Melee(melee, melee.PublicName, melee.LightAttackDamage, melee.ChargedAttackDamage, melee.LightPrecisionMulti, melee.ChargedPrecisionMulti, melee.LightStaggerMulti, melee.ChargedStaggerMulti, melee.LightEnvironmentMulti, melee.ChargedEnvironmentMulti, melee.LightBackstabberMulti, melee.ChargedBackstabberMulti, melee.LightSleeperMulti, melee.ChargedSleeperMulti, melee.LightAttackStaminaCost.baseStaminaCostInCombat, melee.ChargedAttackStaminaCost.baseStaminaCostInCombat, melee.PushStaminaCost.baseStaminaCostInCombat, melee.chargeTime, melee.autoAttackTime);

    // Show the charge slider and hide the distance slider
    chargeContainer.style.display = "block";
    distanceContainer.style.display = "none";

    // Clear all existing rows from the results panel
    weaponStatsRows.replaceChildren();
    // Update the selected weapon text
    weaponTitle.textContent = melee.PublicName;

    displayData.melee.forEach(rowData => {
        createRowFromDatablock(weaponStatsRows, rowData, melee);
    });

    // Update the results panel with the new information
    updateResults();
}

/**
 * Called when the user changes the selected enemy.
 * This function will clear and regenerate the entire stats panel.
 * This function takes an entry of the `enemies` array as returned from the loadAllData() function.
 * @param displayData The loaded json from displayDataConfig.json
 * @param enemy The object for this enemy, as constructed by loadAllData().
 */
function onChangeEnemy(displayData, enemy) {
    activeEnemy = enemy;

    // Clear all existing rows from the results panel
    enemyStatsRows.replaceChildren();
    // Update the selected enemy text
    enemyTitle.textContent = enemy.PublicName;

    displayData.enemy.forEach(rowData => {
        createRowFromDatablock(enemyStatsRows, rowData, enemy);
    });

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

    const enemyHealth = activeEnemy.Health.HealthMax;
    const enemyStaggerHealth = activeEnemy.Health.DamageUntilHitreact;
    const enemyPrecisionMult = activeEnemy.Health.WeakspotDamageMulti;
    let hasBackDamage = activeEnemy.AllowDamgeBonusFromBehind;
    const enemyBackMult = hasBackDamage ? 2 : 1;
    const enemyArmorMult = activeEnemy.Health.ArmorDamageMulti;
    let hasPrecisionPoints = activeEnemy.Calculator_HasPrecisionPoints ?? true;
    const hasArmor = activeEnemy.Calculator_HasArmor ?? activeEnemy.Health.ArmorDamageMulti !== 1
    const hasTumors = activeEnemy.Calculator_HasTumors ?? false;
    const weaponPellets = activeWeapon.pelletCount === 0 ? 1 : activeWeapon.pelletCount;

    // If the active weapon is a Gun, then gun-related information needs to be displayed.
    if (activeWeapon instanceof Gun) {
        // Perform calculations for the results panel.
        const distance = Number(distanceSlider.value);
        let baseDamageDist = activeWeapon.getDamage(distance, enemyPrecisionMult, enemyBackMult, false, false, boosterMultiplier);
        let backDamageDist = activeWeapon.getDamage(distance, enemyPrecisionMult, enemyBackMult, false, true, boosterMultiplier);
        let headDamageDist = activeWeapon.getDamage(distance, enemyPrecisionMult, enemyBackMult, true, false, boosterMultiplier);
        let occiputDamageDist = activeWeapon.getDamage(distance, enemyPrecisionMult, enemyBackMult, true, true, boosterMultiplier);
        let baseDamageSR = activeWeapon.getDamage(0, enemyPrecisionMult, enemyBackMult, false, false, boosterMultiplier);
        let backDamageSR = activeWeapon.getDamage(0, enemyPrecisionMult, enemyBackMult, false, true, boosterMultiplier);
        let headDamageSR = activeWeapon.getDamage(0, enemyPrecisionMult, enemyBackMult, true, false, boosterMultiplier);
        let occiputDamageSR = activeWeapon.getDamage(0, enemyPrecisionMult, enemyBackMult, true, true, boosterMultiplier);
        let baseDamageDistStag = activeWeapon.getDamage(distance, enemyPrecisionMult, enemyBackMult, false, false, boosterMultiplier, true);
        let backDamageDistStag = activeWeapon.getDamage(distance, enemyPrecisionMult, enemyBackMult, false, true, boosterMultiplier, true);
        let headDamageDistStag = activeWeapon.getDamage(distance, enemyPrecisionMult, enemyBackMult, true, false, boosterMultiplier, true);
        let occiputDamageDistStag = activeWeapon.getDamage(distance, enemyPrecisionMult, enemyBackMult, true, true, boosterMultiplier, true);

        // Account for tumour damage caps
        const tumorCap = (activeEnemy.Health.BodypartHealth + 1) * weaponPellets;
        const tumorStaggerCap = tumorCap * activeWeapon.staggerMul * weaponPellets;
        if (hasTumors) {
            headDamageDist = Math.min(headDamageDist, tumorCap);
            occiputDamageDist = Math.min(occiputDamageDist, tumorCap);
            headDamageSR = Math.min(headDamageSR, tumorCap);
            occiputDamageSR = Math.min(occiputDamageSR, tumorCap);
            headDamageDistStag = Math.min(headDamageDistStag, tumorStaggerCap);
            occiputDamageDistStag = Math.min(occiputDamageDistStag, tumorStaggerCap);
        }

        // Mines do not deal back damage
        const isMine = activeWeapon.datablock.Calculator_isMine ?? false;
        if (isMine) {
            hasBackDamage = false;
        }

        // Damage to each hit zone based on the variable distance.
        if (hasArmor) {
            createResultsRow("Base Armor Damage", (baseDamageDist * enemyArmorMult).toFixed(2), Math.ceil(enemyHealth / (baseDamageDist * enemyArmorMult)) + " hit(s) to kill");
        } else {
            createResultsRow("Base Damage", baseDamageDist, Math.ceil(enemyHealth / baseDamageDist) + " hit(s) to kill");
        }
        if (hasBackDamage) {
            if (hasArmor) {
                createResultsRow("Back Armor Damage", (backDamageDist * enemyArmorMult).toFixed(2), Math.ceil(enemyHealth / (backDamageDist * enemyArmorMult)) + " hit(s) to kill");
            } else {
                createResultsRow("Back Damage", backDamageDist, Math.ceil(enemyHealth / backDamageDist) + " hit(s) to kill");
            }
        }
        if (hasPrecisionPoints) {
            createResultsRow((hasTumors ? "Tumor" : "Head") + " Damage", headDamageDist + (hasTumors && headDamageDist === tumorCap ? " (capped)" : ""), Math.ceil(enemyHealth / headDamageDist) + " hit(s) to kill");
        }
        if (hasPrecisionPoints && hasBackDamage) {
            createResultsRow((hasTumors ? "Back Tumor" : "Occiput") + " Damage", occiputDamageDist + (hasTumors && occiputDamageDist === tumorCap ? " (capped)" : ""), Math.ceil(enemyHealth / occiputDamageDist) + " hit(s) to kill");
        }

        // The distance at which a weapon can oneshot an enemy to each hit zone
        if (activeWeapon.falloffStart !== null && activeWeapon.falloffEnd !== null) {
            if (baseDamageSR >= enemyHealth) {
                const baseOneshotDistance = activeWeapon.getOneshotDistance(enemyHealth, enemyPrecisionMult, enemyBackMult, false, false, boosterMultiplier);
                createResultsRow("Base Oneshot Distance", baseOneshotDistance + "m", "", ONESHOT_COLOR);
            }
            if (hasBackDamage && backDamageSR >= enemyHealth) {
                const backOneshotDistance = activeWeapon.getOneshotDistance(enemyHealth, enemyPrecisionMult, enemyBackMult, false, true, boosterMultiplier);
                createResultsRow("Back Oneshot Distance", backOneshotDistance + "m", "", ONESHOT_COLOR);
            }
            if (hasPrecisionPoints && headDamageSR >= enemyHealth) {
                const headOneshotDistance = activeWeapon.getOneshotDistance(hasTumors ? Math.min(enemyHealth, tumorCap) : enemyHealth, enemyPrecisionMult, enemyBackMult, true, false, boosterMultiplier);
                createResultsRow((hasTumors ? "Tumor" : "Head") + " Oneshot Distance", headOneshotDistance + "m", "", ONESHOT_COLOR);
            }
            if (hasBackDamage && hasPrecisionPoints && occiputDamageSR >= enemyHealth) {
                const occiputOneshotDistance = activeWeapon.getOneshotDistance(hasTumors ? Math.min(enemyHealth, tumorCap) : enemyHealth, enemyPrecisionMult, enemyBackMult, true, true, boosterMultiplier);
                createResultsRow((hasTumors ? "Back Tumor" : "Occiput") + " Oneshot Distance", occiputOneshotDistance + "m", "", ONESHOT_COLOR);
            }
        }

        // Stagger damage to each hit zone based on the variable distance (only if this enemy can be staggered).
        if (hasArmor) {
            createResultsRow("Base Armor Stagger Damage", (baseDamageDistStag * enemyArmorMult).toFixed(2), Math.ceil(enemyStaggerHealth / (baseDamageDistStag * enemyArmorMult)) + " hit(s) to stagger", STAGGER_COLOR);
        } else {
            createResultsRow("Base Stagger Damage", baseDamageDistStag, Math.ceil(enemyStaggerHealth / baseDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
        }
        if (hasBackDamage) {
            if (hasArmor) {
                createResultsRow("Back Armor Stagger Damage", (backDamageDistStag * enemyArmorMult).toFixed(2), Math.ceil(enemyStaggerHealth / (backDamageDistStag * enemyArmorMult)) + " hit(s) to stagger", STAGGER_COLOR);
            } else {
                createResultsRow("Back Stagger Damage", backDamageDistStag, Math.ceil(enemyStaggerHealth / backDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
            }
        }
        if (hasPrecisionPoints) {
            createResultsRow((hasTumors ? "Tumor" : "Head") + " Stagger Damage", headDamageDistStag + (hasTumors && headDamageDistStag === tumorStaggerCap ? " (capped)" : ""), Math.ceil(enemyStaggerHealth / headDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
        }
        if (hasBackDamage && hasPrecisionPoints) {
            createResultsRow((hasTumors ? "Back Tumor" : "Occiput") + " Stagger Damage", occiputDamageDistStag + (hasTumors && occiputDamageDistStag === tumorStaggerCap ? " (capped)" : ""), Math.ceil(enemyStaggerHealth / occiputDamageDistStag) + " hit(s) to stagger", STAGGER_COLOR);
        }
    } else {
        // The weapon is a melee, so melee-related information is displayed.

        // Perform all calculations for the results panel.
        const charge = Number(chargeSlider.value);
        let baseDamage = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, false, false, false, boosterMultiplier);
        let backDamage = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, false, true, false, boosterMultiplier);
        let headDamage = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, true, false, false, boosterMultiplier);
        let occiputDamage = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, true, true, false, boosterMultiplier);
        let baseDamageSleep = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, false, false, true, boosterMultiplier);
        let backDamageSleep = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, false, true, true, boosterMultiplier);
        let headDamageSleep = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, true, false, true, boosterMultiplier);
        let occiputDamageSleep = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, true, true, true, boosterMultiplier);
        let baseDamageSleepC = activeWeapon.getDamage(1, enemyPrecisionMult, enemyBackMult, false, false, true, boosterMultiplier);
        let backDamageSleepC = activeWeapon.getDamage(1, enemyPrecisionMult, enemyBackMult, false, true, true, boosterMultiplier);
        let headDamageSleepC = activeWeapon.getDamage(1, enemyPrecisionMult, enemyBackMult, true, false, true, boosterMultiplier);
        let occiputDamageSleepC = activeWeapon.getDamage(1, enemyPrecisionMult, enemyBackMult, true, true, true, boosterMultiplier);
        let baseDamageL = activeWeapon.getDamage(0, enemyPrecisionMult, enemyBackMult, false, false, false, boosterMultiplier);
        let backDamageL = activeWeapon.getDamage(0, enemyPrecisionMult, enemyBackMult, false, true, false, boosterMultiplier);
        let headDamageL = activeWeapon.getDamage(0, enemyPrecisionMult, enemyBackMult, true, false, false, boosterMultiplier);
        let occiputDamageL = activeWeapon.getDamage(0, enemyPrecisionMult, enemyBackMult, true, true, false, boosterMultiplier);
        let baseDamageC = activeWeapon.getDamage(1, enemyPrecisionMult, enemyBackMult, false, false, false, boosterMultiplier);
        let backDamageC = activeWeapon.getDamage(1, enemyPrecisionMult, enemyBackMult, false, true, false, boosterMultiplier);
        let headDamageC = activeWeapon.getDamage(1, enemyPrecisionMult, enemyBackMult, true, false, false, boosterMultiplier);
        let occiputDamageC = activeWeapon.getDamage(1, enemyPrecisionMult, enemyBackMult, true, true, false, boosterMultiplier);
        let baseDamageStag = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, false, false, false, boosterMultiplier, true);
        let backDamageStag = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, false, true, false, boosterMultiplier, true);
        let headDamageStag = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, true, false, false, boosterMultiplier, true);
        let occiputDamageStag = activeWeapon.getDamage(charge, enemyPrecisionMult, enemyBackMult, true, true, false, boosterMultiplier, true);

        // Account for tumour damage caps
        const meleeStaggerMul = (activeWeapon.cStaggerMul - activeWeapon.lStaggerMul) * (charge ** 3) + activeWeapon.lStaggerMul;
        const tumorCap = activeEnemy.Health.BodypartHealth + 1;
        const tumorStaggerCap = tumorCap * meleeStaggerMul;
        if (hasTumors) {
            headDamage = Math.min(headDamage, tumorCap);
            occiputDamage = Math.min(occiputDamage, tumorCap);
            headDamageSleep = Math.min(headDamageSleep, tumorCap);
            occiputDamageSleep = Math.min(occiputDamageSleep, tumorCap);
            headDamageSleepC = Math.min(headDamageSleepC, tumorCap);
            occiputDamageSleepC = Math.min(occiputDamageSleepC, tumorCap);
            headDamageL = Math.min(headDamageL, tumorCap);
            occiputDamageL = Math.min(occiputDamageL, tumorCap);
            headDamageC = Math.min(headDamageC, tumorCap);
            occiputDamageC = Math.min(occiputDamageC, tumorCap);
            headDamageStag = Math.min(headDamageStag, tumorStaggerCap);
            occiputDamageStag = Math.min(occiputDamageStag, tumorStaggerCap);
        }

        // Damage to each hit zone based on the variable charge.
        if (activeWeapon.cSleepMul !== 1) {
            if (hasArmor) {
                createResultsRow("Base Armor Damage", (baseDamage * enemyArmorMult).toFixed(2) + " (" + (baseDamageSleep * enemyArmorMult).toFixed(2) + " sleeping)", Math.ceil(enemyHealth / (baseDamage * enemyArmorMult)) + " hit(s) to kill");
            } else {
                createResultsRow("Base Damage", baseDamage + " (" + baseDamageSleep + " sleeping)", Math.ceil(enemyHealth / baseDamage) + " hit(s) to kill");
            }
        } else {
            if (hasArmor) {
                createResultsRow("Base Armor Damage", (baseDamage * enemyArmorMult).toFixed(2), Math.ceil(enemyHealth / (baseDamage * enemyArmorMult)) + " hit(s) to kill");
            } else {
                createResultsRow("Base Damage", baseDamage, Math.ceil(enemyHealth / baseDamage) + " hit(s) to kill");
            }
        }
        if (hasBackDamage) {
            if (activeWeapon.cSleepMul !== 1) {
                if (hasArmor) {
                    createResultsRow("Back Armor Damage", (backDamage * enemyArmorMult).toFixed(2) + " (" + (backDamageSleep * enemyArmorMult).toFixed(2) + " sleeping)", Math.ceil(enemyHealth / (backDamage * enemyArmorMult)) + " hit(s) to kill");
                } else {
                    createResultsRow("Back Damage", backDamage + " (" + backDamageSleep + " sleeping)", Math.ceil(enemyHealth / backDamage) + " hit(s) to kill");
                }
            } else {
                if (hasArmor) {
                    createResultsRow("Back Armor Damage", (backDamage * enemyArmorMult).toFixed(2), Math.ceil(enemyHealth / (backDamage * enemyArmorMult)) + " hit(s) to kill");
                } else {
                    createResultsRow("Back Damage", backDamage, Math.ceil(enemyHealth / backDamage) + " hit(s) to kill");
                }
            }
        }
        if (hasPrecisionPoints) {
            if (activeWeapon.cSleepMul !== 1) {
                createResultsRow((hasTumors ? "Tumor" : "Head") + " Damage", headDamage + " (" + headDamageSleep + " sleeping)" + (hasTumors && headDamage === tumorCap ? " (capped)" : ""), Math.ceil(enemyHealth / headDamage) + " hit(s) to kill");
            } else {
                createResultsRow((hasTumors ? "Tumor" : "Head") + " Damage", headDamage + (hasTumors && headDamage === tumorCap ? " (capped)" : ""), Math.ceil(enemyHealth / headDamage) + " hit(s) to kill");
            }
        }
        if (hasPrecisionPoints && hasBackDamage) {
            if (activeWeapon.cSleepMul !== 1) {
                createResultsRow((hasTumors ? "Back Tumors" : "Occiput") + " Damage", occiputDamage + " (" + occiputDamageSleep + " sleeping)" + (hasTumors && occiputDamage === tumorCap ? " (capped)" : ""), Math.ceil(enemyHealth / occiputDamage) + " hit(s) to kill");
            } else {
                createResultsRow((hasTumors ? "Back Tumors" : "Occiput") + " Damage", occiputDamage + (hasTumors && occiputDamage === tumorCap ? " (capped)" : ""), Math.ceil(enemyHealth / occiputDamage) + " hit(s) to kill");
            }
        }

        // Damage ranges (light attack to charged) for each hit zone.
        if (hasArmor) {
            createResultsRow("Base Armor Damage Range", (baseDamageL * enemyArmorMult).toFixed(2) + "-" + (baseDamageC * enemyArmorMult).toFixed(2), "", DAMAGE_RANGE_COLOR);
        } else {
            createResultsRow("Base Damage Range", baseDamageL + "-" + baseDamageC, "", DAMAGE_RANGE_COLOR);
        }
        if (hasBackDamage) {
            if (hasArmor) {
                createResultsRow("Back Armor Damage Range", (backDamageL * enemyArmorMult).toFixed(2) + "-" + (backDamageC * enemyArmorMult).toFixed(2), "", DAMAGE_RANGE_COLOR);
            } else {
                createResultsRow("Back Damage Range", backDamageL + "-" + backDamageC, "", DAMAGE_RANGE_COLOR);
            }
        }
        if (hasPrecisionPoints) {
            createResultsRow((hasTumors ? "Tumor" : "Head") + " Damage Range", headDamageL + "-" + headDamageC + (hasTumors && headDamageC === tumorCap ? " (capped)" : ""), "", DAMAGE_RANGE_COLOR);
        }
        if (hasPrecisionPoints && hasBackDamage) {
            createResultsRow((hasTumors ? "Back Tumor" : "Occiput") + " Damage Range", occiputDamageL + "-" + occiputDamageC + (hasTumors && occiputDamageC === tumorCap ? " (capped)" : ""), "", DAMAGE_RANGE_COLOR);
        }

        // The charge required to oneshot this enemy to each hit zone
        if (baseDamageC >= enemyHealth || baseDamageSleepC >= enemyHealth) {
            const baseOneshotCharge = activeWeapon.getOneshotCharge(enemyHealth, enemyPrecisionMult, enemyBackMult, false, false, false, boosterMultiplier);
            if (activeWeapon.cSleepMul !== 1) {
                const baseOneshotChargeSleep = (activeWeapon.getOneshotCharge(enemyHealth, enemyPrecisionMult, enemyBackMult, false, false, true, boosterMultiplier) * 100).toFixed(2);
                let display;
                if (baseDamageC < enemyHealth) {
                    display = baseOneshotChargeSleep + "%* (while sleeping)"
                } else if (baseDamageSleepC < enemyHealth) {
                    display = (baseOneshotCharge * 100).toFixed(2) + "%"
                } else {
                    display = (baseOneshotCharge * 100).toFixed(2) + "% (" + baseOneshotChargeSleep + "% sleeping)"
                }
                createResultsRow("Base Oneshot Charge", display, "", ONESHOT_COLOR);
            } else {
                createResultsRow("Base Oneshot Charge", (baseOneshotCharge * 100).toFixed(2) + "%", "", ONESHOT_COLOR);
            }
        }
        if (hasBackDamage && (backDamageC >= enemyHealth || backDamageSleepC >= enemyHealth)) {
            const backOneshotCharge = activeWeapon.getOneshotCharge(enemyHealth, enemyPrecisionMult, enemyBackMult, false, true, false, boosterMultiplier);
            if (activeWeapon.cSleepMul !== 1) {
                const backOneshotChargeSleep = (activeWeapon.getOneshotCharge(enemyHealth, enemyPrecisionMult, enemyBackMult, false, true, true, boosterMultiplier) * 100).toFixed(2);
                let display;
                if (baseDamageC < enemyHealth) {
                    display = backOneshotChargeSleep + "%* (while sleeping)"
                } else if (baseDamageSleepC < enemyHealth) {
                    display = (backOneshotCharge * 100).toFixed(2) + "%"
                } else {
                    display = (backOneshotCharge * 100).toFixed(2) + "% (" + backOneshotChargeSleep + "% sleeping)"
                }
                createResultsRow("Back Oneshot Charge", display, "", ONESHOT_COLOR);
            } else {
                createResultsRow("Back Oneshot Charge", (backOneshotCharge * 100).toFixed(2) + "%", "", ONESHOT_COLOR);
            }
        }
        if (hasPrecisionPoints && (headDamageC >= enemyHealth || headDamageSleepC >= enemyHealth)) {
            const headOneshotCharge = activeWeapon.getOneshotCharge(hasTumors ? Math.min(enemyHealth, tumorCap) : enemyHealth, enemyPrecisionMult, enemyBackMult, true, false, false, boosterMultiplier);
            if (activeWeapon.cSleepMul !== 1) {
                const headOneshotChargeSleep = (activeWeapon.getOneshotCharge(hasTumors ? Math.min(enemyHealth, tumorCap) : enemyHealth, enemyPrecisionMult, enemyBackMult, true, false, true, boosterMultiplier) * 100).toFixed(2);
                let display;
                if (headDamageC < enemyHealth) {
                    display = headOneshotChargeSleep + "%* (while sleeping)"
                } else if (headDamageSleepC < enemyHealth) {
                    display = (headOneshotCharge * 100).toFixed(2) + "%"
                } else {
                    display = (headOneshotCharge * 100).toFixed(2) + "% (" + headOneshotChargeSleep + "% sleeping)"
                }
                createResultsRow((hasTumors ? "Tumor" : "Head") + " Oneshot Charge", display, "", ONESHOT_COLOR);
            } else {
                createResultsRow((hasTumors ? "Tumor" : "Head") + " Oneshot Charge", (headOneshotCharge * 100).toFixed(2) + "%", "", ONESHOT_COLOR);
            }
        }
        if (hasPrecisionPoints && hasBackDamage && (occiputDamageC >= enemyHealth || occiputDamageSleepC >= enemyHealth)) {
            const occiputOneshotCharge = activeWeapon.getOneshotCharge(hasTumors ? Math.min(enemyHealth, tumorCap) : enemyHealth, enemyPrecisionMult, enemyBackMult, true, true, false, boosterMultiplier);
            if (activeWeapon.cSleepMul !== 1) {
                const occiputOneshotChargeSleep = (activeWeapon.getOneshotCharge(hasTumors ? Math.min(enemyHealth, tumorCap) : enemyHealth, enemyPrecisionMult, enemyBackMult, true, true, true, boosterMultiplier) * 100).toFixed(2);
                let display;
                if (headDamageC < enemyHealth) {
                    display = occiputOneshotChargeSleep + "%* (while sleeping)"
                } else if (headDamageSleepC < enemyHealth) {
                    display = (occiputOneshotCharge * 100).toFixed(2) + "%"
                } else {
                    display = (occiputOneshotCharge * 100).toFixed(2) + "% (" + occiputOneshotChargeSleep + "% sleeping)"
                }
                createResultsRow((hasTumors ? "Back Tumor" : "Occiput") + " Oneshot Charge", display, "", ONESHOT_COLOR);
            } else {
                createResultsRow((hasTumors ? "Back Tumor" : "Occiput") + " Oneshot Charge", (occiputOneshotCharge * 100).toFixed(2) + "%", "", ONESHOT_COLOR);
            }
        }

        // Stagger damage to each hit zone based on the variable distance (only if this enemy can be staggered).
        if (hasArmor) {
            createResultsRow("Base Armor Stagger Damage", (baseDamageStag * enemyArmorMult).toFixed(2), Math.ceil(enemyStaggerHealth / (baseDamageStag * enemyArmorMult)) + " hit(s) to stagger", STAGGER_COLOR);
        } else {
            createResultsRow("Base Stagger Damage", baseDamageStag, Math.ceil(enemyStaggerHealth / baseDamageStag) + " hit(s) to stagger", STAGGER_COLOR);
        }
        if (hasBackDamage) {
            if (hasArmor) {
                createResultsRow("Back Armor Stagger Damage", (backDamageStag * enemyArmorMult).toFixed(2), Math.ceil(enemyStaggerHealth / (backDamageStag * enemyArmorMult)) + " hit(s) to stagger", STAGGER_COLOR);
            } else {
                createResultsRow("Back Stagger Damage", backDamageStag, Math.ceil(enemyStaggerHealth / backDamageStag) + " hit(s) to stagger", STAGGER_COLOR);
            }
        }
        if (hasPrecisionPoints) {
            createResultsRow((hasTumors ? "Tumor" : "Head") + " Stagger Damage", headDamageStag + (hasTumors && headDamageStag === tumorStaggerCap ? " (capped)" : ""), Math.ceil(enemyStaggerHealth / headDamageStag) + " hit(s) to stagger", STAGGER_COLOR);
        }
        if (hasPrecisionPoints && hasBackDamage) {
            createResultsRow((hasTumors ? "Back Tumor" : "Occiput") + " Stagger Damage", occiputDamageStag + (hasTumors && occiputDamageStag === tumorStaggerCap ? " (capped)" : ""), Math.ceil(enemyStaggerHealth / occiputDamageStag) + " hit(s) to stagger", STAGGER_COLOR);
        }
    }
}

function setup() {
    initNamespacesDropdown();
    updateDropdowns();
    initResultsPanel();
}

setup();
