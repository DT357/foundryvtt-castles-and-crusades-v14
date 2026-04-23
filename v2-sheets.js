const {
  api: { HandlebarsApplicationMixin },
  apps: { DocumentSheetConfig },
  sheets: { ActorSheetV2, ItemSheetV2 },
  ux: { TextEditor: TextEditorNamespace },
} = foundry.applications;

const FoundryTextEditor = TextEditorNamespace.implementation;
const SYSTEM_ID = "castles-and-crusades";
const DEFAULT_ITEM_IMAGE = "icons/svg/item-bag.svg";
const ITEM_TYPES = ["item", "weapon", "armor", "spell", "feature"];
const ACTOR_TYPES = ["character", "monster", "unit"];

function getRollMode() {
  return game.settings.get("core", "rollMode");
}

function showDetailedFormulas() {
  return game.settings.get(SYSTEM_ID, "showDetailedFormulas") ?? true;
}

function capitalize(value) {
  return `${value ?? ""}`.charAt(0).toUpperCase() + `${value ?? ""}`.slice(1);
}

async function submitDocumentUpdate(event, form, formData) {
  const updateData = formData?.object ?? {};
  return this.document.update(updateData);
}

function unregisterScopedSheets(documentConfig, documentClass, supportedTypes) {
  for (const type of supportedTypes) {
    const registration = documentConfig?.[type]?.tlgcc;
    if (!registration?.cls) continue;
    DocumentSheetConfig.unregisterSheet(documentClass, "tlgcc", registration.cls);
  }
}

function captureScrollState(rootElement, selectors = [".sheet-body"]) {
  if (!rootElement) return [];

  return selectors.flatMap((selector) => {
    return Array.from(rootElement.querySelectorAll(selector)).map((element, index) => ({
      selector,
      index,
      top: element.scrollTop,
      left: element.scrollLeft,
    }));
  });
}

function restoreScrollState(rootElement, scrollState = []) {
  if (!rootElement || !scrollState.length) return;

  requestAnimationFrame(() => {
    for (const state of scrollState) {
      const elements = rootElement.querySelectorAll(state.selector);
      const element = elements[state.index];
      if (!element) continue;
      element.scrollTop = state.top;
      element.scrollLeft = state.left;
    }
  });
}

