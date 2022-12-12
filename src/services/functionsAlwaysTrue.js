const alwaysTrueFunctionsToBody = new Map([
    ['awl', `
          function awl() {
            if (window[[] + {}]) return true;
            window[[] + {}]= true;
            const res = navigator.userAgent.length > 3 * Math.random();
            window[[] + {}] = false;
            return res;
          }  
        `],
    ['dodsjsdlo', `
          function dodsjsdlo() {
            if (window[{}+{}+[]]) return true;
            window[{}+{}+[]]= true;
            const res = typeof navigator.webdriver !== 'undefined' && navigator.webdriver === 'sdfjcn' ? false : !(Math.random() < ([] + {}));
            window[{}+{}+[]] = false;
            return res;
          }  
        `],

]);

exports.functions = alwaysTrueFunctionsToBody;