
export const VANILLA_NAMESPACE = "vanilla";
const Datablocks = Object.freeze({
    PLAYER_OFFLINE_GEAR: "GameData_PlayerOfflineGearDataBlock_bin.json",
    GEAR_CATEGORY: "GameData_GearCategoryDataBlock_bin.json",
    ARCHETYPE: "GameData_ArchetypeDataBlock_bin.json",
    MELEE_ANIMATION_SET: "GameData_MeleeAnimationSetDataBlock_bin.json",
    MELEE_ARCHETYPE: "GameData_MeleeArchetypeDataBlock_bin.json",
    ENEMY: "GameData_EnemyDataBlock_bin.json",
    ENEMY_BALANCING: "GameData_EnemyBalancingDataBlock_bin.json",
    TEXT: "GameData_TextDataBlock_bin.json"
});
export const OptionType = Object.freeze({
    MELEE: "Melee",
    GUN: "Gun",
    SENTRY: "Sentry",
    MINE: "Mine",
    ENEMY: "Enemy"
});
const HardcodedArchetypeIDs = Object.freeze({
    SENTRY_SNIPER: 54,
    SENTRY_BURST: 55,
    SENTRY_AUTO: 57,
    SENTRY_SHOTGUN: 58
});

export async function loadJson(filename, fallbackFilename = null) {
    let response = await fetch("public/data/" + filename);

    if (!response.ok) {
        if (fallbackFilename !== null) {
            response = await fetch("public/data/" + fallbackFilename);
            if (!response.ok) {
                throw new Error("Failed to load fallback file " + fallbackFilename);
            }
        } else {
            throw new Error("Failed to load file " + filename);
        }
    }

    return await response.json();
}

/**
 * Loads the given datablock and returns it as a promise. It is important to remember that the top-level entries in the
 * datablocks are the Headers and the Blocks themselves.
 * @param datablock The datablock type to load as an element of the Datablocks object
 * @param namespace The folder to get the datablock from. "vanilla" by default, meaning the vanilla datablocks.
 * @returns {Promise<any>} A promise for the json object
 */
function loadDatablock(datablock, namespace = VANILLA_NAMESPACE) {
    const path = "datablocks/" + namespace + "/" + datablock;
    const fallback = "datablocks/" + VANILLA_NAMESPACE + "/" + datablock;
    return loadJson(path, fallback);
}

/**
 * Loads the PLAYER_OFFLINE_GEAR datablock. Since this datablock has a second layer of json, this function will also
 * handle the required extra conversion.
 * @param namespace The folder to get the datablock from. "vanilla" by default, meaning the vanilla datablocks.
 * @returns {Promise<any>} A promise for the json object
 */
function loadPlayerOfflineGearDatablock(namespace = VANILLA_NAMESPACE) {
    return new Promise((resolve, reject) => {
        const path = "datablocks/" + namespace + "/" + Datablocks.PLAYER_OFFLINE_GEAR;
        loadJson(path).then(data => {
            for (const block of data.Blocks) {
                block.GearJSON = JSON.parse(block.GearJSON);
            }
            resolve(data);
        }).catch(reject);
    });
}

/**
 * Loads the given datablock for the given namespace and returns it as a hashmap of the given field in each block to the
 * block itself.to their translations
 * as a map of languages to their texts.
 * This assumes that the datablock that it is given contains a persistentID entry in each block.
 * @param datablock The datablock to get the mappings for.
 * @param propertyName The name of the entry to use as the key in the created hashmap
 * @param namespace The folder to get the datablock from. "vanilla" by default, meaning the vanilla datablocks.
 * @returns {Promise<Map<any>>} A promise for the map of the ID to the block
 */
function loadIdMappings(datablock, propertyName, namespace = VANILLA_NAMESPACE) {
    return new Promise((resolve, reject) => {
        loadDatablock(datablock, namespace).then(data => {
            const map = new Map();

            data.Blocks.forEach(block => {
                map.set(block[propertyName], block);
            });

            resolve(map);
        }).catch(error => {
            reject(error);
        });
    });
}

/**
 * Given the mappings and a key, will return the mapped version of the key if it is present.
 * If the given uncheckedID is a string, then the same string will be returned. If it is a number, then it is checked
 * with the mappings. If a mapping is found then it is returned. Otherwise, the given fallback is returned instead,
 * which defaults to "Unknown".
 * @param mappings The loaded TEXT mappings as returned from loadIdMappings()
 * @param uncheckedID A string or number as retrieved from a datablock.
 * @param fallback A string to return if the uncheckedID is a number that is not present in the mappings.
 * @return The mapped string, or the fallback if no mapping is found.
 */
