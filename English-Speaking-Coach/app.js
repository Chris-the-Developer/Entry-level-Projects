// English Speaking Coach
// Connects the page to the browser's speech tools, the sentence library
// (sentences.js), the word comparison (compare.js) and the punctuation
// checker (checker.js).

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition || null;
const synth = window.speechSynthesis || null;
// When the page runs as a Claude artifact it can ask Claude to check
// writing, but it isn't allowed to use the microphone.
const IN_CLAUDE = typeof window.claude?.use === "function";

const RATE_NORMAL = 0.95;
const RATE_SLOW = 0.65;
const RATE_WORD = 0.7;

const EXAMPLE_TEXT = "i am learning english .i dont speak very well yet , but its getting better every day!! however i still make mistakes. can you help me";
const EXAMPLE_HEARD = "I sink this is the tird Thursday of month";

// Small words that people often swallow when they speak fast.
const SMALL_WORDS = new Set(["a", "an", "the", "to", "of", "and", "in", "on", "at", "for", "is", "are", "was", "it", "as", "or", "but", "so", "do", "be"]);

const TYPE_LABELS = {
  punctuation: "Punctuation",
  capitals: "Capitals",
  spacing: "Spacing",
  grammar: "Grammar",
  spelling: "Spelling",
  "word choice": "Word choice",
  style: "Style",
};

const RECOGNITION_ERRORS = {
  "not-allowed": "The microphone is blocked. Allow microphone access for this page in your browser settings, then try again.",
  "service-not-allowed": "The microphone is blocked. Allow microphone access for this page in your browser settings, then try again.",
  "audio-capture": "No microphone was found. Plug one in or check your sound settings, then try again.",
  network: "Speech recognition needs an internet connection. Check your connection and try again.",
  "language-not-supported": "Your browser can't recognize this accent. Try switching between American and British.",
};

const ICONS = {
  speaker: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>',
  slow: '<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 9.5a3.5 3.5 0 0 1 0 5"/></svg>',
  mic: '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0"/><path d="M12 18v3"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1.5" class="filled"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>',
  check: '<svg viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></svg>',
};

// ---------- Helpers ----------

const $ = (id) => document.getElementById(id);

// Builds an element: el("p", { class: "note", text: "Hi" }, child1, child2)
function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key === "class") node.className = value;
    else if (key === "text") node.textContent = value;
    else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value);
  }
  node.append(...children.filter((child) => child !== null && child !== undefined && child !== false));
  return node;
}

function icon(name) {
  const span = el("span", { class: "btn-icon" });
  span.innerHTML = ICONS[name];
  return span;
}

function loadSaved(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be blocked (for example in private windows). The app still works without it.
  }
}

const settings = { lang: "en-US", voiceURI: "", onlineCheck: true, ...loadSaved("esc-settings", {}) };
const progress = { attempts: [], total: 0, weak: {}, fixed: 0, checks: 0, ...loadSaved("esc-progress", {}) };

function scoreTier(score) {
  if (score >= 80) return "good";
  if (score >= 50) return "fair";
  return "low";
}

// ---------- Speaking out loud (text to speech) ----------

let voices = [];

function loadVoices() {
  voices = synth.getVoices().filter((voice) => /^en([-_]|$)/i.test(voice.lang));
  renderVoiceSelect();
}

function voicesForAccent() {
  return voices.filter((voice) => voice.lang.replace("_", "-").toLowerCase() === settings.lang.toLowerCase());
}

function pickVoice() {
  const chosen = voices.find((voice) => voice.voiceURI === settings.voiceURI);
  if (chosen) return chosen;
  const matching = voicesForAccent();
  const pool = matching.length ? matching : voices;
  return pool.find((voice) => /natural|premium|enhanced|google/i.test(voice.name)) || pool.find((voice) => voice.default) || pool[0] || null;
}

function renderVoiceSelect() {
  const select = $("voice-select");
  const matching = voicesForAccent();
  const others = voices.filter((voice) => !matching.includes(voice));
  select.replaceChildren(el("option", { value: "", text: "Automatic" }),
    ...[...matching, ...others].map((voice) => el("option", { value: voice.voiceURI, text: `${voice.name} (${voice.lang})` })));
  select.value = voices.some((voice) => voice.voiceURI === settings.voiceURI) ? settings.voiceURI : "";
  select.disabled = !voices.length;
}

