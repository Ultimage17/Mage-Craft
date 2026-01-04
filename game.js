const STARTER_DECKS = {
  "Flame Heart": {
    "Flame Burst": 4,
    "Inferno Strike": 4,
    "Fireball": 4,
    "Ember Focus": 3,
    "Fire Field": 4,
    "Flame Relic": 3,
    "Cinder Drake": 2,
    "Phoenix Avatar": 1
    // (continue until 60 cards)
  },

  "Tidal Soul": {
    "Water Jet": 4,
    "Torrential Wave": 4,
    "Frostbind": 4,
    "Tide Focus": 3,
    "Water Field": 4,
    "Pearl Charm": 3,
    "Leviathan": 2,
    "Ocean Sovereign": 1
  },

  "Stone Body": {
    "Stone Crush": 4,
    "Earthen Slam": 4,
    "Granite Guard": 4,
    "Earth Focus": 3,
    "Earth Field": 4,
    "Obsidian Talisman": 3,
    "Golem Titan": 2,
    "World Colossus": 1
  },

  "Clouded Mind": {
    "Wind Slice": 4,
    "Gale Pierce": 4,
    "Sky Rend": 4,
    "Air Focus": 3,
    "Air Field": 4,
    "Zephyr Band": 3,
    "Storm Djinn": 2,
    "Tempest Incarnate": 1
  }
};

/**********************
 * GLOBAL STATE
 **********************/
let cardsDB = null;
let selectedCardIndex = null;

const game = {
  player: {
    deck: [],
    hand: []
  },
  ai: {
    deck: [],
    hand: []
  },
  chainCount: 0,

  startGame() {
    this.chainCount = 0;
    this.player.deck = buildDeck(playerDeck.value);
    this.ai.deck = buildDeck(aiDeck.value);

    shuffle(this.player.deck);
    shuffle(this.ai.deck);

    this.player.hand = drawCards(this.player.deck, 7);
    this.ai.hand = drawCards(this.ai.deck, 7);

    write("=== Mage Craft Match Started ===");
    write(`Player Deck: ${playerDeck.value}`);
    write(`AI Deck: ${aiDeck.value}`);
    write("Awaiting first spell...");
    updateStatus("Your turn – play the first spell");

    renderHand();
  },

  playPlayerCard(card) {
    this.chainCount++;
    removeFromHand(this.player.hand, card);

    return {
      message: `Chain length is now ${this.chainCount}`,
      chainEnded: false
    };
  },

  aiTurn() {
    if (this.ai.hand.length === 0) return;

    const card = this.ai.hand.shift();
    this.chainCount++;

    write(`AI plays ${card.name}`);
    write(`Chain length is now ${this.chainCount}`);
  }
};

/**********************
 * INITIAL LOAD
 **********************/
fetch("cards.json")
  .then(r => r.json())
  .then(db => {
    cardsDB = db;
    populateDecks();
    write("Cards loaded successfully.");
    write("Select decks and press Start Game.");
  });

/**********************
 * DECK SETUP
 **********************/
function populateDecks() {
  ["Flame Heart", "Tidal Soul", "Stone Body", "Clouded Mind"].forEach(d => {
    playerDeck.add(new Option(d, d));
    aiDeck.add(new Option(d, d));
  });
}

function buildDeck(deckName) {
  const deckDef = STARTER_DECKS[deckName];
  if (!deckDef) {
    console.error("No deck definition for", deckName);
    return [];
  }

  const allCards = [
    ...cardsDB.spells,
    ...cardsDB.items,
    ...cardsDB.fields,
    ...cardsDB.summons
  ];

  const deck = [];

  for (const [cardName, count] of Object.entries(deckDef)) {
    const card = allCards.find(c => c.name === cardName);
    if (!card) {
      console.error("Missing card in JSON:", cardName);
      continue;
    }

    for (let i = 0; i < count; i++) {
      deck.push({ ...card });
    }
  }

  console.log(`Built ${deckName} deck with ${deck.length} cards`);
  return deck;
}

/**********************
 * UI ACTIONS
 **********************/
startBtn.onclick = () => {
  clearLog();
  game.startGame();
  passBtn.disabled = false;
};

playCardBtn.onclick = () => {
  if (selectedCardIndex === null) return;

  const card = game.player.hand[selectedCardIndex];
  const result = game.playPlayerCard(card);

  write(`You played ${card.name}`);
  write(result.message);

  selectedCardIndex = null;
  selectedCard.textContent = "None";
  playCardBtn.disabled = true;

  game.aiTurn();
  renderHand();
};

passBtn.onclick = () => {
  write("You pass.");
  game.aiTurn();
  renderHand();
};

/**********************
 * RENDERING
 **********************/
function renderHand() {
  hand.innerHTML = "";

  game.player.hand.forEach((card, i) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type}, ${card.element})`;
    li.onclick = () => {
      selectedCardIndex = i;
      selectedCard.textContent = card.name;
      playCardBtn.disabled = false;
    };
    hand.appendChild(li);
  });
}

/**********************
 * HELPERS
 **********************/
function drawCards(deck, n) {
  return deck.splice(0, n);
}

function removeFromHand(hand, card) {
  const i = hand.indexOf(card);
  if (i >= 0) hand.splice(i, 1);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function write(msg) {
  log.textContent += msg + "\n";
}

function clearLog() {
  log.textContent = "";
}

function updateStatus(msg) {
  status.textContent = msg;
}