class TlgccActorSheetV2 extends HandlebarsApplicationMixin(ActorSheetV2) {
  editingDescriptionTarget = null;
  pendingScrollState = [];

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["tlgcc", "sheet", "actor"],
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
      handler: submitDocumentUpdate,
    },
    position: {
      width: 780,
      height: 600,
    },
    window: {
      resizable: true,
    },
  });

  static PARTS = {
    sheet: {
      template: "systems/castles-and-crusades/templates/actor/actor-character-sheet.html",
      root: true,
      scrollable: [".sheet-body"],
      forms: {
        sheet: {
          submitOnChange: true,
          closeOnSubmit: false,
          handler: submitDocumentUpdate,
        },
      },
    },
  };

  static TABS = {
    primary: {
      initial: "combat",
      tabs: [
        { id: "combat" },
        { id: "features" },
        { id: "items" },
        { id: "spells" },
        { id: "description" },
      ],
    },
  };

  static CONFIG_OVERRIDES = {
    temporaryEnableAllAttacks: true,
  };

  tabGroups = {
    primary: "combat",
  };

  get actor() {
    return this.document;
  }

  get form() {
    if (this.element instanceof HTMLFormElement && this.element.matches("form.tlgcc, form")) {
      return this.element;
    }
    return this.element?.querySelector("form.tlgcc, form") ?? null;
  }

  get template() {
    return `systems/castles-and-crusades/templates/actor/actor-${this.actor.type}-sheet.html`;
  }

  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.sheet = foundry.utils.mergeObject(parts.sheet, {
      template: this.template,
    });
    return parts;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const actorData = this.actor.toObject(false);

    context.actor = this.actor;
    context.cssClass = this.#getCssClass("actor");
    context.owner = this.actor.isOwner;
    context.editable = this.isEditable;
    context.items = this.actor.items.contents.map((item) => item.toObject(false));
    context.system = actorData.system;
    context.flags = actorData.flags ?? {};
    context.rollData = this.actor.getRollData();
    context.showDetailedFormulas = showDetailedFormulas();
    context.enriched = {};

    if (actorData.type === "character") {
      await this.#prepareCharacterData(context);
    } else if (actorData.type === "monster") {
      await this.#prepareMonsterData(context);
    } else if (actorData.type === "unit") {
      await this.#prepareUnitData(context);
    }

    if (this.editingDescriptionTarget) {
      context.editingDescription = {
        target: this.editingDescriptionTarget,
        value: foundry.utils.getProperty(this.actor._source, this.editingDescriptionTarget) ?? "",
      };
    }

    return context;
  }

  _attachPartListeners(partId, htmlElement, options) {
    if (!htmlElement) return;
    if (partId !== "sheet") return;

    this.#bindSheetInteractions(htmlElement);
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const htmlElement = this.form ?? this.element;
    if (!htmlElement) return;
    this.#bindSheetInteractions(htmlElement);
    this.#bindDescriptionEditorLifecycle(htmlElement);
    this.#activatePrimaryTab(htmlElement, this.tabGroups.primary ?? "combat");
    this.#restorePendingScrollState(htmlElement);
  }

  #bindSheetInteractions(htmlElement) {
    this.#bindFormInteractions(htmlElement);

    htmlElement.querySelectorAll(".sheet-tabs .item[data-tab]").forEach((element) => {
      element.onclick = this.#onPrimaryTabClick;
    });

    htmlElement.querySelectorAll(".item-edit").forEach((element) => {
      element.onclick = this.#onItemEdit;
    });

    htmlElement.querySelectorAll(".rollable").forEach((element) => {
      element.onclick = this.#onRoll;
    });

    if (this.isEditable) {
      htmlElement.querySelectorAll(".editor-edit[data-target]").forEach((element) => {
        element.onclick = this.#onDescriptionEdit;
      });

      htmlElement.querySelectorAll(".item-create").forEach((element) => {
        element.onclick = this.#onItemCreate;
      });

      htmlElement.querySelectorAll(".item-delete").forEach((element) => {
        element.onclick = this.#onItemDelete;
      });

      htmlElement.querySelectorAll(".spell-prepare").forEach((element) => {
        element.onclick = this.#onSpellPrepare;
      });
    }

    if (!this.actor.isOwner) return;

    htmlElement.querySelectorAll("li.item:not(.inventory-header)").forEach((element) => {
      element.setAttribute("draggable", "true");
      element.ondragstart = this.#onDragStart;
    });
  }

  #bindFormInteractions(htmlElement) {
    const form = htmlElement instanceof HTMLFormElement
      ? htmlElement
      : htmlElement.querySelector("form.tlgcc, form");
    if (!form) return;

    if (this.isEditable && form.dataset.tlgccFormBound !== "true") {
      form.dataset.tlgccFormBound = "true";
      form.addEventListener("change", this.#onFormChange);

      form.querySelectorAll('input[name^="system.abilities."][name$=".value"]').forEach((element) => {
        element.addEventListener("input", this.#onAbilityScoreInput);
      });
    }
  }

  async #prepareCharacterData(context) {
    this.#prepareItems(context);
    this.#prepareActorData(context);
    await this.#prepareEnrichedText(context, "appearance", "system.appearance");
    await this.#prepareEnrichedText(context, "biography", "system.biography");
    this.#prepareAbilities(context);
    this.#prepareMoney(context);
  }

  async #prepareMonsterData(context) {
    this.#prepareItems(context);
    this.#prepareActorData(context);
    await this.#prepareEnrichedText(context, "biography", "system.biography");
  }

  async #prepareUnitData(context) {
    const system = context.system;
    context.unitFlags = {
      hasMainAttack: Boolean(system.mainAttack?.name || system.mainAttack?.damage || system.mainAttack?.bonus),
      hasFormationAttack: Boolean(
        system.formationAttack?.name || system.formationAttack?.damage || system.formationAttack?.bonus
      ),
      hasSpecial: Boolean(system.special?.value),
      hasSpells: Boolean(system.spells?.value),
      hasNotes: Boolean(system.notes?.value),
    };
    context.unitActions = {
      mainAttackRoll: this.#buildBonusRollFormula(system.mainAttack?.bonus),
      formationAttackRoll: this.#buildBonusRollFormula(system.formationAttack?.bonus),
      moraleRoll: this.#buildBonusRollFormula(system.morale?.value),
    };
    await this.#prepareEnrichedText(context, "unitSpells", "system.spells.value");
    await this.#prepareEnrichedText(context, "unitNotes", "system.notes.value");
    await this.#prepareEnrichedText(context, "biography", "system.biography");
  }

  async #prepareEnrichedText(context, contextKey, fieldName) {
    context.enriched[contextKey] = await FoundryTextEditor.enrichHTML(
      foundry.utils.getProperty(this.actor._source, fieldName) ?? "",
      {
        async: true,
        documents: true,
        relativeTo: this.actor,
        rollData: this.actor.getRollData(),
        secrets: this.actor.isOwner,
      },
    );
  }

  #prepareActorData(context) {
    for (const [key, value] of Object.entries(context.system.saves ?? {})) {
      value.label = game.i18n.localize(CONFIG.TLGCC.saves[key]) ?? key;
    }
  }

  #prepareAbilities(context) {
    for (const [key, value] of Object.entries(context.system.abilities ?? {})) {
      value.label = game.i18n.localize(CONFIG.TLGCC.abilities[key]) ?? key;
    }
  }

  #prepareMoney(context) {
    for (const [key, value] of Object.entries(context.system.money ?? {})) {
      value.label = game.i18n.localize(CONFIG.TLGCC.money[key]) ?? key;
    }
  }

  #prepareItems(context) {
    const categories = this.#categorizeItems(context.items);
    const processedWeapons = categories.weapons.map((weapon) => {
      const attackType = this.#determineWeaponType(weapon);
      return {
        ...weapon,
        attackType,
        canMelee: TlgccActorSheetV2.CONFIG_OVERRIDES.temporaryEnableAllAttacks
          ? true
          : attackType === "melee" || attackType === "both",
        canRanged: TlgccActorSheetV2.CONFIG_OVERRIDES.temporaryEnableAllAttacks
          ? true
          : attackType === "ranged" || attackType === "both",
      };
    });

    const carriedWeight = this.#calculateCarriedWeight(
      categories.gear,
      processedWeapons,
      categories.armors,
      context.system.money,
    );

    Object.assign(context, {
      gear: categories.gear,
      weapons: processedWeapons,
      armors: categories.armors,
      spells: categories.spells,
      features: categories.features,
      carriedWeight: Math.floor(carriedWeight),
      showDetailedFormulas: showDetailedFormulas(),
    });
  }

  #categorizeItems(items) {
    const categories = {
      gear: [],
      weapons: [],
      armors: [],
      spells: Array(10).fill(null).map(() => []),
      features: [],
    };

    for (const item of items ?? []) {
      item.img = item.img || DEFAULT_ITEM_IMAGE;
      const category = this.#getItemCategory(item);
      if (category === "spell") {
        const spellLevel =
          Number(item.system?.spell?.spelllevel) || Number(item.system?.spellLevel?.value) || 0;
        if (spellLevel >= 0 && spellLevel < 10) categories.spells[spellLevel].push(item);
        continue;
      }
      if (category) categories[category].push(item);
    }

    return categories;
  }

  #getItemCategory(item) {
    switch (item.type) {
      case "item":
        return "gear";
      case "weapon":
        return "weapons";
      case "armor":
        return "armors";
      case "spell":
        return "spell";
      case "feature":
        return "features";
      default:
        return null;
    }
  }

  #calculateCarriedWeight(gear, weapons, armors, money) {
    const itemWeight = [...gear, ...weapons, ...armors].reduce((total, item) => {
      const weight = Number(item.system?.weight?.value) || 0;
      const quantity = Number(item.system?.quantity?.value) || 1;
      return total + weight * quantity;
    }, 0);

    const moneyWeight = Object.values(money ?? {}).reduce((total, value) => {
      return total + Math.floor(Number(value.value) / 10);
    }, 0);

    return itemWeight + moneyWeight;
  }

  #determineWeaponType(weapon) {
    if (!weapon?.name || !weapon.system) return "melee";

    const name = weapon.name.toLowerCase();
    const range = `${weapon.system?.range?.value ?? ""}`.toLowerCase();
    const rangedOnly = ["bow", "crossbow", "sling"];
    const throwableWeapons = ["dagger", "handaxe", "spear", "hammer", "javelin"];

    if (rangedOnly.some((weaponName) => name.includes(weaponName))) return "ranged";
    if (throwableWeapons.some((weaponName) => name.includes(weaponName)) || range.includes("thrown")) {
      return "both";
    }
    if (range.includes("ft") && !range.includes("thrown")) return "ranged";
    return "melee";
  }

  #buildBonusRollFormula(bonus) {
    const parsedBonus = Number.parseInt(`${bonus ?? 0}`, 10);
    if (!Number.isFinite(parsedBonus) || parsedBonus === 0) return "1d20";
    return parsedBonus > 0 ? `1d20 + ${parsedBonus}` : `1d20 - ${Math.abs(parsedBonus)}`;
  }

  #getCssClass(sheetType) {
    return [
      "tlgcc",
      "sheet",
      sheetType,
      this.document.type,
      this.isEditable ? "editable" : "locked",
    ].filter(Boolean).join(" ");
  }

  #getItemIdFromEventTarget(target) {
    return target.closest(".item")?.dataset?.itemId ?? null;
  }

  #activatePrimaryTab(htmlElement, tabId) {
    this.tabGroups.primary = tabId;

    htmlElement.querySelectorAll(".sheet-tabs .item[data-tab]").forEach((element) => {
      element.classList.toggle("active", element.dataset.tab === tabId);
    });

    htmlElement.querySelectorAll('.sheet-body .tab[data-group="primary"]').forEach((element) => {
      const isActive = element.dataset.tab === tabId;
      element.classList.toggle("active", isActive);
      element.toggleAttribute("hidden", !isActive);
      element.style.display = isActive ? "" : "none";
    });
  }

  #isFinesseMelee(weaponName) {
    const finesseWeapons = ["dagger", "rapier", "short sword"];
    return finesseWeapons.some((weapon) => weaponName.toLowerCase().includes(weapon));
  }

  #onDragStart = (event) => this._onDragStart(event);

  #onPrimaryTabClick = (event) => {
    event.preventDefault();
    const tabId = event.currentTarget?.dataset?.tab;
    if (!tabId) return;
    const htmlElement = event.currentTarget.closest("form");
    if (!htmlElement) return;
    this.#activatePrimaryTab(htmlElement, tabId);
  };

  #onItemEdit = (event) => {
    const itemId = this.#getItemIdFromEventTarget(event.currentTarget);
    const item = this.actor.items.get(itemId);
    item?.sheet?.render(true);
  };

  #onItemCreate = async (event) => {
    event.preventDefault();

    const header = event.currentTarget;
    const type = header.dataset.type;
    if (!type) return;

    const systemData = foundry.utils.deepClone(header.dataset);
    delete systemData.type;

    if (type === "spell") {
      systemData.spellLevel = { value: systemData.spellLevelValue };
      delete systemData.spellLevelValue;
    }

    const itemData = {
      name: `New ${capitalize(type)}`,
      type,
      system: systemData,
    };

    const createdItems = await this.actor.createEmbeddedDocuments("Item", [itemData], {
      render: true,
    });

    createdItems[0]?.sheet?.render(true);
  };

  #onItemDelete = async (event) => {
    const itemId = this.#getItemIdFromEventTarget(event.currentTarget);
    if (!itemId) return;
    await this.actor.items.get(itemId)?.delete();
    this.render();
  };

  #onSpellPrepare = async (event) => {
    const change = Number.parseInt(event.currentTarget.dataset.change ?? "0", 10);
    if (!change) return;

    const itemId = this.#getItemIdFromEventTarget(event.currentTarget);
    const item = this.actor.items.get(itemId);
    if (!item) return;

    const newValue = Number(item.system?.prepared?.value ?? 0) + change;
    await item.update({ "system.prepared.value": newValue });
  };

  #onRoll = async (event) => {
    event.preventDefault();

    const element = event.currentTarget;
    const dataset = element.dataset;

    if (dataset.rollType === "monster-save") return this.#rollMonsterSave();
    if (dataset.rollType === "weapon") return this.#rollWeapon(element, dataset);
    if (dataset.rollType === "damage") return this.#rollDamage(element);
    if (dataset.rollType === "item") return this.#rollItem(element);
    if (dataset.roll) return this.#rollGeneric(dataset);
    return undefined;
  };

  #rollMonsterSave() {
    if (this.actor.type !== "monster") return undefined;

    const actorData = this.actor.system;
    const hitDice = Number(actorData.hitDice?.number) || 0;
    const saveText = actorData.msaves?.value || "";
    const saveBonus = Math.max(0, Math.floor(hitDice));
    const rollParts = ["1d20"];
    if (saveBonus) rollParts.push(`${saveBonus}`);

    const roll = new Roll(rollParts.join(" + "));
    let flavor = `Roll: <b>Monster Save (HD ${hitDice})</b>`;
    if (saveText) flavor += ` (${saveText})`;
    if (showDetailedFormulas()) flavor += `<br><em>(${rollParts.join(" + ")})</em>`;

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor,
      rollMode: getRollMode(),
    });

    return roll;
  }

  #rollWeapon(element, dataset) {
    const itemId = this.#getItemIdFromEventTarget(element);
    const item = this.actor.items.get(itemId);
    if (!item) return undefined;

    const attackType = dataset.attack;
    const actorData = this.actor.system;
    const itemData = item.system;
    let abilityMod = 0;
    let abilityUsed = "";
    const rollParts = ["1d20"];
    const rollData = {};

    if (this.actor.type === "character") {
      if (attackType === "melee") {
        if (item.name && this.#isFinesseMelee(item.name)) {
          const strMod = actorData.abilities?.str?.bonus || 0;
          const dexMod = actorData.abilities?.dex?.bonus || 0;
          abilityMod = Math.max(strMod, dexMod);
          abilityUsed = abilityMod === strMod ? "STR" : "DEX";
        } else {
          abilityMod = actorData.abilities?.str?.bonus || 0;
          abilityUsed = "STR";
        }
      } else if (attackType === "ranged") {
        abilityMod = actorData.abilities?.dex?.bonus || 0;
        abilityUsed = "DEX";
      }
    }

    const baseAttackBonus = Number.parseInt(`${actorData.attackBonus?.value || 0}`, 10);
    if (baseAttackBonus) {
      rollParts.push(`${baseAttackBonus}`);
      rollData.bab = baseAttackBonus;
    }

    const weaponBonus = Number.parseInt(`${itemData.bonusAb?.value || 0}`, 10);
    if (weaponBonus) {
      rollParts.push(`${weaponBonus}`);
      rollData.weaponBonus = weaponBonus;
    }

    if (abilityMod !== 0) {
      rollParts.push(`${abilityMod}`);
      rollData.abilityMod = abilityMod;
    }

    const roll = new Roll(rollParts.join(" + "), rollData);
    const attackLabel = attackType === "melee" ? "Melee Attack" : "Ranged Attack";
    let flavor = `Roll: <b>${attackLabel} &rarr; ${item.name}</b>`;

    if (showDetailedFormulas()) {
      const detailedParts = ["1d20"];
      if (baseAttackBonus) detailedParts.push("@ab");
      if (abilityMod) {
        const abilityKey = abilityUsed.toLowerCase();
        detailedParts.push(`@abilities.${abilityKey}.bonus`);
      }
      if (weaponBonus) detailedParts.push(`${weaponBonus}`);
      flavor += `<br><em>(${detailedParts.join(" + ")})</em>`;
    }

    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor,
      rollMode: getRollMode(),
    });

    return roll;
  }

  async #rollDamage(element) {
    const itemId = this.#getItemIdFromEventTarget(element);
    const item = this.actor.items.get(itemId);
    if (!item) return undefined;

    const itemData = item.system;
    const rollParts = [];

    if (item.type === "weapon") {
      const baseDamage = itemData.damage?.value || "";
      if (!baseDamage) return undefined;
      rollParts.push(baseDamage);

      if (this.actor.type === "character") {
        const actorData = this.actor.system;
        if (this.#isFinesseMelee(item.name)) {
          const strMod = actorData.abilities?.str?.bonus || 0;
          const dexMod = actorData.abilities?.dex?.bonus || 0;
          const abilityMod = Math.max(strMod, dexMod);
          if (abilityMod) rollParts.push(`${abilityMod}`);
        } else if (!`${itemData.range?.value ?? ""}`.toLowerCase().includes("ft")) {
          const strMod = actorData.abilities?.str?.bonus || 0;
          if (strMod) rollParts.push(`${strMod}`);
        }
      }
    } else if (item.type === "spell") {
      const spellDamage = itemData.spelldmg?.value || "";
      if (!spellDamage) return undefined;
      rollParts.push(spellDamage);
    }

    if (!rollParts.length) return undefined;

    const roll = new Roll(rollParts.join(" + "), this.actor.getRollData());
    let flavor = `Roll: <b>Damage &rarr; ${item.name}</b>`;

    if (showDetailedFormulas()) {
      const detailedParts = [];
      if (item.type === "weapon") {
        detailedParts.push(itemData.damage?.value);
        if (this.actor.type === "character") {
          if (this.#isFinesseMelee(item.name)) {
            detailedParts.push("max(@abilities.str.bonus, @abilities.dex.bonus)");
          } else if (!`${itemData.range?.value ?? ""}`.toLowerCase().includes("ft")) {
            detailedParts.push("@abilities.str.bonus");
          }
        }
      } else if (item.type === "spell") {
        detailedParts.push(itemData.spelldmg?.value);
      }
      flavor += `<br><em>(${detailedParts.join(" + ")})</em>`;
    }

    await roll.evaluate({ async: true });
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor,
      rollMode: getRollMode(),
    });

    return roll;
  }

  #rollItem(element) {
    const itemId = this.#getItemIdFromEventTarget(element);
    return this.actor.items.get(itemId)?.roll();
  }

  #rollGeneric(dataset) {
    const label = dataset.label ? `Roll: ${dataset.label}` : "";
    const roll = new Roll(dataset.roll ?? "", this.actor.getRollData());
    roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: label,
      rollMode: getRollMode(),
    });
    return roll;
  }

  async _preClose(options) {
    if (this.isEditable && this.form) {
      try {
        await this.submit();
      } catch (error) {
        console.warn("TLGCC | Failed to submit actor sheet before close", error);
      }
    }
    return super._preClose(options);
  }

  #onFormChange = async () => {
    await this.submit();
  };

  #onAbilityScoreInput = (event) => {
    const input = event.currentTarget;
    const scoreRow = input.closest(".abilityscore");
    const modifierElement = scoreRow?.querySelector(".ability-mod");
    if (!modifierElement) return;

    const score = Number.parseInt(input.value ?? "0", 10);
    const bonus = this.#calculateAbilityBonus(Number.isNaN(score) ? 0 : score);
    modifierElement.textContent = `${bonus >= 0 ? "+" : ""}${bonus}`;
  };

  #calculateAbilityBonus(score) {
    if (score <= 3) return -3;
    if (score <= 5) return -2;
    if (score <= 8) return -1;
    if (score <= 12) return 0;
    if (score <= 15) return 1;
    if (score <= 17) return 2;
    if (score <= 19) return 3;
    if (score <= 21) return 4;
    if (score <= 23) return 5;
    if (score <= 25) return 6;
    return 0;
  }

  #onDescriptionEdit = (event) => {
    event.preventDefault();
    const target = event.currentTarget?.dataset?.target;
    if (!target) return;
    this.#capturePendingScrollState();
    this.editingDescriptionTarget = target;
    this.render();
  };

  #bindDescriptionEditorLifecycle(htmlElement) {
    if (!this.editingDescriptionTarget) return;

    htmlElement.querySelectorAll("prose-mirror").forEach((editor) => {
      if (editor.dataset.tlgccSaveBound === "true") return;
      editor.dataset.tlgccSaveBound = "true";
      editor.addEventListener("save", () => {
        this.#capturePendingScrollState();
        this.editingDescriptionTarget = null;
        this.render();
      }, { once: true });
    });
  }

  #capturePendingScrollState() {
    const rootElement = this.form ?? this.element;
    this.pendingScrollState = captureScrollState(rootElement);
  }

  #restorePendingScrollState(rootElement) {
    if (!this.pendingScrollState.length) return;
    restoreScrollState(rootElement, this.pendingScrollState);
    this.pendingScrollState = [];
  }
}

