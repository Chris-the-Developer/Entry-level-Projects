# Storyglot

A language-learning reader that runs entirely in the browser — no account, no server, no build step.

Paste any text, have it translated into the language you are learning, then read it with
narration and tap the words you don't know.

## What it does

- **Add a text** in your own language (it is translated sentence by sentence into the language you
  are learning) or paste a text that is already in that language. `.txt` files can be opened too.
- **Read with colour-coded words**: blue = new, yellow = learning (fades in three steps), plain = known.
  Tap a word to see its meaning, hear it, edit the meaning and set how well you know it.
- **Narration**: sentence-by-sentence voiceover with highlighting, previous/next, loop a sentence,
  speed from 0.5× to 1.5×. Uses the voices installed on your device, so it works offline.
- **Translation view**: every sentence with its translation underneath.
- **Finish lesson**: every word you did not tap is counted as known — your known-word count is the
  main progress number.
- **Review**: spaced-repetition flashcards for the words you tapped, shown in their original sentence.
- **Progress**: known words, words read, minutes listened, daily goal and streak.
- **Words**: searchable vocabulary list, CSV export (for Anki etc.), full backup export/import.
- 33 languages, including Chinese, Japanese and Thai (words are segmented by the browser).

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
