// A punctuation and grammar checker that works offline. Each rule looks
// for one mistake English learners often make and explains it in plain
// English.
//
// checkText(text) returns a list of issues like this:
//   { start, end, replacement, type, message }
// `start` and `end` are positions in the text. `replacement` is the text
// that should go there, or null when a person has to decide the fix.

// ---------- Word lists ----------

const MISSING_APOSTROPHE = {
  dont: "don't", doesnt: "doesn't", didnt: "didn't", isnt: "isn't", arent: "aren't",
  wasnt: "wasn't", werent: "weren't", cant: "can't", couldnt: "couldn't", wouldnt: "wouldn't",
  shouldnt: "shouldn't", wont: "won't", havent: "haven't", hasnt: "hasn't", hadnt: "hadn't",
  mustnt: "mustn't", neednt: "needn't", im: "I'm", ive: "I've", youre: "you're", youve: "you've",
  youll: "you'll", youd: "you'd", theyre: "they're", theyve: "they've", theyll: "they'll",
  weve: "we've", thats: "that's", whats: "what's", wheres: "where's", whos: "who's",
  theres: "there's", heres: "here's", hows: "how's", shes: "she's", hes: "he's", itll: "it'll",
  wouldve: "would've", couldve: "could've", shouldve: "should've", oclock: "o'clock",
};

const LONG_FORMS = { "can't": "cannot", "won't": "will not", "o'clock": "of the clock" };

const I_WORDS = new Set(["i", "i'm", "i've", "i'll", "i'd"]);

// Words after "its" that show the writer meant "it's" (it is / it has).
const ITS_MEANS_IT_IS = new Set([
  "a", "an", "the", "not", "been", "going", "gonna", "very", "so", "too", "really", "just", "ok",
  "okay", "over", "about", "like", "time", "also", "still", "always", "never", "my", "your", "our",
  "their", "his", "her", "me", "you", "him", "them", "us", "here", "there", "now", "all", "because",
]);

// Words after "your" that show the writer meant "you're" (you are).
const YOUR_MEANS_YOU_ARE = new Set([
  "welcome", "a", "an", "the", "so", "very", "too", "not", "always", "never", "really", "just",
  "sure", "kidding", "joking", "going", "doing", "being", "coming", "leaving", "making", "trying",
  "getting", "gonna", "here", "there",
]);

// Describing words. After "its"/"your" they only mean "it is"/"you are"
// when the phrase ends there: "it's nice", "it's nice to meet you",
// but "its nice colour" and "your nice house".
const STATE_WORDS = new Set([
  "nice", "good", "bad", "cold", "hot", "warm", "late", "early", "hard", "easy", "important",
  "possible", "impossible", "difficult", "fine", "great", "better", "worse", "true", "free",
  "ready", "sunny", "cloudy", "windy", "done", "broken", "open", "closed", "beautiful", "amazing",
  "terrible", "cheap", "expensive", "far", "near", "normal", "strange", "funny", "sad", "right",
  "wrong", "correct", "busy", "tired", "sick", "happy", "lucky", "smart", "kind", "crazy", "awesome",
]);

const LINKING_WORDS = new Set([
  "to", "that", "for", "and", "but", "because", "when", "if", "about", "at", "in", "now", "today",
  "tonight", "again", "too", "here", "there", "outside", "enough", "of",
]);

// "-ing" words that are usually things, not actions ("its ending", not "it's ending").
const ING_NOUNS = new Set([
  "thing", "king", "ring", "wing", "spring", "string", "sibling", "building", "meaning", "ending",
  "beginning", "opening", "setting", "ceiling", "morning", "evening", "feeling", "clothing",
  "wedding", "painting", "drawing", "training", "funding", "timing", "warning", "rating", "heading",
  "landing", "offering", "saving", "handling", "marketing", "spelling", "filling", "lining",
  "coating", "housing", "packaging", "icing", "stuffing", "pudding", "wiring", "lighting",
  "seating", "parking", "ranking", "recording", "writing", "reading",
]);

const BE_FORMS = new Set(["is", "are", "was", "were", "isn't", "aren't", "wasn't", "weren't"]);

