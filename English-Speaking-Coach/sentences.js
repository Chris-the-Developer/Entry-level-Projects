// The practice library: sounds that English learners often find hard,
// with a tip for each one and sentences full of that sound.

const SOUNDS = {
  th: {
    name: "TH",
    ipa: "/θ/ /ð/",
    short: "For TH, put the tip of your tongue between your teeth and push air out.",
    tip: "Put the tip of your tongue lightly between your top and bottom teeth, then push air out. In “think” and “three” there is no voice. In “this” and “mother” your throat buzzes.",
    mistake: "Saying t, d, s, z or f instead, so “think” sounds like “sink” or “tink”.",
    pattern: /th/,
  },
  rl: {
    name: "R and L",
    ipa: "/r/ /l/",
    short: "For L, touch the ridge behind your top teeth. For R, your tongue touches nothing.",
    tip: "For L, press the tip of your tongue on the ridge just behind your top teeth. For R, pull your tongue back so it touches nothing, and round your lips a little.",
    mistake: "Mixing the two, so “right” sounds like “light”.",
    pattern: /[rl]/,
  },
  vw: {
    name: "V and W",
    ipa: "/v/ /w/",
    short: "For V, your top teeth touch your bottom lip. For W, round your lips.",
    tip: "For V, rest your top teeth on your bottom lip and make a buzz. For W, make your lips into a small circle, then open them. Your teeth don't touch your lip.",
    mistake: "Saying W or B for V, so “very” sounds like “wery” or “berry”.",
    pattern: /[vw]/,
  },
  ship: {
    name: "Ship or sheep",
    ipa: "/ɪ/ /iː/",
    short: "Short /ɪ/ is quick and relaxed. Long /iː/ is longer, with a small smile.",
    tip: "The short sound in “ship”, “sit” and “live” is quick, with relaxed lips. The long sound in “sheep”, “seat” and “leave” is longer, and your lips spread in a small smile.",
    mistake: "Making both sounds the same length, so “ship” sounds like “sheep”.",
    pattern: /ee|ea|ie|i/,
  },
  ed: {
    name: "-ed endings",
    ipa: "/t/ /d/ /ɪd/",
    short: "Say the -ed ending clearly. Don't drop it.",
    tip: "After t or d, -ed adds a syllable: want-ed, need-ed. After p, k, s, sh, ch and f it sounds like t, so “walked” is “walkt”. After other sounds it sounds like d, so “played” is “playd”.",
    mistake: "Dropping the ending, so “walked” sounds like “walk”, or adding a syllable that isn't there: “walk-ed”.",
    pattern: /ed$/,
  },
  s: {
    name: "Final S",
    ipa: "/s/ /z/ /ɪz/",
    short: "Say the final s clearly. It changes the meaning.",
    tip: "The final s tells the listener “more than one” (books) or “he or she does it” (speaks). After s, sh, ch, x and z sounds it adds a syllable: bus-es, watch-es.",
    mistake: "Dropping the last sound, so “she speaks” sounds like “she speak”.",
    pattern: /s$/,
  },
  everyday: {
    name: "Everyday phrases",
    ipa: "",
    short: "Join the words together, like in a real conversation.",
    tip: "Say the whole phrase smoothly, the way you would in a real conversation. Don't stop between words. Questions with a yes or no answer usually go up at the end.",
    mistake: "Saying every word separately, which sounds slow and robotic.",
    pattern: null,
  },
};

const SENTENCES = [
  { sound: "th", text: "I think this is the third Thursday of the month." },
  { sound: "th", text: "Thank you for the three thick books." },
  { sound: "th", text: "My mother and father are both at the theater." },
  { sound: "th", text: "They thought the weather was better than this." },
  { sound: "th", text: "There are thirty things on the other table." },
  { sound: "th", text: "The athlete breathes through her mouth." },

  { sound: "rl", text: "Laura really likes red roses." },
  { sound: "rl", text: "The little rabbit ran along the road." },
  { sound: "rl", text: "Please collect the correct letters." },
  { sound: "rl", text: "Turn right at the traffic light." },
  { sound: "rl", text: "Larry likes to read in the library." },
  { sound: "rl", text: "The glass was full of fresh lemonade." },

  { sound: "vw", text: "We visited a very windy village." },
  { sound: "vw", text: "Victor wants to win the video game." },
  { sound: "vw", text: "I will vote for Vanessa." },
  { sound: "vw", text: "The waves were very wild in winter." },
  { sound: "vw", text: "Would you like a vanilla waffle?" },
  { sound: "vw", text: "Every week we watch a movie." },

  { sound: "ship", text: "The sheep is on the ship." },
  { sound: "ship", text: "Please sit in this seat." },
  { sound: "ship", text: "I live here, but I leave at six." },
  { sound: "ship", text: "Tim eats cheese and fish for dinner." },
  { sound: "ship", text: "This peach is a bit too sweet." },
  { sound: "ship", text: "Give me a piece of pizza, please." },

  { sound: "ed", text: "I walked to the park and played football." },
  { sound: "ed", text: "She wanted a coffee, so she waited in line." },
  { sound: "ed", text: "We laughed and talked all evening." },
  { sound: "ed", text: "They cleaned the room and opened the windows." },
  { sound: "ed", text: "He needed help, so I helped him." },
  { sound: "ed", text: "The shop closed early, so we stayed at home." },

  { sound: "s", text: "She speaks three languages." },
  { sound: "s", text: "My friend's dogs love long walks." },
  { sound: "s", text: "He watches the news and reads books." },
  { sound: "s", text: "The buses stop outside the shops." },
  { sound: "s", text: "My sister likes cats and birds." },
  { sound: "s", text: "The kids play games after classes." },

  { sound: "everyday", text: "Could you repeat that, please?" },
  { sound: "everyday", text: "Nice to meet you. Where are you from?" },
  { sound: "everyday", text: "I'd like a cup of coffee, please." },
  { sound: "everyday", text: "How long does it take to get there?" },
  { sound: "everyday", text: "Sorry, I didn't catch your name." },
  { sound: "everyday", text: "What do you do for a living?" },
];

if (typeof module !== "undefined") module.exports = { SOUNDS, SENTENCES };
