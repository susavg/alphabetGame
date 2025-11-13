/**
 * Vercel Serverless Function: Generate Template
 * Creates downloadable template files for questions.json and preview.json
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { type = 'questions' } = req.query;

  // Template for questions.json (full version)
  const questionsTemplate = {
    A: [
      {
        word: "Apple",
        definition: "A red or green fruit that grows on trees?",
        answers: ["Apple", "Apples"],
        hints: [
          "It's a common fruit found in many grocery stores.",
          "Often associated with doctors and health.",
          "Has varieties like Granny Smith and Red Delicious.",
          "Five letters, starts with A."
        ]
      }
    ],
    B: [
      {
        word: "Book",
        definition: "What do you read that has pages and words?",
        answers: ["Book", "Books"],
        hints: [
          "Can be fiction or non-fiction.",
          "Found in libraries and bookstores.",
          "Made of paper with a cover.",
          "Four letters, starts with B."
        ]
      }
    ],
    C: [
      {
        word: "Cat",
        definition: "A small furry pet that says 'meow'?",
        answers: ["Cat", "Cats"],
        hints: [
          "A common household pet.",
          "Known for being independent.",
          "Has whiskers and a tail.",
          "Three letters, starts with C."
        ]
      }
    ],
    D: [
      {
        word: "Dog",
        definition: "A loyal pet that barks and wags its tail?",
        answers: ["Dog", "Dogs"],
        hints: [
          "Known as man's best friend.",
          "Comes in many breeds and sizes.",
          "Often walked on a leash.",
          "Three letters, starts with D."
        ]
      }
    ],
    E: [
      {
        word: "Elephant",
        definition: "A large gray animal with a long trunk?",
        answers: ["Elephant", "Elephants"]
      }
    ],
    F: [{ word: "Fish", definition: "An animal that lives in water and has fins?", answers: ["Fish"] }],
    G: [{ word: "Guitar", definition: "A musical instrument with strings?", answers: ["Guitar"] }],
    H: [{ word: "House", definition: "A building where people live?", answers: ["House", "Home"] }],
    I: [{ word: "Ice", definition: "Frozen water?", answers: ["Ice"] }],
    J: [{ word: "Jump", definition: "What do you do when you leap off the ground?", answers: ["Jump"] }],
    K: [{ word: "Key", definition: "What opens a lock?", answers: ["Key", "Keys"] }],
    L: [{ word: "Lion", definition: "The king of the jungle?", answers: ["Lion"] }],
    M: [{ word: "Moon", definition: "What shines in the sky at night?", answers: ["Moon"] }],
    N: [{ word: "Nose", definition: "The part of your face you use to smell?", answers: ["Nose"] }],
    O: [{ word: "Ocean", definition: "A large body of salt water?", answers: ["Ocean", "Sea"] }],
    P: [{ word: "Pizza", definition: "A round food with cheese and toppings?", answers: ["Pizza"] }],
    Q: [{ word: "Queen", definition: "A female ruler of a country?", answers: ["Queen"] }],
    R: [{ word: "Rain", definition: "Water that falls from clouds?", answers: ["Rain"] }],
    S: [{ word: "Sun", definition: "The bright star that gives us light?", answers: ["Sun"] }],
    T: [{ word: "Tree", definition: "A tall plant with branches and leaves?", answers: ["Tree"] }],
    U: [{ word: "Umbrella", definition: "What protects you from rain?", answers: ["Umbrella"] }],
    V: [{ word: "Violin", definition: "A musical instrument you play with a bow?", answers: ["Violin"] }],
    W: [{ word: "Water", definition: "A clear liquid that you drink?", answers: ["Water"] }],
    X: [{ word: "Xray", definition: "A medical picture that shows bones?", answers: ["Xray", "X-ray"] }],
    Y: [{ word: "Yellow", definition: "The color of the sun and bananas?", answers: ["Yellow"] }],
    Z: [{ word: "Zoo", definition: "A place where you can see wild animals?", answers: ["Zoo"] }]
  };

  // Simpler template for preview.json
  const previewTemplate = {
    A: [{ word: "Apple", definition: "A red or green fruit?", answers: ["Apple"] }],
    B: [{ word: "Book", definition: "Something you read?", answers: ["Book"] }],
    C: [{ word: "Cat", definition: "A furry pet that meows?", answers: ["Cat"] }],
    D: [{ word: "Dog", definition: "A pet that barks?", answers: ["Dog"] }],
    E: [{ word: "Egg", definition: "What chickens lay?", answers: ["Egg"] }],
    F: [{ word: "Fish", definition: "Lives in water?", answers: ["Fish"] }],
    G: [{ word: "Game", definition: "Something you play?", answers: ["Game"] }],
    H: [{ word: "Hat", definition: "You wear it on your head?", answers: ["Hat"] }],
    I: [{ word: "Ice", definition: "Frozen water?", answers: ["Ice"] }],
    J: [{ word: "Jump", definition: "Leap into the air?", answers: ["Jump"] }],
    K: [{ word: "Key", definition: "Opens a lock?", answers: ["Key"] }],
    L: [{ word: "Lion", definition: "King of the jungle?", answers: ["Lion"] }],
    M: [{ word: "Moon", definition: "Shines at night?", answers: ["Moon"] }],
    N: [{ word: "Nose", definition: "You smell with this?", answers: ["Nose"] }],
    O: [{ word: "Ocean", definition: "Large body of water?", answers: ["Ocean"] }],
    P: [{ word: "Pizza", definition: "Round food with cheese?", answers: ["Pizza"] }],
    Q: [{ word: "Queen", definition: "Female ruler?", answers: ["Queen"] }],
    R: [{ word: "Rain", definition: "Water from clouds?", answers: ["Rain"] }],
    S: [{ word: "Sun", definition: "Bright star in the sky?", answers: ["Sun"] }],
    T: [{ word: "Tree", definition: "Has branches and leaves?", answers: ["Tree"] }],
    U: [{ word: "Up", definition: "Opposite of down?", answers: ["Up"] }],
    V: [{ word: "Van", definition: "A type of vehicle?", answers: ["Van"] }],
    W: [{ word: "Water", definition: "You drink this?", answers: ["Water"] }],
    X: [{ word: "Box", definition: "(Contains X) Container for storage?", answers: ["Box"] }],
    Y: [{ word: "Yes", definition: "Opposite of no?", answers: ["Yes"] }],
    Z: [{ word: "Zoo", definition: "See wild animals here?", answers: ["Zoo"] }]
  };

  const template = type === 'preview' ? previewTemplate : questionsTemplate;

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${type}-template.json"`);

  return res.status(200).json(template);
}
