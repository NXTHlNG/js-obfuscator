const {getHash} = require('emoji-hash-gen');
const {v4: uuidv4} = require('uuid');
const {RefactorSession} = require('shift-refactor');
const {refactor: refc} = require('shift-refactor');
const {parseScript} = require('shift-parser');
const Shift = require('shift-ast');
const alwaysTrueFunctionsToBody = require('./functionsAlwaysTrue.js').functions;
const alwaysFalseFunctionsToBody = require('./functionsAlwaysFalse.js').functions;
const jsesc = require('jsesc')

// const fs = require('fs');

function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function encode64(input, keyStr) {
    if (!String(input).length) return false;
    var output = "";
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    do {
        chr1 = input.charCodeAt(i++);
        chr2 = input.charCodeAt(i++);
        chr3 = input.charCodeAt(i++);

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
        enc4 = chr3 & 63;

        if (isNaN(chr2)) {
            enc3 = enc4 = 64;
        } else if (isNaN(chr3)) {
            enc4 = 64;
        }
        output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
            keyStr.charAt(enc3) + keyStr.charAt(enc4);
    } while (i < input.length);

    return output;
}

function generateRandomString(length) {
    const result = [];
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result.push(characters.charAt(Math.floor(Math.random() * charactersLength)));
    }
    return result.join('');
}

function generateVariableName() {
    return "_" + uuidv4().replace(/-/g, '_')
}