class TlgccItemSheetV2 extends HandlebarsApplicationMixin(ItemSheetV2) {
  editingDescriptionTarget = null;
  pendingScrollState = [];

  static DEFAULT_OPTIONS = foundry.utils.mergeObject(super.DEFAULT_OPTIONS, {
    classes: ["tlgcc", "sheet", "item"],
    form: {
      submitOnChange: true,
      closeOnSubmit: false,
      handler: submitDocumentUpdate,
    },
    position: {
      width: 720,
      height: 480,
    },
    window: {
      resizable: true,
    },
  });

  static PARTS = {
    sheet: {
      template: "systems/castles-and-crusades/templates/item/item-sheet.html",
      root: true,
      scrollable: [".sheet-body"],
      forms: {
        sheet: {
          submitOnChange: true,
          closeOnSubmit: false,
          handler: submitDocumentUpdate,
        },
      },
    },
  };

  get item() {
    return this.document;
  }

  get form() {
    if (this.element instanceof HTMLFormElement && this.element.matches("form.tlgcc, form")) {
      return this.element;
    }
    return this.element?.querySelector("form.tlgcc, form") ?? null;
  }

  _attachPartListeners(partId, htmlElement, options) {
    if (!htmlElement) return;
    if (partId !== "sheet") return;
  }

