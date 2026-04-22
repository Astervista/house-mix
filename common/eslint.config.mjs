// @ts-check

import eslint from "@eslint/js";
import {defineConfig} from "eslint/config";
import tseslint from "typescript-eslint";
import {jsdoc} from "eslint-plugin-jsdoc";

const rules = {
    "@typescript-eslint/no-inferrable-types":               "off",
    "@typescript-eslint/unbound-method":                    [
        "error",
        {
            "ignoreStatic": true
        }
    ],
    "@typescript-eslint/explicit-function-return-type":     "error",
    "@typescript-eslint/restrict-template-expressions":     [
        "error",
        {
            "allowNumber":  true,
            "allowBoolean": true
        }
    ],
    "@typescript-eslint/non-nullable-type-assertion-style": "off",
    "@typescript-eslint/prefer-promise-reject-errors":      [
        "error",
        {
            "allowThrowingAny":     true,
            "allowThrowingUnknown": true
        }
    ],
    "@typescript-eslint/explicit-member-accessibility":     [
        "error",
        {
            "accessibility": "explicit",
            "overrides": {
                "constructors": "no-public"
            }
        }
    ],
    "@typescript-eslint/switch-exhaustiveness-check":       [
        "error",
        {
            "requireDefaultForNonUnion": false
        }
    ],
    "@typescript-eslint/strict-boolean-expressions":        "error",
    "@typescript-eslint/no-unnecessary-qualifier":          "error",
    "@typescript-eslint/no-unnecessary-parameter-property-assignment": "error",
    "no-shadow":                                            "off",
    "@typescript-eslint/no-shadow":                         "error",
    "array-callback-return":                                "error",
    "no-self-compare":                                      "error",
    "no-unassigned-vars":                                   "error",
    "no-alert":                                             "error",
    "no-new":                                               "error",
    "no-return-assign":                                     "error",
    "@typescript-eslint/unified-signatures":                [
        "error",
        {
            "ignoreDifferentlyNamedParameters": true,
            "ignoreOverloadsWithDifferentJSDoc": true
        }
    ],
    "@typescript-eslint/no-unused-vars":                    [
        "warn",
        {
            "argsIgnorePattern": "^_",
            "vars":              "all",
            "args":              "after-used"
        }
    ],
    "@typescript-eslint/no-unnecessary-type-parameters":    "off"
};

const jsdocRules = {
    "jsdoc/tag-lines":                               [
        "warn",
        "always",
        {
            count:                0,
            endLines:             1,
            startLinesWithNoTags: 0,
            startLines:           1
        }
    ],
    "jsdoc/require-returns":                         [
        "warn",
        {
            checkGetters: false
        }
    ],
    "jsdoc/require-hyphen-before-param-description": [
        "warn",
        "always"
    ],
    "jsdoc/require-description-complete-sentence":   [
        "warn",
        {
            tags: ["see", "copyright"]
        }
    ],
    "jsdoc/require-description":                     [
        "warn"
    ],
    "jsdoc/require-throws":                          [
        "warn"
    ],
    "jsdoc/require-file-overview":                   [
        "warn",
        {
            "tags": {
                "module": {
                    "mustExist": true
                }
            }
        }
    ],
    "jsdoc/require-jsdoc":                           [
        "warn",
        {
            require:     {
                FunctionDeclaration: true,
                MethodDefinition:    true,
                ClassDeclaration:    true
            },
            enableFixer: false,
            contexts:    [
                "ClassProperty",
                "PropertyDefinition",     // modern class fields
                "TSTypeAliasDeclaration TSPropertySignature",
                "TSInterfaceDeclaration TSPropertySignature",
                "TSEnumDeclaration",
                "Program > VariableDeclaration",
                "ExportNamedDeclaration > VariableDeclaration",
                "ExportDefaultDeclaration > VariableDeclaration",
                "PropertyDefinition[value.type='ArrowFunctionExpression']",
                "PropertyDefinition[value.type='FunctionExpression']",
                "ClassProperty[value.type='ArrowFunctionExpression']",
                "ClassProperty[value.type='FunctionExpression']",
                "TSInterfaceDeclaration",
                "TSTypeAliasDeclaration",
                "MethodDefinition[kind='method'][abstract=true]"
            ]
        }
    ],
    "jsdoc/require-asterisk-prefix":                 [
        "warn",
        "always"
    ],
    "jsdoc/require-template":                        [
        "warn",
        {
            requireSeparateTemplates: true
        }
    ],
    "jsdoc/require-template-description":            "warn"
};

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    jsdoc({
              config:          "flat/recommended",
              languageOptions: {
                  parserOptions: {
                      projectService:  true,
                      tsconfigRootDir: import.meta.dirname
                  }
              },
              rules:           jsdocRules
          }
    ),
    {
        languageOptions: {
            parserOptions: {
                projectService:  true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules
    },
    tseslint.configs.stylisticTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService:  true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        rules
    }
);
