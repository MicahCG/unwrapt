import assert from 'node:assert/strict';
import test from 'node:test';
import { chatSuggestions, wantsDifferentPerson, type SuggestionMessage } from './chatSuggestions.ts';

const kora = { id: 'k', name: 'Kora Lee' };
const people = [{ id: 'k', name: 'Kora Lee' }, { id: 'j', name: 'Jake Moss' }, { id: 'l', name: 'Luigi' }];
const u = (content: string): SuggestionMessage => ({ role: 'user', content });
const a = (content: string, extra: Partial<SuggestionMessage> = {}): SuggestionMessage => ({ role: 'assistant', content, ...extra });
const ids = (s: Array<{ id: string }>) => s.map((x) => x.id);

test('no conversation yet: nothing (the greeting chips cover it)', () => {
  assert.deepEqual(chatSuggestions({ messages: [], justScheduled: false, people }), []);
});

test('working on someone with no cards yet: options and price limits, in their words', () => {
  const s = chatSuggestions({ messages: [u('gift for Kora'), a('What does she like?', { activeRecipient: kora })], justScheduled: false, people });
  assert.deepEqual(ids(s), ['options', 'under25', 'under50', 'pick', 'someone-else']);
  assert.equal(s[0].send, 'Can you show me some options for Kora?');
});

test('after cards: more / cheaper / different', () => {
  const s = chatSuggestions({ messages: [u('options'), a('Here you go', { activeRecipient: kora, products: [{}] })], justScheduled: false, people });
  assert.deepEqual(ids(s), ['more', 'under25', 'different', 'pick', 'someone-else']);
});

test('a pending Review card carries its own buttons', () => {
  const s = chatSuggestions({ messages: [u('that one'), a('Review', { activeRecipient: kora, review: {} })], justScheduled: false, people });
  assert.deepEqual(s, []);
});

test('after a gift is scheduled: the other people, not the one just done', () => {
  const s = chatSuggestions({ messages: [u('yes'), a('Scheduled!', { activeRecipient: kora })], justScheduled: true, people });
  assert.deepEqual(ids(s), ['person:j', 'person:l', 'whats-next']);
  assert.equal(s[0].send, "Let's find a gift for Jake.");
});

test('"let\'s focus on someone else" switches the chips to people', () => {
  assert.equal(wantsDifferentPerson("Let's focus on someone else"), true);
  assert.equal(wantsDifferentPerson('show me gifts under $25'), false);
  const s = chatSuggestions({ messages: [u('gift for Kora'), a('ok', { activeRecipient: kora }), u("Let's focus on someone else"), a('Who would you like?', { activeRecipient: kora })], justScheduled: false, people });
  assert.deepEqual(ids(s), ['person:j', 'person:l']);
});

test('once the new person is the active one, chips follow them', () => {
  const jake = { id: 'j', name: 'Jake Moss' };
  const s = chatSuggestions({ messages: [u("Let's focus on someone else"), a('Who?', { activeRecipient: kora }), u('Jake'), a('What does Jake like?', { activeRecipient: jake })], justScheduled: false, people });
  assert.equal(s[0].send, 'Can you show me some options for Jake?');
});

test('with nobody else to switch to, there is no "Someone else"', () => {
  const s = chatSuggestions({ messages: [u('x'), a('y', { activeRecipient: kora })], justScheduled: false, people: [kora] });
  assert.equal(ids(s).includes('someone-else'), false);
});

test('names saved as event titles do not become "Eric\'s\'s gift"', () => {
  const s = chatSuggestions({
    messages: [u('yes'), a('Scheduled!', { activeRecipient: kora })],
    justScheduled: true,
    people: [kora, { id: 'e', name: "Eric's Birthday" }, { id: 'c', name: 'Chris' }],
  });
  assert.equal(s[0].label, "Eric's gift");
  assert.equal(s[0].send, "Let's find a gift for Eric.");
  assert.equal(s[1].label, "Chris' gift");
});
