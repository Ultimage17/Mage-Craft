/*************************
 * Mage Craft – game.js
 * Stable Core Prototype
 *************************/

let cardsDB = null;

/* ======================
   DOM REFERENCES
====================== */
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const handEl = document.getElementById("hand");
const inPlayEl = document.getElementById("inPlay");

const playerDeckSelect = document.getElementById("playerDeck");
const aiDeckSelect = document.getElementById("aiDeck");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const playCardBtn = document.getElementById("playCardBtn");
const endTurnBtn = document.getElementById("endTurnBtn");

const cardDetailsEl = document.getElementById("cardDetails");
const tsvPreviewEl = document.getElementById("tsvPreview");

/* ======================
   UTILITIES
====================== */
function log(msg) {
  logEl.textContent += msg + "\n";
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* ======================
   LOAD CARDS
====================== */
fetch("cards.json")
  .then(res => res.json())
  .then(db => {
    cardsDB = db;
    populateDeckSelectors();
    log("Cards loaded successfully.");
  })
  .catch(err => {
    console.error(err);
    log("ERROR loading cards.json");
  });

/* ======================
   DECK SELECTION
====================== */
function populateDeckSelectors() {
  if (!window.STARTER_DECKS) {
    console.error("STARTER_DECKS not found");
    return;
  }

  playerDeckSelect.innerHTML = "";
  aiDeckSelect.innerHTML = "";

  Object.keys(STARTER_DECKS).forEach(name => {
    playerDeckSelect.add(new Option(name, name));
    aiDeckSelect.add(new Option(name, name));
  });
}

/* ======================
   CARD NORMALIZATION
====================== */
function getAllCardsArray() {
  let all = [];

  for (const key in cardsDB) {
    if (Array.isArray(cardsDB[key])) {
      const type = key.slice(0, -1); // Spells → Spell
      cardsDB[key].forEach(c => {
        all.push({ ...c, type });
      });
    }
  }
  return all;
}

/* ======================
   BUILD DECK
====================== */
function buildDeck(deckName) {
  const list = STARTER_DECKS[deckName];
  const allCards = getAllCardsArray();
  const deck = [];

  list.forEach(([name, count]) => {
    const card = allCards.find(c => c.name === name);
    if (!card) throw new Error(`Missing card: ${name}`);
    for (let i = 0; i < count; i++) {
      deck.push(JSON.parse(JSON.stringify(card)));
    }
  });

  shuffle(deck);
  return deck;
}

/* ======================
   GAME STATE
====================== */
const game = {
  round: 1,
  currentField: null,

  player: {
    deck: [],
    hand: [],
    vp: 0,
    summons: []
  }
};

let selectedCard = null;

const turnState = {
  spellPlayed: false,
  fieldPlayed: false,
  itemsPlayed: 0,
  cardsPlayed: []
};

/* ======================
   RESET GAME
====================== */
function resetGame() {
  game.round = 1;
  game.currentField = null;
  game.player.vp = 0;
  game.player.deck = [];
  game.player.hand = [];
  game.player.summons = [];

  selectedCard = null;
  Object.assign(turnState, {
    spellPlayed: false,
    fieldPlayed: false,
    itemsPlayed: 0,
    cardsPlayed: []
  });

  handEl.innerHTML = "";
  inPlayEl.innerHTML = "";
  logEl.textContent = "";
  cardDetailsEl.textContent = "Select a card to view details.";
  if (tsvPreviewEl) tsvPreviewEl.textContent = "0";

  playCardBtn.disabled = true;
  endTurnBtn.disabled = true;

  statusEl.textContent = "Waiting to start...";
}

/* ======================
   TSV CALCULATION
====================== */
function calculateTSV() {
  let spell = null;
  let tsv = 0;

  turnState.cardsPlayed.forEach(c => {
    if (c.type === "Spell") spell = c;
  });

  if (!spell) return 0;

  tsv += spell.basetsv || 0;

  const field = game.currentField;
  if (field) {
    const key = "affinity" + field.element.toLowerCase();
    tsv += spell[key] || 0;
  }

  turnState.cardsPlayed.forEach(c => {
    if (c.type === "Item") {
      if (c.modifier) tsv += c.modifier;
      if (c.element === spell.element) tsv += 1;
    }
  });

  return tsv;
}

function updateTSVPreview() {
  if (tsvPreviewEl) tsvPreviewEl.textContent = calculateTSV();
}

/* ======================
   RENDER HAND
====================== */
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

/* ======================
   RENDER IN PLAY
====================== */
function renderInPlay() {
  inPlayEl.innerHTML = "";

  turnState.cardsPlayed.forEach(card => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type})`;
    inPlayEl.appendChild(li);
  });
}

/* ======================
   CARD DETAILS
====================== */
function renderCardDetails(card) {
  let text = `Name: ${card.name}\n`;
  text += `Type: ${card.type}\n`;
  text += `Element: ${card.element}\n`;
  text += `Rarity: ${card.rarity || "—"}\n\n`;

  if (card.type === "Spell") {
    text += `Base TSV: ${card.basetsv}\n\nAffinities:\n`;
    text += `Fire: ${card.affinityfire}\n`;
    text += `Water: ${card.affinitywater}\n`;
    text += `Air: ${card.affinityair}\n`;
    text += `Earth: ${card.affinityearth}\n`;
  }

  if (card.type === "Item") {
    if (card.modifier) text += `Modifier: +${card.modifier}\n`;
    if (card.specialeffect) text += `Effect:\n${card.specialeffect}\n`;
  }

  if (card.type === "Field") {
    text += `Effect:\n${card.effect}\n\nDuration:\n${card.duration}`;
  }

  if (card.type === "Summon") {
    text += `Threshold: ${card.threshold}\n\nAura:\n${card.aura}\n\nBurst:\n${card.burstskill}`;
  }

  cardDetailsEl.textContent = text;
}

/* ======================
   PLAY CARD
====================== */
playCardBtn.onclick = () => {
  if (!selectedCard) return;

  if (selectedCard.type === "Spell" && turnState.spellPlayed) {
    log("Only one spell allowed.");
    return;
  }

  if (selectedCard.type === "Item" && turnState.itemsPlayed >= 2) {
    log("Maximum 2 items per turn.");
    return;
  }

  if (selectedCard.type === "Field" && turnState.fieldPlayed) {
    log("Only one field per turn.");
    return;
  }

  if (selectedCard.type === "Summon" && selectedCard.threshold > game.round) {
    log("Summon threshold not met.");
    return;
  }

  // Apply play effects
  if (selectedCard.type === "Spell") turnState.spellPlayed = true;
  if (selectedCard.type === "Item") turnState.itemsPlayed++;
  if (selectedCard.type === "Field") {
    turnState.fieldPlayed = true;
    game.currentField = selectedCard;
  }

  game.player.hand = game.player.hand.filter(c => c !== selectedCard);
  turnState.cardsPlayed.push(selectedCard);

  log(`Played ${selectedCard.name}`);

  selectedCard = null;
  playCardBtn.disabled = true;

  renderHand();
  renderInPlay();
  updateTSVPreview();
};

/* ======================
   END TURN
====================== */
endTurnBtn.onclick = () => {
  const finalTSV = calculateTSV();
  log(`Final TSV: ${finalTSV}`);

  // Draw back to 7
  while (game.player.hand.length < 7 && game.player.deck.length > 0) {
    game.player.hand.push(game.player.deck.shift());
  }

  game.round++;
  Object.assign(turnState, {
    spellPlayed: false,
    fieldPlayed: false,
    itemsPlayed: 0,
    cardsPlayed: []
  });

  inPlayEl.innerHTML = "";
  endTurnBtn.disabled = true;
  renderHand();
};

/* ======================
   START GAME
====================== */
startBtn.onclick = () => {
  resetGame();

  const deckName = playerDeckSelect.value;
  game.player.deck = buildDeck(deckName);
  game.player.hand = game.player.deck.splice(0, 7);

  statusEl.textContent = "Your turn";
  log("Game started.");
  renderHand();
};

resetBtn.onclick = resetGame;