function speak(text, rate = RATE_NORMAL) {
  if (!synth || !text.trim()) return;
  synth.cancel();
  const voice = pickVoice();
  // Long text is read one sentence at a time, because some browsers stop
  // reading after about 15 seconds.
  const pieces = text.split(/\n+/).flatMap((line) => line.match(/[^.!?]+(?:[.!?]+|$)/g) || []);
  for (const piece of pieces) {
    if (!piece.trim()) continue;
    const utterance = new SpeechSynthesisUtterance(piece.trim());
    utterance.lang = voice ? voice.lang : settings.lang;
    if (voice) utterance.voice = voice;
    utterance.rate = rate;
    synth.speak(utterance);
  }
}

// ---------- Listening (speech to text) ----------

let activeRecognition = null;

function canRecord() {
  return Boolean(Recognition) && !IN_CLAUDE;
}

// Listens for one sentence. Calls onHearing with the words so far, and
// resolves with everything that was heard ("" if nothing).
function listenOnce(onHearing) {
  return new Promise((resolve, reject) => {
    const recognition = new Recognition();
    recognition.lang = settings.lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.maxAlternatives = 1;

    let finalText = "";
    let latestText = "";
    let error = null;

    recognition.onresult = (event) => {
      let interim = "";
      finalText = "";
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalText += result[0].transcript + " ";
        else interim += result[0].transcript + " ";
      }
      latestText = (finalText + interim).trim();
      onHearing(latestText);
    };
    recognition.onerror = (event) => {
      error = event.error;
    };
    recognition.onend = () => {
      activeRecognition = null;
      if (error && error !== "no-speech" && error !== "aborted") reject(error);
      else resolve(finalText.trim() || latestText);
    };

    activeRecognition = recognition;
    try {
      recognition.start();
    } catch {
      activeRecognition = null;
      reject("start-failed");
    }
  });
}

function setListening(button, on) {
  button.classList.toggle("is-recording", on);
  button.setAttribute("aria-pressed", String(on));
  button.querySelector(".btn-icon").innerHTML = ICONS[on ? "stop" : "mic"];
  button.querySelector(".btn-label").textContent = on ? "Stop" : button.dataset.label;
}

// ---------- Tabs ----------

const TABS = ["speak", "write", "progress"];

function showTab(name, moveFocus = false) {
  for (const tab of TABS) {
    const selected = tab === name;
    const button = $("tab-" + tab);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
    $("view-" + tab).hidden = !selected;
    if (selected && moveFocus) button.focus();
  }
  if (name === "progress") renderProgress();
  try {
    history.replaceState(null, "", "#" + name);
  } catch {
    // Some embedded views don't allow changing the address. That's fine.
  }
}

function setupTabs() {
  TABS.forEach((name, index) => {
    const button = $("tab-" + name);
    button.addEventListener("click", () => showTab(name));
    button.addEventListener("keydown", (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      showTab(TABS[(index + step + TABS.length) % TABS.length], true);
    });
  });
  window.addEventListener("hashchange", () => {
    const name = location.hash.slice(1);
    if (TABS.includes(name)) showTab(name);
  });
}

// ---------- Accent and voice ----------

function setupAccent() {
  for (const button of document.querySelectorAll(".segment")) {
    button.addEventListener("click", () => {
      settings.lang = button.dataset.lang;
      settings.voiceURI = "";
      save("esc-settings", settings);
      renderAccent();
      if (synth) renderVoiceSelect();
    });
  }
  renderAccent();

  if (!synth) {
    $("voice-select").disabled = true;
    return;
  }
  loadVoices();
  synth.onvoiceschanged = loadVoices;
  $("voice-select").addEventListener("change", (event) => {
    settings.voiceURI = event.target.value;
    save("esc-settings", settings);
    speak("Hello. This is how I sound.");
  });
}

function renderAccent() {
  for (const button of document.querySelectorAll(".segment")) {
    button.setAttribute("aria-checked", String(button.dataset.lang === settings.lang));
  }
}

// ---------- Speak tab ----------

const speakState = { sound: "all", index: 0, custom: null, result: null, heard: "", isExample: false };

function sentenceList() {
  return speakState.sound === "all" ? SENTENCES : SENTENCES.filter((item) => item.sound === speakState.sound);
}

function currentItem() {
  if (speakState.custom) return { text: speakState.custom, sound: null };
  const list = sentenceList();
  return list[speakState.index % list.length];
}

function clearResult() {
  speakState.result = null;
  speakState.isExample = false;
}

function setupChips() {
  const options = [["all", "All sounds", ""], ...Object.entries(SOUNDS).map(([key, sound]) => [key, sound.name, sound.ipa])];
  $("sound-chips").replaceChildren(...options.map(([key, name, ipa]) => el("button", {
    type: "button",
    class: "chip",
    "data-sound": key,
    onclick: () => {
      stopListening();
      speakState.sound = key;
      speakState.index = 0;
      speakState.custom = null;
      clearResult();
      renderSpeak();
      setSpeakStatus(defaultSpeakStatus());
    },
  }, name, ipa ? el("span", { class: "ipa", text: ipa }) : null)));
}

