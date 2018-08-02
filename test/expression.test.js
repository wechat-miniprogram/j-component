const Expression = require('../src/expression');

test('parse successfully', () => {
  let expr1 = new Expression('a.value + 12 - (2 * 14 / 4)').parse();
  expect(expr1({ a: { value: 1 } })).toBe(6);
  expect(expr1({ a: { value: 3 } })).toBe(8);

  let expr2 = new Expression('a && b || c && ( d || e )').parse();
  expect(expr2({ a: true, b: false, c: true, d: false, e: true })).toBe(true);
  expect(expr2({ a: false, b: true, c: false, d: true, e: false })).toBe(false);

  let expr3 = new Expression('a.value + 12 - (2 * 14 / 4)').parse();
  expect(expr3({ a: { value: 1 } })).toBe(6);
  expect(expr3({ a: { value: 3 } })).toBe(8);

  let expr4 = new Expression('a === b && a !== c').parse();
  expect(expr4({ a: 1, b: 1, c: '1' })).toBe(true);
  expect(expr4({ a: 1, b: 1, c: 1 })).toBe(false);

  let expr5 = new Expression('a > 3 && b < 10').parse();
  expect(expr5({ a: 4, b: 5 })).toBe(true);
  expect(expr5({ a: 3, b: 5 })).toBe(false);
  expect(expr5({ a: 4, b: 11 })).toBe(false);

  let expr6 = new Expression('a.list[i + 1]').parse();
  expect(expr6({ a: { list: [0, 5, 10] }, i: 1 })).toBe(10);
  expect(expr6({ a: { list: [0, 5, 10] }, i: 0 })).toBe(5);

  let expr7 = new Expression('a > b ? b : a').parse();
  expect(expr7({ a: 2, b: 1 })).toBe(1);
  expect(expr7({ a: 2, b: 3 })).toBe(2);  
});

test('get and calc expression successfully', () => {
  let arr = Expression.getExpression('123-{{a + b}}-456-{{a - b}}');

  expect(arr[0]).toBe('123-');
  expect(arr[1]).toBeInstanceOf(Function);
  expect(arr[2]).toBe('-456-');
  expect(arr[3]).toBeInstanceOf(Function);

  expect(Expression.calcExpression(arr, { a: 4, b: 1 })).toBe('123-5-456-3');
});