const COMPARATIVES = new Set([
  "more", "less", "better", "worse", "rather", "other", "bigger", "smaller", "faster", "slower",
  "older", "younger", "taller", "shorter", "cheaper", "higher", "lower", "larger", "longer",
  "stronger", "easier", "harder", "happier", "earlier", "greater", "fewer", "nicer", "colder",
  "warmer", "hotter", "smarter", "richer", "sooner",
]);

const MODALS = new Set(["could", "would", "should", "must", "might", "couldn't", "wouldn't", "shouldn't"]);

const JOINED_SPELLINGS = {
  alot: "a lot", infront: "in front", aswell: "as well", atleast: "at least", eachother: "each other",
  everytime: "every time", noone: "no one", thankyou: "thank you", incase: "in case",
};

const ALLOWED_DOUBLES = new Set(["had", "that", "bye", "no", "ha", "blah"]);

const DAYS = new Set(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]);
// "may" and "march" are also normal words, so they are left out ("march" is checked separately).
const MONTHS = new Set(["january", "february", "april", "june", "july", "august", "september", "october", "november", "december"]);
const LANGUAGES = new Set([
  "english", "spanish", "french", "german", "italian", "portuguese", "chinese", "japanese",
  "korean", "arabic", "russian", "hindi", "turkish", "dutch", "greek", "vietnamese", "thai",
  "indonesian", "american", "british", "canadian", "australian", "indian", "mexican",
  "brazilian", "european", "african", "asian",
]);
const HOLIDAYS = new Set(["christmas", "easter"]);
const MONTH_CONTEXT = new Set(["in", "of", "since", "until", "till", "by", "last", "next", "early", "late", "mid", "from", "on"]);

const INTRO_PHRASES = [
  "however", "therefore", "moreover", "furthermore", "nevertheless", "unfortunately", "fortunately",
  "meanwhile", "consequently", "additionally", "finally", "firstly", "secondly", "thirdly", "lastly",
  "personally", "honestly", "luckily", "sadly", "in addition", "in fact", "for example",
  "for instance", "in my opinion", "by the way", "on the other hand", "in conclusion", "as a result",
  "in other words", "yes",
];

// Words like "u" in "university" sound like "you", so they take "a".
const CONSONANT_SOUND_START = /^(unicorn|uniform|unif|union|uniq|unit|univers|unison|usual|use|usag|uten|util|utop|uran|urin|eu|ewe|one$|one-|once|ukul|ukrain|unanim|ufo)/;
// Words with a silent "h" take "an": an hour, an honest person.
const SILENT_H_START = /^(hour|honest|honou?r|heir)/;

const ABBREVIATIONS = new Set(["mr", "mrs", "ms", "dr", "prof", "st", "sr", "jr", "vs", "etc", "e.g", "i.e", "a.m", "p.m", "approx"]);

const FILE_AND_DOMAIN_ENDINGS = new Set([
  "com", "org", "net", "edu", "gov", "io", "co", "uk", "ca", "au", "info", "biz", "app", "dev",
  "html", "htm", "php", "js", "css", "py", "txt", "pdf", "doc", "docx", "jpg", "jpeg", "png", "gif",
  "mp3", "mp4", "zip", "csv", "xlsx", "json",
]);

// Words that start questions.
const QUESTION_WORDS = new Set(["what", "where", "when", "why", "how", "who", "which", "whose", "whom"]);
const QUESTION_WORD_SHORT = new Set(["what's", "where's", "who's", "how's", "when's", "why's", "what're", "where're", "who're", "how're"]);
const HELPING_VERBS = new Set([
  "do", "does", "did", "is", "are", "was", "were", "am", "can", "could", "will", "would", "should",
  "shall", "may", "might", "must", "have", "has", "had", "don't", "doesn't", "didn't", "isn't",
  "aren't", "wasn't", "weren't", "can't", "couldn't", "won't", "wouldn't", "shouldn't", "haven't",
  "hasn't", "hadn't", "mustn't",
]);
const SUBJECTS = new Set([
  "i", "you", "he", "she", "it", "we", "they", "there", "this", "that", "these", "those", "anyone",
  "anybody", "someone", "somebody", "everyone", "everybody", "anything", "something", "everything",
  "people",
]);
const DETERMINERS = new Set(["the", "a", "an", "my", "your", "his", "her", "its", "our", "their", "any", "some", "all"]);

