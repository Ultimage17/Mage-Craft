let cardsDB = null;

const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const handEl = document.getElementById("hand");
const playerDeckSelect = document.getElementById("playerDeck");
const aiDeckSelect = document.getElementById("aiDeck");

const startBtn = document.getElementById("startBtn");

// ---------- UTILITIES ----------
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
    log("Cards loaded.");

    // SAFE debug log
    const allCards = [];
    for (const key in cardsDB) {
      if (Array.isArray(cardsDB[key])) {
        allCards.push(...cardsDB[key]);
      }
    }

    console.log(
      "Loaded card names:",
      allCards.map(c => `"${c.name}"`)
    );
  })
  .catch(err => {
    console.error(err);
    log("ERROR loading cards.json");
  });

// ---------- DECK SELECT ----------
function populateDeckSelectors() {
  Object.keys(STARTER_DECKS).forEach(name => {
    playerDeckSelect.add(new Option(name, name));
    aiDeckSelect.add(new Option(name, name));
  });
}

// ---------- DECK BUILDER ----------
function buildDeck(deckName) {
  const deckList = STARTER_DECKS[deckName];
  if (!deckList) {
    throw new Error("Deck not found: " + deckName);
  }

  // Normalize all cards into a single array
let allCards = [];

if (Array.isArray(cardsDB)) {
  allCards = cardsDB;
} 
else if (cardsDB.cards && Array.isArray(cardsDB.cards)) {
  allCards = cardsDB.cards;
} 
else {
  for (const key in cardsDB) {
    if (Array.isArray(cardsDB[key])) {
      allCards.push(...cardsDB[key]);
    }
  }
}


  const deck = [];

  deckList.forEach(([cardName, count]) => {
    const card = allCards.find(c => c.name === cardName);

    if (!card) {
      console.error("Missing card:", cardName);
      throw new Error(`Card "${cardName}" not found in cards database`);
    }

    for (let i = 0; i < count; i++) {
      deck.push(JSON.parse(JSON.stringify(card))); // deep copy
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
  game.player.hand.forEach(card => {
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
  log("Starting game with deck: " + deckName);

  game.player.deck = buildDeck(deckName);
  shuffle(game.player.deck);

  game.player.hand = game.player.deck.splice(0, 7);

  log(`Deck built: ${game.player.deck.length + game.player.hand.length} cards`);
  log("You draw 7 cards.");

  statusEl.textContent = "Your turn – play a spell";
  renderHand();
};
