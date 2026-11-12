# Storyglot

A language-learning reader that runs entirely in the browser — no account, no server, no build step.

Paste any text, have it translated into the language you are learning, then read it with
narration and tap the words you don't know.

## What it does

- **Home**: today's input against your daily word goal, total words of input, known words, an
  estimated level, your streak, and the text to continue with.
- **Add a text** in your own language (it is translated sentence by sentence into the language you
  are learning) or paste one that is already in that language. `.txt` and `.epub` files can be
  opened; long texts and books are split into chapters.
- **Read with colour-coded words**: blue = new, green = in your flashcards (fading as it moves from
  New to Familiar to Known), plain = mastered. Tap a word for an instant translation — it is added
  to your flashcards with the sentence you found it in. Select several words to save a phrase.
- **Narration**: sentence-by-sentence voiceover with word highlighting, previous/next, loop a
  sentence, speed from 0.5× to 1.5×. Uses the voices installed on your device, so it works offline.
- **Sentences view**: every sentence with its translation underneath.
- **Mark as read**: the text's words are added to your total input, split into words met for the
  first time and words reinforced. Words you did not tap count as known (can be switched off).
- **Flashcards**: spaced repetition, always in context, with four study modes — recognise, recall,
  fill the gap in the original sentence, and listen.
- **Progress**: total input (read + listened), estimated level, new vs reinforced words, word
  familiarity breakdown, activity calendar and streak.
- **Words**: searchable vocabulary list, CSV export (for Anki etc.), full backup export/import.
- Light and dark theme, 33 languages including Chinese, Japanese and Thai.

Not included, because they need a paid AI service or a server: AI-generated stories, an AI
conversation tutor, and automatic podcast/video transcripts.

## Put it on your tablet

The app is a single page (`index.html`). Pick whichever is easiest:

1. **GitHub Pages (recommended — installable and offline).**
   In this repository: *Settings → Pages → Deploy from a branch*, choose the branch that contains
   this folder and `/ (root)`. Then open
   `https://<your-user>.github.io/Entry-level-Projects/storyglot/` on the tablet and use
   *Add to Home screen* (Chrome: ⋮ menu; iPad Safari: Share button). After the first visit it opens
   without a connection.
2. **From a computer on the same Wi-Fi.** Run `python3 -m http.server 8000` inside this folder and
   open `http://<computer-ip>:8000` on the tablet. (Offline install needs HTTPS, so this only works
   while the computer is serving.)
3. **Just the file.** Copy `index.html` to an Android tablet and open it with Chrome. Depending on
   the browser, progress may not be saved in this mode — the app warns you if so.

## What needs internet

Only translation. Reading, narration, word tracking, review and statistics are local.
Translation uses, in order: the browser's built-in on-device translator when it is installed
(some desktop Chrome versions), otherwise the free [MyMemory](https://mymemory.translated.net/) API
(about 5,000 characters a day; about 50,000 if you enter an email in Settings). You can point the
app at a LibreTranslate server instead. Text you translate is sent to that service; nothing else
leaves the device.

## Voices

Audio quality depends on the voices installed on the tablet. If there is no voice for your language:
Android — *Settings → Accessibility → Text-to-speech → install voice data*;
iPad — *Settings → Accessibility → Spoken Content → Voices*.

All data lives in the browser's storage for the page. Use *Settings → Export backup* now and then.
