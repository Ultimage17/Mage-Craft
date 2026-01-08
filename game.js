/*************************
 * Mage Craft – game.js
 *************************/

let cardsDB = null;

/* =====================
   DOM REFERENCES
===================== */
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const handEl = document.getElementById("hand");
const inPlayEl = document.getElementById("inPlay");
const cardDetailsEl = document.getElementById("cardDetails");
const tsvPreviewEl = document.getElementById("tsvPreview");

const playerDeckSelect = document.getElementById("playerDeck");
const aiDeckSelect = document.getElementById("aiDeck");

const startBtn = document.getElementById("startBtn");
const playCardBtn = document.getElementById("playCardBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const resetBtn = document.getElementById("resetBtn");

/* =====================
   UTILITIES
===================== */
function log(msg) {
  logEl.textContent += msg + "\n";
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/* =====================
   LOAD CARDS
===================== */
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

/* =====================
   DECK SELECTORS
===================== */
function populateDeckSelectors() {
  playerDeckSelect.innerHTML = "";
  aiDeckSelect.innerHTML = "";

  Object.keys(STARTER_DECKS).forEach(deckName => {
    playerDeckSelect.add(new Option(deckName, deckName));
    aiDeckSelect.add(new Option(deckName, deckName));
  });
}

/* =====================
   CARD NORMALIZATION
===================== */
function getAllCards() {
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

/* =====================
   DECK BUILDER
===================== */
function buildDeck(deckName) {
  const def = STARTER_DECKS[deckName];
  if (!def) throw new Error("Deck not found");

  const allCards = getAllCards();
  const deck = [];

  def.forEach(([name, count]) => {
    const card = allCards.find(c => c.name === name);
    if (!card) throw new Error(`Missing card: ${name}`);
    for (let i = 0; i < count; i++) {
      deck.push(JSON.parse(JSON.stringify(card)));
    }
  });

  shuffle(deck);
  return deck;
}

/* =====================
   GAME STATE
===================== */
const game = {
  player: {
    deck: [],
    hand: []
  }
};

let selectedCardIndex = null;

const turnState = {
  spell: false,
  field: false,
  items: 0,
  staged: []
};

/* =====================
   TSV CALCULATION
===================== */
function calculateTSV() {
  let spell = null;
  let field = null;
  let tsv = 0;

  turnState.staged.forEach(c => {
    if (c.type === "Spell") spell = c;
    if (c.type === "Field") field = c;
  });

  if (!spell) return 0;

  tsv += spell.basetsv || 0;

  if (field) {
    const k = "affinity" + field.element.toLowerCase();
    tsv += spell[k] || 0;
  }

  turnState.staged.forEach(c => {
    if (c.type === "Item") {
      if (c.modifier) tsv += c.modifier;
      if (c.element === spell.element) tsv += 1;
    }
  });

  return tsv;
}

function updateTSVPreview() {
  if (!tsvPreviewEl) return;
  tsvPreviewEl.textContent = calculateTSV();
}

/* =====================
   RESET
===================== */
function resetGame() {
  game.player.deck = [];
  game.player.hand = [];

  selectedCardIndex = null;

  turnState.spell = false;
  turnState.field = false;
  turnState.items = 0;
  turnState.staged = [];

  handEl.innerHTML = "";
  inPlayEl.innerHTML = "";
  cardDetailsEl.textContent = "Select a card to view details.";
  logEl.textContent = "";

  playCardBtn.disabled = true;
  endTurnBtn.disabled = true;

  if (tsvPreviewEl) tsvPreviewEl.textContent = "0";

  statusEl.textContent = "Waiting to start...";
}

/* =====================
   RENDER HAND
===================== */
function renderHand() {
  handEl.innerHTML = "";

  game.player.hand.forEach((card, i) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type} – ${card.element})`;
    li.style.cursor = "pointer";

    if (i === selectedCardIndex) {
      li.style.background = "#333";
      li.style.color = "#fff";
    }

    li.onclick = () => {
      selectedCardIndex = i;
      playCardBtn.disabled = false;
      renderCardDetails(card);
      renderHand();
    };

    handEl.appendChild(li);
  });
}

/* =====================
   RENDER IN PLAY
===================== */
function renderInPlay() {
  inPlayEl.innerHTML = "";

  turnState.staged.forEach((card, i) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type})`;
    li.style.cursor = "pointer";

    li.onclick = () => {
      turnState.staged.splice(i, 1);
      game.player.hand.push(card);

      if (card.type === "Spell") turnState.spell = false;
      if (card.type === "Field") turnState.field = false;
      if (card.type === "Item") turnState.items--;

      renderHand();
      renderInPlay();
      updateTSVPreview();
    };

    inPlayEl.appendChild(li);
  });
}

/* =====================
   CARD DETAILS
===================== */
function renderCardDetails(card) {
  let t = `Name: ${card.name}\n`;
  t += `Type: ${card.type}\n`;
  t += `Element: ${card.element}\n`;
  t += `Rarity: ${card.rarity || "—"}\n\n`;

  if (card.type === "Spell") {
    t += `Base TSV: ${card.basetsv || 0}\n\nAffinities:\n`;
    t += `Fire: ${card.affinityfire || 0}\n`;
    t += `Water: ${card.affinitywater || 0}\n`;
    t += `Air: ${card.affinityair || 0}\n`;
    t += `Earth: ${card.affinityearth || 0}\n`;
  }

  if (card.type === "Item") {
    if (card.modifier) t += `Modifier: +${card.modifier}\n`;
    if (card.specialeffect) t += `Effect:\n${card.specialeffect}\n`;
  }

  if (card.type === "Field") {
    t += `Effect:\n${card.effect}\n\nDuration:\n${card.duration}\n`;
  }

  if (card.type === "Summon") {
    t += `Threshold: ${card.threshold}\n\nAura:\n${card.aura}\n\nBurst:\n${card.burstskill}`;
  }

  cardDetailsEl.textContent = t;
}

/* =====================
   PLAY CARD
===================== */
playCardBtn.onclick = () => {
  if (selectedCardIndex === null) return;

  const card = game.player.hand[selectedCardIndex];

  if (card.type === "Spell" && turnState.spell) return log("Only one spell.");
  if (card.type === "Field" && turnState.field) return log("Only one field.");
  if (card.type === "Item" && turnState.items >= 2) return log("Only two items.");

  if (card.type === "Spell") turnState.spell = true;
  if (card.type === "Field") turnState.field = true;
  if (card.type === "Item") turnState.items++;

  game.player.hand.splice(selectedCardIndex, 1);
  turnState.staged.push(card);

  selectedCardIndex = null;
  playCardBtn.disabled = true;

  renderHand();
  renderInPlay();
  updateTSVPreview();
};

/* =====================
   END TURN
===================== */
endTurnBtn.onclick = () => {
  const tsv = calculateTSV();
  log(`Final TSV: ${tsv}`);

  turnState.staged = [];
  turnState.spell = false;
  turnState.field = false;
  turnState.items = 0;

  inPlayEl.innerHTML = "";
  updateTSVPreview();
};

/* =====================
   START / RESET
===================== */
startBtn.onclick = () => {
  resetGame();

  const deckName = playerDeckSelect.value;
  game.player.deck = buildDeck(deckName);
  game.player.hand = game.player.deck.splice(0, 7);

  statusEl.textContent = "Your turn";
  renderHand();
};

resetBtn.onclick = resetGame;