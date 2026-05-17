import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const KIND = {
    Enum: 8,
    EnumMember: 16,
    Variable: 32,
    Class: 128,
    Interface: 256,
    Function: 2048,
    Property: 1024,
    Method: 2048,
    CallSignature: 4096,
    Constructor: 16384,
    ConstructorSignature: 32768,
    Getter: 262144,
    Setter: 524288,
    TypeAlias: 2097152
};

const KIND_TO_FOLDER = {
    8: "enums",
    32: "variables",
    128: "classes",
    256: "interfaces",
    2048: "functions",
    4096: "functions",
    2097152: "types"
};

function walk(node, ctx, out) {
    if (!node) {
        return;
    }

    const isInternal = !node.flags?.isExternal;
    const isConstructor = node.kind === KIND.Constructor || node.name === "constructor";
    const isMember = ctx && (ctx.type === KIND.Class || ctx.type === KIND.Interface || ctx.type === KIND.Enum);

    const newCtx = {
        type: node.kind,
        name: node.name,
        parent: ctx
    };

    if (!isInternal) {
        return;
    }

    // 1. CLASS
    if (node.kind === KIND.Class) {
        out.classes.push({
            name: node.name,
            fullPath: buildPath(newCtx),
            kind: node.kind
        });
    }

    // 2. INTERFACE
    if (node.kind === KIND.Interface) {
        out.interfaces.push({
            name: node.name,
            fullPath: buildPath(newCtx),
            kind: node.kind
        });
    }

    // 3. ENUM
    if (node.kind === KIND.Enum) {
        out.enums.push({
            name: node.name,
            fullPath: buildPath(newCtx),
            kind: node.kind
        });
    }

    // Handle Members (Properties, Methods, Enum Members)
    const MEMBER_KINDS = [
        KIND.Property,
        KIND.Method,
        KIND.EnumMember,
        KIND.Getter,
        KIND.Setter
    ];

    if (isMember && MEMBER_KINDS.includes(node.kind)) {
        out.variables.push({
            name: `${ctx.name}.${node.name}`,
            fullPath: buildPath(newCtx),
            kind: node.kind,
            isChild: true,
            parentName: ctx.name,
            parentKind: ctx.type
        });
    }

    // 4. FUNCTIONS
    const isTopLevelFunction = node.kind === KIND.Function && ctx?.type !== KIND.Class;

    if (isTopLevelFunction && !isConstructor) {
        out.functions.push({
            name: node.name,
            fullPath: buildPath(newCtx),
            kind: node.kind
        });
    }

    // VARIABLE
    if (node.kind === KIND.Variable && isInternal) {
        out.variables.push({
            name: node.name,
            fullPath: buildPath(newCtx),
            kind: node.kind
        });
    }

    // TYPE ALIAS
    if (node.kind === KIND.TypeAlias && isInternal) {
        out.types.push({
            name: node.name,
            fullPath: buildPath(newCtx),
            kind: node.kind
        });
    }

    // RECURSE children
    if (node.children) {
        for (const child of node.children) {
            walk(child, newCtx, out);
        }
    }

    // SIGNATURES
    if (node.signatures && !isConstructor) {
        for (const sig of node.signatures) {
            if (sig.kind !== KIND.ConstructorSignature && ctx?.type !== KIND.Class) {
                out.functions.push({
                    name: node.name,
                    fullPath: buildPath(newCtx),
                    kind: sig.kind
                });
            }
        }
    }
}

function buildPath(ctx) {
    const parts = [];
    let current = ctx;
    while (current) {
        if (current.name && current.name !== "default" && current.name !== "\"src/index\"") {
            parts.unshift(current.name);
        }
        current = current.parent;
    }
    return parts.join(".");
}

function dedupe(arr) {
    const seen = new Set();
    return arr.filter(x => {
        if (!x.fullPath || seen.has(x.fullPath)) {
            return false;
        }
        seen.add(x.fullPath);
        return true;
    });
}

/**
 * Ensures common documentation JSON exists, generating it if necessary
 */
export function ensureCommonDocumentation() {
    const projectRoot = getProjectRoot();
    const commonDir = path.join(projectRoot, 'common');
    const commonJsonPath = getCommonJsonPath();

    if (!fs.existsSync(commonJsonPath)) {
        console.log("Common TypeDoc JSON not found. Generating...");
        try {
            execSync("npx typedoc", { cwd: commonDir, stdio: "inherit" });
        } catch (error) {
            console.error("Failed to generate common documentation:", error);
            throw error;
        }
    }
}

/**
 * Extracts common symbols from the common.json TypeDoc output
 * @param {string} commonJsonPath - Path to the common.json file
 * @param {string} relativePath - Relative path to use for URLs (e.g., "../../common/" for backends)
 * @returns {Object} Object with common symbols mapped to their documentation URLs
 */
export function extractCommonSymbols(commonJsonPath, relativePath = "../../common/") {
    if (!fs.existsSync(commonJsonPath)) {
        return {};
    }

    const data = JSON.parse(fs.readFileSync(commonJsonPath, 'utf-8'));

    const out = {
        classes: [],
        interfaces: [],
        enums: [],
        functions: [],
        variables: [],
        types: []
    };

    // Start walking
    if (data.children) {
        for (const child of data.children) {
            walk(child, null, out);
        }
    }

    // Dedupe all categories
    out.classes = dedupe(out.classes);
    out.interfaces = dedupe(out.interfaces);
    out.enums = dedupe(out.enums);
    out.functions = dedupe(out.functions);
    out.variables = dedupe(out.variables);
    out.types = dedupe(out.types);

    // Process each category and generate URLs
    for (const key in out) {
        if (Array.isArray(out[key])) {
            out[key] = out[key].map(item => {
                if (item.isChild) {
                    const parentFolder = KIND_TO_FOLDER[item.parentKind] || "classes";
                    const lastDotIndex = item.fullPath.lastIndexOf(".");
                    const pathPart = item.fullPath.substring(0, lastDotIndex).replace(/\//g, "_");
                    const anchor = item.name.split(".")[1];
                    const url = `documentation/common/${parentFolder}/${pathPart}.html#${anchor}`;
                    return { ...item, url };
                }

                const folder = KIND_TO_FOLDER[item.kind] || "variables";
                const lastDotIndex = item.fullPath.lastIndexOf(".");
                const pathPart = item.fullPath.substring(0, lastDotIndex);
                const memberPart = item.fullPath.substring(lastDotIndex);
                const formattedPath = pathPart.replace(/\//g, "_");
                const url = `documentation/common/${folder}/${formattedPath}${memberPart}.html`;

                return { ...item, url };
            });
        }
    }

    // Build the final mappings
    const externalMappings = { "common": {} };

    const categories = ["classes", "interfaces", "enums", "functions", "variables", "types"];

    categories.forEach(category => {
        if (out[category]) {
            out[category].forEach(item => {
                externalMappings["common"][item.name] = item.url.replace("documentation/common/", relativePath);
            });
        }
    });

    return externalMappings;
}

/**
 * Gets the project root directory
 * @returns {string} The absolute path to the project root
 */
export function getProjectRoot() {
    return path.resolve(__dirname, '../../');
}

/**
 * Gets the path to common.json relative to project root
 * @returns {string} The absolute path to common.json
 */
export function getCommonJsonPath() {
    return path.resolve(getProjectRoot(), 'documentation/json/common.json');
}
