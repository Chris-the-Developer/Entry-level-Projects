// Run with: node --test (from the English-Speaking-Coach folder)
const test = require("node:test");
const assert = require("node:assert/strict");
const { scoreAttempt, diagnose, normalizeWord } = require("../compare.js");

const statuses = (result) => result.words.filter((w) => w.norm).map((w) => `${w.clean}:${w.status}`);

test("marks clear, different and missing words", () => {
  const result = scoreAttempt("I think this is the third Thursday of the month.", "I sink this is the tird Thursday of month");
  assert.deepEqual(statuses(result), [
    "I:ok", "think:close", "this:ok", "is:ok", "the:ok", "third:close", "Thursday:ok", "of:ok", "the:missed", "month:ok",
  ]);
  assert.equal(result.score, 70);
  const think = result.words.find((w) => w.clean === "think");
  assert.equal(think.heard, "sink");
  assert.equal(think.sound, "th");
});

test("a perfect attempt scores 100", () => {
  assert.equal(scoreAttempt("Could you repeat that, please?", "could you repeat that please").score, 100);
});

test("numbers and words that sound the same count as correct", () => {
  assert.equal(scoreAttempt("She speaks three languages.", "she speaks 3 languages").score, 100);
  assert.equal(scoreAttempt("I want to go too.", "I want two go to").score, 100);
  assert.equal(scoreAttempt("My friend's dogs love long walks.", "my friends dogs love long walks").score, 100);
  assert.equal(scoreAttempt("My mother and father are both at the theater.", "my mother and father are both at the theatre").score, 100);
});

test("one word heard as two still counts", () => {
  assert.equal(scoreAttempt("I need something.", "I need some thing").score, 100);
});

test("extra words are listed", () => {
  const result = scoreAttempt("Turn right at the light.", "turn right right at the light");
  assert.equal(result.score, 100);
  assert.deepEqual(result.extra, ["right"]);
});

test("guesses the sound behind a mistake", () => {
  assert.equal(diagnose("three", "tree"), "th");
  assert.equal(diagnose("this", "dis"), "th");
  assert.equal(diagnose("rice", "lice"), "rl");
  assert.equal(diagnose("very", "berry"), "vw");
  assert.equal(diagnose("sheep", "ship"), "ship");
  assert.equal(diagnose("leave", "live"), "ship");
  assert.equal(diagnose("walked", "walk"), "ed");
  assert.equal(diagnose("stopped", "stop"), "ed");
  assert.equal(diagnose("speaks", "speak"), "s");
  assert.equal(diagnose("watches", "watch"), "s");
  assert.equal(diagnose("table", "cable"), null);
});

test("normalizes words for comparing", () => {
  assert.equal(normalizeWord("Month."), "month");
  assert.equal(normalizeWord("21"), "twentyone");
  assert.equal(normalizeWord("it’s"), "its");
});
