import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeDictation } from './speechDictation.ts';

test('mergeDictation keeps what was typed and adds the spoken words', () => {
  assert.equal(mergeDictation('', '  birthday for Mom '), 'birthday for Mom');
  assert.equal(mergeDictation('Ask about ', 'a candle'), 'Ask about a candle');
  assert.equal(mergeDictation('Ask about', 'a candle'), 'Ask about a candle');
  assert.equal(mergeDictation('Already sent.', ''), 'Already sent.');
});
