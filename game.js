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
const playerDeckSelect = document.getElementById("playerDeck");
const aiDeckSelect = document.getElementById("aiDeck");
const startBtn = document.getElementById("startBtn");
const playCardBtn = document.getElementById("playCardBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const resetBtn = document.getElementById("resetBtn");
const cardDetailsEl = document.getElementById("cardDetails");
const tsvPreviewEl = document.getElementById("tsvPreview");

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
    log("Cards loaded successfully.");
  });

function populateDeckSelectors() {
  playerDeckSelect.innerHTML = "";
  aiDeckSelect.innerHTML = "";

  Object.keys(STARTER_DECKS).forEach(name => {
    playerDeckSelect.add(new Option(name, name));
    aiDeckSelect.add(new Option(name, name));
  });
}

/* =======================
   DECK BUILDER
======================= */
function getAllCardsArray() {
  let all = [];
  for (const key in cardsDB) {
    if (Array.isArray(cardsDB[key])) {
      const type = key.slice(0, -1);
      cardsDB[key].forEach(card => {
        all.push({ ...card, type });
      });
    }
  }
  return all;
}

function buildDeck(deckName) {
  const deckList = STARTER_DECKS[deckName];
  const allCards = getAllCardsArray();
  const deck = [];

  deckList.forEach(([name, count]) => {
    const card = allCards.find(c => c.name === name);
    if (!card) throw new Error(`Missing card: ${name}`);
    for (let i = 0; i < count; i++) {
      deck.push(JSON.parse(JSON.stringify(card)));
    }
  });

  shuffle(deck);
  return deck;
}

/* =======================
   GAME STATE (PERSISTENT)
======================= */
const game = {
  player: {
    deck: [],
    hand: []
  },
  currentTSV: 0,
  threshold: 0,
  activeField: null
};

let selectedCard = null;

const turnState = {
  spellPlayed: false,
  itemsPlayed: 0,
  fieldPlayed: false,
  cardsPlayed: []
};

/* =======================
   RESET
======================= */
function resetGame() {
  game.player.deck = [];
  game.player.hand = [];
  game.currentTSV = 0;
  game.threshold = 0;
  game.activeField = null;

  selectedCard = null;
  turnState.spellPlayed = false;
  turnState.itemsPlayed = 0;
  turnState.fieldPlayed = false;
  turnState.cardsPlayed = [];

  handEl.innerHTML = "";
  inPlayEl.innerHTML = "";
  logEl.textContent = "";
  cardDetailsEl.textContent = "Select a card to view details.";
  tsvPreviewEl.textContent = "0";
  statusEl.textContent = "Waiting to start...";

  playCardBtn.disabled = true;
  endTurnBtn.disabled = true;

  log("Game reset.");
}

/* =======================
   TSV CALCULATION
======================= */
function calculateTSVPreview() {
  let tsv = game.currentTSV;
  let spell = null;

  turnState.cardsPlayed.forEach(c => {
    if (c.type === "Spell") spell = c;
  });

  if (!spell) return tsv;

  tsv += spell.basetsv || 0;

  const field = turnState.cardsPlayed.find(c => c.type === "Field") || game.activeField;
  if (field) {
    const key = "affinity" + field.element.toLowerCase();
    tsv += spell[key] || 0;
  }

  turnState.cardsPlayed.forEach(c => {
    if (c.type === "Item") {
      if (c.modifier) tsv += c.modifier;
      if (c.element === spell.element) tsv += 1;
      if (field && c.element === field.element) tsv += 1;
    }
  });

  return tsv;
}

function updateTSVPreview() {
  tsvPreviewEl.textContent = calculateTSVPreview();
}

/* =======================
   RENDERING
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

function renderInPlay() {
  inPlayEl.innerHTML = "";
  turnState.cardsPlayed.forEach((card, i) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type})`;
    li.onclick = () => undoCard(i);
    li.style.cursor = "pointer";
    inPlayEl.appendChild(li);
  });
}

/* =======================
   CARD DETAILS
======================= */
function renderCardDetails(card) {
  let t = `Name: ${card.name}\nType: ${card.type}\nElement: ${card.element}\nRarity: ${card.rarity}\n\n`;

  if (card.type === "Spell") {
    t += `Base TSV: ${card.basetsv}\n\nAffinities:\n`;
    t += `Fire: ${card.affinityfire}\nWater: ${card.affinitywater}\nAir: ${card.affinityair}\nEarth: ${card.affinityearth}`;
  }

  if (card.type === "Item") {
    if (card.modifier) t += `Modifier: +${card.modifier}\n`;
    if (card.specialeffect) t += `Effect:\n${card.specialeffect}`;
  }

  if (card.type === "Field") {
    t += `Effect:\n${card.effect}\n\nDuration:\n${card.duration}`;
  }

  if (card.type === "Summon") {
    t += `Threshold: ${card.threshold}\n\nAura:\n${card.aura}\n\nBurst:\n${card.burstskill}`;
  }

  cardDetailsEl.textContent = t;
}

/* =======================
   PLAY / UNDO CARD
======================= */
function undoCard(index) {
  const card = turnState.cardsPlayed.splice(index, 1)[0];
  game.player.hand.push(card);

  if (card.type === "Spell") turnState.spellPlayed = false;
  if (card.type === "Item") turnState.itemsPlayed--;
  if (card.type === "Field") turnState.fieldPlayed = false;

  renderHand();
  renderInPlay();
  updateTSVPreview();
}

playCardBtn.onclick = () => {
  if (!selectedCard) return;

  if (selectedCard.type === "Spell" && turnState.spellPlayed) return log("Only one spell per turn.");
  if (selectedCard.type === "Item" && turnState.itemsPlayed >= 2) return log("Max 2 items.");
  if (selectedCard.type === "Field" && turnState.fieldPlayed) return log("Only one field.");
  if (selectedCard.type === "Summon" && game.threshold < selectedCard.threshold)
    return log("Threshold not met.");

  if (selectedCard.type === "Spell") turnState.spellPlayed = true;
  if (selectedCard.type === "Item") turnState.itemsPlayed++;
  if (selectedCard.type === "Field") turnState.fieldPlayed = true;

  game.player.hand = game.player.hand.filter(c => c !== selectedCard);
  turnState.cardsPlayed.push(selectedCard);
  selectedCard = null;

  renderHand();
  renderInPlay();
  updateTSVPreview();
  playCardBtn.disabled = true;
  endTurnBtn.disabled = false;
};

/* =======================
   END TURN
======================= */
endTurnBtn.onclick = () => {
  const finalTSV = calculateTSVPreview();
  game.currentTSV = finalTSV;
  game.threshold++;

  const field = turnState.cardsPlayed.find(c => c.type === "Field");
  if (field) game.activeField = field;

  log(`Turn resolved. TSV: ${game.currentTSV} | Threshold: ${game.threshold}`);

  turnState.spellPlayed = false;
  turnState.itemsPlayed = 0;
  turnState.fieldPlayed = false;
  turnState.cardsPlayed = [];

  inPlayEl.innerHTML = "";
  updateTSVPreview();
  endTurnBtn.disabled = true;
  statusEl.textContent = "Opponent's turn (AI next)";
};

/* =======================
   START / RESET
======================= */
startBtn.onclick = () => {
  resetGame();
  const deck = playerDeckSelect.value;
  game.player.deck = buildDeck(deck);
  game.player.hand = game.player.deck.splice(0, 7);
  statusEl.textContent = "Your turn";
  renderHand();
};

resetBtn.onclick = resetGame;