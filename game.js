/*************************************************
 * Mage Craft – Digital Playtest (Stable Build)
 *************************************************/

let cardsDB = null;

// ---------- DOM ----------
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const handEl = document.getElementById("hand");
const playerDeckSelect = document.getElementById("playerDeck");
const aiDeckSelect = document.getElementById("aiDeck");
const startBtn = document.getElementById("startBtn");

// ---------- UTIL ----------
function log(msg) {
  logEl.textContent += msg + "\n";
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ---------- LOAD CARDS ----------
fetch("cards.json")
  .then(res => res.json())
  .then(db => {
    cardsDB = db;
    populateDeckSelectors();
    log("Cards loaded successfully.");
  })
  .catch(err => {
    console.error(err);
    log("ERROR: Failed to load cards.json");
  });

// ---------- DECK SELECT ----------
function populateDeckSelectors() {
  playerDeckSelect.innerHTML = "";
  aiDeckSelect.innerHTML = "";

  Object.keys(STARTER_DECKS).forEach(deckName => {
    playerDeckSelect.add(new Option(deckName, deckName));
    aiDeckSelect.add(new Option(deckName, deckName));
  });
}

// ---------- CARD NORMALIZATION ----------
function getAllCards() {
  const all = [];

  if (!cardsDB) return all;

  for (const key in cardsDB) {
    if (Array.isArray(cardsDB[key])) {
      all.push(...cardsDB[key]);
    }
  }

  return all;
}

// ---------- DECK BUILDER ----------
function buildDeck(deckName) {
  const deckDef = STARTER_DECKS[deckName];
  if (!deckDef) {
    throw new Error("Deck not found: " + deckName);
  }

  const allCards = getAllCards();
  const deck = [];

  deckDef.forEach(([cardName, count]) => {
    const card = allCards.find(c => c.name.trim() === cardName.trim());

    if (!card) {
      console.error("Available cards:", allCards.map(c => c.name));
      throw new Error(`Card "${cardName}" not found in cards database`);
    }

    for (let i = 0; i < count; i++) {
      deck.push(JSON.parse(JSON.stringify(card)));
    }
  });

  shuffle(deck);
  return deck;
}

// ---------- GAME STATE ----------
const game = {
  player: {
    deck: [],
    hand: []
  }
};

// ---------- RENDER ----------
function renderHand() {
  handEl.innerHTML = "";

  game.player.hand.forEach((card, index) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type} – ${card.element})`;
    handEl.appendChild(li);
  });
}

// ---------- START GAME ----------
startBtn.onclick = () => {
  logEl.textContent = "";
  handEl.innerHTML = "";

  if (!cardsDB) {
    log("Cards not loaded yet.");
    return;
  }

  const deckName = playerDeckSelect.value;
  if (!deckName) {
    log("Please select a deck.");
    return;
  }

  log("Starting game with deck: " + deckName);

  game.player.deck = buildDeck(deckName);
  game.player.hand = game.player.deck.splice(0, 7);

  log(`Deck built: ${game.player.deck.length + game.player.hand.length} cards`);
  log("You draw 7 cards.");

  statusEl.textContent = "Your turn – play the first spell";
  renderHand();
};