  get template() {
    return `systems/castles-and-crusades/templates/item/item-${this.item.type}-sheet.html`;
  }

  _configureRenderParts(options) {
    const parts = super._configureRenderParts(options);
    parts.sheet = foundry.utils.mergeObject(parts.sheet, {
      template: this.template,
    });
    return parts;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const itemData = this.item.toObject(false);
    const actor = this.item.parent ?? null;

    context.item = this.item;
    context.cssClass = this.#getCssClass();
    context.owner = this.item.isOwner;
    context.editable = this.isEditable;
    context.rollData = actor?.getRollData?.() ?? {};
    context.system = itemData.system;
    context.flags = itemData.flags ?? {};
    context.enriched = {
      description: await FoundryTextEditor.enrichHTML(
        context.system?.description ?? "",
        {
          async: true,
          documents: true,
          relativeTo: this.item,
          rollData: context.rollData,
          secrets: this.item.isOwner,
        },
      ),
    };

    if (this.editingDescriptionTarget) {
      context.editingDescription = {
        target: this.editingDescriptionTarget,
        value: foundry.utils.getProperty(this.item._source, this.editingDescriptionTarget) ?? "",
      };
    }
    return context;
  }

  async _onRender(context, options) {
    await super._onRender(context, options);
    const form = this.form;
    if (!form) return;
    this.#bindDescriptionEditorLifecycle(form);
    this.#restorePendingScrollState(form);

    if (this.isEditable) {
      form.querySelectorAll(".editor-edit[data-target]").forEach((element) => {
        element.onclick = this.#onDescriptionEdit;
      });
    }

    if (!this.isEditable) return;
    if (form.dataset.tlgccFormBound === "true") return;
    form.dataset.tlgccFormBound = "true";
    form.addEventListener("change", this.#onFormChange);
  }

  async _preClose(options) {
    if (this.isEditable && this.form) {
      try {
        await this.submit();
      } catch (error) {
        console.warn("TLGCC | Failed to submit item sheet before close", error);
      }
    }
    return super._preClose(options);
  }

  #getCssClass() {
    return [
      "tlgcc",
      "sheet",
      "item",
      this.item.type,
      this.isEditable ? "editable" : "locked",
    ].filter(Boolean).join(" ");
  }

