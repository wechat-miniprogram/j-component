/**
 * thanks for John Resig
 * source code: https://johnresig.com/files/htmlparser.js
 */

// Regular Expressions for parsing tags and attributes
const startTagReg = /^<([-A-Za-z0-9_]+)((?:\s+[\w\:]+(?:\s*=\s*(?:(?:"[^"]*")|(?:'[^']*')|[^>\s]+))?)*)\s*(\/?)>/;
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

        if (content.indexOf('<!--') === 0) {
            // Comment
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

        if (content == last) throw new Error(`parse error: ${content}`);
        last = content;
    }

    // Clean up any remaining tags
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

            handler.start(tagName, attrs, unary);
        }
    }

    function parseEndTag(tag, tagName) {
        let pos;

        if (!tagName) {
            // If no tag name is provided, clean shop
            pos = 0;
        } else {
            // Find the closest opened tag of the same type
            for (pos = stack.length - 1; pos >= 0; pos--) {
                if (stack[pos] === tagName) break;
            }
        }

        if (pos >= 0) {
            // Close all the open elements, up the stack
            for (let i = stack.length - 1; i >= pos; i--) {
                handler.end && handler.end(stack[i]);
            }

            // Remove the open elements from the stack
            stack.length = pos;
        }
    }
}
