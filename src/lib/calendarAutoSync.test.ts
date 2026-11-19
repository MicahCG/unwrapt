import assert from 'node:assert/strict';
import test from 'node:test';
import { CALENDAR_SYNC_MIN_INTERVAL_MS, planCalendarSync, shouldRunCalendarSync, type CalendarPerson } from './calendarAutoSync.ts';

const p = (key: string): CalendarPerson => ({ key, name: key, birthday: '2000-01-01', anniversary: null });

test('first run only records who is on the calendar; it imports nobody', () => {
  const plan = planCalendarSync([p('mom'), p('dad')], null);
  assert.deepEqual(plan.toImport, []);
  assert.deepEqual([...plan.seen].sort(), ['dad', 'mom']);
});

test('a person added to the calendar after the baseline is imported once', () => {
  const baseline = planCalendarSync([p('mom')], null).seen;
  const next = planCalendarSync([p('mom'), p('kora')], baseline);
  assert.deepEqual(next.toImport.map((x) => x.key), ['kora']);
  // ...and is not imported again on the following sync
  assert.deepEqual(planCalendarSync([p('mom'), p('kora')], next.seen).toImport, []);
});

test('someone the user deleted in Unwrapt is not re-added (they were already seen)', () => {
  const seen = planCalendarSync([p('mom'), p('luigi')], null).seen;
  assert.deepEqual(planCalendarSync([p('mom'), p('luigi')], seen).toImport, []);
});

test('an unchanged or shrinking calendar imports nothing', () => {
  const seen = planCalendarSync([p('a'), p('b')], null).seen;
  assert.deepEqual(planCalendarSync([p('a')], seen).toImport, []);
});

test('background syncs are throttled to the minimum interval', () => {
  const now = 1_000_000_000;
  assert.equal(shouldRunCalendarSync(null, now), true);
  assert.equal(shouldRunCalendarSync(now - 60_000, now), false);
  assert.equal(shouldRunCalendarSync(now - CALENDAR_SYNC_MIN_INTERVAL_MS, now), true);
});
