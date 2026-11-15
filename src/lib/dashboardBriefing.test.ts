import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addressChipForm,
  buildBriefingMessage,
  buildDashboardBriefing,
  disambiguateBriefingNames,
} from './dashboardBriefing.ts';
import type { RecipientRecord } from './giftStatus.ts';

const soonBirthday = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 10);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `1990-${month}-${day}`;
};

const farBirthday = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + 200);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `1990-${month}-${day}`;
};

const person = (id: string, name: string, birthday: string): RecipientRecord => ({
  id,
  name,
  birthday,
  interests: ['tea'],
  scheduled_gifts: [],
});

test('address chips say Fill and keep the occasion detail', () => {
  const briefing = buildDashboardBriefing([person('jordan', 'Jordan Lee', soonBirthday())]);
  const chip = briefing.needsInfo.find((item) => item.action === 'address');
  assert.ok(chip);
  assert.equal(chip.label, "Fill Jordan's address");
  assert.equal(chip.detail, 'So I can plan their birthday');
  assert.equal(chip.label.includes('Need '), false);
});

test('an address chip opens the in-chat address form and does not send its label', () => {
  const briefing = buildDashboardBriefing([person('jordan', 'Jordan Lee', soonBirthday())]);
  const chip = briefing.needsInfo.find((item) => item.action === 'address');
  assert.ok(chip);
  assert.deepEqual(addressChipForm(chip), { recipientId: 'jordan', focus: 'address' });
  assert.equal(addressChipForm({ ...chip, action: 'open' }), null);
});

test('shared first names in the briefing stay visible and use enough of the saved name', () => {
  const birthday = soonBirthday();
  const aunty = person('a', 'Aunty', birthday);
  const andrea = person('b', 'Aunty Andrea', birthday);
  const ulan = person('c', 'Aunty Ulan', birthday);
  const briefing = buildDashboardBriefing([aunty, andrea, ulan]);

  assert.deepEqual(
    briefing.upcoming.map((item) => item.label).sort(),
    ["Aunty Andrea's birthday", "Aunty Ulan's birthday", "Aunty's birthday"],
  );
  assert.deepEqual(
    briefing.needsInfo.filter((item) => item.action === 'address').map((item) => item.label).sort(),
    ["Fill Aunty Andrea's address", "Fill Aunty Ulan's address", "Fill Aunty's address"],
  );
  assert.equal(briefing.upcoming.length, 3);
  assert.equal(briefing.needsInfo.filter((item) => item.action === 'address').length, 3);

  const message = buildBriefingMessage('Micah', briefing);
  assert.match(message, /Aunty Andrea's birthday/);
  assert.match(message, /Aunty Ulan's birthday/);
  assert.match(message, /Fill Aunty Andrea's address/);
  assert.equal(message.includes("Need Aunty"), false);

  for (const chip of briefing.needsInfo.filter((item) => item.action === 'address')) {
    assert.equal(chip.detail, 'So I can plan their birthday');
    assert.deepEqual(addressChipForm(chip), { recipientId: chip.recipientId, focus: 'address' });
  }
});

test('a first name is only lengthened when someone else in the briefing shares it', () => {
  const briefing = buildDashboardBriefing([
    person('near', 'Aunty Andrea', soonBirthday()),
    person('far', 'Aunty Ulan', farBirthday()),
  ]);
  assert.deepEqual(briefing.upcoming.map((item) => item.label), ["Aunty's birthday"]);
  assert.equal(briefing.upcoming.some((item) => item.recipientId === 'far'), false);

  assert.equal(disambiguateBriefingNames([
    { id: '1', name: 'Mary Ann Lee' },
    { id: '2', name: 'Mary Ann Kim' },
  ]).get('1'), 'Mary Ann Lee');
  assert.equal(disambiguateBriefingNames([
    { id: '1', name: 'Sam Smith' },
  ]).get('1'), 'Sam');
});
