const {Converter} = require("typedoc");
const path        = require("path");
const {execSync}  = require("child_process");
const td          = require("typedoc");
const ts          = td.TypeScript;

/**
 * @param {import("typedoc").Application} app
 */
function load(app) {
    let gitBaseUrl  = "";
    let projectRoot = "";

    try {
        // 1. Get the remote URL and current revision
        let remote = execSync("git config --get remote.origin.url").toString().trim();
        remote     = remote.replace(/\.git$/, "").replace("git@github.com:", "https://github.com/");

        const revision = execSync("git rev-parse --short HEAD").toString().trim();
        projectRoot    = execSync("git rev-parse --show-toplevel").toString().trim();

        // 2. Construct the base blob URL (GitHub/GitLab style)
        gitBaseUrl = `${remote}/blob/${revision}`;
    } catch (e) {
        app.logger.warn("StylesheetPlugin: Git not found or not a repository.");
    }

    app.converter.on(
        td.Converter.EVENT_CREATE_DECLARATION,
        (context, decl) => {

            // Only class reflections
            if (
                !(decl instanceof td.DeclarationReflection)
            ) {
                return;
            }

            if (
                decl.kind !== td.ReflectionKind.Class
            ) {
                return;
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
                !ts.isClassDeclaration(declaration)
            ) {
                return;
            }

            // TS5-compatible decorators
            const decorators =
                      ts.canHaveDecorators(declaration)
                          ? ts.getDecorators(declaration) ?? []
                          : [];

            const componentDecorator =
                      decorators.find((decorator) => {

                          const expr =
                                    decorator.expression;

                          return (
                              ts.isCallExpression(expr) &&
                              ts.isIdentifier(
                                  expr.expression
                              ) &&
                              expr.expression.text ===
                              "Component"
                          );
                      });

            if (!componentDecorator) {
                return;
            }

            const callExpr =
                      componentDecorator.expression;

            if (
                !ts.isCallExpression(callExpr)
            ) {
                return;
            }

            const arg = callExpr.arguments[0];

            if (
                !arg ||
                !ts.isObjectLiteralExpression(arg)
            ) {
                return;
            }

            let templateUrl = null;
            let selector    = null;
            const styleUrls = [];


            for (const prop of arg.properties) {

                if (
                    !ts.isPropertyAssignment(prop)
                ) {
                    continue;
                }

                const name =
                          prop.name.getText();

                // templateUrl
                if (
                    name === "templateUrl" &&
                    ts.isStringLiteral(
                        prop.initializer
                    )
                ) {

                    templateUrl =
                        prop.initializer.text;
                }

                if (
                    name === "selector" &&
                    ts.isStringLiteral(prop.initializer)
                ) {
                    selector = prop.initializer.text;
                }

                // styleUrl
                if (
                    name === "styleUrl" &&
                    ts.isStringLiteral(
                        prop.initializer
                    )
                ) {

                    styleUrls.push(
                        prop.initializer.text
                    );
                }

                // styleUrls
                if (
                    name === "styleUrls" &&
                    ts.isArrayLiteralExpression(
                        prop.initializer
                    )
                ) {

                    for (const el of prop.initializer
                        .elements) {

                        if (
                            ts.isStringLiteral(el)
                        ) {

                            styleUrls.push(
                                el.text
                            );
                        }
                    }
                }
            }


            if (decl.comment) {
                if (!decl.comment.modifierTags.has("@component")) {
                    app.logger.warn(`Class "${decl.name}" is an Angular component, but is missing the @component TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@component\n    at (${
                        declaration.getSourceFile().fileName}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`);

                    decl.comment.modifierTags.add("@component");
                }


                if (selector) {
                    if (!decl.comment.blockTags.some(a => a.tag === "@componentSelector")) {
                        app.logger.warn(`Class "${decl.name}" is an Angular component (selector: "${selector}"), but is missing the @componentSelector TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@componentSelector \`<${selector}>\`\n    at (${
                            declaration.getSourceFile().fileName}:${
                            declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                            declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`);

                        decl.comment.blockTags.push(
                            new td.CommentTag("@componentSelector", [
                                {
                                    kind: "text",
                                    text: `\`<${selector}>\``
                                }
                            ])
                        );
                    } else {
                        const tag = decl.comment.blockTags.find(a => a.tag === "@componentSelector");

                        if (tag && tag.content.length > 0 && tag.content[0].kind === "code") {
                            const rawText = tag.content[0].text;
                            if (rawText !== `\`<${selector}>\``) {
                                app.logger.warn(`Class "${decl.name}" is an Angular component (selector: "${selector}"), but is tagged with a different selector ("${rawText}"). Check it for copy errors.\n    at (${
                                    declaration.getSourceFile().fileName}:${
                                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`);
                            }
                        }

                    }
                }
            }


            if (
                !templateUrl &&
                styleUrls.length === 0
            ) {
                return;
            }

            const sourceFile =
                      declaration
                          .getSourceFile()
                          .fileName;

            if (!decl.sources) {
                decl.sources = [];
            }

            function addSource(relativePath) {

                const absoluteTarget =
                          path.resolve(
                              path.dirname(sourceFile),
                              relativePath
                          );

                const repoPath =
                          path.relative(
                              projectRoot,
                              absoluteTarget
                          );

                const gitUrl =
                          gitBaseUrl
                              ? `${gitBaseUrl}/${repoPath}`
                              : undefined;

                decl.sources.push({
                                      fileName:
                                          path.basename(
                                              relativePath
                                          ),

                                      fullFileName:
                                      absoluteTarget,

                                      line:      1,
                                      character: 1,
                                      url:       gitUrl
                                  });
            }

            if (templateUrl) {
                addSource(templateUrl);
            }

            for (const styleUrl of styleUrls) {
                addSource(styleUrl);
            }
        }
    );

    // NEW BLOCK FOR DIRECTIVES
    app.converter.on(
        td.Converter.EVENT_CREATE_DECLARATION,
        (context, decl) => {
            // Only class reflections
            if (
                !(decl instanceof td.DeclarationReflection)
            ) {
                return;
            }

            if (
                decl.kind !== td.ReflectionKind.Class
            ) {
                return;
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
                !ts.isClassDeclaration(declaration)
            ) {
                return;
            }

            // TS5-compatible decorators
            const decorators =
                      ts.canHaveDecorators(declaration)
                          ? ts.getDecorators(declaration) ?? []
                          : [];

            const directiveDecorator =
                      decorators.find((decorator) => {
                          const expr = decorator.expression;
                          return (
                              ts.isCallExpression(expr) &&
                              ts.isIdentifier(expr.expression) &&
                              expr.expression.text === "Directive"
                          );
                      });

            if (!directiveDecorator) {
                return;
            }

            const callExpr = directiveDecorator.expression;

            if (!ts.isCallExpression(callExpr)) {
                return;
            }

            const arg = callExpr.arguments[0];

            if (
                !arg ||
                !ts.isObjectLiteralExpression(arg)
            ) {
                return;
            }

            let selector = null;

            for (const prop of arg.properties) {
                if (!ts.isPropertyAssignment(prop)) {
                    continue;
                }

                const name = prop.name.getText();

                if (
                    name === "selector" &&
                    ts.isStringLiteral(prop.initializer)
                ) {
                    selector = prop.initializer.text.replace(/^[|]$/, "");
                    break;
                }
            }

            if (decl.comment) {
                if (!decl.comment.modifierTags.has("@directive")) {
                    app.logger.warn(`Class "${decl.name}" is an Angular directive, but is missing the @directive TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@directive\n    at (${
                        declaration.getSourceFile().fileName}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`);

                    decl.comment.modifierTags.add("@directive");
                }

                if (selector) {
                    if (!decl.comment.blockTags.some(a => a.tag === "@directiveName")) {
                        app.logger.warn(`Class "${decl.name}" is an Angular directive (selector: "${selector}"), but is missing the @directiveName TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@directiveName \`${selector}\`\n    at (${
                            declaration.getSourceFile().fileName}:${
                            declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                            declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`);

                        decl.comment.blockTags.push(
                            new td.CommentTag("@directiveName", [
                                {
                                    kind: "text",
                                    text: `\`[${selector}]\``
                                }
                            ])
                        );
                    } else {
                        const tag = decl.comment.blockTags.find(a => a.tag === "@directiveName");
                        if (tag && tag.content.length > 0 && tag.content[0].kind === "code") {
                            const rawText = tag.content[0].text;
                            if (rawText !== `\`${selector}\``) {
                                app.logger.warn(`Class "${decl.name}" is an Angular directive (selector: "${selector}"), but is tagged with a different selector ("${rawText}"). Check it for copy errors.\n    at (${
                                    declaration.getSourceFile().fileName}:${
                                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`);
                            }
                        }
                    }
                }
            }
        }
    );

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


function elaborateProperty(app, context, decl) {



    if (
        !(decl instanceof td.DeclarationReflection)
    ) {
        return;
    }

    if (
        decl.kind !== td.ReflectionKind.Property && decl.kind !== td.ReflectionKind.Method && decl.kind !== td.ReflectionKind.Accessor
    ) {
        return;
    }

    if (
        decl.kind === td.ReflectionKind.Accessor &&
        decl.setSignature?.comment
    ) {
        decl.setSignature.type = undefined;
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

    let characteristics = {
        input:        false,
        required:     false,
        inputAlias:   null,
        output:       false,
        outputAlias:  null,
        hostBindings:  [],
        viewChild:    false,
        viewChildren: false,
    };

    for (let decorator of propertyDecorators) {
        const callExpr = decorator.expression;
        let arg0       = callExpr.arguments[0];
        if (arg0 && ts.isStringLiteral(arg0)) {
            if (callExpr.expression.text === "Input") {
                characteristics.input      = true;
                characteristics.inputAlias = arg0.text;
            }
            if (callExpr.expression.text === "Output") {
                characteristics.output      = true;
                characteristics.outputAlias = arg0.text;
            }
            if (callExpr.expression.text === "HostBinding") {
                characteristics.hostBindings.push(arg0.text);
            }
            if (callExpr.expression.text === "ViewChild") {
                characteristics.viewChild = true;
            }
            if (callExpr.expression.text === "ViewChildren") {
                characteristics.viewChildren = true;
            }
        } else if (arg0 && ts.isObjectLiteralExpression(arg0)) {
            for (let prop of arg0.properties) {
                const name = prop.name.getText();
                if (callExpr.expression.text === "Input" && name === "required" && ts.isPropertyAssignment(prop) && ts.isBooleanLiteral(prop.initializer)) {
                    if (prop.initializer.kind === ts.SyntaxKind.TrueKeyword) {
                        characteristics.input    = true;
                        characteristics.required = true;
                    } else {
                        characteristics.input = true;
                    }
                }
                if ((callExpr.expression.text === "Input" || callExpr.expression.text === "Output") && name === "alias" && ts.isPropertyAssignment(prop) && ts.isStringLiteral(prop.initializer)) {
                    if (callExpr.expression.text === "Input") {
                        characteristics.input = true;
                        characteristics.inputAlias = prop.initializer.text;
                    } else {
                        characteristics.output = true;
                        characteristics.outputAlias = prop.initializer.text;
                    }
                }
            }
        } else {
            if (callExpr.expression.text === "Input") {
                characteristics.input = true;
            }
            if (callExpr.expression.text === "Output") {
                characteristics.output = true;
            }
            if (callExpr.expression.text === "ViewChild") {
                characteristics.viewChild = true;
            }
            if (callExpr.expression.text === "ViewChildren") {
                characteristics.viewChildren = true;
            }
        }
    }

    let comment = decl.comment ?? decl.setSignature?.comment ?? decl.getSignature?.comment;
    let rootComment = comment;
    let moveToRoot = false;

    if (decl.comment == null && comment != null) {
        decl.comment = rootComment = new td.Comment();
        moveToRoot = true;
    }


    if (comment) {
        if (characteristics.input && !comment.modifierTags.has("@input")) {
            app.logger.warn(
                `Property "${decl.name}" is an Angular input, but is missing the @input TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@input\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
            );

            if (moveToRoot) {
                rootComment.modifierTags.add("@input");
            } else {
                comment.modifierTags.add("@input");
            }
        } else if (!characteristics.input && comment.modifierTags.has("@input")) {
            app.logger.warn(
                `Property "${decl.name}" is not an Angular input, but the documentation defines the @input TSDoc tag. Check again for correctness.\nTo Fix This, remove "@input" from the property TSDoc.\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character +
                    1})\n`
            );
        } else if (characteristics.input) {
            if (moveToRoot) {
                rootComment.modifierTags.add("@input");
                comment.modifierTags.delete("@input");
            }
        }

        if (characteristics.input && !comment.blockTags.some(a => a.tag === "@group")) {

            comment.blockTags.push(
                new td.CommentTag("@group", [
                    {
                        kind: "text",
                        text: "Angular inputs"
                    }
                ])
            );
        }

        if (characteristics.required && !comment.modifierTags.has("@required")) {
            app.logger.warn(
                `Property "${decl.name}" is required, but is missing the @required TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@required\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
            );

            if (moveToRoot) {
                rootComment.modifierTags.add("@required");
            } else {
                comment.modifierTags.add("@required");
            }
        } else if (!characteristics.required && comment.modifierTags.has("@required")) {
            app.logger.warn(
                `Property "${decl.name}" is not required, but the documentation defines the @required TSDoc tag. Check again for correctness.\nTo Fix This, remove "@required" from the property TSDoc.\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character +
                    1})\n`
            );
        } else if (characteristics.required) {
            if (moveToRoot) {
                rootComment.modifierTags.add("@required");
                comment.modifierTags.delete("@required");
            }
        }

        if (characteristics.output && !comment.modifierTags.has("@output")) {
            app.logger.warn(
                `Property "${decl.name}" is an Angular output, but is missing the @output TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@output\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
            );

            if (moveToRoot) {
                rootComment.modifierTags.add("@output");
            } else {
                comment.modifierTags.add("@output");
            }
        } else if (!characteristics.output && comment.modifierTags.has("@output")) {
            app.logger.warn(
                `Property "${decl.name}" is not an Angular output, but the documentation defines the @output TSDoc tag. Check again for correctness.\nTo Fix This, remove "@output" from the property TSDoc.\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character +
                    1})\n`
            );
        } else if (characteristics.output) {
            if (moveToRoot) {
                rootComment.modifierTags.add("@output");
                comment.modifierTags.delete("@output");
            }
        }


        if (characteristics.output && !comment.blockTags.some(a => a.tag === "@group")) {

            comment.blockTags.push(
                new td.CommentTag("@group", [
                    {
                        kind: "text",
                        text: "Angular outputs"
                    }
                ])
            );
        }

        if (characteristics.inputAlias != null && !comment.blockTags.some(a => a.tag === "@inputAlias")) {
            app.logger.warn(
                `Property "${decl.name}" as an Angular input has an alias, but is missing the @inputAlias TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@inputAlias ${characteristics.inputAlias}\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
            );

            comment.blockTags.push(
                new td.CommentTag("@inputAlias", [
                    {
                        kind: "code",
                        text: characteristics.inputAlias
                    }
                ])
            );
        } else if (characteristics.inputAlias == null && comment.blockTags.some(a => a.tag === "@inputAlias")) {
            app.logger.warn(
                `Property "${decl.name}" does not have an Angular input alias, but the documentation defines the @inputAlias TSDoc tag. Check again for correctness.\nTo Fix This, remove "@inputAlias" from the property TSDoc.\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character +
                    1})\nTo fix this warning, remove "@inputAlias" from the property TSDoc.\n`
            );
        } else if (comment.blockTags.some(a => a.tag === "@inputAlias")) {
            const tag = comment.blockTags.find(a => a.tag === "@inputAlias");
            if (tag && tag.content.length > 0 && tag.content[0].kind === "text") {
                const rawText = tag.content[0].text;
                tag.content[0].text = `\`${rawText}\``;
            }
        }

        if (characteristics.outputAlias != null && !comment.blockTags.some(a => a.tag === "@outputAlias")) {
            app.logger.warn(
                `Property "${decl.name}" as an Angular output has an alias, but is missing the @outputAlias TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@outputAlias ${characteristics.outputAlias}\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
            );

            comment.blockTags.push(
                new td.CommentTag("@outputAlias", [
                    {
                        kind: "text",
                        text: characteristics.outputAlias
                    }
                ])
            );
        } else if (characteristics.outputAlias == null && comment.blockTags.some(a => a.tag === "@outputAlias")) {
            app.logger.warn(
                `Property "${decl.name}" does not have an Angular output alias, but the documentation defines the @outputAlias TSDoc tag. Check again for correctness.\nTo Fix This, remove "@outputAlias" from the property TSDoc.\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character +
                    1})\n`
            );
        } else if (comment.blockTags.some(a => a.tag === "@outputAlias")) {
            const tag = comment.blockTags.find(a => a.tag === "@outputAlias");
            if (tag && tag.content.length > 0 && tag.content[0].kind === "text") {
                const rawText = tag.content[0].text;
                tag.content[0].text = `\`${rawText}\``;
            }
        }


        let orphans = comment.blockTags.filter(a => a.tag === "@hostBinding" && !characteristics.hostBindings.includes(a.content?.[0]?.text));

        for (let orphan of orphans) {
            app.logger.warn(
                `Property "${decl.name}" does not have an Angular host binding with expression "${orphan.content?.[0]?.text}", but the documentation defines this @hostBinding TSDoc tag. Check again for correctness.\nTo Fix This, remove this "@hostBinding" from the property TSDoc.\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character +
                    1})\n`
            );
        }

        for (let hostBinding of characteristics.hostBindings) {
            if (hostBinding != null && !comment.blockTags.some(a => a.tag === "@hostBinding" && a.content?.[0]?.text === hostBinding)) {
                app.logger.warn(
                    `Property "${decl.name}" is an Angular host binding for ${hostBinding}, but is missing the @hostBinding TSDoc tag for ${hostBinding}. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@hostBinding ${hostBinding}\n    at (${
                        declaration.getSourceFile().fileName}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                        declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
                );

                comment.blockTags.push(
                    new td.CommentTag("@hostBinding", [
                        {
                            kind: "text",
                            text: hostBinding.split(".")
                                                 .map((el, pos) => `<span class="tsd-angular-host-biding" data-order="${pos}">\`${el}\`</span>`)
                                                 .join("<span class='divider'>.</span>")
                        }
                    ])
                );
            } else if (comment.blockTags.some(a => a.tag === "@hostBinding" && a.content?.[0]?.text === hostBinding)) {
                const tag = comment.blockTags.find(a => a.tag === "@hostBinding" && a.content?.[0]?.text === hostBinding);
                if (tag && tag.content.length > 0 && tag.content[0].kind === "text") {
                    const rawText       = tag.content[0].text;
                    tag.content[0].text =
                        rawText.split(".").map((el, pos) => `<span class="tsd-angular-host-biding" data-order="${pos}">\`${el}\`</span>`).join("<span class='divider'>.</span>");
                }
            }
        }

        if (characteristics.viewChild && !comment.blockTags.some(a => a.tag === "@viewChild")) {
            app.logger.warn(
                `Property "${decl.name}" is an Angular ViewChild, but is missing the @viewChild TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@viewChild\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
            );

            comment.blockTags.push(
                new td.CommentTag("@viewChild", [
                    {
                        kind: "text",
                        text: ""
                    }
                ])
            );
        } else if (!characteristics.viewChild && comment.blockTags.some(a => a.tag === "@viewChild")) {
            app.logger.warn(
                `Property "${decl.name}" is not an Angular ViewChild, but the documentation defines the @viewChild TSDoc tag. Check again for correctness.\nTo Fix This, remove "@viewChild" from the property TSDoc.\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character +
                    1})\n`
            );
        }

        if (characteristics.viewChildren && !comment.blockTags.some(a => a.tag === "@viewChildren")) {
            app.logger.warn(
                `Property "${decl.name}" is an Angular ViewChildren, but is missing the @viewChildren TSDoc tag. It has been added automatically to the documentation, but it is missing from the source code TSDoc comment and thus will not be available by IDEs, for example.\nTo fix this warning, add the following to the tsdoc:\n@viewChildren\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character + 1})\n`
            );

            comment.blockTags.push(
                new td.CommentTag("@viewChildren", [
                    {
                        kind: "text",
                        text: ""
                    }
                ])
            );
        } else if (!characteristics.viewChildren && comment.blockTags.some(a => a.tag === "@viewChildren")) {
            app.logger.warn(
                `Property "${decl.name}" is not an Angular ViewChildren, but the documentation defines the @viewChildren TSDoc tag. Check again for correctness.\nTo Fix This, remove "@viewChildren" from the property TSDoc.\n    at (${
                    declaration.getSourceFile().fileName}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).line + 1}:${
                    declaration.getSourceFile().getLineAndCharacterOfPosition(declaration.getStart()).character +
                    1})\n`
            );
        }


    }

}

module.exports = {load};
