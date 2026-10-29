// Compares the sentence you meant to say with what the speech recognizer
// heard, word by word, and guesses which sound caused each mistake.

const NUMBER_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
  "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS_WORDS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function numberToWords(n) {
  if (n < 20) return NUMBER_WORDS[n];
  if (n < 100) return TENS_WORDS[Math.floor(n / 10)] + (n % 10 ? " " + NUMBER_WORDS[n % 10] : "");
  if (n < 1000) return NUMBER_WORDS[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + numberToWords(n % 100) : "");
  if (n < 1000000) return numberToWords(Math.floor(n / 1000)) + " thousand" + (n % 1000 ? " " + numberToWords(n % 1000) : "");
  return String(n);
}

// Words that sound the same, or are spelled differently in British and
// American English. The recognizer can't hear the difference, so they
// count as the same word.
const SAME_SOUND = [
  ["to", "too", "two"], ["for", "four"], ["there", "their", "they're"], ["right", "write"],
  ["here", "hear"], ["no", "know"], ["new", "knew"], ["see", "sea"], ["by", "buy", "bye"],
  ["one", "won"], ["hole", "whole"], ["weather", "whether"], ["where", "wear"], ["our", "hour"],
  ["your", "you're"], ["meet", "meat"], ["week", "weak"], ["peace", "piece"], ["son", "sun"],
  ["eight", "ate"], ["flower", "flour"], ["pair", "pear"], ["wait", "weight"], ["which", "witch"],
  ["would", "wood"], ["blue", "blew"], ["break", "brake"], ["okay", "ok"], ["mister", "mr"],
  ["color", "colour"], ["favorite", "favourite"], ["flavor", "flavour"], ["neighbor", "neighbour"],
  ["honor", "honour"], ["humor", "humour"], ["behavior", "behaviour"], ["center", "centre"],
  ["theater", "theatre"], ["meter", "metre"], ["liter", "litre"], ["realize", "realise"],
  ["organize", "organise"], ["recognize", "recognise"], ["apologize", "apologise"],
  ["analyze", "analyse"], ["traveling", "travelling"], ["traveled", "travelled"],
  ["canceled", "cancelled"], ["gray", "grey"], ["program", "programme"], ["practice", "practise"],
  ["license", "licence"], ["defense", "defence"], ["jewelry", "jewellery"], ["pajamas", "pyjamas"],
  ["tire", "tyre"], ["check", "cheque"], ["donut", "doughnut"], ["catalog", "catalogue"],
];

const CANONICAL = {};
for (const group of SAME_SOUND) {
  for (const word of group) CANONICAL[word] = group[0];
}

