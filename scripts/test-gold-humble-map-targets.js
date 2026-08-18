import assert from "node:assert/strict"
import { EASTER_EGG_RARITY, LOTTERY_ROD_PLUGINS } from "../lib/constants.js"
import { getMapFishTypes } from "../lib/maps.js"
import { createDefaultUserData, normalizeUserData } from "../lib/user.js"
import {
  getRodTargetChangeDateForMap,
  resolveRodTarget,
  setRodTargetChangeDateForMap,
  setRodTargetForMap,
} from "../lib/gold-humble.js"

const rod = LOTTERY_ROD_PLUGINS.gold_humble
const userData = createDefaultUserData()
userData.rodsOwned.push(rod.id)

setRodTargetForMap(userData, rod.id, "pond", {
  type: "fish",
  name: "金龙鱼",
  rarity: "rare",
})
setRodTargetChangeDateForMap(userData, rod.id, "pond", "2026-08-18")
setRodTargetForMap(userData, rod.id, "abyss", {
  type: "fish",
  name: "深海灯塔鲸",
  rarity: "legendary",
})
setRodTargetChangeDateForMap(userData, rod.id, "abyss", "2026-08-18")

const pondTarget = resolveRodTarget(userData, rod, { mapId: "pond" })
const abyssTarget = resolveRodTarget(userData, rod, {
  mapId: "abyss",
  fishTypes: getMapFishTypes("abyss"),
})
assert.equal(pondTarget?.name, "金龙鱼")
assert.equal(abyssTarget?.name, "深海灯塔鲸")
assert.equal(pondTarget?.mapId, "pond")
assert.equal(abyssTarget?.mapId, "abyss")
assert.equal(getRodTargetChangeDateForMap(userData, rod.id, "pond"), "2026-08-18")
assert.equal(getRodTargetChangeDateForMap(userData, rod.id, "abyss"), "2026-08-18")

setRodTargetForMap(userData, rod.id, "abyss", {
  type: "fish",
  name: "潜梦水母鱼",
  rarity: EASTER_EGG_RARITY,
})
const deepEggTarget = resolveRodTarget(userData, rod, {
  mapId: "abyss",
  fishTypes: getMapFishTypes("abyss"),
})
assert.equal(deepEggTarget?.name, "潜梦水母鱼")
assert.equal(resolveRodTarget(userData, rod, { mapId: "pond" })?.name, "金龙鱼")

const legacyUser = createDefaultUserData()
legacyUser.rodTargets[rod.id] = {
  type: "fish",
  name: "金龙鱼",
  rarity: "rare",
}
legacyUser.rodTargetChangeDates[rod.id] = "2026-08-17"
normalizeUserData(legacyUser)
assert.equal(resolveRodTarget(legacyUser, rod, { mapId: "pond" })?.name, "金龙鱼")
assert.equal(getRodTargetChangeDateForMap(legacyUser, rod.id, "pond"), "2026-08-17")
assert.equal(getRodTargetChangeDateForMap(legacyUser, rod.id, "abyss"), "")

legacyUser.rodTargetChangeDates[rod.id] = "[object Object]"
normalizeUserData(legacyUser)
assert.equal(getRodTargetChangeDateForMap(legacyUser, rod.id, "pond"), "")

console.log("gold humble pond/deep-sea target isolation and migration ok")
