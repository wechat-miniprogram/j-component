/**
 * get random id
 */
let seed = +new Date();
function getId() {
  return ++seed;
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

module.exports = {
  getId,
  copy,
  isHtmlTag,
};
