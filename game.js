/*************************
 * Mage Craft – game.js
 *************************/

let cardsDB = null;

/* ---------- DOM ---------- */
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const handEl = document.getElementById("hand");
const inPlayEl = document.getElementById("inPlay");
const activeSummonsEl = document.getElementById("activeSummons");
const playerDeckSelect = document.getElementById("playerDeck");
const startBtn = document.getElementById("startBtn");
const playCardBtn = document.getElementById("playCardBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const resetBtn = document.getElementById("resetBtn");
const burstBtn = document.getElementById("burstBtn");
const tsvPreviewEl = document.getElementById("tsvPreview");
const cardDetailsEl = document.getElementById("cardDetails");

/* ---------- UTIL ---------- */
function log(msg) {
  logEl.textContent += msg + "\n";
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function rollD8() {
  return Math.floor(Math.random() * 8) + 1;
}

/* ---------- LOAD CARDS ---------- */
fetch("cards.json")
  .then(res => res.json())
  .then(db => {
    cardsDB = db;
    populateDeckSelectors();
    log("Cards loaded.");
  });

/* ---------- DECK SELECT ---------- */
function populateDeckSelectors() {
  playerDeckSelect.innerHTML = "";
  Object.keys(STARTER_DECKS).forEach(deck => {
    playerDeckSelect.add(new Option(deck, deck));
  });
}

/* ---------- DECK BUILDER ---------- */
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
  const list = STARTER_DECKS[deckName];
  const allCards = getAllCardsArray();
  const deck = [];

  list.forEach(([name, count]) => {
    const card = allCards.find(c => c.name === name);
    for (let i = 0; i < count; i++) {
      deck.push(JSON.parse(JSON.stringify(card)));
    }
  });

  shuffle(deck);
  return deck;
}

/* ---------- GAME STATE ---------- */
const game = {
  player: {
    deck: [],
    hand: []
  },
  activeSummons: [],
  activeField: null   // 🔥 FIELD IS NOW GLOBAL
};

let selectedCard = null;
let selectedSummon = null;

const turnState = {
  spellPlayed: false,
  itemsPlayed: 0,
  cardsPlayed: [],
  attunement: { attempted: false, success: false, bonus: 0 }
};

/* ---------- RESET ---------- */
function resetGame() {
  game.player.deck = [];
  game.player.hand = [];
  game.activeSummons = [];
  game.activeField = null;

  selectedCard = null;
  selectedSummon = null;

  turnState.spellPlayed = false;
  turnState.itemsPlayed = 0;
  turnState.cardsPlayed = [];
  turnState.attunement = { attempted: false, success: false, bonus: 0 };

  handEl.innerHTML = "";
  inPlayEl.innerHTML = "";
  activeSummonsEl.innerHTML = "";
  logEl.textContent = "";
  cardDetailsEl.textContent = "Select a card to view details.";
  tsvPreviewEl.textContent = "0";
  statusEl.textContent = "Waiting to start...";
  burstBtn.disabled = true;
}

/* ---------- ATTUNEMENT ---------- */
function attemptAttunement() {
  if (turnState.attunement.attempted) return;

  const spell = turnState.cardsPlayed.find(c => c.type === "Spell");
  if (!spell) return;

  const difficulty = { Common: 3, Uncommon: 5, Rare: 6, Mythic: 7 };
  const bonus = { Common: 1, Uncommon: 2, Rare: 3, Mythic: 5 };

  const roll = rollD8();
  turnState.attunement.attempted = true;

  if (roll >= difficulty[spell.rarity]) {
    turnState.attunement.success = true;
    turnState.attunement.bonus = bonus[spell.rarity];
    log(`Attunement SUCCESS (roll ${roll})`);
  } else {
    log(`Attunement failed (roll ${roll})`);
  }
}

/* ---------- TSV ---------- */
function calculateTSV() {
  let tsv = 0;
  const spell = turnState.cardsPlayed.find(c => c.type === "Spell");
  if (!spell) return 0;

  tsv += spell.basetsv || 0;

  // 🌍 GLOBAL FIELD
  if (game.activeField) {
    const key = "affinity" + game.activeField.element.toLowerCase();
    tsv += spell[key] || 0;
  }

  // Items
  turnState.cardsPlayed.forEach(card => {
    if (card.type === "Item") {
      if (card.modifier) tsv += card.modifier;
      if (card.element === spell.element) tsv += 1;
    }
  });

  // Summon Auras
  game.activeSummons.forEach(s => {
    if (s.aura?.tsvBonus) tsv += s.aura.tsvBonus;
  });

  if (turnState.attunement.success) {
    tsv += turnState.attunement.bonus;
  }

  return tsv;
}

function updateTSVPreview() {
  tsvPreviewEl.textContent = calculateTSV();
}

/* ---------- PLAY CARD ---------- */
playCardBtn.onclick = () => {
  if (!selectedCard) return;

  // 🔒 Play limits
  if (selectedCard.type === "Spell" && turnState.spellPlayed) return;
  if (selectedCard.type === "Item" && turnState.itemsPlayed >= 2) return;

  // 🌍 FIELD PLAY
  if (selectedCard.type === "Field") {
    game.activeField = selectedCard;
    log(`Field changed to ${selectedCard.name}`);
  }
  // 🧙 SUMMON
  else if (selectedCard.type === "Summon") {
    game.activeSummons.push(selectedCard);
    log(`Summoned ${selectedCard.name}`);
  }
  // 🎴 NORMAL CARD
  else {
    if (selectedCard.type === "Spell") turnState.spellPlayed = true;
    if (selectedCard.type === "Item") turnState.itemsPlayed++;
    turnState.cardsPlayed.push(selectedCard);
  }

  game.player.hand = game.player.hand.filter(c => c !== selectedCard);
  selectedCard = null;

  renderHand();
  updateTSVPreview();
};

/* ---------- END TURN ---------- */
endTurnBtn.onclick = () => {
  attemptAttunement();
  log(`Final TSV: ${calculateTSV()}`);

  turnState.spellPlayed = false;
  turnState.itemsPlayed = 0;
  turnState.cardsPlayed = [];
  turnState.attunement = { attempted: false, success: false, bonus: 0 };

  updateTSVPreview();
};

/* ---------- START ---------- */
startBtn.onclick = () => {
  resetGame();
  game.player.deck = buildDeck(playerDeckSelect.value);
  game.player.hand = game.player.deck.splice(0, 7);
  renderHand();
  statusEl.textContent = "Your turn";
};

resetBtn.onclick = resetGame;