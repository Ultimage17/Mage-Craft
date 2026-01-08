/*************************
 * Mage Craft – game.js
 *************************/

let cardsDB = null;

/* ---------- DOM ---------- */
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
    log("Cards loaded successfully.");
  });

/* ---------- DECK SELECT ---------- */
function populateDeckSelectors() {
  playerDeckSelect.innerHTML = "";
  aiDeckSelect.innerHTML = "";

  Object.keys(STARTER_DECKS).forEach(deck => {
    playerDeckSelect.add(new Option(deck, deck));
    aiDeckSelect.add(new Option(deck, deck));
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
  }
};

let selectedCard = null;

const turnState = {
  spellPlayed: false,
  fieldPlayed: false,
  itemsPlayed: 0,
  cardsPlayed: [],
  attunement: {
    attempted: false,
    success: false,
    bonus: 0
  }
};

/* ---------- RESET ---------- */
function resetGame() {
  game.player.deck = [];
  game.player.hand = [];
  selectedCard = null;

  turnState.spellPlayed = false;
  turnState.fieldPlayed = false;
  turnState.itemsPlayed = 0;
  turnState.cardsPlayed = [];
  turnState.attunement = { attempted: false, success: false, bonus: 0 };

  handEl.innerHTML = "";
  inPlayEl.innerHTML = "";
  logEl.textContent = "";
  cardDetailsEl.textContent = "Select a card to view details.";
  tsvPreviewEl.textContent = "0";
  statusEl.textContent = "Waiting to start...";

  playCardBtn.disabled = true;
  endTurnBtn.disabled = true;
}

/* ---------- ATTUNEMENT ---------- */
function attemptAttunement() {
  if (turnState.attunement.attempted) {
    log("Attunement already attempted this turn.");
    return;
  }

  const spell = turnState.cardsPlayed.find(c => c.type === "Spell");
  if (!spell) {
    log("No spell to attune.");
    return;
  }

  const difficultyByRarity = {
    Common: 3,
    Uncommon: 5,
    Rare: 6,
    Mythic: 7
  };

  const bonusByRarity = {
    Common: 1,
    Uncommon: 2,
    Rare: 3,
    Mythic: 5
  };

  const roll = rollD8();
  const difficulty = difficultyByRarity[spell.rarity] || 4;

  turnState.attunement.attempted = true;

  if (roll >= difficulty) {
    turnState.attunement.success = true;
    turnState.attunement.bonus = bonusByRarity[spell.rarity] || 1;
    log(`Attunement SUCCESS! Rolled ${roll} (+${turnState.attunement.bonus} TSV)`);
  } else {
    log(`Attunement failed. Rolled ${roll}.`);
  }

  updateTSVPreview();
}

/* ---------- TSV ---------- */
function calculateTSV() {
  let tsv = 0;
  let spell = null;
  let field = null;

  turnState.cardsPlayed.forEach(card => {
    if (card.type === "Spell") spell = card;
    if (card.type === "Field") field = card;
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
    }
  });

  if (turnState.attunement.success) {
    tsv += turnState.attunement.bonus;
  }

  return tsv;
}

function updateTSVPreview() {
  tsvPreviewEl.textContent = calculateTSV();
}

/* ---------- RENDER ---------- */
function renderHand() {
  handEl.innerHTML = "";
  game.player.hand.forEach(card => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type} – ${card.element})`;
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
  turnState.cardsPlayed.forEach((card, idx) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type})`;
    li.onclick = () => {
      turnState.cardsPlayed.splice(idx, 1);
      game.player.hand.push(card);
      if (card.type === "Spell") turnState.spellPlayed = false;
      if (card.type === "Item") turnState.itemsPlayed--;
      if (card.type === "Field") turnState.fieldPlayed = false;
      updateTSVPreview();
      renderHand();
      renderInPlay();
    };
    inPlayEl.appendChild(li);
  });
}

/* ---------- CARD DETAILS ---------- */
function renderCardDetails(card) {
  let text = `Name: ${card.name}\nType: ${card.type}\nElement: ${card.element}\nRarity: ${card.rarity}\n\n`;

  if (card.type === "Spell") {
    text += `Base TSV: ${card.basetsv}\n`;
    text += "Affinities:\n";
    text += `Fire: ${card.affinityfire}\nWater: ${card.affinitywater}\nAir: ${card.affinityair}\nEarth: ${card.affinityearth}\n`;
  }

  cardDetailsEl.textContent = text;
}

/* ---------- PLAY CARD ---------- */
playCardBtn.onclick = () => {
  if (!selectedCard) return;

  if (selectedCard.type === "Spell" && turnState.spellPlayed) return;
  if (selectedCard.type === "Field" && turnState.fieldPlayed) return;
  if (selectedCard.type === "Item" && turnState.itemsPlayed >= 2) return;

  if (selectedCard.type === "Spell") turnState.spellPlayed = true;
  if (selectedCard.type === "Field") turnState.fieldPlayed = true;
  if (selectedCard.type === "Item") turnState.itemsPlayed++;

  game.player.hand = game.player.hand.filter(c => c !== selectedCard);
  turnState.cardsPlayed.push(selectedCard);
  selectedCard = null;

  renderHand();
  renderInPlay();
  updateTSVPreview();
};

/* ---------- END TURN ---------- */
endTurnBtn.onclick = () => {
  log(`Final TSV: ${calculateTSV()}`);
  turnState.spellPlayed = false;
  turnState.fieldPlayed = false;
  turnState.itemsPlayed = 0;
  turnState.cardsPlayed = [];
  turnState.attunement = { attempted: false, success: false, bonus: 0 };
  renderInPlay();
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