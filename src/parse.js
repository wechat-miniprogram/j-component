/**
 * thanks for John Resig
 * source code: https://johnresig.com/files/htmlparser.js
 */

// regexs for parsing tags and attrs
const startTagReg = /^<([-A-Za-z0-9_]+)((?:\s+[\w\-\:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
const endTagReg = /^<\/([-A-Za-z0-9_]+)[^>]*>/;
const attrReg = /([-A-Za-z0-9_\:]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|([^>\s]+)))?/g;

module.exports = function(content, handler) {
    let stack = [];
    let last = content;

    stack.last = function () {
        return this[this.length - 1];
    };

    while (content) {
        let isText = true;

        if (!stack.last() || stack.last() !== 'wxs') {
            if (content.indexOf('<!--') === 0) {
                // comment
                let index = content.indexOf('-->');

                if (index >= 0) {
                    content = content.substring(index + 3);
                    isText = false;
                }

            } else if (content.indexOf('</') === 0) {
                // end tag
                let match = content.match(endTagReg);

                if (match) {
                    content = content.substring(match[0].length);
                    match[0].replace(endTagReg, parseEndTag);
                    isText = false;
                }

            } else if (content.indexOf('<') === 0) {
                // start tag
                let match = content.match(startTagReg);

                if (match) {
                    content = content.substring(match[0].length);
                    match[0].replace(startTagReg, parseStartTag);
                    isText = false;
                }
            }

            if (isText) {
                let index = content.indexOf('<');

                let text = index < 0 ? content : content.substring(0, index);
                content = index < 0 ? '' : content.substring(index);

                handler.text && handler.text(text);
            }
        } else {
            let execRes = (new RegExp(`<\/${stack.last()}[^>]*>`)).exec(content);
            
            if (execRes) {
                let text = content.substring(0, execRes.index);
                content = content.substring(execRes.index + execRes[0].length);

                text.replace(/<!--(.*?)-->/g, '');
                if (text) handler.text && handler.text(text);
            }

            parseEndTag('', stack.last());
        }


        if (content == last) throw new Error(`parse error: ${content}`);
        last = content;
    }

    // clean up any remaining tags
    parseEndTag();

    function parseStartTag(tag, tagName, rest, unary) {
        tagName = tagName.toLowerCase();
        unary = !!unary;

        if (!unary) stack.push(tagName);

        if (handler.start) {
            let attrs = [];

            rest.replace(attrReg, (all, $1, $2, $3, $4) => {
                let value = $2 || $3 || $4;

                attrs.push({
                    name: $1,
                    value,
                });
            });

            handler.start && handler.start(tagName, attrs, unary);
        }
    }

    function parseEndTag(tag, tagName) {
        let pos;

        if (!tagName) {
            pos = 0;
        } else {
            // find the closest opened tag of the same type
            for (pos = stack.length - 1; pos >= 0; pos--) {
                if (stack[pos] === tagName) break;
            }
        }

        if (pos >= 0) {
            // close all the open elements, up the stack
            for (let i = stack.length - 1; i >= pos; i--) {
                handler.end && handler.end(stack[i]);
            }

            stack.length = pos;
        }
    }
}
