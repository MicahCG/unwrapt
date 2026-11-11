import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ensureAddressFormForPeople,
  replyClaimsMissingAddress,
  type AddressPerson,
} from './theaAddressForm.ts';

const onFile: AddressPerson = { id: 'rec_aunty', name: 'Aunty', hasAddress: true, addressConfirmed: true };
const confirmedOnly: AddressPerson = { id: 'rec_aunty', name: 'Aunty', hasAddress: false, addressConfirmed: true };
const missing: AddressPerson = { id: 'rec_aunty', name: 'Aunty', hasAddress: false, addressConfirmed: false };

const claim = "I can't place the order until I confirm the address. Aunty's address is still missing. Would you like to add her address so we can proceed?";

test('hasAddress or addressConfirmed does not claim the address is missing or force the form', () => {
  for (const person of [onFile, confirmedOnly]) {
    const result = ensureAddressFormForPeople("Please place Aunty's gift", [], claim, [], [person], false);
    assert.equal(replyClaimsMissingAddress(result.reply), false);
    assert.equal(result.ui.some((mod) => mod.module === 'edit_recipient'), false);
    assert.match(result.reply, /Aunty's address is already on file/);
  }
});

test('a missing address or an agreement to add one opens the address form', () => {
  const fromClaim = ensureAddressFormForPeople("Please place Aunty's gift", [], claim, [], [missing], false);
  assert.deepEqual(fromClaim.ui, [{
    module: 'edit_recipient',
    recipientId: 'rec_aunty',
    recipientName: 'Aunty',
    focus: 'address',
  }]);

  const fromYes = ensureAddressFormForPeople('yes', [
    { role: 'assistant', content: "Aunty's address is still missing. Want to add her address?" },
  ], 'Sure.', [], [missing], false);
  assert.equal(fromYes.ui[0]?.module, 'edit_recipient');
  assert.equal(fromYes.ui[0]?.focus, 'address');
});
