const fs   = require("fs");
const path = require("path");

const input  = path.resolve(process.cwd(), "documentation/json/common.json");
const output = path.resolve(process.cwd(), "documentation/json/common-mappings.json");

const data = JSON.parse(fs.readFileSync(input, "utf-8"));

/**
 * Updated ReflectionKind values based on TypeDoc defaults:
 * Enum: 8
 * EnumMember: 16
 * Class: 128
 * Interface: 256
 * Function: 64 (Call Signature is usually what you want to track)
 * Variable: 32 (Sometimes used for arrow-function exports)
 * Constructor: 512
 */
const KIND = {
    Enum:                 8,
    EnumMember:           16,
    Variable:             32,
    Class:                128,
    Interface:            256,
    Function:             2048,
    Property:             1024,
    Method:               2048,
    CallSignature:        4096,
    Constructor:          16384,
    ConstructorSignature: 32768,
    Getter:               262144,
    Setter:               524288,
    TypeAlias:            2097152
};

function walk(node, ctx, out) {
    if (!node) {
        return;
    }
    
    const isInternal    = !node.flags?.isExternal;
    const isConstructor = node.kind === KIND.Constructor || node.name === "constructor";
    
    // Check if the current node is a member of a Class, Interface, or Enum
    const isMember = ctx && (ctx.type === KIND.Class || ctx.type === KIND.Interface || ctx.type === KIND.Enum);
    
    const newCtx = {
        type:   node.kind,
        name:   node.name,
        parent: ctx
    };
    
    if (!isInternal) {
        return;
    }
    
    // 1. CLASS
    if (node.kind === KIND.Class) {
        out.classes.push({
                             name:     node.name,
                             fullPath: buildPath(newCtx),
                             kind:     node.kind
                         });
    }
    
    // 2. INTERFACE
    if (node.kind === KIND.Interface) {
        out.interfaces.push({
                                name:     node.name,
                                fullPath: buildPath(newCtx),
                                kind:     node.kind
                            });
    }
    
    // 3. ENUM (Corrected Kind to 8)
    if (node.kind === KIND.Enum) {
        out.enums.push({
                           name:     node.name,
                           fullPath: buildPath(newCtx),
                           kind:     node.kind
                       });
    }
    
    // NEW: Handle Members (Properties, Methods, Enum Members)
    const MEMBER_KINDS = [
        KIND.Property,
        KIND.Method,
        KIND.EnumMember,
        KIND.Getter,
        KIND.Setter
    ];
    
    if (isMember && MEMBER_KINDS.includes(node.kind)) {
        out.variables.push({
                               // This creates the "Cat#name" key TypeDoc looks for
                               name:       `${ctx.name}.${node.name}`,
                               fullPath:   buildPath(newCtx),
                               kind:       node.kind,
                               isChild:    true,
                               parentName: ctx.name,
                               parentKind: ctx.type
                           });
    }
    
    // 4. FUNCTIONS
    // Logic: Must be a function kind, NOT inside a class, and NOT a constructor
    const isTopLevelFunction = node.kind === KIND.Function && ctx?.type !== KIND.Class;
    
    if (isTopLevelFunction && !isConstructor) {
        out.functions.push({
                               name:     node.name,
                               fullPath: buildPath(newCtx),
                               kind:     node.kind
                           });
    }
    
    // VARIABLE
    if (node.kind === KIND.Variable && isInternal) {
        out.variables.push({
                               name:     node.name,
                               fullPath: buildPath(newCtx),
                               kind:     node.kind
                           });
    }
    
    // TYPE ALIAS
    if (node.kind === KIND.TypeAlias && isInternal) {
        out.types.push({
                           name:     node.name,
                           fullPath: buildPath(newCtx),
                           kind:     node.kind
                       });
    }
    
    // RECURSE children
    if (node.children) {
        for (const child of node.children) {
            walk(child, newCtx, out);
        }
    }
    
    // SIGNATURES
    // TypeDoc often puts the actual data in 'signatures' for functions.
    // We skip these if the parent was a constructor.
    if (node.signatures && !isConstructor) {
        for (const sig of node.signatures) {
            // Only add if it's a call signature (4096) and not a constructor signature
            if (sig.kind !== KIND.ConstructorSignature && ctx?.type !== KIND.Class) {
                out.functions.push({
                                       name:     node.name, // Use parent node name, signatures often just say "__type"
                                       fullPath: buildPath(newCtx),
                                       kind:     sig.kind
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

const out = {
    classes:    [],
    interfaces: [],
    enums:      [],
    functions:  [],
    variables:  [],
    types:      []
};

// Start walking
if (data.children) {
    for (const child of data.children) {
        walk(child, null, out);
    }
}

// dedupe
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

out.classes    = dedupe(out.classes);
out.interfaces = dedupe(out.interfaces);
out.enums      = dedupe(out.enums);
out.functions  = dedupe(out.functions);
out.variables  = dedupe(out.variables);
out.types      = dedupe(out.types);

const KIND_TO_FOLDER = {
    8:       "enums",
    32:      "variables",
    128:     "classes",
    256:     "interfaces",
    2048:    "functions",
    4096:    "functions",
    2097152: "types"
};

// Process each category in the 'out' object
for (const key in out) {
    if (Array.isArray(out[key])) {
        out[key] = out[key].map(item => {
            if (item.isChild) {
                // Link to the parent's file with an anchor
                const parentFolder = KIND_TO_FOLDER[item.parentKind] || "classes";
                const lastDotIndex = item.fullPath.lastIndexOf(".");
                const pathPart     = item.fullPath.substring(0, lastDotIndex).replace(/\//g, "_");
                
                const anchor = item.name.split(".")[1];
                const url    = `documentation/common/${parentFolder}/${pathPart}.html#${anchor}`;
                return {...item, url};
            }
            
            const folder       = KIND_TO_FOLDER[item.kind] || "variables";
            const lastDotIndex = item.fullPath.lastIndexOf(".");
            const pathPart     = item.fullPath.substring(0, lastDotIndex);
            const memberPart   = item.fullPath.substring(lastDotIndex);
            
            const formattedPath = pathPart.replace(/\//g, "_");
            const url           = `documentation/common/${folder}/${formattedPath}${memberPart}.html`;
            
            return {
                ...item,
                url: url
            };
        });
    }
}

// This is the object we will merge into backend's typedoc.json
const externalMappings = {
    "common": {}
};

const categories = ["classes", "interfaces", "enums", "functions", "variables", "types"];

categories.forEach(category => {
    if (out[category]) {
        out[category].forEach(item => {
            // Because backend and common folders are siblings:
            // We use '../common/' to jump out of 'backend/' and into 'common/'
            // Map the symbol name to the relative path
            externalMappings["common"][item.name] = item.url.replace("documentation/common/", "../../common/");
        });
    }
});

console.log(JSON.stringify(externalMappings, null, 2));
