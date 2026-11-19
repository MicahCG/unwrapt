import assert from 'node:assert/strict';
import test from 'node:test';
import { describeOrderResult } from './placeOrder.ts';

test('a successful reply says ordered', () => {
  const r = describeOrderResult({ success: true }, null, 'Kora Lee');
  assert.equal(r.ok, true);
  assert.match(r.message, /Kora's gift is on its way/);
});

test('an already-ordered gift is reported as such, not as a new order', () => {
  const r = describeOrderResult({ success: true, alreadyFulfilled: true }, null, 'Kora');
  assert.equal(r.ok && r.alreadyOrdered, true);
});

test('a shortfall shows the backend copy', () => {
  const r = describeOrderResult({ success: false, code: 'shortfall', confirmationCopy: 'You need $5 more.' }, null, 'Kora');
  assert.deepEqual(r, { ok: false, message: 'You need $5 more.' });
});

test('an unavailable product says nothing was charged', () => {
  const r = describeOrderResult({ success: false, error: 'Selected Goody product is no longer available' }, null, 'Kora');
  assert.equal(r.ok, false);
  assert.match(r.message, /Nothing was charged/);
});

test('a country error is not mistaken for a missing address', () => {
  const r = describeOrderResult({ success: false, error: 'mailing_address.country is invalid' }, null, 'Kora');
  assert.equal(r.ok, false);
  assert.doesNotMatch(r.message, /complete delivery address/);
});

test('no reply and a transport error never reports success', () => {
  assert.equal(describeOrderResult(null, { message: 'network' }, 'Kora').ok, false);
  assert.equal(describeOrderResult(undefined, null, 'Kora').ok, false);
});
