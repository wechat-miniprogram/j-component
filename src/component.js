const exparser = require('miniprogram-exparser');
const _ = require('./utils');

const MOVE_DELTA = 10;
const LONGPRESS_TIME = 350;
const SCROLL_PROTECTED = 150;
const NATIVE_TOUCH_EVENT = ['touchstart', 'touchmove', 'touchend', 'touchcancel'];

class ComponentNode {
    constructor(exparserNode, component) {
        this._exparserNode = exparserNode;
        this._component = component;

        this.dom = this._exparserNode.$$;
    }

    /**
     * dispatch event
     */
    dispatchEvent(eventName, options = {}) {
        let dom = this.dom;

        if (NATIVE_TOUCH_EVENT.indexOf(eventName) >= 0) {
            // native touch event
            let touches = options.touches;
            let changedTouches = options.changedTouches;

            if (eventName === 'touchstart' || eventName === 'touchmove') {
                touches = touches || [{ x: 0, y: 0 }];
                changedTouches = changedTouches || [{ x: 0, y: 0 }];
            } else if (eventName === 'touchend' || eventName === 'touchcancel') {
                touches = touches || [];
                changedTouches = changedTouches || [{ x: 0, y: 0 }];
            }

            let touchEvent = new TouchEvent(eventName, {
                cancelable: true,
                bubbles: true,
                touches: touches.map(touch => {
                  return new Touch({
                    identifier: _.getId(),
                    target: dom,
                    clientX: touch.x,
                    clientY: touch.y,
                  })
                }),
                targetTouches: [],
                changedTouches: changedTouches.map(touch => {
                    return new Touch({
                        identifier: _.getId(),
                        target: dom,
                        clientX: touch.x,
                        clientY: touch.y,
                    });
                }),
            });

            dom.dispatchEvent(touchEvent);
        } else {
            // custom event
            let customEvent = new CustomEvent(eventName, options);
            dom.dispatchEvent(customEvent);

            exparser.Event.dispatchEvent(customEvent.target, exparser.Event.create(eventName, {}, {
                originalEvent: customEvent,
                bubbles: true,
                capturePhase: true,
                composed: true,
                extraFields: {
                    touches: options.touches || {},
                    changedTouches: options.changedTouches || {}
                }
            }));
        }
    }
}

class Component {
    constructor(componentManager, properties) {
        let id = componentManager.id;
        let tagName = _.getTagName(id);
        let exparserDef = componentManager.exparserDef;
        this._exparserNode = exparser.createElement(tagName || id, exparserDef, properties); // create exparser node and render
        this._componentManager = componentManager;
        this._isTapCancel = false;
        this._lastScrollTime = 0;

        this.dom = this._exparserNode.$$;

        this._bindEvent();
    }

    /**
     * initial event listener
     */
    _bindEvent() {
        let dom = this.dom;

        // for touch
        dom.addEventListener('touchstart', evt => {
            this._triggerExparserEvent(evt, 'touchstart');

            if (this._touchstartEvt || evt.defaultPrevented) return;
            if (evt.touches.length === 1) {
                if (this._longpressTimer) this._longpressTimer = clearTimeout(this._longpressTimer);

                this._touchstartX = evt.touches[0].pageX;
                this._touchstartY = evt.touches[0].pageY;
                this._touchstartEvt = evt;

                if ((+new Date()) - this._lastScrollTime < SCROLL_PROTECTED) {
                    // is scrolling
                    this._isTapCancel = true;
                    this._lastScrollTime = 0; // only checked once
                } else {
                    this._isTapCancel = false;
                    this._longpressTimer = setTimeout(() => {
                        this._triggerExparserEvent(evt, 'longpress', { x: this._touchstartX, y: this._touchstartY });
                    }, LONGPRESS_TIME);
                }
            }
        }, { capture: true, passive: false });

        dom.addEventListener('touchmove', evt => {
            this._triggerExparserEvent(evt, 'touchmove');

            if (!this._touchstartEvt) return;
            if (evt.touches.length === 1) {
                if (!(Math.abs(evt.touches[0].pageX - this._touchstartX) < MOVE_DELTA && Math.abs(evt.touches[0].pageY - this._touchstartY) < MOVE_DELTA)) {
                    // is moving
                    if (this._longpressTimer) this._longpressTimer = clearTimeout(this._longpressTimer);
                    this._isTapCancel = true;
                }
            }
        }, { capture: true, passive: false });

        dom.addEventListener('touchend', evt => {
            this._triggerExparserEvent(evt, 'touchend');

            if(evt.touches.length === 0) {
                if (this._longpressTimer) this._longpressTimer = clearTimeout(this._longpressTimer);
                if (!this._isTapCancel) this._triggerExparserEvent(this._touchstartEvt, 'tap', { x: evt.changedTouches[0].pageX, y: evt.changedTouches[0].pageY });
            }
        }, { capture: true, passive: false });

        dom.addEventListener('touchcancel', evt => {
           this._triggerExparserEvent(evt, 'touchcancel');

           if (this._longpressTimer) this._longpressTimer = clearTimeout(this._longpressTimer);
        }, { capture: true, passive: false });

        // for other
        dom.addEventListener('scroll', evt => {
            this._lastScrollTime = +new Date();
            this._triggerExparserEvent(evt, 'scroll');
        }, { capture: true, passive: false });

        dom.addEventListener('blur', evt => {
            if (this._longpressTimer) this._longpressTimer = clearTimeout(this._longpressTimer);
        }, { capture: true, passive: false });
    }

    /**
     * trigger exparser node event
     */
    _triggerExparserEvent(evt, name, detail = {}) {
        exparser.Event.dispatchEvent(evt.target, exparser.Event.create(name, detail, {
            originalEvent: evt,
            bubbles: true,
            capturePhase: true,
            composed: true,
            extraFields: {
                touches: evt.touches || {},
                changedTouches: evt.changedTouches || {}
            }
        }));
    }

    querySelector(selector) {
        let shadowRoot = this._exparserNode.shadowRoot;
        let selExparserNode = shadowRoot && shadowRoot.querySelector(selector);

        if (selExparserNode) {
            return selExparserNode.__componentNode__ ? selExparserNode.__componentNode__ : new ComponentNode(selExparserNode, this);
        }
    }

    querySelectorAll(selector) {
        let shadowRoot = this._exparserNode.shadowRoot;
        let selExparserNodes = shadowRoot.querySelectorAll(selector) || [];

        return selExparserNodes.map(selExparserNode => selExparserNode.__componentNode__ ? selExparserNode.__componentNode__ : new ComponentNode(selExparserNode, this));
    }
}

module.exports = Component;
