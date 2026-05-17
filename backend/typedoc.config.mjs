import { OptionDefaults } from "typedoc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureCommonDocumentation, extractCommonSymbols, getCommonJsonPath } from "../scripts/ts-doc/extract-common-symbols.mjs";
/** @import { TypeDocOptions } from "typedoc" */

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure common documentation exists before extracting mappings
ensureCommonDocumentation();
const commonMappings = extractCommonSymbols(getCommonJsonPath(), "../common/");

const DefaultConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "./typedoc.json"), "utf-8"));

// Merge common symbol mappings with existing mappings
if (commonMappings["common"] && Object.keys(commonMappings["common"]).length > 0) {
    DefaultConfig.externalSymbolLinkMappings = DefaultConfig.externalSymbolLinkMappings || {};
    DefaultConfig.externalSymbolLinkMappings["common"] = commonMappings["common"];
}

/** @type {TypeDocOptions} */
const config = {
    ...DefaultConfig,
    blockTags: [
        ...OptionDefaults.blockTags,
        ...(DefaultConfig.blockTags || [])
    ],
    modifierTags: [
        ...OptionDefaults.modifierTags,
        ...(DefaultConfig.modifierTags || [])
    ],
    inlineTags: [
        ...OptionDefaults.inlineTags,
        ...(DefaultConfig.inlineTags || [])
    ]
};

export default config;
