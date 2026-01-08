/*************************
 * Mage Craft – game.js
 *************************/

let cardsDB = null;

/* =======================
   DOM REFERENCES
======================= */
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const handEl = document.getElementById("hand");
const inPlayEl = document.getElementById("inPlay");
const cardDetailsEl = document.getElementById("cardDetails");

const playerDeckSelect = document.getElementById("playerDeck");
const aiDeckSelect = document.getElementById("aiDeck");

const startBtn = document.getElementById("startBtn");
const playCardBtn = document.getElementById("playCardBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const resetBtn = document.getElementById("resetBtn");

/* =======================
   UTILITIES
======================= */
function log(msg) {
  logEl.textContent += msg + "\n";
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* =======================
   LOAD CARDS
======================= */
fetch("cards.json")
  .then(res => res.json())
  .then(db => {
    cardsDB = db;
    populateDeckSelectors();
    log("Cards loaded.");
  })
  .catch(err => {
    console.error(err);
    log("ERROR loading cards.json");
  });

/* =======================
   DECK SELECTORS
======================= */
function populateDeckSelectors() {
  playerDeckSelect.innerHTML = "";
  aiDeckSelect.innerHTML = "";

  Object.keys(STARTER_DECKS).forEach(deckName => {
    playerDeckSelect.add(new Option(deckName, deckName));
    aiDeckSelect.add(new Option(deckName, deckName));
  });
}

/* =======================
   CARD NORMALIZATION
======================= */
function getAllCardsArray() {
  const all = [];

  for (const key in cardsDB) {
    if (!Array.isArray(cardsDB[key])) continue;

    const type = key.slice(0, -1); // Spells → Spell
    cardsDB[key].forEach(card => {
      all.push({ ...card, type });
    });
  }

  return all;
}

/* =======================
   DECK BUILDER
======================= */
function buildDeck(deckName) {
  const deckDef = STARTER_DECKS[deckName];
  if (!deckDef) throw new Error("Deck not found: " + deckName);

  const allCards = getAllCardsArray();
  const deck = [];

  deckDef.forEach(([name, count]) => {
    const card = allCards.find(c => c.name === name);
    if (!card) throw new Error(`Card not found: ${name}`);

    for (let i = 0; i < count; i++) {
      deck.push(JSON.parse(JSON.stringify(card)));
    }
  });

  shuffle(deck);
  return deck;
}

/* =======================
   GAME STATE
======================= */
const game = {
  player: {
    deck: [],
    hand: []
  },
  threshold: 0
};

let selectedCard = null;

const turnState = {
  spellPlayed: false,
  fieldPlayed: false,
  itemsPlayed: 0,
  cardsPlayed: []
};

/* =======================
   RESET
======================= */
function resetGame() {
  game.player.deck = [];
  game.player.hand = [];
  game.threshold = 0;

  selectedCard = null;

  turnState.spellPlayed = false;
  turnState.fieldPlayed = false;
  turnState.itemsPlayed = 0;
  turnState.cardsPlayed = [];

  handEl.innerHTML = "";
  inPlayEl.innerHTML = "";
  cardDetailsEl.textContent = "Select a card to view details.";
  logEl.textContent = "";

  playCardBtn.disabled = true;
  endTurnBtn.disabled = true;

  statusEl.textContent = "Waiting to start...";
}

/* =======================
   TSV CALCULATION
======================= */
function calculateTSVPreview() {
  let tsv = 0;
  let spell = null;
  let field = null;

  turnState.cardsPlayed.forEach(c => {
    if (c.type === "Spell") spell = c;
    if (c.type === "Field") field = c;
  });

  if (!spell) return 0;

  tsv += spell.basetsv || 0;

  if (field) {
    const key = "affinity" + field.element.toLowerCase();
    tsv += spell[key] || 0;
  }

  turnState.cardsPlayed.forEach(card => {
    if (card.type === "Item") {
      if (card.modifier) tsv += card.modifier;
      if (card.element === spell.element) tsv += 1;
      if (field && card.element === field.element) tsv += 1;
    }
  });

  return tsv;
}

/* =======================
   RENDER HAND
======================= */
function renderHand() {
  handEl.innerHTML = "";

  game.player.hand.forEach(card => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type} – ${card.element})`;
    li.style.cursor = "pointer";

    li.onclick = () => {
      selectedCard = card;
      playCardBtn.disabled = false;
      renderCardDetails(card);
    };

    handEl.appendChild(li);
  });
}

/* =======================
   RENDER IN-PLAY
======================= */
function renderInPlay() {
  inPlayEl.innerHTML = "";

  turnState.cardsPlayed.forEach((card, index) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type})`;
    li.style.cursor = "pointer";

    li.onclick = () => {
      turnState.cardsPlayed.splice(index, 1);
      game.player.hand.push(card);

      if (card.type === "Spell") turnState.spellPlayed = false;
      if (card.type === "Field") turnState.fieldPlayed = false;
      if (card.type === "Item") turnState.itemsPlayed--;

      renderHand();
      renderInPlay();
    };

    inPlayEl.appendChild(li);
  });
}

