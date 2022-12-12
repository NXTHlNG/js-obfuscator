const alwaysFalseFunctionsToBody = new Map([
    ['awlui', `
          function awlui() {
            if (window[[] + {} + {}]) return false;
            window[[] + {} + {}]= true;
            const res = navigator.userAgent.length < (500 + 877.83 * Math.random());
            window[[] + {} + {}] = false;
            return !res;
          }  
        `],
    ['dodsjsswdlo', `
          function dodsjsswdlo() {
            if (window[{}+{}+[]]) return false;
            window[{}+{}+[]]= true;
            const res = typeof navigator.webdriver !== 'undefined' && navigator.webdriver === '27sdfh28__sel' ? true : (Math.random() < ([] + {}));
            window[{}+{}+[]] = false;
            return res;
          }
        `],

]);

exports.functions = alwaysFalseFunctionsToBody;