// ---------- Small helpers ----------

function markName(mark, british) {
  if (mark === ".") return british ? "full stop" : "period";
  return { ",": "comma", ";": "semicolon", ":": "colon", "!": "exclamation mark", "?": "question mark" }[mark] || "mark";
}

function matchCase(original, replacement) {
  if (/^i'/i.test(replacement)) return "I" + replacement.slice(1);
  if (original.length > 1 && original === original.toUpperCase()) return replacement.toUpperCase();
  if (/^\p{Lu}/u.test(original)) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

function findWords(text) {
  const words = [];
  for (const m of text.matchAll(/[\p{L}\p{N}]+(?:['’][\p{L}]+)*/gu)) {
    words.push({ text: m[0], lower: m[0].toLowerCase().replace(/’/g, "'"), start: m.index, end: m.index + m[0].length });
  }
  return words;
}

// True when the text around `index` looks like a web or email address.
function looksLikeLink(text, index) {
  let start = index;
  let end = index;
  while (start > 0 && !/\s/.test(text[start - 1])) start--;
  while (end < text.length && !/\s/.test(text[end])) end++;
  return /@|:\/\/|^www\./i.test(text.slice(start, end));
}

function isAbbreviationBefore(text, dotIndex) {
  const before = text.slice(Math.max(0, dotIndex - 10), dotIndex).match(/[\p{L}.]+$/u);
  if (!before) return false;
  return ABBREVIATIONS.has(before[0].toLowerCase()) || /^\p{Lu}$/u.test(before[0]);
}

// Splits the text into sentences. A sentence ends at . ! ? or … followed
// by a space, at a line break, or at the end of the text.
function findSentences(text) {
  const sentences = [];
  let start = null;
  let afterEllipsis = false;

  const finish = (end, mark, markStart) => {
    let e = end;
    while (e > start && /\s/.test(text[e - 1])) e--;
    sentences.push({ start, end: e, mark, markStart, text: text.slice(start, e), afterEllipsis });
    afterEllipsis = mark === "..." || mark.includes("…");
    start = null;
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (start === null) {
      if (/\s/.test(ch)) continue;
      start = i;
    }
    if (ch === "\n") {
      finish(i, "", -1);
      continue;
    }
    if (/[.!?…]/.test(ch)) {
      let j = i;
      while (j < text.length && /[.!?…]/.test(text[j])) j++;
      let k = j;
      while (k < text.length && /["'”’)\]]/.test(text[k])) k++;
      const next = text[k];
      // "home .I went" also ends a sentence: the space is on the wrong side.
      const ends = k >= text.length || /\s/.test(next) || (text[i - 1] === " " && /\p{L}/u.test(next));
      const abbreviation = j - i === 1 && ch === "." && isAbbreviationBefore(text, i);
      if (ends && !abbreviation) {
        finish(k, text.slice(i, j), i);
        i = k - 1;
        continue;
      }
      i = j - 1;
    }
  }
  if (start !== null) finish(text.length, "", -1);
  return sentences;
}

// Guesses whether a sentence is a direct question, such as
// "Where do you live" or "Can you help me".
function looksLikeQuestion(sentence) {
  const t = sentence.toLowerCase().replace(/’/g, "'").match(/[\p{L}']+/gu) || [];
  if (!t.length) return false;
  const [first, second] = t;

  if (QUESTION_WORD_SHORT.has(first)) return true;
  if (QUESTION_WORDS.has(first)) {
    if (first === "who" || HELPING_VERBS.has(second)) return true;
    if (first === "how" && ["much", "many", "long", "old", "far", "often", "about", "come"].includes(second)) return true;
    if (first === "what" && ["time", "about", "kind", "sort", "type", "if", "happened", "else", "day"].includes(second)) return true;
    if (first === "why" && second === "not") return true;
    // "What time is it", but not "When I was young, I lived in Rome".
    if (sentence.includes(",")) return false;
    for (let k = 2; k <= 3; k++) {
      const subjectBefore = t.slice(1, k).some((w) => SUBJECTS.has(w));
      if (HELPING_VERBS.has(t[k]) && !subjectBefore && (SUBJECTS.has(t[k + 1]) || DETERMINERS.has(t[k + 1]))) return true;
    }
    return false;
  }
  if (HELPING_VERBS.has(first)) {
    const base = { "can't": "can", "won't": "will" }[first] || first.replace(/n't$/, "");
    // "Do you like it" is a question, but "Do it now" and "Have a nice day" are not.
    if (base === "do" || base === "have") return ["i", "you", "we", "they", "people"].includes(second);
    return SUBJECTS.has(second) || DETERMINERS.has(second);
  }
  // Tag questions: "It's cold, isn't it"
  const tail = sentence.slice(sentence.lastIndexOf(",") + 1).toLowerCase().replace(/’/g, "'").match(/[\p{L}']+/gu) || [];
  return sentence.includes(",") && tail.length === 2 && /n't$/.test(tail[0]) && SUBJECTS.has(tail[1]);
}

function startsWithVowelSound(word) {
  if (CONSONANT_SOUND_START.test(word)) return false;
  if (SILENT_H_START.test(word)) return true;
  return /^[aeiou]/.test(word);
}

function startsSentence(text, index) {
  const before = text.slice(0, index).replace(/["'“‘(\s]+$/, "");
  return before === "" || /[.!?]$/.test(before);
}

function lowerFirst(text) {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

// ---------- Rules ----------

function checkSpacing({ text, british, add }) {
  // "home .I went" -> "home. I went"
  for (const m of text.matchAll(/(\S)( +)([,.;:!?])(?=(\p{L}+))/gu)) {
    if (m[3] === "." && FILE_AND_DOMAIN_ENDINGS.has(m[4].toLowerCase())) continue;
    const start = m.index + 1;
    add(start, start + m[2].length + 1, m[3] + " ", "spacing", `Put the space after the ${markName(m[3], british)}, not before it.`);
  }

  // "Hello , world" -> "Hello, world"
  for (const m of text.matchAll(/(\S)( +)([,.;:!?]+)/gu)) {
    const start = m.index + 1;
    const marks = m[3];
    const next = text[m.index + m[0].length] || "";
    if (/\p{L}/u.test(next)) continue; // handled by the rule above
    if (marks.startsWith("..")) continue; // a space before "..." is fine
    if (/[:;]/.test(marks[0]) && next && !/\s/.test(next)) continue; // smileys like :)
    if (marks[0] === "." && /\d/.test(next)) continue; // numbers like .5
    if (/[,.;:!?]/.test(m[1])) continue;
    add(start, start + m[2].length, "", "spacing", `Don't put a space before a ${markName(marks[0], british)}.`);
  }

  // "Hello,world" -> "Hello, world"
  for (const m of text.matchAll(/[,;:!?](?=\p{L})/gu)) {
    if (text[m.index - 1] === " " || looksLikeLink(text, m.index)) continue;
    add(m.index + 1, m.index + 1, " ", "spacing", `Put a space after the ${markName(m[0], british)}.`);
  }

  // "home.I went" -> "home. I went" (but not "e.g.", "U.S." or "example.com")
  for (const m of text.matchAll(/(\p{L}+)\.(?=(\p{L}+))/gu)) {
    const [, left, right] = m;
    const dot = m.index + left.length;
    if (left.length < 2 || text[m.index - 1] === "." || looksLikeLink(text, dot)) continue;
    if (FILE_AND_DOMAIN_ENDINGS.has(right.toLowerCase())) continue;
    if (!/^\p{Lu}/u.test(right) && right !== "i" && right.length < 2) continue;
    add(dot + 1, dot + 1, " ", "spacing", `Put a space after the ${markName(".", british)}.`);
  }

  // "two  spaces" -> "two spaces"
  for (const m of text.matchAll(/(\S)( {2,})(?=[^\s,.;:!?])/gu)) {
    add(m.index + 1, m.index + 1 + m[2].length, " ", "spacing", "Use one space between words.");
  }
}

function checkRepeatedMarks({ text, british, add }) {
  for (const m of text.matchAll(/([!?.,;:])\1+/g)) {
    const [run, mark] = m;
    if (mark === "." && run.length === 3) continue; // "..." is an ellipsis
    let replacement = mark;
    let message = `Use one ${markName(mark, british)}.`;
    if (mark === "!") message = "One exclamation mark is enough. Two or more look very informal.";
    if (mark === "?") message = "One question mark is enough.";
    if (mark === "." && run.length > 3) {
      replacement = "...";
      message = "An ellipsis has exactly three dots (...).";
    } else if (mark === ".") {
      message = `End a sentence with one ${markName(".", british)}, or use three dots (...) for a pause.`;
    }
    add(m.index, m.index + run.length, replacement, "punctuation", message);
  }
}

function checkCapitalI({ text, words, add }) {
  for (const w of words) {
    if (!I_WORDS.has(w.lower) || w.text[0] !== "i") continue;
    if (w.lower === "i" && text[w.end] === "." && /\p{L}/u.test(text[w.end + 1] || "")) continue; // i.e.
    if (text[w.start - 1] === "(" && text[w.end] === ")") continue; // list numbers like (i)
    add(w.start, w.start + 1, "I", "capitals", "The word “I” is always a capital letter.");
  }
}

function checkApostrophes({ words, add }) {
  for (const w of words) {
    const fixed = MISSING_APOSTROPHE[w.lower];
    if (fixed) {
      const long = LONG_FORMS[fixed.toLowerCase()] || fixed.toLowerCase()
        .replace(/n't$/, " not").replace(/'m$/, " am").replace(/'re$/, " are").replace(/'ve$/, " have")
        .replace(/'ll$/, " will").replace(/'d$/, " would").replace(/'s$/, " is").replace(/^i /, "I ");
      add(w.start, w.end, matchCase(w.text, fixed), "punctuation",
        `Add an apostrophe: “${fixed}” is short for “${long}”. The apostrophe shows where letters are missing.`);
    } else if (/^\p{L}+'nt$/u.test(w.lower)) {
      add(w.start, w.end, w.text.slice(0, -3) + "n't", "punctuation",
        "The apostrophe goes where the “o” of “not” is missing: do not → don't.");
    }
  }
}

function checkWordChoice({ text, words, add }) {
  const joined = (a, b) => Boolean(b) && /^ +$/.test(text.slice(a.end, b.start));
  // True when the phrase ends after words[i]: "it's nice." or "it's nice to ..."
  const phraseEndsAfter = (i) => !joined(words[i], words[i + 1]) || LINKING_WORDS.has(words[i + 1].lower);

  words.forEach((w, i) => {
    const nextWord = words[i + 1];
    const next = joined(w, nextWord) ? nextWord.lower : null;
    const isIng = next && /^\p{L}{2,}ing$/u.test(next) && !ING_NOUNS.has(next);

    if (w.lower === "its" && next && (ITS_MEANS_IT_IS.has(next) || isIng || (STATE_WORDS.has(next) && phraseEndsAfter(i + 1)))) {
      add(w.start, w.end, matchCase(w.text, "it's"), "punctuation",
        "Write “it's” (with an apostrophe) when you mean “it is” or “it has”. “Its” means “belonging to it”: The dog wagged its tail.");
    }
    if (w.lower === "it's" && next === "own") {
      add(w.start, w.end, matchCase(w.text, "its"), "punctuation", "Write “its own” with no apostrophe. “It's” always means “it is” or “it has”.");
    }
    if (w.lower === "your" && next && (YOUR_MEANS_YOU_ARE.has(next) || (STATE_WORDS.has(next) && phraseEndsAfter(i + 1)))) {
      add(w.start, w.end, matchCase(w.text, "you're"), "word choice",
        "Write “you're” when you mean “you are”. “Your” means “belonging to you”: your bag.");
    }
    if (w.lower === "their" && next && BE_FORMS.has(next)) {
      add(w.start, w.end, matchCase(w.text, "there"), "word choice",
        "Use “there” with is, are, was and were: There is a problem. “Their” means “belonging to them”.");
    }
    if (w.lower === "there" && next === "own") {
      add(w.start, w.end, matchCase(w.text, "their"), "word choice", "Write “their own”. “Their” means “belonging to them”.");
    }
    if (COMPARATIVES.has(w.lower) && next === "then") {
      add(nextWord.start, nextWord.end, matchCase(nextWord.text, "than"), "word choice",
        `Use “than” to compare things: ${w.lower} than. “Then” is about time: first this, then that.`);
    }
    if (MODALS.has(w.lower) && next === "of") {
      add(nextWord.start, nextWord.end, matchCase(nextWord.text, "have"), "grammar",
        `Write “${w.lower} have”. When people speak fast, “${w.lower}'ve” sounds like “${w.lower} of”, but “of” is wrong here.`);
    }
    if ((w.lower === "a" || w.lower === "an") && next && !/\d/.test(nextWord.text) && nextWord.text.length > 1
      && nextWord.text !== nextWord.text.toUpperCase() && !(w.text === "A" && !startsSentence(text, w.start))) {
      const wantsAn = startsWithVowelSound(next);
      if (w.lower === "a" && wantsAn) {
        add(w.start, w.end, matchCase(w.text, "an"), "grammar", `Use “an” before a vowel sound: an ${nextWord.text}.`);
      } else if (w.lower === "an" && !wantsAn) {
        add(w.start, w.end, matchCase(w.text, "a"), "grammar", `Use “a” before a consonant sound: a ${nextWord.text}.`);
      }
    }
    const split = JOINED_SPELLINGS[w.lower];
    if (split) {
      add(w.start, w.end, matchCase(w.text, split), "spelling", `Write “${split}” as two words.`);
    }
    if (next && next === w.lower && /\p{L}/u.test(next) && !ALLOWED_DOUBLES.has(next)) {
      add(w.end, nextWord.end, "", "grammar", `“${nextWord.text}” is written twice.`);
    }
  });
}

function checkNames({ words, add }) {
  words.forEach((w, i) => {
    if (!/^\p{Ll}/u.test(w.text)) return;
    let message = null;
    if (DAYS.has(w.lower)) message = "Days of the week start with a capital letter.";
    else if (MONTHS.has(w.lower)) message = "Months start with a capital letter.";
    else if (LANGUAGES.has(w.lower)) message = "Languages and nationalities start with a capital letter.";
    else if (HOLIDAYS.has(w.lower)) message = "Holidays start with a capital letter.";
    else if (w.lower === "march" && (MONTH_CONTEXT.has(words[i - 1]?.lower) || /^\d/.test(words[i + 1]?.text || ""))) {
      message = "Months start with a capital letter.";
    }
    if (message) add(w.start, w.start + 1, w.text[0].toUpperCase(), "capitals", message);
  });
}

function checkSentences({ text, words, sentences, british, add }) {
  sentences.forEach((s, index) => {
    const inside = words.filter((w) => w.start >= s.start && w.end <= s.end);
    if (!inside.length) return;
    const first = inside[0];

    // A capital letter at the start
    if (first.start === s.start && /^\p{Ll}/u.test(first.text) && !s.afterEllipsis && !I_WORDS.has(first.lower)
      && !/\p{Lu}/u.test(first.text.slice(1)) && !looksLikeLink(text, first.start)) {
      add(first.start, first.start + 1, first.text[0].toUpperCase(), "capitals", "Start every sentence with a capital letter.");
    }

    // A comma after an opening word like "However"
    const lower = s.text.toLowerCase();
    const phrase = INTRO_PHRASES.find((p) => lower.startsWith(p + " "));
    if (phrase && /^ +\p{L}/u.test(s.text.slice(phrase.length))) {
      const at = s.start + phrase.length;
      add(at, at, ",", "punctuation", `Put a comma after “${text.slice(s.start, at)}” when it starts a sentence.`);
    }

    // The right mark at the end
    const question = looksLikeQuestion(s.text);
    if (!s.mark) {
      const isLast = index === sentences.length - 1;
      // Short lines without a mark are often titles, greetings or names.
      if (/[\p{L}\p{N}"'”’)]/u.test(text[s.end - 1]) && inside.length >= (isLast ? 2 : 4)) {
        add(s.end, s.end, question ? "?" : ".", "punctuation", question
          ? "This is a question, so end it with a question mark (?)."
          : `End the sentence with a ${markName(".", british)} (.).`);
      }
    } else if (s.mark === "." && question) {
      add(s.markStart, s.markStart + 1, "?", "punctuation",
        `This is a question, so end it with a question mark (?), not a ${markName(".", british)}.`);
    }
  });
}

function checkPairs({ text, add }) {
  const open = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === "(") open.push(i);
    if (text[i] !== ")") continue;
    if (open.length) {
      open.pop();
    } else if (!/[:;=-]/.test(text[i - 1] || "") && !/(^|\n)\s*[\p{L}\p{N}]{1,3}$/u.test(text.slice(0, i))) {
      add(i, i + 1, null, "punctuation", "This bracket closes, but it was never opened. Add “(” before the extra information.");
    }
  }
  for (const i of open) {
    add(i, i + 1, null, "punctuation", "This bracket is never closed. Add “)” after the extra information.");
  }

  const quotes = [...text.matchAll(/"/g)].map((m) => m.index);
  if (quotes.length % 2 === 1) {
    const last = quotes[quotes.length - 1];
    add(last, last + 1, null, "punctuation", "Quotation marks come in pairs. One of them is missing its partner.");
  }
  const opening = [...text.matchAll(/“/g)].length;
  const closing = [...text.matchAll(/”/g)].length;
  if (opening !== closing) {
    const mark = opening > closing ? "“" : "”";
    const at = text.lastIndexOf(mark);
    add(at, at + 1, null, "punctuation", "Quotation marks come in pairs. One of them is missing its partner.");
  }
}

const RULES = [checkSpacing, checkRepeatedMarks, checkCapitalI, checkApostrophes, checkWordChoice, checkNames, checkSentences, checkPairs];

// ---------- Putting it together ----------

function checkText(text, options = {}) {
  const issues = [];
  const context = {
    text,
    british: Boolean(options.british),
    words: findWords(text),
    sentences: findSentences(text),
    add(start, end, replacement, type, message) {
      issues.push({ start, end, replacement, type, message });
    },
  };
  for (const rule of RULES) rule(context);
  return tidyIssues(issues);
}

function tidyIssues(issues) {
  issues.sort((a, b) => a.start - b.start || a.end - b.end);
  const unique = [];
  for (const issue of issues) {
    const duplicate = unique.some((u) => u.start === issue.start && u.end === issue.end && u.replacement === issue.replacement);
    if (!duplicate) unique.push(issue);
  }
  // A word fix at the start of a sentence also takes the capital letter:
  // "dont" -> "Don't" instead of two separate fixes.
  for (const capital of unique.filter((u) => u.type === "capitals" && u.end === u.start + 1)) {
    const word = unique.find((u) => u !== capital && u.start === capital.start && u.end > capital.end && u.replacement);
    if (word) {
      word.replacement = capital.replacement + word.replacement.slice(1);
      word.message += " Also, " + lowerFirst(capital.message);
      capital.merged = true;
    }
  }
  return unique.filter((u) => !u.merged);
}

// True when two issues touch the same part of the text.
function rangesOverlap(a, b) {
  if (a.start === a.end || b.start === b.end) return Math.max(a.start, b.start) <= Math.min(a.end, b.end);
  return Math.max(a.start, b.start) < Math.min(a.end, b.end);
}

function applyFix(text, issue) {
  return text.slice(0, issue.start) + issue.replacement + text.slice(issue.end);
}

// Applies every fix that doesn't overlap another one. It works from the
// end of the text backwards, so earlier positions stay correct.
function applyFixes(text, issues) {
  const fixable = issues.filter((issue) => issue.replacement !== null).sort((a, b) => b.start - a.start || b.end - a.end);
  let limit = Infinity;
  let count = 0;
  for (const issue of fixable) {
    if (issue.end > limit) continue;
    text = applyFix(text, issue);
    limit = issue.start;
    count++;
  }
  return { text, count };
}

// Keeps fixing until nothing is left that the checker can fix.
function fixAllText(text, options) {
  for (let pass = 0; pass < 5; pass++) {
    const result = applyFixes(text, checkText(text, options));
    if (!result.count) break;
    text = result.text;
  }
  return text;
}

if (typeof module !== "undefined") {
  module.exports = { checkText, applyFix, applyFixes, fixAllText, rangesOverlap, looksLikeQuestion, findSentences };
}
