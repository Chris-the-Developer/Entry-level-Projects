# Storyglot

A language-learning reader for Android tablets (and any browser) — no account needed, your data stays with you.

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

### AI, with your own key

Add a DeepSeek API key in Settings to switch these on (the key is stored only on the device, is
sent only to DeepSeek, and is left out of backups):

- **Stories**: a story written for you in the language you are learning — pick a topic, a level
  (A1–C2) and a length. It can weave in words from your flashcards so you meet them again.
- **Tutor**: a conversation partner with role-plays (café, directions, shopping, interview) or a
  chat about your last text. Replies are tappable like any lesson, can be read aloud, and your
  mistakes are corrected after each message. Where the browser supports it you can dictate.
- **Explain**: in the word panel, a short explanation of the word in its sentence.
- **Translation**: with a key set, translation uses DeepSeek instead of the limited free service.

**AI relay.** If the tablet's browser reports that it cannot reach the AI service even though the
key is right, DeepSeek may be refusing direct browser requests. Put any OpenAI-compatible relay in
front of it (for example a small Azure Function that forwards `/chat/completions`) and enter its
address under Settings → AI → Service address.

### YouTube videos

Choose *My text is already in …*, paste the video link and paste the video's transcript (on
youtube.com: open the description → *Show transcript* → select and copy; `.srt`/`.vtt` subtitle
files work too). The video plays above the text, the current line is highlighted as it plays, and
tapping ▶ on a line jumps the video there. The app cannot download a transcript by itself: YouTube
does not allow that from a web page. The embedded video needs the app to be opened from a web
address (options 1 or 2 below), not as a bare file.

### Voices

No extra app is needed: narration uses the tablet's own text-to-speech voices and works offline.
For more natural voices, switch *Voice source* to **Azure neural voices** in Settings and enter the
key and region of an Azure *Speech* resource (the free F0 tier covers about 500,000 characters a
month). With Azure the sentence is highlighted but not the individual word.

Not included: automatic podcast transcription.

## Android app (recommended for a tablet)

Storyglot is packaged as a real Android app. Everything runs on the tablet: there is no server.

**Install**

1. On the tablet, open the repository's **Releases** page and download `Storyglot.apk` from
   “Storyglot for Android”:
   `https://github.com/Chris-the-Developer/Entry-level-Projects/releases/tag/storyglot-apk`
   (if the repository is private, sign in to GitHub in the browser first).
2. Open the downloaded file. Android asks once to allow the browser or *My Files* to install apps:
   allow it, then choose *Install*. If Play Protect asks, choose *Install anyway* — the app is
   not from the Play Store, so Google does not know it.
3. Open **Storyglot**, pick your languages, then in *Settings* enter your DeepSeek key and, if you
   want Azure voices, your Azure Speech key and region.

To update, download the newer `Storyglot.apk` and install it over the old one. Progress is kept.
Every push that changes `storyglot/` builds a new APK (see *Actions → Storyglot Android app*).

**What the app does differently from the web version**

- **Voice** comes from the tablet's own text-to-speech engine (on Samsung: *Settings → General
  management → Text-to-speech*). *Settings → Voice → Install voice data* opens the engine's
  language downloads. Azure neural voices work too, with your key.
- **AI, translation, Azure and YouTube** requests are made by Android itself, so the browser
  restrictions that can block these on a web page do not apply.
- **YouTube**: paste only the video link and leave the text empty; the app asks YouTube for the
  captions from the tablet. If YouTube refuses, paste the transcript as before.
- **Progress** is stored inside the app. Each day you use it, a backup is also written to
  `Documents/Storyglot` on the tablet (newest five kept). *Settings → Import backup* restores one,
  also after reinstalling. API keys are never written to backups, so re-enter them after a restore.
- The **back** button or gesture goes back inside the app.
- Dictation in the tutor (the microphone button) is not available in the app.

Requires Android 7 or newer.

**Building it yourself** (optional): Node 22, JDK 21 and the Android SDK, then
`npm ci && npx cap sync android && cd android && ./gradlew assembleRelease`. The web app lives in
`www/`; `android/` is the Capacitor project. The APK is signed with `android/storyglot.keystore`,
a key kept in this repository so that every build can update the previous one. That is fine for a
personal app you install yourself; do not use that key for anything published to a store.

## Alternative: run it on Azure



`server.js` turns Storyglot into a hosted app: it serves the app, keeps your DeepSeek and Azure
Speech keys on the server (the tablet never sees them, and there are no browser connection
problems), saves your progress on the server with a backup for each of the last 7 days, and tries to
fetch YouTube transcripts for you. It has no dependencies and needs Node 18 or newer.

1. **Create the web app.** Azure portal → *Create a resource* → *Web App*. Publish: *Code*,
   runtime stack: *Node 22 LTS* (or 20), operating system: *Linux*, plan: *Free F1* is enough to
   start (it sleeps when unused, so the first page load can take a while; *Basic B1* avoids that).
2. **Add the settings.** In the web app: *Settings → Environment variables → App settings*, add
   and apply:

   | Name | Value |
   | --- | --- |
   | `APP_PASSWORD` | a password of your choice — the tablet asks for it once |
   | `DEEPSEEK_API_KEY` | your DeepSeek key |
   | `AZURE_SPEECH_KEY` | key of an Azure *Speech* resource (optional, for neural voices) |
   | `AZURE_SPEECH_REGION` | that resource's region, e.g. `westeurope` |

   Without `APP_PASSWORD` the hosted app stays locked, so nobody else can spend your keys.
3. **Deploy the code.** In the web app: *Deployment → Deployment Center*, source *GitHub*, sign in,
   pick this repository and the branch that contains `storyglot/`, and save. Azure adds a workflow
   to the repository and deploys on every push. The `package.json` in the repository root tells
   Azure to start `storyglot/server.js`.
4. **Install it on the tablet.** Open `https://<your-app-name>.azurewebsites.net` in Chrome, enter
   the password, then ⋮ → *Add to Home screen* / *Install app*. It now opens like any other app,
   also without a connection (changes made offline are uploaded later).

Progress is stored in `/home/storyglot-data` on the web app, which survives restarts and
redeployments. Sign in from another device with the same password and it picks up the same
progress; if two devices changed things while apart, the most recent one wins.

YouTube: with the server, paste only the video link and leave the text empty. YouTube frequently
refuses requests from cloud servers; when it does, the app says so and you paste the transcript.

To try the server on a computer instead: `node storyglot/server.js`, then open
`http://<computer-ip>:8080` on the tablet (set the same variables in the shell first if you want
AI and Azure voices).

## Other ways to put it on your tablet

Without the server the app still works, with keys entered in Settings and progress kept only in
the tablet's browser:

1. **GitHub Pages.** *Settings → Pages → Deploy from a branch*, choose the branch that contains
   this folder and `/ (root)`, then open
   `https://<your-user>.github.io/Entry-level-Projects/storyglot/www/` and *Add to Home screen*.
2. **Just the file.** Copy `www/index.html` to the tablet and open it with Chrome. Depending on the
   browser, progress may not be saved in this mode — the app warns you if so.

## What needs internet

Translation, the AI features, Azure voices and YouTube video. Reading, narration with the
tablet's voices, word tracking, flashcards and statistics are local.
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
