# Castles & Crusades for Foundry VTT

This repository contains the active Foundry VTT system for **Castles & Crusades**, updated for modern Foundry core versions and maintained to run under the original system id:

- `castles-and-crusades`

The current system release is targeted at **Foundry VTT v13 and v14**, with sheet and application updates to support Foundry's newer UI framework expectations while preserving compatibility with existing Castles & Crusades content and modules.

## Compatibility

- Minimum Foundry version: `13`
- Verified Foundry version: `14`
- System id: `castles-and-crusades`

This keeps the system install compatible with modules and content packs that expect the original Castles & Crusades system identifier.

## Highlights

### Foundry v13 and v14 support

The system has been updated to run cleanly against current Foundry core releases, including:

- manifest compatibility updates for Foundry v13/v14
- runtime path and asset updates for the active `castles-and-crusades` system id
- continued support for actor sheets, monster sheets, item sheets, rolls, item interactions, and system settings under current Foundry core behavior

### V2 application framework updates

The system includes updates to align with Foundry's newer application and sheet framework direction:

- a V2-oriented sheet layer in [v2-sheets.js](E:/Documents/TTRPGs/Foundry%20Development/System%20-%20Castles%20%26%20Crusades/castles-and-crusades/v2-sheets.js)
- updated actor and item sheet template routing for the active system id
- modernized sheet rendering and registration behavior for current Foundry versions
- continued support for character, monster, and item sheet workflows under the newer framework model

### Sheet and UI improvements

In addition to compatibility work, the current system includes cleanup and parity work for the updated sheets:

- character actor sheet visual adjustments to better match the legacy Castles & Crusades presentation
- item sheet styling updates for closer parity with the prior user experience
- checkbox and form-control fixes for Foundry v14's themed form rendering
- asset path fixes for icons, watermark art, and sheet media

## Key Files

- system.json: system manifest and compatibility metadata
- v2-sheets.js: current V2-oriented sheet/application layer
- castles_crusades.js: bundled runtime logic
- styles/castles_crusades.css: system stylesheet and sheet presentation rules
- templates: actor, monster, item, and partial templates

## Installation

Install the system in Foundry under:

- `Data/systems/castles-and-crusades`

Because the system retains the original id and folder name, official Troll Lord Games modules and other existing integrations that target `castles-and-crusades` can continue to resolve the expected system identifier and paths.

## Notes

