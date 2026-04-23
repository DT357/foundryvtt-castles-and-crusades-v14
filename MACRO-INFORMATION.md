# Macro Information

This document highlights the most important Actor and Item data paths in the `castles-and-crusades` system and shows how to reference them from a Foundry VTT custom macro.

The examples below are based on the current live data model in:

- [template.json](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/castles-and-crusades/template.json)

## Basic Actor Pattern

In most Foundry macros, you will start with an Actor like this:

```js
const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
if (!actor) {
  ui.notifications.warn("Select a token or assign a character first.");
  return;
}

console.log(actor.name);
console.log(actor.type);
console.log(actor.system);
```

You can then read values directly:

```js
const ac = actor.system.armorClass.value;
const move = actor.system.move.value;
```

If you want a safer nested lookup, use `foundry.utils.getProperty`:

```js
const morale = foundry.utils.getProperty(actor, "system.morale.value");
```

## Actor Types In This System

The current actor types are:

- `character`
- `monster`
- `unit`

## Shared Base Actor Attributes

These exist on all actor types because they come from the shared base actor template.

### Common Paths

- `actor.system.armorClass.value`
- `actor.system.attackBonus.value`
- `actor.system.biography`
- `actor.system.appearance`
- `actor.system.hitPoints.value`
- `actor.system.hitPoints.max`
- `actor.system.hdSize.value`
- `actor.system.alignment.value`
- `actor.system.move.value`
- `actor.system.languages.value`
- `actor.system.saves.death.value`
- `actor.system.saves.wands.value`
- `actor.system.saves.paralysis.value`
- `actor.system.saves.breath.value`
- `actor.system.saves.spells.value`

## Character Actor Attributes

Use these when `actor.type === "character"`.

### Important Character Paths

- `actor.system.class.value`
- `actor.system.race.value`
- `actor.system.level.value`
- `actor.system.title.value`
- `actor.system.deity.value`
- `actor.system.xp.value`
- `actor.system.xp.next`
- `actor.system.money.pp.value`
- `actor.system.money.gp.value`
- `actor.system.money.sp.value`
- `actor.system.money.cp.value`
- `actor.system.valuables.value`
- `actor.system.spellsPerLevel.value`

### Ability Scores

- `actor.system.abilities.str.value`
- `actor.system.abilities.dex.value`
- `actor.system.abilities.con.value`
- `actor.system.abilities.int.value`
- `actor.system.abilities.wis.value`
- `actor.system.abilities.cha.value`

### Prime Attributes

- `actor.system.abilities.str.ccprimary`
- `actor.system.abilities.dex.ccprimary`
- `actor.system.abilities.con.ccprimary`
- `actor.system.abilities.int.ccprimary`
- `actor.system.abilities.wis.ccprimary`
- `actor.system.abilities.cha.ccprimary`

### Character Macro Example

```js
const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
if (!actor || actor.type !== "character") {
  ui.notifications.warn("Select a character actor.");
  return;
}

ChatMessage.create({
  content: `<b>${actor.name}</b><br>STR: ${actor.system.abilities.str.value}<br>DEX: ${actor.system.abilities.dex.value}<br>XP: ${actor.system.xp.value} / ${actor.system.xp.next}`
});
```

## Monster Actor Attributes

Use these when `actor.type === "monster"`.

### Important Monster Paths

- `actor.system.hitDice.number`
- `actor.system.hitDice.size`
- `actor.system.hitDice.mod`
- `actor.system.monsterINT.value`
- `actor.system.numberAppearing.value`
- `actor.system.specialAbility.value`
- `actor.system.treasureType.value`
- `actor.system.type.value`
- `actor.system.msaves.value`
- `actor.system.sanity.value`
- `actor.system.attacks.value`
- `actor.system.biome.value`
- `actor.system.climate.value`
- `actor.system.xp.value`

## Unit Actor Attributes

Use these when `actor.type === "unit"`.

### Important Unit Paths

- `actor.system.unitType.value`
- `actor.system.sizeRatio.value`
- `actor.system.level.value`
- `actor.system.uhp.value`
- `actor.system.uhp.max`
- `actor.system.move.value`
- `actor.system.armorClass.value`
- `actor.system.armorNotes.value`
- `actor.system.mainAttack.name`
- `actor.system.mainAttack.damage`
- `actor.system.mainAttack.range`
- `actor.system.mainAttack.bonus`
- `actor.system.formationAttack.name`
- `actor.system.formationAttack.damage`
- `actor.system.formationAttack.range`
- `actor.system.formationAttack.bonus`
- `actor.system.special.value`
- `actor.system.weaponInitiative.value`
- `actor.system.savesPrimes.value`
- `actor.system.face.value`
- `actor.system.morale.value`
- `actor.system.spells.value`
- `actor.system.commander.value`
- `actor.system.squadCount.value`
- `actor.system.notes.value`
- `actor.system.biography`

### Unit Macro Example: Morale Roll

```js
const actor = canvas.tokens.controlled[0]?.actor;
if (!actor || actor.type !== "unit") {
  ui.notifications.warn("Select a Unit actor token.");
  return;
}

const morale = Number(actor.system.morale.value || 0);
const formula = morale >= 0 ? `1d20 + ${morale}` : `1d20 - ${Math.abs(morale)}`;

new Roll(formula).toMessage({
  speaker: ChatMessage.getSpeaker({ actor }),
  flavor: `${actor.name} - Morale Check`
});
```

## Item Data In Macros

Owned Items are usually read from `actor.items`.

```js
const actor = canvas.tokens.controlled[0]?.actor ?? game.user.character;
if (!actor) return;

for (const item of actor.items) {
  console.log(item.name, item.type, item.system);
}
```

### Common Item Paths

- `item.system.description`
- `item.system.price.value`
- `item.system.weight.value`
- `item.system.itemev.value`

### Weapon Item Paths

- `item.system.damage.value`
- `item.system.range.value`
- `item.system.bonusAb.value`
- `item.system.size.value`

### Armor Item Paths

- `item.system.armorClass.value`

### Spell Item Paths

- `item.system.class.value`
- `item.system.duration.value`
- `item.system.savevalue.value`
- `item.system.spellresist.value`
- `item.system.spellcomp.value`
- `item.system.prepared.value`
- `item.system.range.value`
- `item.system.spelldmg.value`
- `item.system.cast.value`
- `item.system.component.value`
- `item.system.summary.value`
- `item.system.spellLevel.value`

### Feature Item Paths

- `item.system.formula.value`
- `item.system.value`

## Built-In Macro Helper

The system exposes a helper on `game.tlgcc` for owned item rolling:

- `game.tlgcc.rollItemMacro("Item Name")`

Example:

```js
game.tlgcc.rollItemMacro("Longsword");
```

## Rich-Text Fields

Several actor and item fields are still normal string paths even though the V2 sheets render them through rich-text editors.

Important rich-text paths include:

- `actor.system.appearance`
- `actor.system.biography`
- `actor.system.notes.value`
- `actor.system.spells.value`
- `item.system.description`

## Updating Actor Values In A Macro

```js
await actor.update({
  "system.morale.value": 2
});
```

```js
await actor.update({
  "system.uhp.value": Math.max(0, actor.system.uhp.value - 5)
});
```

## Notes

- These paths reflect the current live schema and should be kept in sync with future Unit phases.
- If you are unsure whether a field exists, inspect `actor.system` or `item.system` in the browser console.
- For generalized macros, prefer `foundry.utils.getProperty` when you are not certain a nested path exists.