function updateChips() {
  for (const chip of $("sound-chips").children) {
    chip.setAttribute("aria-pressed", String(!speakState.custom && speakState.sound === chip.dataset.sound));
  }
}

function renderSpeak() {
  const item = currentItem();
  const sound = item.sound ? SOUNDS[item.sound] : null;
  const list = sentenceList();

  $("sound-name").textContent = sound ? sound.name : "Your sentence";
  $("sound-ipa").textContent = sound ? sound.ipa : "";
  $("sentence-counter").textContent = speakState.custom ? "" : `${(speakState.index % list.length) + 1} of ${list.length}`;
  $("btn-library").hidden = !speakState.custom;

  renderSentence(speakState.result ? speakState.result.words : tokenize(item.text), Boolean(speakState.result));

  $("tip-title").textContent = sound ? `How to say ${sound.name}` : "How to practice";
  $("tip-text").textContent = sound ? sound.tip : "Listen first, then say it at a natural speed. Tap any word to hear it on its own.";
  $("tip-mistake").textContent = sound ? `Common mistake: ${sound.mistake}` : "";
  $("tip-mistake").hidden = !sound;

  updateChips();
  renderResult();
}

function glossFor(word) {
  if (word.status === "close") return `“${word.heard}”`;
  if (word.status === "missed") return "missed";
  return "";
}

function renderSentence(words, withResult) {
  const box = $("sentence");
  box.replaceChildren();
  words.forEach((word, i) => {
    if (i > 0 && !word.attached) box.append(" ");
    const span = el("span", { class: "word" + (word.status ? " is-" + word.status : "") });
    if (withResult) span.append(el("span", { class: "gloss", "aria-hidden": "true", text: glossFor(word) || " " }));
    if (word.norm) {
      const label = word.status === "close" ? `${word.clean}, sounded like ${word.heard}` : word.status === "missed" ? `${word.clean}, not heard` : word.clean;
      span.append(el("button", {
        type: "button",
        class: "word-btn",
        "aria-label": `Hear “${label}”`,
        onclick: () => speak(word.clean, RATE_WORD),
      }, word.display));
    } else {
      span.append(word.display);
    }
    box.append(span);
  });
}

function scoreMessage(score) {
  if (score === 100) return "Perfect. Every word was clear.";
  if (score >= 80) return "Very good. Just a few words to polish.";
  if (score >= 60) return "Good effort. Listen again and focus on the marked words.";
  if (score >= 40) return "Getting there. Try it more slowly.";
  return "Keep practicing. Listen first, then try again slowly.";
}

function feedbackItem(word, item) {
  const small = SMALL_WORDS.has(word.norm);
  const focus = item.sound && SOUNDS[item.sound];
  let sound = word.sound ? SOUNDS[word.sound] : null;
  if (!sound && !small && focus && focus.pattern && focus.pattern.test(word.norm)) sound = focus;

  let advice;
  if (word.status === "close") {
    advice = `Sounded like “${word.heard}”. ` + (sound ? sound.short : "Listen to it slowly, then say it on its own a few times.");
  } else if (small) {
    advice = `Not heard. Small words like “${word.clean}” are easy to swallow. Say them lightly, but don't skip them.`;
  } else {
    advice = "Not heard. Say it a little louder, and don't rush. " + (sound ? sound.short : "");
  }

  return el("li", { class: `feedback-item is-${word.status}` },
    el("p", { class: "feedback-word", text: word.clean }),
    el("div", { class: "feedback-body" },
      sound ? el("p", { class: "feedback-sound" }, sound.name + " ", el("span", { class: "ipa", text: sound.ipa })) : null,
      el("p", { class: "feedback-advice", text: advice.trim() })),
    el("button", { type: "button", class: "btn btn-small", "aria-label": `Hear “${word.clean}”`, onclick: () => speak(word.clean, RATE_WORD) },
      icon("speaker"), "Hear"));
}

