const _ = require('../src/utils');

test('getId', () => {
    expect(typeof _.getId()).toBe('number');
    expect(_.getId() + '').toMatch(/\d{13}/);
    expect(_.getId(true)).toMatch(/[a-j]{13}/);
});

test('copy', () => {
    let src = { a: 123, b: [{ c: 321 }, 456] };
    let res = _.copy(src);
    expect(res).not.toBe(src);
    expect(res).toEqual(src);

    src = Symbol();
    res = _.copy(src);
    expect(res).toBe(undefined);
});

test('isHtmlTag', () => {
    expect(_.isHtmlTag('div')).toBe(true);
    expect(_.isHtmlTag('span')).toBe(true);
    expect(_.isHtmlTag('component')).toBe(false);
    expect(_.isHtmlTag('wxs')).toBe(false);
});

test('transformRpx', () => {
    expect(_.transformRpx('width: 123rpx;')).toBe('width: 123px;');
    expect(_.transformRpx('width: aaarpx;')).toBe('width: aaarpx;');
    expect(_.transformRpx('width: 123px;')).toBe('width: 123px;');
});

test('dashToCamelCase', () => {
    expect(_.dashToCamelCase('abc-e')).toBe('abcE');
    expect(_.dashToCamelCase('aBcDE-f')).toBe('aBcDEF');
    expect(_.dashToCamelCase('a-bC-d-e-Fg')).toBe('aBCDE-Fg');
});

test('camelToDashCase', () => {
    expect(_.camelToDashCase('abcE')).toBe('abc-e');
    expect(_.camelToDashCase('aBcDEF')).toBe('a-bc-d-e-f');
    expect(_.camelToDashCase('aBCDE-Fg')).toBe('a-b-c-d-e--fg');
});

test('animationToStyle', () => {
    // TODO
    expect(_.animationToStyle()).toBe(undefined);
});

test('adjustExparserDefinition', () => {
    expect(_.adjustExparserDefinition({})).toEqual({});
    expect(_.adjustExparserDefinition({
        properties: {
            a: null,
            b: Number,
            c: String,
            d: Boolean,
            e: Array,
            d: Object,
            e: {
                type: Number,
                value: 123,
            },
            f: {
                public: true,
                type: Number,
                value: 123,
            },
            g: {
                public: false,
                type: Number,
                value: 123,
            },
            h: {
                type: null,
                value: 123,
            },
        },
    })).toEqual({
        properties: {
            a: { type: null },
            b: { type: 'Number' },
            c: { type: 'String' },
            d: { type: 'Boolean' },
            e: { type: 'Array' },
            d: { type: 'Object' },
            e: {
                type: 'Number',
                value: 123,
            },
            f: {
                type: 'Number',
                value: 123,
            },
            g: {
                public: false,
                type: Number,
                value: 123,
            },
            h: {
                type: null,
                value: 123,
            },
        },
    });
});

test('setTagName/getTagName', () => {
    _.setTagName(1, 'abc');
    expect(_.getTagName(1)).toBe('abc');
});
