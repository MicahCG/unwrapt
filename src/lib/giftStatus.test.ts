import assert from 'node:assert/strict';
import test from 'node:test';
import { getGiftStatus, isSettledGiftStatus, type GiftRecord, type RecipientRecord } from './giftStatus.ts';

const recipient: RecipientRecord = {
  id: 'r1',
  name: 'Aunty',
  birthday: '1990-12-02',
  interests: ['tea'],
  street: '1 Main',
  city: 'Austin',
  state: 'TX',
  zip_code: '78701',
};

test('reserved funds that are ready to order count as handled', () => {
  const gift: GiftRecord = {
    status: 'scheduled',
    wallet_reserved: true,
    occasion_date: '2026-12-02',
    gift_type: 'Tea set',
  };
  const status = getGiftStatus(gift, recipient);
  assert.equal(status.key, 'ready_to_order');
  assert.equal(isSettledGiftStatus(status.key), true);
});

test('an occasion with no gift is not handled', () => {
  assert.equal(isSettledGiftStatus('needs_details'), false);
  assert.equal(isSettledGiftStatus('about_to_order'), false);
});