function renderResult() {
  const card = $("result");
  const { result, heard, isExample } = speakState;
  if (!result) {
    card.hidden = true;
    card.replaceChildren();
    return;
  }
  const item = currentItem();
  const problems = result.words.filter((word) => word.status === "close" || word.status === "missed");
  const legend = (status, label) => el("li", {}, el("span", { class: `swatch is-${status}` }), label);

  card.replaceChildren(
    isExample ? el("p", { class: "example-note" }, el("span", { class: "tag", text: "Example" }), "This is what feedback looks like. Press Record to get your own.") : null,
    el("div", { class: "score-row" },
      el("p", { class: `score tier-${scoreTier(result.score)}` }, el("span", { class: "score-num", text: String(result.score) }), el("span", { class: "score-unit", text: "%" })),
      el("div", { class: "score-text" },
        el("p", { class: "score-title", text: scoreMessage(result.score) }),
        el("p", { class: "score-sub", text: `${result.clear} of ${result.total} words were clear.` }),
        el("p", { class: "heard" }, "We heard: ", el("q", { text: heard })))),
    el("ul", { class: "legend", "aria-label": "Color key" }, legend("ok", "Clear"), legend("close", "Sounded different"), legend("missed", "Not heard")),
    problems.length ? el("ol", { class: "feedback" }, ...problems.map((word) => feedbackItem(word, item))) : null,
    result.extra.length ? el("p", { class: "extra", text: `Extra words we heard: ${result.extra.join(", ")}. Maybe a word was repeated or added.` }) : null,
    el("div", { class: "controls" },
      canRecord() ? el("button", { type: "button", class: "btn", onclick: onRecord }, icon("mic"), "Try again") : null,
      el("button", { type: "button", class: "btn btn-quiet", onclick: nextSentence }, "Next sentence", icon("next"))));
  card.hidden = false;
}

function setSpeakStatus(text, isError = false) {
  const status = $("speak-status");
  status.textContent = text;
  status.classList.toggle("is-error", isError);
}

function defaultSpeakStatus() {
  return canRecord() ? "Press Listen to hear the sentence, then press Record and say it yourself." : "Press Listen to hear the sentence, then say it along with the voice.";
}

function stopListening() {
  if (activeRecognition) activeRecognition.abort();
}

function nextSentence() {
  stopListening();
  if (speakState.custom) speakState.custom = null;
  else speakState.index += 1;
  clearResult();
  renderSpeak();
  setSpeakStatus(defaultSpeakStatus());
}

function practiceText(text) {
  stopListening();
  speakState.custom = text;
  clearResult();
  showTab("speak");
  renderSpeak();
  setSpeakStatus(defaultSpeakStatus());
}

async function onRecord() {
  if (activeRecognition) {
    activeRecognition.stop();
    return;
  }
  if (!canRecord()) return;
  if (synth) synth.cancel();

  const item = currentItem();
  const button = $("btn-record");
  setListening(button, true);
  setSpeakStatus("Listening. Say the sentence now.");
  try {
    const heard = await listenOnce((text) => setSpeakStatus(`Hearing: “${text}”`));
    if (currentItem().text !== item.text) return; // the sentence changed while listening
    if (!heard) {
      setSpeakStatus("I didn't hear anything. Press Record, wait a moment, then speak clearly.", true);
      return;
    }
    const result = scoreAttempt(item.text, heard);
    recordAttempt(item, result);
    Object.assign(speakState, { result, heard, isExample: false });
    renderSpeak();
    setSpeakStatus(result.score === 100 ? "Every word was clear. Try the next one." : "Tap a marked word to hear how it should sound, then try again.");
  } catch (code) {
    setSpeakStatus(RECOGNITION_ERRORS[code] || "Recording stopped unexpectedly. Please try again.", true);
  } finally {
    setListening(button, false);
  }
}

function recordAttempt(item, result) {
  progress.total += 1;
  progress.attempts.unshift({ at: Date.now(), text: item.text, score: result.score });
  progress.attempts.length = Math.min(progress.attempts.length, 100);
  for (const word of result.words) {
    if (!word.norm) continue;
    const entry = progress.weak[word.norm];
    if (word.status === "ok") {
      // Two clear attempts in a row and the word leaves the list.
      if (entry && ++entry.streak >= 2) {
        delete progress.weak[word.norm];
        progress.fixed += 1;
      }
    } else {
      const updated = entry || { word: word.clean, misses: 0, streak: 0 };
      updated.misses += 1;
      updated.streak = 0;
      updated.last = Date.now();
      progress.weak[word.norm] = updated;
    }
  }
  save("esc-progress", progress);
  renderWeakWords($("weak-side"), 8);
}

