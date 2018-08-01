const Expression = require('../src/expression');

test('parse successfully', () => {
  let expr = new Expression('a.value + 12 - (2 * 14 / 4)');
  let exe = expr.parse();

  expect(exe({ a: { value: 1 } })).toBe(6);
  expect(exe({ a: { value: 3 } })).toBe(8);
});
