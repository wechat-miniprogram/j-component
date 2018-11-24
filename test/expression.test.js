const Expression = require('../src/expression');

test('get and calc expression', () => {
  let arr = Expression.getExpression('123-{{a + b}}-456-{{a - b}}-{{');
  expect(arr.length).toBe(6);
  expect(arr[0]).toBe('123-');
  expect(arr[1]).toBeInstanceOf(Function);
  expect(arr[2]).toBe('-456-');
  expect(arr[3]).toBeInstanceOf(Function);
  expect(arr[4]).toBe('-');
  expect(arr[5]).toBe('{{');
  expect(Expression.calcExpression(arr, { a: 4, b: 1 })).toBe('123-5-456-3-{{');

  arr = Expression.getExpression('123');
  expect(arr).toEqual(['123']);
  expect(Expression.calcExpression(arr, {})).toBe('123');

  arr = Expression.getExpression('{{a + b}}');
  expect(arr.length).toBe(1);
  expect(arr[0]).toBeInstanceOf(Function);
  expect(Expression.calcExpression(arr, { a: 1, b: 2 })).toBe(3);

  expect(Expression.calcExpression(123)).toBe(123);

  expect(Expression.calcExpression(['123-', 56, '{{'])).toBe('123-{{');
});