function setupSpeak() {
  const notice = IN_CLAUDE
    ? "Recording is off in this preview, because it can't use your microphone. You can still listen to every sentence and use the Write tab. To record yourself, open index.html from the project in Chrome, Edge or Safari."
    : !Recognition
      ? "This browser can't turn speech into text, so recording is off. Open the page in Chrome, Edge or Safari to record yourself. You can still listen to every sentence."
      : !window.isSecureContext
        ? "Your browser only allows the microphone on secure pages. Open the app from a file on your computer, from localhost, or from an https:// address."
        : "";
  $("speak-notice").textContent = notice;
  $("speak-notice").hidden = !notice;

  const record = $("btn-record");
  record.dataset.label = "Record";
  record.disabled = !canRecord();
  record.addEventListener("click", onRecord);
  $("btn-listen").addEventListener("click", () => speak(currentItem().text, RATE_NORMAL));
  $("btn-slow").addEventListener("click", () => speak(currentItem().text, RATE_SLOW));
  $("btn-next").addEventListener("click", nextSentence);
  $("btn-library").addEventListener("click", nextSentence);
  for (const id of ["btn-listen", "btn-slow"]) $(id).disabled = !synth;

  $("custom-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const text = $("custom-input").value.trim();
    if (text) practiceText(text);
    else $("custom-input").focus();
  });

  setupChips();

  // Before the first attempt, show what feedback looks like.
  if (progress.total === 0) {
    Object.assign(speakState, { result: scoreAttempt(SENTENCES[0].text, EXAMPLE_HEARD), heard: EXAMPLE_HEARD, isExample: true });
  }
  renderSpeak();
  setSpeakStatus(defaultSpeakStatus());
  renderWeakWords($("weak-side"), 8);
}

// ---------- Write tab ----------

const writeState = { checkedText: null, issues: [], online: [], onlineAvailable: true };
let claudeSample = null;

function setWriteStatus(text, isError = false) {
  const status = $("write-status");
  status.textContent = text;
  status.classList.toggle("is-error", isError);
}

function setWriting(text) {
  $("write-input").value = text;
  afterWritingChanged();
}

function afterWritingChanged() {
  const text = $("write-input").value;
  $("example-tag").hidden = text !== EXAMPLE_TEXT;
  save("esc-draft", text);
  const stale = writeState.checkedText !== null && text !== writeState.checkedText;
  $("results-stale").hidden = !stale;
  $("results-card").classList.toggle("is-stale", stale);
  for (const button of $("results-card").querySelectorAll("button")) button.disabled = stale;
}

// Re-runs the offline checker and adds back the online suggestions that
// don't overlap with it.
function refreshIssues(text) {
  writeState.checkedText = text;
  const offline = checkText(text, { british: settings.lang === "en-GB" });
  const online = writeState.online.filter((suggestion) => !offline.some((issue) => rangesOverlap(issue, suggestion)));
  writeState.issues = [...offline, ...online].sort((a, b) => a.start - b.start || a.end - b.end);
  renderIssues();
  afterWritingChanged();
}

async function runCheck() {
  const text = $("write-input").value;
  if (!text.trim()) {
    setWriteStatus("Write or dictate some English first.", true);
    return;
  }
  writeState.online = [];
  refreshIssues(text);
  progress.checks += 1;
  save("esc-progress", progress);

  const useOnline = settings.onlineCheck && writeState.onlineAvailable;
  if (!useOnline) {
    setWriteStatus(checkedSummary());
    return;
  }

  const source = IN_CLAUDE ? "Claude" : "LanguageTool";
  setWriteStatus(`Asking ${source} for a deeper check…`);
  $("btn-check").disabled = true;
  try {
    const suggestions = await askOnline(text);
    if (writeState.checkedText !== text) {
      setWriteStatus(""); // the text changed while waiting, so these suggestions are out of date
      return;
    }
    // Keep only one suggestion for each part of the text.
    writeState.online = suggestions.filter((s, i) => !suggestions.slice(0, i).some((earlier) => rangesOverlap(earlier, s)));
    const before = writeState.issues.length;
    refreshIssues(text);
    const added = writeState.issues.length - before;
    setWriteStatus(added ? `${source} found ${added} more. ${checkedSummary()}` : `${source} found nothing more. ${checkedSummary()}`);
  } catch (error) {
    setWriteStatus(onlineErrorMessage(error), true);
  } finally {
    $("btn-check").disabled = false;
  }
}

function checkedSummary() {
  const fixable = writeState.issues.filter((issue) => issue.replacement !== null).length;
  if (!writeState.issues.length) return "No mistakes found.";
  return fixable ? "Press Fix on each one, or Fix all." : "Read the notes and fix these by hand.";
}

function askOnline(text) {
  return IN_CLAUDE ? askClaude(text) : askLanguageTool(text);
}

