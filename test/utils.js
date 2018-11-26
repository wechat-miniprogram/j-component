/**
 * Touch polyfill
 */
class Touch {
  constructor(options = {}) {
    this.clientX = 0;
    this.clientY = 0;
    this.identifier = 0;
    this.pageX = 0;
    this.pageY = 0;
    this.screenX = 0;
    this.screenY = 0;
    this.target = null;

    Object.keys(options).forEach(key => {
      this[key] = options[key];
    });
  }
}

/**
 * 环境准备
 */
function env() {
  global.Touch = window.Touch = Touch;
}

/**
 * 延迟执行后续代码
 */
async function sleep(timeout) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

module.exports = {
  env,
  sleep,
};
