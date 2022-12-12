import './App.css';
import CodeMirror from '@uiw/react-codemirror';
import {useEffect, useMemo, useState} from "react";
import {javascript} from '@codemirror/lang-javascript';
import {obfuscate} from './services/ObfuscatorService'

const testCode =
    `function abc(a, b, c) {
    let res;
    if (a > 0) {
        res = a + 3;
    } else {
        res = a + b / c;
    }
    return res;
}

let tips = [
    "Click on any AST node with a '+' to expand it",

    "Shift click on an AST node to expand the whole subtree"
];

function printTips() {
    if (2+2===4) {
        console.log();
    }
    else {
        tips.forEach((tip, i) => console.log(\`Tip \${i} + tip\`));
    }
}

printTips()
abc(1,2,3)`


function App() {
    const [code, setCode] = useState(testCode);
    const [obfuscatedCode, setObfuscatedCode] = useState('');
    const [oneString, setOneString] = useState(false);
    const [renameVariables, setRenameVariables] = useState(false);
    const [renameProperties, setRenameProperties] = useState(false);
    const [renameFunctions, setRenameFunctions] = useState(false);
    const [ifToTernaryOperator, setIfToTernaryOperator] = useState(false);
    const [literalArray, setLiteralArray] = useState(false);

    function createTransformationsConfig(oneString, renameVariables, renameProperties, renameFunctions, ifToTernaryOperator, literalArray) {
        return {
            frequency: {
                'encoding': 0.7,
                'ternary': 0.3
            },
            maxSplits: 4,
            oneString: oneString,
            renameVariables: renameVariables,
            renameProperties: renameProperties,
            renameFunctions: renameFunctions,
            ifToTernaryOperator: ifToTernaryOperator,
            literalArray: literalArray
        };
    }

    const transformationsConfig = useMemo(() => createTransformationsConfig(oneString, renameVariables, renameProperties, renameFunctions, ifToTernaryOperator, literalArray), [
        oneString,
        renameVariables,
        renameProperties,
        renameFunctions,
        ifToTernaryOperator,
        literalArray
    ]);

    useEffect(() => {
        setObfuscatedCode(prev => {
            try {
                return obfuscate(code, transformationsConfig)
            } catch (e) {

            }
        })
    }, [code, transformationsConfig])

    return (
        <>
            <div style={{display: "flex", flexDirection: "column", width: "1200px", margin: "0 auto"}}>
                <div style={{fontSize: "28px", fontFamily: "sans-serif", color: "white"}}>JS Obfuscator</div>
                <div style={{display: "flex", justifyContent: "space-between", width: "100%", marginTop: "12px"}}>
                    <div style={{width: "49%"}}>
                        <CodeMirror
                            value={code}
                            height="800px"
                            extensions={[javascript()]}
                            theme={"dark"}
                            basicSetup={{
                                lineNumbers: true,
                                foldGutter: false,
                                autocompletion: true
                            }}
                            onChange={value => setCode(value)}
                        />
                        <button style={{marginTop: "12px", fontSize: "18px"}} onClick={e => alert(eval(code))}>Evaluate</button>
                    </div>
                    <div style={{width: "49%"}}>
                        <CodeMirror
                            value={obfuscatedCode}
                            height="800px"
                            extensions={[javascript()]}
                            theme={"dark"}
                            editable={false}
                            basicSetup={{
                                lineNumbers: true,
                                foldGutter: false
                            }}
                        />
                        <button style={{marginTop: "12px", fontSize: "18px"}} onClick={e => alert(eval(obfuscatedCode))}>Evaluate</button>
                    </div>
                </div>
                <div style={{
                    margin: "0 auto",
                    marginTop: "12px",
                    fontSize: "18px",
                    fontFamily: "sans-serif",
                    color: "white",
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "space-between",
                    width: "500px"
                }}>
                    <div style={{width: "200px"}}>
                        <input type={"checkbox"} id={"oneString"} onClick={e => setOneString(prevState => !prevState)}/>
                        <label htmlFor={"oneString"}>One String</label>
                    </div>
                    <div style={{width: "200px"}}>
                        <input type={"checkbox"} id={"renameVariables"}
                               onClick={e => setRenameVariables(prevState => !prevState)}/>
                        <label htmlFor={"renameVariables"}>Rename Variables</label>
                    </div>
                    <div style={{width: "200px"}}>
                        <input type={"checkbox"} id={"renameProperties"}
                               onClick={e => setRenameProperties(prevState => !prevState)}/>
                        <label htmlFor={"renameProperties"}>Rename Properties</label>
                    </div>
                    <div style={{width: "200px"}}>
                        <input type={"checkbox"} id={"renameFunctions"}
                               onClick={e => setRenameFunctions(prevState => !prevState)}/>
                        <label htmlFor={"renameFunctions"}>Rename Functions</label>
                    </div>
                    <div style={{width: "200px"}}>
                        <input type={"checkbox"} id={"ifToTernaryOperator"}
                               onClick={e => setIfToTernaryOperator(prevState => !prevState)}/>
                        <label htmlFor={"ifToTernaryOperator"}>If To Ternary Operator</label>
                    </div>
                    <div style={{width: "200px"}}>
                        <input type={"checkbox"} id={"literalArray"}
                               onClick={e => setLiteralArray(prevState => !prevState)}/>
                        <label htmlFor={"literalArray"}>Literal Array</label>
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
