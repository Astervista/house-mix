// @ts-check

import eslint from "@eslint/js";
import {defineConfig} from "eslint/config";
import tseslint from "typescript-eslint";

const rules = {
    "@typescript-eslint/no-inferrable-types":                          "off",
    "@typescript-eslint/unbound-method":                               [
        "error",
        {
            "ignoreStatic": true
        }
    ],
    "@typescript-eslint/explicit-function-return-type":                "error",
    "@typescript-eslint/restrict-template-expressions":                [
        "error",
        {
            "allowNumber":  true,
            "allowBoolean": true
        }
    ],
    "@typescript-eslint/non-nullable-type-assertion-style":            "off",
    "@typescript-eslint/prefer-promise-reject-errors":                 [
        "error",
        {
            "allowThrowingAny":     true,
            "allowThrowingUnknown": true
        }
    ],
    "@typescript-eslint/explicit-member-accessibility":                [
        "error",
        {
            "accessibility": "explicit",
            "overrides":     {
                "constructors": "no-public"
            }
        }
    ],
    "@typescript-eslint/switch-exhaustiveness-check":                  [
        "error",
        {
            "requireDefaultForNonUnion": false
        }
    ],
    "@typescript-eslint/strict-boolean-expressions":                   "error",
    "@typescript-eslint/no-unnecessary-qualifier":                     "error",
    "@typescript-eslint/no-unnecessary-parameter-property-assignment": "error",
    "no-shadow":                                                       "off",
    "@typescript-eslint/no-shadow":                                    "error",
    "array-callback-return":                                           "error",
    "no-self-compare":                                                 "error",
    "no-unassigned-vars":                                              "error",
    "no-alert":                                                        "error",
    "no-new":                                                          "error",
    "no-return-assign":                                                "error",
    "@typescript-eslint/unified-signatures":                           [
        "error",
        {
            "ignoreDifferentlyNamedParameters":  true,
            "ignoreOverloadsWithDifferentJSDoc": true
        }
    ],
    "@typescript-eslint/no-unused-vars":                               [
        "warn",
        {"argsIgnorePattern": "^_"}
    ],
    "@typescript-eslint/no-unnecessary-type-parameters":               "off"
};

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.strictTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService:  true,
                tsconfigRootDir: import.meta.dirname
            }
        },
        ignores:         ["eslint.config.mjs"],
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