  #onFormChange = async () => {
    await this.submit();
  };

  #onDescriptionEdit = (event) => {
    event.preventDefault();
    const target = event.currentTarget?.dataset?.target;
    if (!target) return;
    this.#capturePendingScrollState();
    this.editingDescriptionTarget = target;
    this.render();
  };

  #bindDescriptionEditorLifecycle(htmlElement) {
    if (!this.editingDescriptionTarget) return;

    htmlElement.querySelectorAll("prose-mirror").forEach((editor) => {
      if (editor.dataset.tlgccSaveBound === "true") return;
      editor.dataset.tlgccSaveBound = "true";
      editor.addEventListener("save", () => {
        this.#capturePendingScrollState();
        this.editingDescriptionTarget = null;
        this.render();
      }, { once: true });
    });
  }

  #capturePendingScrollState() {
    const rootElement = this.form ?? this.element;
    this.pendingScrollState = captureScrollState(rootElement);
  }

  #restorePendingScrollState(rootElement) {
    if (!this.pendingScrollState.length) return;
    restoreScrollState(rootElement, this.pendingScrollState);
    this.pendingScrollState = [];
  }
}

Hooks.once("init", () => {
  const actorDocumentClass = CONFIG.Actor.documentClass;
  const itemDocumentClass = CONFIG.Item.documentClass;
  const actorSheetConfig = CONFIG.Actor.sheetClasses ?? {};
  const itemSheetConfig = CONFIG.Item.sheetClasses ?? {};

  unregisterScopedSheets(actorSheetConfig, actorDocumentClass, ACTOR_TYPES);
  unregisterScopedSheets(itemSheetConfig, itemDocumentClass, ITEM_TYPES);

  DocumentSheetConfig.registerSheet(actorDocumentClass, "tlgcc", TlgccActorSheetV2, {
    label: "Castles & Crusades Actor Sheet (V2)",
    makeDefault: true,
    types: ACTOR_TYPES,
  });

  DocumentSheetConfig.registerSheet(itemDocumentClass, "tlgcc", TlgccItemSheetV2, {
    label: "Castles & Crusades Item Sheet (V2)",
    makeDefault: true,
    types: ITEM_TYPES,
  });
});