async function askLanguageTool(text) {
  const response = await fetch("https://api.languagetool.org/v2/check", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ text, language: settings.lang }),
  });
  if (!response.ok) throw { code: response.status === 429 ? "rate_limited" : "upstream_error" };
  const data = await response.json();
  return (data.matches || []).map((match) => {
    const category = match.rule?.category?.id || "";
    let type = "grammar";
    if (match.rule?.issueType === "misspelling" || category === "TYPOS") type = "spelling";
    else if (category === "PUNCTUATION" || category === "TYPOGRAPHY") type = "punctuation";
    else if (category === "CASING") type = "capitals";
    else if (category === "CONFUSED_WORDS" || category === "COLLOCATIONS") type = "word choice";
    else if (["STYLE", "REDUNDANCY", "PLAIN_ENGLISH"].includes(category)) type = "style";
    return {
      start: match.offset,
      end: match.offset + match.length,
      replacement: match.replacements?.length ? match.replacements[0].value : null,
      type,
      message: match.message,
      source: "LanguageTool",
    };
  });
}

async function askClaude(text) {
  claudeSample ||= window.claude.use("sample");
  const sample = await claudeSample;
  if (!sample) throw { code: "unavailable" };
  const accent = settings.lang === "en-GB" ? "British" : "American";
  const prompt = `You are a friendly English teacher. A learner wrote the TEXT below in ${accent} English. Find their mistakes in punctuation, capital letters, spelling, grammar and word choice. Only report real mistakes, not style preferences. List them in the order they appear.

Reply with only a JSON object in this shape:
{"issues":[{"original":"dont","replacement":"don't","type":"punctuation","explanation":"Don't is short for do not, so it needs an apostrophe."}]}

Rules for each issue:
- "original": the exact characters copied from the TEXT that need to change, usually 1 to 3 words. When you add or move punctuation, include the word next to it so it can be found (for example "home I" becomes "home. I").
- "replacement": what those characters should be.
- "type": one of "punctuation", "capitals", "spelling", "grammar", "word choice".
- "explanation": one short sentence in simple English that a learner at B1 level understands.
If there are no mistakes, reply {"issues":[]}.

TEXT:
<<<
${text}
>>>`;
  const reply = await sample.json(prompt, { modelTier: "quick" });
  const list = Array.isArray(reply?.issues) ? reply.issues : [];

  // Find each suggestion in the text, searching forward from the last one.
  const found = [];
  let cursor = 0;
  for (const item of list) {
    const original = String(item.original ?? "");
    const replacement = String(item.replacement ?? "");
    if (!original || original === replacement) continue;
    let at = text.indexOf(original, cursor);
    if (at === -1) at = text.indexOf(original);
    if (at === -1) continue;
    cursor = at + original.length;
    found.push({
      start: at,
      end: at + original.length,
      replacement,
      type: TYPE_LABELS[item.type] ? item.type : "grammar",
      message: String(item.explanation || "Suggested correction."),
      source: "Claude",
    });
  }
  return found;
}

function onlineErrorMessage(error) {
  const code = error?.code;
  if (["not_granted", "sampling_disabled", "not_declared", "capability_disabled", "capability_removed", "unavailable"].includes(code)) {
    writeState.onlineAvailable = false;
    $("online-option").hidden = true;
    return "Claude isn't available on this page, so only the built-in check ran.";
  }
  if (code === "rate_limited") return "Too many checks in a short time. The built-in check ran. Wait a minute before the next deeper check.";
  if (IN_CLAUDE) return "Claude didn't answer this time. The built-in check still ran, so try again in a moment.";
  return "The online check didn't answer. Are you offline? The built-in check still ran.";
}