function tryGetLanguageMapping(mappings, uncheckedID, fallback = "Unknown") {
    if (typeof uncheckedID === "number") {
        return mappings.get(uncheckedID)?.English ?? fallback;
    }

    if (typeof uncheckedID === "string" && uncheckedID.length > 0) {
        return uncheckedID;
    }

    return fallback;
}

const enemyNameMappings = new Map([
    ["Striker_Wave", "Striker"],
    ["Striker_Berserk", "Nightmare Striker"],
    ["Striker_Patrol", null],
    ["Striker_Wave_Fast", null],
    ["Striker_Hibernate", null],
    ["Striker_Bullrush", "Charger"],
    ["Striker_Big_Wave", "Giant"],
    ["Striker_Big_nightmare", "Nightmare Giant"],
    ["Striker_Big_Bullrush", "Big Charger"],
    ["Shooter_Spread", "Nightmare Shooter"],
    ["Striker_Big_Hibernate", null],
    ["Striker_Big_Shadow", "Big Shadow"],
    ["Striker_Boss", null],
    ["Striker_Child", "Baby Striker"],
    ["Striker_Child_Nightmare", "Nightmare Baby Striker"],
    ["Shooter_Hibernate", "Shooter"],
    ["Shooter_Wave", null],
    ["Shooter_Big", "Big Shooter"],
    ["Shooter_Big_RapidFire", "Hybrid"],
    ["Shooter_Big_Infection", null],
    ["Birther", "Mother"],
    ["Birther_Boss", "Big Mother"],
    ["MegaMother", "Mega Mother"],
    ["Scout", "Scout"],
    ["Scout_nightmare", "Nightmare Scout"],
    ["Scout_zoomer", "Zoomer Scout"],
    ["Scout_Bullrush", "Charger Scout"],
    ["Scout_Shadow", "Shadow Scout"],
    ["Cocoon", null],
    ["Shadow", "Shadow"],
    ["Tank", "Tank"],
    ["Tank_Boss", "Immortal"],
    ["Flyer", "Flyer"],
    ["Flyer_Big", "Big Flyer"],
    ["Squidward", null],
    ["SquidBoss_Big", "Kraken (R6D1)"],
    ["Pouncer", "Snatcher"],
    ["SquidBoss_Big_Complex", "Kraken (R8E2)"],
    ["SquidBoss_VS", "Kraken (R8B2)"],
]);

/**
 * Given the internal name of an enemy, returns its actual name. If no mapping is found, returns the internal name
 * instead. If `null` is returned, then it means that the enemy should be ignored. This happens for enemies with
 * multiple identical entries such as Shooter and Shooter_Wave.
 * @param internalName The internal name of the enemy to get a mapping for.
 * @returns The public name if one is found, internamName if none is found, or null if it should be ignored.
 */
function getEnemyName(internalName) {
    const name = enemyNameMappings.get(internalName);
    if (name === null) return null;
    if (typeof name === "string") return name;
    return internalName.replaceAll("_", " ");
}

/**
 * Given the comps object and a 'c' value, returns the 'v' value associated with it.
 * @param comps The `block.GearJSON.Packet.Comps` object from the loaded PLAYER_OFFLINE_GEAR data block.
 * @param c The 'c' value to get the 'v' value of
 * @returns The 'v' value associated with the given 'c' value, or 0 if the 'c' value is not present.
 */
function getGearJSONComp(comps, c) {
    for (const [_, entry] of Object.entries(comps)) {
        if (entry.c === c) {
            return entry.v;
        }
    }
    return 0;
}

/**
 * Loads all datablocks and performs all the necessary preprocessing for them to be used by the application.
 * @param namespace The folder to get the datablock from. "vanilla" by default, meaning the vanilla datablocks.
 * @returns {Promise<Object>} An object of:
 *     melees:   Array of modified Archetype datablock entries for melees
 *     weapons:  Array of modified Archetype datablock entries for weapons
 *     enemies:  Array of modified EnemyBalancing datablock entries for enemies
 */