// Turns a word into the form used for comparing: lowercase, no
// punctuation, numbers written as words, one spelling for words that
// sound the same.
function normalizeWord(word) {
  let w = word.toLowerCase().replace(/[’‘`]/g, "'").replace(/[^\p{L}\p{N}']/gu, "");
  w = w.replace(/^'+|'+$/g, "").replace(/'s$/, "s");
  if (/^\d+$/.test(w)) w = numberToWords(Number(w)).replace(/ /g, "");
  return CANONICAL[w] || w;
}

// Splits text into words. Each word keeps its original spelling for
// display ("month."), a clean form for speaking ("month") and the
// normalized form for comparing.
function tokenize(text) {
  const tokens = [];
  for (const chunk of text.trim().split(/\s+/)) {
    if (!chunk) continue;
    // "well-known" becomes "well-" + "known", because the recognizer
    // often hears hyphenated words as two words.
    const parts = chunk.match(/[^-–—]+[-–—]*|[-–—]+/g);
    parts.forEach((part, i) => {
      const clean = part.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, "");
      tokens.push({ display: part, clean, norm: clean ? normalizeWord(clean) : "", attached: i > 0 });
    });
  }
  return tokens;
}

function letterDistance(a, b) {
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      const change = a[i - 1] === b[j - 1] ? 0 : 1;
      current.push(Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + change));
    }
    previous = current;
  }
  return previous[b.length];
}

// Lines up the target words with the heard words (like a spell checker's
// "edit distance", but for whole words). Returns a list of steps:
//   match  - the word was heard correctly
//   sub    - a different word was heard in its place
//   del    - the word was not heard at all
//   ins    - an extra word was heard
//   merge  - one target word was heard as two ("something" -> "some thing")
//   split  - two target words were heard as one ("any one" -> "anyone")
function alignWords(target, heard) {
  const n = target.length;
  const m = heard.length;
  const cost = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(Infinity));
  const step = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(null));
  cost[0][0] = 0;

  const relax = (i, j, toI, toJ, price, type) => {
    if (toI > n || toJ > m) return;
    const total = cost[i][j] + price;
    if (total < cost[toI][toJ]) {
      cost[toI][toJ] = total;
      step[toI][toJ] = { type, i, j };
    }
  };

  for (let i = 0; i <= n; i++) {
    for (let j = 0; j <= m; j++) {
      if (cost[i][j] === Infinity) continue;
      if (i < n && j < m) {
        const same = target[i] === heard[j];
        // Similar words are cheaper to swap, so "sink" lines up with "think".
        const price = same ? 0 : 0.6 + 0.4 * (letterDistance(target[i], heard[j]) / Math.max(target[i].length, heard[j].length));
        relax(i, j, i + 1, j + 1, price, same ? "match" : "sub");
      }
      if (i < n && j + 1 < m && target[i] === heard[j] + heard[j + 1]) relax(i, j, i + 1, j + 2, 0, "merge");
      if (i + 1 < n && j < m && target[i] + target[i + 1] === heard[j]) relax(i, j, i + 2, j + 1, 0, "split");
      relax(i, j, i + 1, j, 1, "del");
      relax(i, j, i, j + 1, 1, "ins");
    }
  }

  const steps = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    const s = step[i][j];
    steps.push(s);
    i = s.i;
    j = s.j;
  }
  return steps.reverse();
}

// Common sound swaps. If replacing one sound in the target word gives the
// word that was heard, that sound is probably the problem.
const CONFUSIONS = [
  { sound: "th", from: "th", to: ["t", "d", "f", "s", "z", "v"] },
  { sound: "rl", from: "r", to: ["l", "w"] },
  { sound: "rl", from: "l", to: ["r"] },
  { sound: "vw", from: "v", to: ["w", "b", "f"] },
  { sound: "vw", from: "w", to: ["v"] },
  { sound: "ship", from: "ee", to: ["i"] },
  { sound: "ship", from: "ea", to: ["i"] },
  { sound: "ship", from: "ie", to: ["i"] },
  { sound: "ship", from: "i", to: ["ee", "ea"] },
];

// Double consonants don't change the sound ("berry" sounds like "bery").
const squeeze = (word) => word.replace(/([^aeiou])\1+/g, "$1");

function diagnose(target, heard) {
  const h = squeeze(heard);
  const heardAs = (options) => options.some((option) => option !== target && squeeze(option) === h);

  if (/ed$/.test(target) && heardAs([target.slice(0, -2), target.slice(0, -1), target.replace(/ied$/, "y")])) return "ed";
  if (/s$/.test(target) && heardAs([target.slice(0, -1), target.replace(/es$/, ""), target.replace(/ies$/, "y")])) return "s";

  const t = squeeze(target);
  for (const { sound, from, to } of CONFUSIONS) {
    for (let at = t.indexOf(from); at !== -1; at = t.indexOf(from, at + 1)) {
      for (const swap of to) {
        if (squeeze(t.slice(0, at) + swap + t.slice(at + from.length)) === h) return sound;
      }
    }
  }
  return null;
}

// Scores one attempt. Every target word gets a status:
//   ok     - heard clearly
//   close  - heard as a different word (`heard` says which)
//   missed - not heard
function scoreAttempt(targetText, heardText) {
  const words = tokenize(targetText).map((word) => ({ ...word, status: word.norm ? "missed" : null, heard: null, sound: null }));
  const scored = words.filter((word) => word.norm);
  const heard = tokenize(heardText).filter((word) => word.norm);
  const extra = [];

  for (const step of alignWords(scored.map((w) => w.norm), heard.map((w) => w.norm))) {
    if (step.type === "match" || step.type === "merge") {
      scored[step.i].status = "ok";
    } else if (step.type === "split") {
      scored[step.i].status = "ok";
      scored[step.i + 1].status = "ok";
    } else if (step.type === "sub") {
      const word = scored[step.i];
      word.status = "close";
      word.heard = heard[step.j].clean;
      word.sound = diagnose(word.norm, heard[step.j].norm);
    } else if (step.type === "ins") {
      extra.push(heard[step.j].clean);
    }
  }

  const clear = scored.filter((word) => word.status === "ok").length;
  const score = scored.length ? Math.round((100 * clear) / scored.length) : 0;
  return { words, extra, clear, total: scored.length, score };
}

if (typeof module !== "undefined") {
  module.exports = { numberToWords, normalizeWord, tokenize, alignWords, diagnose, scoreAttempt };
}
