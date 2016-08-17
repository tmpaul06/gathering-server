const quotes = [
  "Are you not entertwained",
  "What is your problem ?",
  "Get a life mortal !!!",
  "What is dead may never die",
  "The secret of getting ahead is getting started",
  "Whenever you find yourself on the side of the majority, it is time to pause and reflect.",
  "I have never let my schooling interfere with my education.",
  "Don't go around saying the world owes you a living. The world owes you nothing. It was here first",
  "If you tell the truth, you don't have to remember anything.",
  "The man who does not read good books has no advantage over the man who cannot read them.",
  "Get your facts first, and then you can distort them as much as you please.",
  "Clothes make the man. Naked people have little or no influence on society.",
  "It is better to keep your mouth closed and let people think you are a fool than to open it and remove all doubt.",
  "Truth is stranger than fiction, but it is because Fiction is obliged to stick to possibilities; Truth isn't.",
  "Kindness is the language which the deaf can hear and the blind can see."
];

export function randomQuote() {
  let len = quotes.length;
  let randomInt = Math.floor(Math.random() * (len - 1));
  return quotes[randomInt];
};