/**
 * get random id
 */
let seed = +new Date();
let charString = 'abcdefghij';
function getId(notNumber) {
  let id = ++seed;
  return notNumber ? id.toString().split('').map(item => charString[+item]).join('') : id;
}

/**
 * copy object
 */
function copy(src) {
  if (typeof src === 'object' && src !== null) {
    let dest;

    if (Array.isArray(src)) {
      dest = src.map(item => copy(item));
    } else {
      dest = {};
      Object.keys(src).forEach(key => dest[key] = copy(src[key]));
    }

    return dest;
  }

  if (typeof src === 'symbol') return undefined;
  return src;
}

/**
 * is html tag
 */
const tags = ['a', 'abbr', 'address', 'area', 'article', 'aside', 'audio', 'b', 'base', 'bdi', 'bdo', 'blockquote', 'body', 'br', 'button', 'canvas', 'caption', 'cite', 'code', 'col', 'colgroup', 'data', 'datalist', 'dd', 'del', 'dfn', 'div', 'dl', 'dt', 'em', 'embed', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'head', 'header', 'hr', 'html', 'i', 'iframe', 'img', 'input', 'ins', 'kbd', 'keygen', 'label', 'legend', 'li', 'link', 'main', 'map', 'mark', 'meta', 'meter', 'nav', 'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'param', 'pre', 'progress', 'q', 'rb', 'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'script', 'section', 'select', 'small', 'source', 'span', 'strong', 'style', 'sub', 'sup', 'table', 'tbody', 'td', 'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'track', 'u', 'ul', 'var', 'video', 'wbr'];
function isHtmlTag(tagName) {
  return tags.indexOf(tagName) >= 0;
}

/**
 * transform rpx to px
 */
function transformRpx(style) {
  return style.replace(/(\d+)rpx/ig, '$1px');
}

/**
 * transform dash to camel case
 */
function dashToCamelCase(dash) {
  return dash.replace(/-[a-z]/g, s => s[1].toUpperCase());
}

/**
 * transform camel to dash case
 */
function camelToDashCase(camel) {
  return camel.replace(/([A-Z])/g, '-$1').toLowerCase();
}

/**
 * transform animation object to style
 */
function animationToStyle() {
  // TODO
}

/**
 * adjust exparser definition
 */
function adjustExparserDefinition(definition) {
  // adjust properties
  let properties = definition.properties || {};
  Object.keys(properties).forEach(key => {
    let value = properties[key];
    if (value === null) {
      properties[key] = { type: null };
    } else if (value === Number || value === String || value === Boolean || value === Object || value === Array) {
      properties[key] = { type: value.name };
    } else if (value.public === undefined || value.public) {
      properties[key] = {
        type: value.type === null ? null : value.type.name,
        value: value.value,
      };
    }
  });

  return definition;
}

module.exports = {
  getId,
  copy,
  isHtmlTag,
  transformRpx,
  dashToCamelCase,
  camelToDashCase,
  animationToStyle,
  adjustExparserDefinition,
};
