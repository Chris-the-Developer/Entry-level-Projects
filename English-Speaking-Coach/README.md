# English Speaking Coach

Project 2: a web app that helps you practice English pronunciation and punctuation. It runs in your browser, with nothing to install.

## What it does

**Speak**: pronunciation practice
- Pick a sound that learners often find hard: TH, R and L, V and W, ship or sheep, -ed endings, final S, or everyday phrases. There are 42 practice sentences.
- Press **Listen** (or **Slowly**) to hear the sentence. Tap any word to hear it on its own.
- Press **Record** and read the sentence. The coach shows what it heard, word by word:
  - green underline: the word was clear
  - amber, with the word it heard above: it sounded like a different word (for example “think” heard as “sink”)
  - red dashes: the word wasn't heard
- For each problem word it explains the likely sound mistake and how to say the sound (tongue, lips and teeth).
- Type your own sentence to practice anything you like.

**Write**: punctuation and grammar check
- Type, paste or **Dictate** some English, then press **Check my writing**.
- Every mistake is marked in your text, explained in simple English, and can be fixed with one click (or **Fix all**).
- It catches capital letters, missing apostrophes (dont → don't), its/it's, your/you're, there/their, a/an, missing question marks, commas after words like “However”, spacing around punctuation, repeated words and more.
- Optional deeper check: [LanguageTool](https://languagetool.org), a free grammar checker. It needs an internet connection and sends your text to languagetool.org. You can turn it off.
- **Read aloud** lets you hear how your punctuation changes the way a sentence sounds.
- A punctuation guide explains each mark and how it sounds when you speak.

**Progress**
- Your scores, and a list of words you often miss. Say a word clearly twice in a row and it leaves the list.

## How to run it

1. Open the `English-Speaking-Coach` folder.
2. Double-click `index.html` to open it in **Chrome**, **Edge** or **Safari**.
3. Allow microphone access when the browser asks.

If the microphone doesn't work from the file, run a small local web server from inside the folder:

```bash
cd English-Speaking-Coach
python3 -m http.server 8000
```

Then open http://localhost:8000 in Chrome, Edge or Safari.

### On your phone

Phones need the app on a secure (https) web address. GitHub Pages can host it for free:

1. On GitHub, open the repository's **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**, pick your main branch and the `/ (root)` folder, then press **Save**.
3. After a minute or two, open `https://<your-username>.github.io/Entry-level-Projects/English-Speaking-Coach/` on your phone.

### Browser support

| Feature | Chrome / Edge | Safari | Firefox |
| --- | --- | --- | --- |
| Record and Dictate | Yes | Yes | No |
| Listen and Read aloud | Yes | Yes | Yes |
| Write checker | Yes | Yes | Yes |

## Good to know

- Speech recognition is done by your browser. Chrome and Edge send your voice to Google to turn it into text, and Safari uses Apple's service.
- The coach checks whether a listener understood each word. It can't grade your accent, word stress or intonation.
- Your progress and your draft text are saved in your browser only.

## How the code is organized

| File | What it does |
| --- | --- |
| `index.html` | The page layout: the Speak, Write and Progress tabs |
| `style.css` | Colors, fonts and layout, with light and dark themes |
| `sentences.js` | The practice sentences and the tips for each sound |
| `compare.js` | Lines up the words you said with the sentence and guesses which sound went wrong |
| `checker.js` | The offline punctuation and grammar rules |
| `app.js` | Connects everything: speech, buttons, saving progress |
| `tests/` | Automated tests for `compare.js` and `checker.js` |

The app uses two tools that are built into modern browsers:
- **Speech recognition** (`SpeechRecognition`) turns your voice into text.
- **Speech synthesis** (`speechSynthesis`) reads text aloud.

## Running the tests

You need [Node.js](https://nodejs.org) 18 or newer. From inside the `English-Speaking-Coach` folder:

```bash
node --test
```

## Ideas for next steps

- Add more sounds and sentences to `sentences.js` (for example /æ/ in “cat” vs /ʌ/ in “cut”).
- Add a daily goal or streak to the Progress tab.
- Add a new rule to `checker.js`, with a test for it in `tests/checker.test.js`.
