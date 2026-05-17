const {Converter} = require("typedoc");
const path        = require("path");
const {execSync}  = require("child_process");
const td          = require("typedoc");
const ts          = td.TypeScript;

/**
 * @param {import("typedoc").Application} app
 */
function load(app) {

    app.converter.on(
        td.Converter.EVENT_RESOLVE_END,
        (context) => {

            const reflections =
                      context.project.getReflectionsByKind(
                          td.ReflectionKind.Accessor |
                          td.ReflectionKind.Property |
                          td.ReflectionKind.Method
                      );

            for (const decl of reflections) {

                elaborateProperty(app, context, decl);
            }
        }
    );


}

let httpMethods = ["@get", "@post", "@put", "@patch", "@delete"];

function elaborateProperty(app, context, decl) {



    if (
        !(decl instanceof td.DeclarationReflection)
    ) {
        return;
    }

    if (
        decl.kind !== td.ReflectionKind.Method &&
        decl.kind !== td.ReflectionKind.Property
    ) {
        return;
    }


    let hasBlockTag = false;
    let modifierTags = [];
    let hasComment = false;
    if (decl.kind === td.ReflectionKind.Method) {
        for (let signature of decl.signatures) {
            if (signature.comment == null) {
                continue;
            }
            hasComment = true;
            let comment = new td.Comment();
            let changed = false;
            let firstModifier = null;
            let ignore = false;
            signature.comment.modifierTags.forEach(tag => {
                if (tag === "@apiProxy") {
                    ignore = true;
                }
                if (httpMethods.includes(tag)) {
                    if (firstModifier == null) {
                        firstModifier = tag.substring(1).toUpperCase();
                    }
                    comment.modifierTags.add(tag)
                    signature.comment.modifierTags.delete(tag);
                    changed = true;
                    modifierTags.push(tag);
                }
            })
            if (ignore) {
                return;
            }
            signature.comment.blockTags.forEach(a => {
                if (a.tag === "@apiEndpoint") {
                    hasBlockTag = true;
                    if (firstModifier) {
                        a.content = [
                            {
                                kind: "text",
                                text: `<span class="http-method http-method-${firstModifier.toLowerCase()}">\`${firstModifier}\`</span> `
                            },
                            ...a.content
                        ]
                    }
                }
            })
            if (changed) {
                decl.comment = comment;
            }
        }
    } else {

        let firstModifier = null;
        decl.comment?.modifierTags?.forEach(tag => {
            if (tag === "@apiProxy") {
                return
            }
            if (httpMethods.includes(tag)) {
                if (firstModifier == null) {
                    firstModifier = tag.substring(1).toUpperCase();
                }
                modifierTags.push(tag);
            }
        })

        decl.comment?.blockTags?.forEach(a => {
            if (a.tag === "@apiEndpoint") {
                hasBlockTag = true;
                if (firstModifier) {
                    a.content = [
                        {
                            kind: "text",
                            text: `<span class="http-method http-method-${firstModifier.toLowerCase()}">\`${firstModifier}\`</span> `
                        },
                        ...a.content
                    ]
                }
            }
        })

        hasComment = decl.comment != null;
    }

    const symbol =
              context.getSymbolFromReflection(
                  decl
              );

    if (!symbol) {
        return;
    }


    const declaration =
              symbol.valueDeclaration;

    if (!declaration) {
        return;
    }
    if (
        !ts.isPropertyDeclaration(declaration) &&
        !ts.isMethodDeclaration(declaration) &&
        !ts.isSetAccessorDeclaration(declaration) &&
        !ts.isGetAccessorDeclaration(declaration)
    ) {
        return;
    }



    // TS5-compatible decorators
    const decorators =
              ts.canHaveDecorators(declaration)
                  ? ts.getDecorators(declaration) ?? []
                  : [];

    const propertyDecorators =
              decorators.filter((decorator) => {

                  const expr = decorator.expression;

                  return (
                      ts.isCallExpression(expr) &&
                      ts.isIdentifier(expr.expression)
                  );
              });

    let activeHttpDecorators = [];

    for (let decorator of propertyDecorators) {
        const callExpr = decorator.expression;
        if (httpMethods.includes("@" + callExpr.expression.escapedText.toLowerCase())) {
            activeHttpDecorators.push("@" + callExpr.expression.escapedText.toLowerCase());
        }
    }

    if (hasComment) {
        if (activeHttpDecorators.length > 0) {
            if (!hasBlockTag) {
                app.logger.warn(
                    `Property "${decl.name}" is a REST endpoint, but is missing the @apiEndpoint TSDoc tag.\nTo fix this warning, add the following to the tsdoc:\n@apiEndpoint\n    at (${
                        declaration.getSourceFile().fileName}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
                );
            }
        } else {
            if (hasBlockTag) {
                app.logger.warn(
                    `Property "${decl.name}" is not a REST endpoint, but the documentation defines the @apiEndpoint TSDoc tag. Check again for correctness.\nTo Fix This, remove "@apiEndpoint" from the property TSDoc.\n    at (${
                        declaration.getSourceFile().fileName}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character +
                        1})\n`
                );
            }
        }
        for (let decorator of activeHttpDecorators) {
            if (!modifierTags.includes(decorator)) {
                app.logger.warn(
                    `Property "${decl.name}" has the decorator ${decorator}, but the TSDoc is missing the corresponding modifier tag.\nTo fix this warning, add the following to the tsdoc:\n${decorator} \n    at (${
                        declaration.getSourceFile().fileName}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
                );
            }
        }

        for (let tag of modifierTags) {
            if (!activeHttpDecorators.includes(tag)) {
                app.logger.warn(
                    `Property "${decl.name}" has the TSDoc modifier tag "${tag}", but the corresponding decorator is missing in the code.\nTo fix this warning, remove "${tag}" from the TSDoc or add the decorator to the property.\n    at (${
                        declaration.getSourceFile().fileName}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
                );
            }
        }



    }

}

module.exports = {load};