/* =======================
   CARD DETAILS
======================= */
function renderCardDetails(card) {
  let text = `Name: ${card.name}\n`;
  text += `Type: ${card.type}\n`;
  text += `Element: ${card.element}\n`;
  text += `Rarity: ${card.rarity || "—"}\n\n`;

  if (card.type === "Spell") {
    text += `Base TSV: ${card.basetsv || 0}\n\nAffinities:\n`;
    text += `Fire: ${card.affinityfire || 0}\n`;
    text += `Water: ${card.affinitywater || 0}\n`;
    text += `Air: ${card.affinityair || 0}\n`;
    text += `Earth: ${card.affinityearth || 0}\n`;
  }

  if (card.type === "Item") {
    if (card.modifier) text += `Modifier: +${card.modifier}\n`;
    if (card.specialeffect) text += `Effect:\n${card.specialeffect}\n`;
  }

  if (card.type === "Field") {
    text += `Effect:\n${card.effect}\n\nDuration:\n${card.duration}\n`;
  }

  if (card.type === "Summon") {
    text += `Threshold: ${card.threshold}\n\nAura:\n${card.aura}\n\nBurst:\n${card.burstskill}`;
  }

  cardDetailsEl.textContent = text;
}

/* =======================
   PLAY CARD
======================= */
playCardBtn.onclick = () => {
  if (!selectedCard) return;

  if (selectedCard.type === "Spell" && turnState.spellPlayed) {
    log("Only one spell per turn.");
    return;
  }

  if (selectedCard.type === "Field" && turnState.fieldPlayed) {
    log("Only one field per turn.");
    return;
  }

  if (selectedCard.type === "Item" && turnState.itemsPlayed >= 2) {
    log("Only two items per turn.");
    return;
  }

  if (selectedCard.type === "Summon" &&
      game.threshold < selectedCard.threshold) {
    log("Summon threshold not met.");
    return;
  }

  if (selectedCard.type === "Spell") turnState.spellPlayed = true;
  if (selectedCard.type === "Field") turnState.fieldPlayed = true;
  if (selectedCard.type === "Item") turnState.itemsPlayed++;

  game.player.hand = game.player.hand.filter(c => c !== selectedCard);
  turnState.cardsPlayed.push(selectedCard);

  selectedCard = null;
  playCardBtn.disabled = true;

  renderHand();
  renderInPlay();
};

/* =======================
   END TURN
======================= */
endTurnBtn.onclick = () => {
  const tsv = calculateTSVPreview();
  log(`Final TSV: ${tsv}`);

  game.threshold++;

  turnState.cardsPlayed = [];
  turnState.spellPlayed = false;
  turnState.fieldPlayed = false;
  turnState.itemsPlayed = 0;

  inPlayEl.innerHTML = "";
  playCardBtn.disabled = true;
};

/* =======================
   START GAME
======================= */
startBtn.onclick = () => {
  resetGame();

  const deckName = playerDeckSelect.value;
  game.player.deck = buildDeck(deckName);
  game.player.hand = game.player.deck.splice(0, 7);

  statusEl.textContent = "Your turn";
  renderHand();
};

resetBtn.onclick = resetGame;