function obfuscateFPScript(src, transformationsConfig) {
    // const fileContents = fs.readFileSync(src, 'utf8');
    const tree = parseScript(src);
    const refactor = new RefactorSession(tree);

    const alwaysTrueFunctions = Array.from(alwaysTrueFunctionsToBody.keys());

    function selectRandomFunction(alwaysTrueFunctions) {
        return alwaysTrueFunctions[Math.floor(alwaysTrueFunctions.length * Math.random())];
    }

    alwaysTrueFunctionsToBody.forEach((fBody) => {
        const alwaysTrueFuncAst = parseScript(fBody).statements[0];
        refactor.query('Script')[0].statements.unshift(alwaysTrueFuncAst);
    });

    const alwaysFalseFunctions = Array.from(alwaysFalseFunctionsToBody.keys());

    alwaysFalseFunctionsToBody.forEach((fBody) => {
        const alwaysFalseFuncAst = parseScript(fBody).statements[0];
        refactor.query('Script')[0].statements.unshift(alwaysFalseFuncAst);
    });

    const alphabetPropertyName = generateRandomString(6);
    const alphabet = shuffle("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
        .split(''))
        .join('');


    const stringsProgram = Array.from(new Set(refactor.query('LiteralStringExpression').map(v => jsesc(v.value, {
        'escapeEverything': true
    }))));
    const numbersProgram = Array.from(new Set(refactor.query('LiteralNumericExpression').map(v => v.value)));
    const bindingProperties = Array.from(new Set(refactor.query('AssignmentExpression[binding.type="StaticMemberAssignmentTarget"]').map(v => v.binding.property)));
    const expStatementStr = Array.from(new Set(refactor.query('ExpressionStatement[expression.expression.type="StaticMemberExpression"]').map(exp => exp.expression.expression.property)));
    const staticMemberStr = Array.from(new Set(refactor.query('StaticMemberExpression').map(v => v.property)));

    const staticLiterals = stringsProgram.concat(numbersProgram, bindingProperties, expStatementStr, staticMemberStr);

    if (transformationsConfig.renameVariables) {
        const variables = Array.from(new Set(refactor.query('VariableDeclarator').map(v => v.binding.name)))
        const variablesMap = new Map(variables.map(v => [v, generateVariableName()]));

        refactor.query('VariableDeclarator').forEach(v => v.binding.name = variablesMap.get(v.binding.name))
        refactor.query('IdentifierExpression, AssignmentTargetIdentifier').forEach(v => {
            if (variablesMap.has(v.name)) {
                v.name = variablesMap.get(v.name)
            }
        })
    }

    if (transformationsConfig.renameProperties) {
        const properties = Array.from(new Set(refactor.query('FunctionDeclaration > FormalParameters[items.length > 0]').flatMap(f => f.items).map(b => b.name)))
        console.log(properties)
        const propertiesMap = new Map(properties.map(v => [v, generateVariableName()]));

        refactor.query('FunctionDeclaration > FormalParameters[items.length > 0]').forEach(v => v.items.forEach(v => v.name = propertiesMap.get(v.name)))
        refactor.query('IdentifierExpression, AssignmentTargetIdentifier').forEach(v => {
            if (propertiesMap.has(v.name)) {
                v.name = propertiesMap.get(v.name)
            }
        })
    }


    if (transformationsConfig.literalArray) {
        function splitStringLiteral(lit, maxNumSplits) {
            maxNumSplits = Math.min(maxNumSplits, lit.length);
            const numSplits = Math.max(1, Math.floor(maxNumSplits * Math.random()));
            const splits = new Set();
            while (splits.size < numSplits) {
                splits.add(Math.max(1, Math.floor(lit.length * Math.random())));
            }

            const orderedSplits = Array.from(splits);
            orderedSplits.sort((a, b) => a - b);
            const literalChunks = orderedSplits.map((v, idx) => {
                if (idx === 0) {
                    return lit.substring(0, v);
                } else if (idx < orderedSplits.length - 1) {
                    return lit.substring(orderedSplits[idx - 1], v);
                } else {
                    return lit.substring(orderedSplits[idx - 1]);
                }
            });

            if (numSplits === 1) {
                literalChunks.push(lit.substring(orderedSplits[0]))
            }
            return literalChunks;
        }

        const subLiterals = new Set(); // To save space, we keep each substring only once
        const staticLiteralToChunks = new Map(staticLiterals.map(lit => {
            let subLit;
            if (typeof lit === 'string') {
                subLit = splitStringLiteral(lit, transformationsConfig.maxSplits);
            } else {
                subLit = [lit]
            }

            subLit.forEach(v => subLiterals.add(v));
            return [lit, subLit]; // we don't split numbers for the moment
        }));

        const subLitArr = Array.from(subLiterals);
        const subLiteralToIndex = new Map(subLitArr.map((v, idx) => [v, idx]));
        const staticLiteralToIndexChunks = new Map();
        staticLiteralToChunks.forEach((v, k) => {
            const indexChunks = v.map(subLit => subLiteralToIndex.get(subLit));
            staticLiteralToIndexChunks.set(k, indexChunks);
        });

        // Add array with all sub-literal members
        refactor.query('Script')[0].statements.unshift(new Shift.VariableDeclarationStatement({
            declaration: new Shift.VariableDeclaration({
                kind: 'const',
                declarators: [new Shift.VariableDeclarator({
                    binding: new Shift.BindingIdentifier({
                        name: 'qew'
                    }),
                    init: new Shift.ArrayExpression({
                        elements: subLitArr.map((lit) => {
                            if (typeof lit === 'string') {
                                return new Shift.LiteralStringExpression({
                                    value: encode64(lit, alphabet)
                                })
                            } else if (typeof lit === 'number') {
                                return new Shift.LiteralNumericExpression({
                                    value: lit
                                })
                            }
                        })
                    })
                })]
            })
        }));

        // Add function to map an index to a literal
        const indexToStr = `
    function ZXC(b, c) {
        if (typeof c[b] ==='string') return d(c[b], window['${alphabetPropertyName}']);
            return c[b];
    }`;


        const indexToStrAst = parseScript(indexToStr).statements[0];
        refactor.query('Script')[0].statements.unshift(indexToStrAst);

        function buildIndexToLitCallExpression(indexes, transformationsConfig) {
            const tree = parseScript(
                indexes.map(idx => {
                    const rd = Math.random();

                    if (rd < transformationsConfig.frequency.encoding) {
                        return `ZXC(${idx}, qew)`
                    } else if (rd >= transformationsConfig.frequency.encoding) { // Only 2 families of transformations for the moment
                        const numSubTransfo = 4;
                        const interval = (transformationsConfig.frequency.ternary) / numSubTransfo;

                        if (rd <= transformationsConfig.frequency.encoding + interval) {
                            return `(${selectRandomFunction(alwaysFalseFunctions)}() ? '${generateRandomString(Math.max(3, Math.floor(8 * Math.random())))}' : ZXC(${idx}, qew))`;
                        } else if (rd < transformationsConfig.frequency.encoding + 2 * interval) {
                            return `(${selectRandomFunction(alwaysFalseFunctions)}() ? ZXC(${Math.floor(subLitArr.length * Math.random())}, qew) : ZXC(${idx}, qew))`;
                        } else if (rd < transformationsConfig.frequency.encoding + 3 * interval) {
                            return `(${selectRandomFunction(alwaysTrueFunctions)}() ? ZXC(${idx}, qew) : '${generateRandomString(Math.max(3, Math.floor(8 * Math.random())))}')`;
                        } else if (rd <= transformationsConfig.frequency.encoding + 4 * interval) {
                            return `(${selectRandomFunction(alwaysTrueFunctions)}() ? ZXC(${idx}, qew) : a(${Math.floor(subLitArr.length * Math.random())}, qew))`;
                        }
                    }
                })
                    .join(' +')
            );

            return tree.statements[0].expression;
        }

        // Code transformations
        refactor.query('CallExpression')
            .forEach(callExpression => {
                callExpression.arguments.forEach((argument, idx) => {
                    if (argument.type === 'LiteralStringExpression' || argument.type === 'LiteralNumericExpression') {
                        callExpression.arguments[idx] = buildIndexToLitCallExpression(staticLiteralToIndexChunks.get(argument.value), transformationsConfig)
                    }
                });
            });

        // Assignments of the form myobj.prop = val; => myobj[func(idx, arr)] = val;
        refactor.query('AssignmentExpression[binding.type="StaticMemberAssignmentTarget"]')
            .forEach(assignmentExpression => {
                assignmentExpression.binding = new Shift.ComputedMemberAssignmentTarget({
                    object: assignmentExpression.binding.object,
                    expression: buildIndexToLitCallExpression(staticLiteralToIndexChunks.get(assignmentExpression.binding.property), transformationsConfig)
                });
            });

        refactor.query(':matches(ExpressionStatement[expression.expression.type="LiteralStringExpression"], ' +
            'ExpressionStatement[expression.expression.type="LiteralNumericExpression"])')
            .forEach((exp) => {
                exp.expression.expression = buildIndexToLitCallExpression(staticLiteralToIndexChunks.get(exp.expression.expression.value), transformationsConfig)
            });

        refactor.query('VariableDeclarationStatement')
            .forEach((exp) => {
                exp.declaration.declarators.forEach((declarator) => {
                    if (declarator.init?.type === 'LiteralNumericExpression' || declarator.init?.type === 'LiteralStringExpression') {
                        declarator.init = buildIndexToLitCallExpression(staticLiteralToIndexChunks.get(declarator.init.value), transformationsConfig)
                    }
                })
            });

        refactor.query('StaticMemberExpression')
            .forEach((exp) => {
                exp.type = 'ComputedMemberExpression';
                exp.expression = buildIndexToLitCallExpression(staticLiteralToIndexChunks.get(exp.property), transformationsConfig);
                delete exp.property;
            });


        const alphabetElement = parseScript(`window['${alphabetPropertyName}'] = '${alphabet}'`).statements[0];
        refactor.query('Script')[0].statements.unshift(alphabetElement);


        const decodeBody = `function d(Q, x) {
       if (!Q) return false;
       var Y = "";
       var ascc, sfdgh, sdfh;
       var sfgh, erwh, hjkl, gjkf;
       var i = 0;
    
       Q = Q.replace(/[^A-Za-z0-9\\+\\/\\=]/g, "");
    
       do {
          sfgh = x["indexOf"](Q["charAt"](i++));
          erwh = x["indexOf"](Q["charAt"](i++));
          hjkl = x["indexOf"](Q["charAt"](i++));
          gjkf = x["indexOf"](Q["charAt"](i++));
    
          ascc = (sfgh << 2) | (erwh >> 4);
          sfdgh = ((erwh & 15) << 4) | (hjkl >> 2);
          sdfh = ((hjkl & 3) << 6) | gjkf;
    
          Y = Y + String["fromCharCode"](ascc);
    
          if (hjkl != 64) {
             Y = Y + String["fromCharCode"](sfdgh);
          }
          if (gjkf != 64) {
             Y = Y + String["fromCharCode"](sdfh);
          }
       } while (i < Q["length"]);
    
       return Y;
    }`;

        const decodeBodyAst = parseScript(decodeBody).statements[0];
        refactor.query('Script')[0].statements.unshift(decodeBodyAst);
    }



    if (transformationsConfig.ifToTernaryOperator) {
        console.log("if to ternary")
        refactor.replace("IfStatement[alternate.block.statements.length = 1][consequent.block.statements.length = 1]", s => {
            console.log(s)
            // if (s.test === null) return new Shift.IdentifierExpression({name: 'myListener'})
            // if (s.consequent === null) return new Shift.IdentifierExpression({name: 'myListener1'})
            // if (s.alternate === null) return new Shift.IdentifierExpression({name: 'myListener2'})
                let a = new Shift.ExpressionStatement({
                    expression: new Shift.ConditionalExpression(
                        {
                            test: s.test,
                            consequent: s.consequent.block.statements[0].expression,
                            alternate: s.alternate.block.statements[0].expression
                        }
                    )
                })
                console.log(a)
                return a
            }
        )
        refactor.print()
        console.log("asd")
    }

    if (transformationsConfig.renameFunctions) {
        const functions = Array.from(new Set(refactor.query('FunctionDeclaration > BindingIdentifier').map(f => f.name)))
        console.log(functions)
        const functionsMap = new Map(functions.map(v => [v, generateVariableName()]));

        refactor.query('FunctionDeclaration > BindingIdentifier').forEach(f => f.name = functionsMap.get(f.name))
        refactor.query('CallExpression > IdentifierExpression').forEach(v => {
            if (functionsMap.has(v.name)) {
                v.name = functionsMap.get(v.name)
            }
        })
    }

    if (transformationsConfig.oneString) {
        return refactor.print().replace(/[\n\r]/g, "")
    }

    return refactor.print()

    // fs.writeFileSync(dest, refactor.print(), 'utf8');
}

exports.obfuscate = obfuscateFPScript;