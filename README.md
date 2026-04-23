# Castles & Crusades for Foundry VTT

This directory contains the active **Castles & Crusades** Foundry VTT system for the original system id:

- `castles-and-crusades`

The current system is maintained for **Foundry VTT v13 and v14**, uses the Foundry **V2 sheet/application layer**, and keeps the original system identifier so existing Troll Lord Games modules and other integrations can continue to target the expected system id and `systems/castles-and-crusades/...` paths.

## Compatibility

- Minimum Foundry version: `13`
- Verified Foundry version: `14`
- System id: `castles-and-crusades`
- Current system version format: `YYYY.MM.DD`

## Current State

The current runtime system ships with:

- `castles_crusades.js`
- `v2-sheets.js`
- `styles/castles_crusades.css`
- `templates/...`

The old distributed source map no longer ships with the system. The previous `castles_crusades.js.map` artifact had become stale after repeated runtime cleanup and repair work, so it was removed rather than leaving misleading debug metadata in distribution.

## Highlights

### Foundry v13 and v14 support

The system has been updated to run cleanly against current Foundry core releases, including:

- manifest compatibility for Foundry v13/v14
- active runtime paths for the `castles-and-crusades` system id
- V2-based actor and item sheet registration
- continued support for rolls, owned items, settings, hooks, and macros under current Foundry behavior

### V2 sheet/application framework

The active sheet layer now lives in:

- [v2-sheets.js](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/castles-and-crusades/v2-sheets.js)

Current V2 work includes:

- V2 actor sheets for `character`, `monster`, and `unit`
- V2 item sheets for all supported item types
- rich-text editor support on actor and item description fields
- scroll-position preservation when opening and saving rich-text editors
- active tab and form-handling logic aligned with modern Foundry sheet behavior

### Fields of Battle `Unit` actor support

The system includes a dedicated **`unit`** actor type for optional **Fields of Battle** mass-combat play.

Current Unit support includes:

- a dedicated `unit` Actor type in the schema
- a dedicated Unit V2 sheet
- combat, traits, and notes tabs
- actor-local main attack and formation attack profiles
- morale, squad count, commander, tactical traits, and unit notes
- rich-text editors for:
  - `Spells / Spell Like Abilities`
  - `Biography and Notes`
  - `Appearance`
- clickable rolls for:
  - main attack
  - formation attack
  - morale

Planned future Fields of Battle work is documented in:

- [FIELDS-OF-BATTLE-UNIT-IMPLEMENTATION-PLAN.md](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/FIELDS-OF-BATTLE-UNIT-IMPLEMENTATION-PLAN.md)

### Sheet and UI improvements

Recent sheet and UI work includes:

- character-sheet parity improvements against the legacy Castles & Crusades presentation
- item-sheet parity and spacing cleanup
- checkbox and form-control fixes for Foundry dark-theme rendering
- Unit-sheet styling improvements so it visually fits the character/monster family better
- rich-text editor usability fixes, including preserving sheet scroll position during editor open/save

### Runtime cleanup

Recent cleanup work includes:

- removal of the old dormant V1 actor/item sheet registration path
- removal of the remaining dormant V1 sheet classes from `castles_crusades.js`
- removal of the stale distributed `castles_crusades.js.map`
- preservation and repair of the `Trollzah!` console startup art in the runtime bundle

## Key Files

- [system.json](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/castles-and-crusades/system.json): manifest and compatibility metadata
- [template.json](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/castles-and-crusades/template.json): actor/item schema
- [v2-sheets.js](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/castles-and-crusades/v2-sheets.js): active V2 sheet layer
- [castles_crusades.js](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/castles-and-crusades/castles_crusades.js): bundled runtime logic
- [styles/castles_crusades.css](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/castles-and-crusades/styles/castles_crusades.css): system styling
- [templates](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/castles-and-crusades/templates): actor, item, and partial templates
- [MACRO-INFORMATION.md](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/castles-and-crusades/MACRO-INFORMATION.md): schema paths and macro helper usage

## Installation

Install the system in Foundry under:

- `Data/systems/castles-and-crusades`

Because the system retains the original id and folder name, official Troll Lord Games modules and other existing integrations that target `castles-and-crusades` can continue to resolve the expected system identifier and paths.

## Notes

This repo has been upgraded and maintained with AI-assisted coding support as part of the workflow. If that bothers you on principle, this is probably not the build for you.