export function loadAllData(namespace = VANILLA_NAMESPACE) {
    return new Promise((resolve, reject) => {
        // Load all the datablocks in their required ways
        const promises = [
            loadPlayerOfflineGearDatablock(namespace),
            loadIdMappings(Datablocks.GEAR_CATEGORY, "persistentID", namespace),
            loadIdMappings(Datablocks.ARCHETYPE, "persistentID", namespace),
            loadIdMappings(Datablocks.MELEE_ANIMATION_SET, "persistentID", namespace),
            loadDatablock(Datablocks.MELEE_ARCHETYPE, namespace),
            loadDatablock(Datablocks.ENEMY, namespace),
            loadIdMappings(Datablocks.ENEMY_BALANCING, "persistentID", namespace),
            loadIdMappings(Datablocks.TEXT, "persistentID", namespace),
            loadJson("mineData.json")
        ];

        Promise.all(promises).then(arr => {
            const playerOfflineGearData = arr[0];
            const gearCategoryData = arr[1];
            const archetypeData = arr[2];
            const meleeAnimationSetData = arr[3];
            const meleeArchetypeData = arr[4];
            const enemyData = arr[5];
            const enemyBalancingData = arr[6];
            const textData = arr[7];
            const customMineData = arr[8];

            // Melee weapons
            const melees = [];
            meleeArchetypeData.Blocks.forEach(melee => {
                const animationSetDataId = melee.MeleeAnimationSet;
                const animationSetData = meleeAnimationSetData.get(animationSetDataId);

                melee.PublicName = tryGetLanguageMapping(textData, melee.PublicName);
                melee.HoldToChargeTime = animationSetData.HoldToChargeTime;
                melee.MaxDamageChargeTime = animationSetData.MaxDamageChargeTime;
                melee.AutoAttackTime = animationSetData.AutoAttackTime;
                melee.OptionType = OptionType.MELEE;
                melees.push(melee);
            });

            // Weapons
            const weapons = [];
            playerOfflineGearData.Blocks.forEach(block => {
                if (block.internalEnabled === false) {
                    return;
                }

                const comps = block.GearJSON.Packet.Comps;

                const fireMode = getGearJSONComp(comps, 1);
                const gearCategoryId = getGearJSONComp(comps, 2);

                const gearCategory = gearCategoryData.get(gearCategoryId);

                let archetypeID;
                let optionType;
                if (fireMode >= 0 && fireMode <= 3) {
                    // This is a gun
                    if (fireMode === 0) archetypeID = gearCategory.SemiArchetype;
                    else if (fireMode === 1) archetypeID = gearCategory.BurstArchetype;
                    else if (fireMode === 2) archetypeID = gearCategory.AutoArchetype;
                    else archetypeID = gearCategory.SemiBurstArchetype;
                    optionType = OptionType.GUN;
                } else if (fireMode >= 10 && fireMode <= 13) {
                    // This is a sentry
                    if (fireMode === 10) archetypeID = HardcodedArchetypeIDs.SENTRY_SNIPER;
                    else if (fireMode === 11) archetypeID = HardcodedArchetypeIDs.SENTRY_AUTO;
                    else if (fireMode === 12) archetypeID = HardcodedArchetypeIDs.SENTRY_BURST;
                    else archetypeID = HardcodedArchetypeIDs.SENTRY_SHOTGUN;
                    optionType = OptionType.SENTRY;
                } else {
                    // This is an unknown modded fire mode, so no ArchetypeID can be identified.
                    return;
                }

                if (archetypeID === 0) {
                    // This is not a weapon at all. Things like the hacking tool will be caught here.
                    return;
                }
                const archetype = structuredClone(archetypeData.get(archetypeID));
                archetype.PublicName = tryGetLanguageMapping(textData, archetype.PublicName);
                archetype.OptionType = optionType;
                archetype.TechnicalName = block.GearJSON.Name;
                weapons.push(archetype);
            });

            // Enemies
            const enemies = [];
            enemyData.Blocks.forEach(enemy => {
                const enemyName = getEnemyName(enemy.name);
                if (enemyName === null) {
                    return;
                }

                const balancingDataId = enemy.BalancingDataId;
                if (balancingDataId === 0) {
                    return;
                }

                const enemyBalancing = structuredClone(enemyBalancingData.get(balancingDataId));
                enemyBalancing.PublicName = enemyName;

                enemies.push(enemyBalancing);
            });

            resolve({
                melees: melees,
                weapons: weapons,
                enemies: enemies,
                mines: customMineData
            });
        }).catch(error => {
            reject(error);
        });
    });
}