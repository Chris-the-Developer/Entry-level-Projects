// Run with: node --test (from the English-Speaking-Coach folder)
const test = require("node:test");
const assert = require("node:assert/strict");
const { checkText, fixAllText, looksLikeQuestion } = require("../checker.js");

const fix = (text) => fixAllText(text);

test("fixes the example text from the Write tab", () => {
  const example = "i am learning english .i dont speak very well yet , but its getting better every day!! however i still make mistakes. can you help me";
  assert.equal(
    fix(example),
    "I am learning English. I don't speak very well yet, but it's getting better every day! However, I still make mistakes. Can you help me?",
  );
});

test("leaves correct writing alone", () => {
  const correct = [
    "The dog wagged its tail.",
    "When I was young, I lived in Rome.",
    "What a beautiful day.",
    "Do it now.",
    "Have a nice day.",
    "I like fruit, e.g. apples and pears.",
    "Visit example.com today.",
    "It costs 3.50 dollars.",
    "Wait... maybe tomorrow.",
    "Mr. Smith is here.",
    "Raise your hand.",
    "I bought an hour of time at a university.",
    "Plan A is better than plan B.",
    "She said, “I'm tired.”",
    "I had had enough.",
    "Its own colour is nice.",
    "The building lost its meaning.",
    "Email me at sam@example.com, please.",
    "We march every year.",
    "May I come in?",
    "Dear Sam,\nThanks for the letter.\nBest wishes,\nAnna",
  ];
  for (const text of correct) {
    assert.deepEqual(checkText(text).map((i) => i.message), [], text);
  }
});

test("adds question marks to questions", () => {
  assert.equal(fix("Where do you live."), "Where do you live?");
  assert.equal(fix("What time is it."), "What time is it?");
  assert.equal(fix("Can you help me"), "Can you help me?");
  assert.equal(fix("It's cold, isn't it."), "It's cold, isn't it?");
  assert.equal(fix("I wonder where he is."), "I wonder where he is.");
});

test("spots question sentences", () => {
  assert.ok(looksLikeQuestion("Do you like coffee"));
  assert.ok(looksLikeQuestion("How much is it"));
  assert.ok(!looksLikeQuestion("Do it now"));
  assert.ok(!looksLikeQuestion("When I was young, I lived in Rome"));
});

test("fixes apostrophes", () => {
  assert.equal(fix("Dont do that."), "Don't do that.");
  assert.equal(fix("im happy because its raining."), "I'm happy because it's raining.");
  assert.equal(fix("I do'nt know."), "I don't know.");
  assert.equal(fix("The cat lost it's own toy."), "The cat lost its own toy.");
});

test("fixes common word mix-ups", () => {
  assert.equal(fix("Your welcome."), "You're welcome.");
  assert.equal(fix("Your right."), "You're right.");
  assert.equal(fix("Their is a problem."), "There is a problem.");
  assert.equal(fix("She is taller then me."), "She is taller than me.");
  assert.equal(fix("I could of gone."), "I could have gone.");
  assert.equal(fix("I like the the film."), "I like the film.");
  assert.equal(fix("I eat alot."), "I eat a lot.");
});

test("chooses a or an by sound", () => {
  assert.equal(fix("I ate a apple and an banana."), "I ate an apple and a banana.");
  assert.equal(fix("It was an university."), "It was a university.");
  assert.equal(fix("We waited a hour."), "We waited an hour.");
});

test("fixes capitals", () => {
  assert.equal(fix("see you on monday. i speak french."), "See you on Monday. I speak French.");
  assert.equal(fix("It starts in march."), "It starts in March.");
});

test("fixes spacing and repeated marks", () => {
  assert.equal(fix("Hello ,world."), "Hello, world.");
  assert.equal(fix("I went home.I slept."), "I went home. I slept.");
  assert.equal(fix("Wow!!! That  is great."), "Wow! That is great.");
  assert.equal(fix("Really ?"), "Really?");
  assert.equal(fix("Wait.."), "Wait.");
});

test("adds commas after opening words", () => {
  assert.equal(fix("However we stayed."), "However, we stayed.");
  assert.equal(fix("In fact it was fun."), "In fact, it was fun.");
  assert.equal(fix("Yes I can."), "Yes, I can.");
});

test("flags brackets and quotes without guessing a fix", () => {
  const issues = checkText("He said (very quietly that he was tired.");
  assert.equal(issues.length, 1);
  assert.equal(issues[0].replacement, null);
  assert.equal(checkText('She said "hello.').length, 1);
});

test("uses British names for marks when asked", () => {
  const [issue] = checkText("I went home", { british: true });
  assert.match(issue.message, /full stop/);
  assert.match(checkText("I went home")[0].message, /period/);
});
