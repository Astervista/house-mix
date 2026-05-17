import { OptionDefaults } from "typedoc";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
/** @import { TypeDocOptions } from "typedoc" */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DefaultConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "./typedoc.json"), "utf-8"));

/** @type {TypeDocOptions} */
const config = {
    ...DefaultConfig
};

export default config;