// Shows a short before/after preview: the whole word for a capital
// letter fix, and a little context for small changes like a missing comma.
function changePreview(text, issue) {
  const core = text.slice(issue.start, issue.end);
  let left = "";
  let right = "";
  if (/^\p{L}$/u.test(core)) {
    left = (text.slice(0, issue.start).match(/[\p{L}'’]*$/u) || [""])[0];
    right = (text.slice(issue.end).match(/^[\p{L}'’]*/u) || [""])[0];
  } else if (!/\p{L}{2,}/u.test(core)) {
    left = (text.slice(Math.max(0, issue.start - 20), issue.start).match(/[\p{L}\p{N}'’]*[^\p{L}\p{N}\s]?\s?$/u) || [""])[0];
    right = (text.slice(issue.end, issue.end + 20).match(/^\s?[^\p{L}\p{N}\s]?[\p{L}\p{N}'’]*/u) || [""])[0];
  }
  let before = left + core + right;
  let after = left + (issue.replacement ?? core) + right;
  if (issue.type === "spacing") {
    before = before.replace(/ /g, "␣");
    after = after.replace(/ /g, "␣");
  }
  return { before, after };
}

function renderIssues() {
  const { issues, checkedText: text } = writeState;
  const count = issues.length;
  $("results-title").textContent = count ? `${count} ${count === 1 ? "correction" : "corrections"}` : "No mistakes found";

  const byType = {};
  for (const issue of issues) byType[issue.type] = (byType[issue.type] || 0) + 1;
  $("results-summary").replaceChildren(
    ...Object.entries(byType).map(([type, n]) => el("span", { class: "summary-chip" }, TYPE_LABELS[type] || type, el("b", { text: String(n) }))),
    count ? "" : el("p", { class: "section-sub", text: "The checker looks for common mistakes, but it can't catch everything. Read your text aloud too." }));
  $("btn-fix-all").hidden = !issues.some((issue) => issue.replacement !== null);

  renderMarked(text, issues);
  $("issue-list").replaceChildren(...issues.map((issue, index) => issueItem(issue, index + 1, text)));
}

function renderMarked(text, issues) {
  const box = $("marked-text");
  box.replaceChildren();
  let position = 0;
  issues.forEach((issue, index) => {
    if (issue.start < position) return; // overlaps the one before; it is still in the list
    box.append(text.slice(position, issue.start));
    const number = el("sup", { class: "mark-num", text: String(index + 1) });
    if (issue.start === issue.end) {
      box.append(el("span", { class: "caret", "aria-hidden": "true" }), number);
    } else {
      const piece = text.slice(issue.start, issue.end);
      const onlySpace = /^\s+$/.test(piece);
      box.append(el("mark", { class: onlySpace ? "is-space" : "", text: onlySpace ? piece.replace(/ /g, "␣") : piece }), number);
    }
    position = issue.end;
  });
  box.append(text.slice(position));
}

function issueItem(issue, number, text) {
  const preview = changePreview(text, issue);
  const canFix = issue.replacement !== null;
  return el("li", { class: "issue" },
    el("span", { class: "issue-num", text: String(number) }),
    el("div", { class: "issue-body" },
      el("p", { class: "change" },
        el("span", { class: "badge", text: TYPE_LABELS[issue.type] || "Note" }),
        canFix ? el("del", { text: preview.before }) : el("span", { class: "change-plain", text: preview.before }),
        canFix ? el("span", { class: "arrow", "aria-label": "becomes", text: "→" }) : null,
        canFix ? el("ins", { text: preview.after }) : null),
      el("p", { class: "issue-msg", text: issue.message }),
      issue.source ? el("p", { class: "issue-source", text: `Suggested by ${issue.source}` }) : null),
    canFix ? el("button", { type: "button", class: "btn btn-small", onclick: () => fixIssue(issue) }, "Fix") : null);
}

function fixIssue(issue) {
  const text = writeState.checkedText;
  const shift = issue.replacement.length - (issue.end - issue.start);
  // Online suggestions after this fix move by the change in length.
  writeState.online = writeState.online
    .filter((other) => other !== issue && !rangesOverlap(other, issue))
    .map((other) => (other.start >= issue.end ? { ...other, start: other.start + shift, end: other.end + shift } : other));
  const updated = applyFix(text, issue);
  $("write-input").value = updated;
  refreshIssues(updated);
  setWriteStatus(writeState.issues.length ? `Fixed. ${writeState.issues.length} left.` : "Fixed. That was the last one. Press Read aloud to hear your text.");
}

function fixAll() {
  const { text, count } = applyFixes(writeState.checkedText, writeState.issues);
  writeState.online = [];
  $("write-input").value = text;
  refreshIssues(text);
  const left = writeState.issues.length;
  setWriteStatus(left ? `Fixed ${count}. ${left} left to look at.` : `Fixed ${count}. Press Read aloud to hear your text.`);
}

async function onDictate() {
  if (activeRecognition) {
    activeRecognition.stop();
    return;
  }
  if (!canRecord()) return;
  if (synth) synth.cancel();
  const button = $("btn-dictate");
  setListening(button, true);
  setWriteStatus("Listening. Speak, and your words will appear in the box.");
  try {
    const heard = await listenOnce((text) => setWriteStatus(`Hearing: “${text}”`));
    if (!heard) {
      setWriteStatus("I didn't hear anything. Press Dictate and try again.", true);
      return;
    }
    const box = $("write-input");
    const space = box.value && !/\s$/.test(box.value) ? " " : "";
    box.value = (box.value === EXAMPLE_TEXT ? "" : box.value + space) + heard;
    afterWritingChanged();
    setWriteStatus("Speech has no punctuation, so add it yourself. Then press Check my writing.");
  } catch (code) {
    setWriteStatus(RECOGNITION_ERRORS[code] || "Dictation stopped unexpectedly. Please try again.", true);
  } finally {
    setListening(button, false);
  }
}

function setupWrite() {
  const input = $("write-input");
  input.value = loadSaved("esc-draft", "") || EXAMPLE_TEXT;
  input.addEventListener("input", afterWritingChanged);

  $("btn-check").addEventListener("click", runCheck);
  $("btn-fix-all").addEventListener("click", fixAll);
  $("btn-read").addEventListener("click", () => speak(input.value, RATE_NORMAL));
  $("btn-read").disabled = !synth;

  const dictate = $("btn-dictate");
  dictate.dataset.label = "Dictate";
  dictate.disabled = !canRecord();
  dictate.addEventListener("click", onDictate);

  if (IN_CLAUDE) {
    $("online-label").textContent = "Also ask Claude to check grammar and word choice";
    $("online-note").textContent = "The first time, Claude asks for your permission.";
    claudeSample = window.claude.use("sample");
    claudeSample.then((sample) => {
      if (!sample) {
        writeState.onlineAvailable = false;
        $("online-option").hidden = true;
      }
    });
  }
  const online = $("online-check");
  online.checked = settings.onlineCheck;
  online.addEventListener("change", () => {
    settings.onlineCheck = online.checked;
    save("esc-settings", settings);
  });

  for (const button of document.querySelectorAll("[data-say]")) {
    button.addEventListener("click", () => speak(button.dataset.say, RATE_NORMAL));
    button.disabled = !synth;
  }

  // Check the starting text right away, so the corrections are visible.
  refreshIssues(input.value);
  if (input.value === EXAMPLE_TEXT) {
    setWriteStatus(`This example has ${writeState.issues.length} mistakes. Replace it with your own writing, then press Check my writing.`);
  }
}

// ---------- Progress tab ----------

function weakWordList() {
  return Object.values(progress.weak).sort((a, b) => b.misses - a.misses || b.last - a.last);
}

function renderWeakWords(container, limit) {
  const list = weakWordList().slice(0, limit);
  if (!list.length) {
    container.replaceChildren(el("p", { class: "empty", text: "Words you find hard will appear here after you practice." }));
    return;
  }
  container.replaceChildren(el("div", { class: "word-chips" }, ...list.map((entry) => el("button", {
    type: "button",
    class: "word-chip",
    "aria-label": `Practice “${entry.word}”, missed ${entry.misses} ${entry.misses === 1 ? "time" : "times"}`,
    onclick: () => practiceText(entry.word),
  }, entry.word, el("span", { class: "miss-count", text: "×" + entry.misses })))));
}

function formatWhen(time) {
  const date = new Date(time);
  const now = new Date();
  const clock = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (date.toDateString() === now.toDateString()) return "Today, " + clock;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday, " + clock;
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function renderProgress() {
  const recent = progress.attempts.slice(0, 10);
  $("stat-total").textContent = String(progress.total);
  $("stat-average").textContent = recent.length ? Math.round(recent.reduce((sum, a) => sum + a.score, 0) / recent.length) + "%" : "–";
  $("stat-fixed").textContent = String(progress.fixed);
  $("stat-checks").textContent = String(progress.checks);
  renderWeakWords($("weak-full"), 40);

  const box = $("history");
  if (!progress.attempts.length) {
    box.replaceChildren(el("p", { class: "empty", text: "Nothing yet. Record a sentence on the Speak tab and it will show up here." }));
    return;
  }
  const rows = progress.attempts.slice(0, 15).map((attempt) => el("tr", {},
    el("td", { class: "history-text", text: attempt.text }),
    el("td", {}, el("span", { class: `score-pill tier-${scoreTier(attempt.score)}`, text: attempt.score + "%" })),
    el("td", { class: "history-when", text: formatWhen(attempt.at) })));
  box.replaceChildren(el("table", { class: "history" },
    el("thead", {}, el("tr", {}, el("th", { text: "Sentence" }), el("th", { text: "Clarity" }), el("th", { text: "When" }))),
    el("tbody", {}, ...rows)));
}

function setupProgress() {
  const button = $("btn-clear");
  let confirmTimer = null;
  button.addEventListener("click", () => {
    if (!confirmTimer) {
      button.textContent = "Press again to clear everything";
      confirmTimer = setTimeout(() => {
        confirmTimer = null;
        button.textContent = "Clear my progress";
      }, 4000);
      return;
    }
    clearTimeout(confirmTimer);
    confirmTimer = null;
    button.textContent = "Clear my progress";
    Object.assign(progress, { attempts: [], total: 0, weak: {}, fixed: 0, checks: 0 });
    save("esc-progress", progress);
    renderProgress();
    renderWeakWords($("weak-side"), 8);
  });
}

// ---------- Start ----------

for (const node of document.querySelectorAll("[data-icon]")) node.innerHTML = ICONS[node.dataset.icon];
setupTabs();
setupAccent();
setupSpeak();
setupWrite();
setupProgress();
showTab(TABS.includes(location.hash.slice(1)) ? location.hash.slice(1) : "speak");
