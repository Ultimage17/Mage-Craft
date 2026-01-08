/*************************
 * Mage Craft – game.js
 * Fully Integrated Core Engine
 *************************/

let cardsDB = null;

/* ======================
   DOM REFERENCES
====================== */
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const handEl = document.getElementById("hand");
const inPlayEl = document.getElementById("inPlay");
const activeSummonsEl = document.getElementById("activeSummons");
const playerDeckSelect = document.getElementById("playerDeck");
const aiDeckSelect = document.getElementById("aiDeck");
const startBtn = document.getElementById("startBtn");
const playCardBtn = document.getElementById("playCardBtn");
const endTurnBtn = document.getElementById("endTurnBtn");
const resetBtn = document.getElementById("resetBtn");
const tsvPreviewEl = document.getElementById("tsvPreview");
const playerVPEl = document.getElementById("playerVP");
const aiVPEl = document.getElementById("aiVP");

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
   LOAD CARD DATABASE
====================== */
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

  Object.keys(STARTER_DECKS).forEach(deck => {
    playerDeckSelect.add(new Option(deck, deck));
    aiDeckSelect.add(new Option(deck, deck));
  });
}

/* ======================
   DECK BUILDING
====================== */
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

/* ======================
   GAME STATE
====================== */
const game = {
  round: 1,
  threshold: 0,
  currentTSV: 0,
  spellChain: 0,

  playerVP: 0,
  aiVP: 0,

  player: {
    deck: [],
    hand: []
    
    ai: {
  deck: [],
  hand: []
}
  },

  activeSummons: []
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
  game.threshold = 0;
  game.currentTSV = 0;
  game.spellChain = 0;
  game.playerVP = 0;
  game.aiVP = 0;
  game.activeSummons = [];

  game.player.deck = [];
  game.player.hand = [];

  selectedCard = null;
  Object.assign(turnState, {
    spellPlayed: false,
    fieldPlayed: false,
    itemsPlayed: 0,
    cardsPlayed: []
  });

  handEl.innerHTML = "";
  inPlayEl.innerHTML = "";
  activeSummonsEl.innerHTML = "";
  logEl.textContent = "";

  playerVPEl.textContent = "0";
  aiVPEl.textContent = "0";
  tsvPreviewEl.textContent = "0";

  statusEl.textContent = "Waiting to start...";
  playCardBtn.disabled = true;
  endTurnBtn.disabled = true;

  log("Game reset.");
}

/* ======================
   TSV CALCULATION
====================== */
function calculateTSVPreview() {
  let tsv = game.currentTSV;
  let spell = null;
  let field = null;

  turnState.cardsPlayed.forEach(c => {
    if (c.type === "Spell") spell = c;
    if (c.type === "Field") field = c;
  });

  if (!spell) return tsv;

  tsv += spell.basetsv || 0;

  if (field) {
    const key = "affinity" + field.element.toLowerCase();
    tsv += spell[key] || 0;
  }

  turnState.cardsPlayed.forEach(c => {
    if (c.type === "Item") {
      tsv += c.modifier || 0;
      if (c.element === spell.element) tsv += 1;
      if (field && c.element === field.element) tsv += 1;
    }
  });

  game.activeSummons.forEach(s => {
    if (s.auraValue) tsv += s.auraValue;
  });

  return tsv;
}

function updateTSVPreview() {
  tsvPreviewEl.textContent = calculateTSVPreview();
}

/* ======================
   RENDERING
====================== */
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
  turnState.cardsPlayed.forEach((card, i) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type})`;
    li.onclick = () => undoCard(i);
    inPlayEl.appendChild(li);
  });
}

function renderActiveSummons() {
  activeSummonsEl.innerHTML = "";
  game.activeSummons.forEach((s, i) => {
    const li = document.createElement("li");
    li.textContent = `${s.name} (Aura +${s.auraValue || 0})`;

    const btn = document.createElement("button");
    btn.textContent = "Burst";
    btn.onclick = () => activateBurst(i);

    li.appendChild(btn);
    activeSummonsEl.appendChild(li);
  });
}

/* ======================
   CARD DETAILS
====================== */
function renderCardDetails(card) {
  const el = document.getElementById("cardDetails");
  let t = `Name: ${card.name}\nType: ${card.type}\nElement: ${card.element}\nRarity: ${card.rarity}\n\n`;

  if (card.type === "Spell") {
    t += `Base TSV: ${card.basetsv}\n\nAffinities:\n`;
    ["fire", "water", "air", "earth"].forEach(e => {
      t += `  ${e}: ${card["affinity" + e] || 0}\n`;
    });
  }

  if (card.type === "Item") {
    t += `Modifier: +${card.modifier || 0}\n${card.specialeffect || ""}`;
  }

  if (card.type === "Field") {
    t += `Effect:\n${card.effect}\n\nDuration:\n${card.duration}`;
  }

  if (card.type === "Summon") {
    t += `Threshold: ${card.threshold}\nAura: ${card.aura}\n\nBurst:\n${card.burstskill}`;
  }

  el.textContent = t;
}

/* ======================
   PLAY / UNDO
====================== */
function undoCard(index) {
  const card = turnState.cardsPlayed.splice(index, 1)[0];
  game.player.hand.push(card);

  if (card.type === "Spell") turnState.spellPlayed = false;
  if (card.type === "Field") turnState.fieldPlayed = false;
  if (card.type === "Item") turnState.itemsPlayed--;

  renderHand();
  renderInPlay();
  updateTSVPreview();
}

playCardBtn.onclick = () => {
  if (!selectedCard) return;

  if (selectedCard.type === "Spell" && turnState.spellPlayed) return;
  if (selectedCard.type === "Field" && turnState.fieldPlayed) return;
  if (selectedCard.type === "Item" && turnState.itemsPlayed >= 2) return;
  if (selectedCard.type === "Summon" && game.threshold < selectedCard.threshold) return;

  if (selectedCard.type === "Spell") turnState.spellPlayed = true;
  if (selectedCard.type === "Field") turnState.fieldPlayed = true;
  if (selectedCard.type === "Item") turnState.itemsPlayed++;

  if (selectedCard.type === "Summon") {
    game.activeSummons.push({ ...selectedCard, burstUsed: false });
  } else {
    turnState.cardsPlayed.push(selectedCard);
  }

  game.player.hand = game.player.hand.filter(c => c !== selectedCard);
  selectedCard = null;
  playCardBtn.disabled = true;

  renderHand();
  renderInPlay();
  renderActiveSummons();
  updateTSVPreview();
};

/* ======================
   BURST SKILLS
====================== */
function activateBurst(index) {
  const s = game.activeSummons[index];
  if (s.burstUsed) return;

  log(`Burst activated: ${s.name}`);
  log(s.burstskill);

  s.burstUsed = true;
  game.activeSummons.splice(index, 1);
  renderActiveSummons();
}

/* ======================
   END TURN
====================== */
endTurnBtn.onclick = () => {
  const finalTSV = calculateTSVPreview();
  log(`Final TSV locked: ${finalTSV}`);

  game.currentTSV = finalTSV;
  game.spellChain++;
  game.threshold++;

  const cardsPlayedCount = turnState.cardsPlayed.length;
  for (let i = 0; i < cardsPlayedCount; i++) {
    if (game.player.deck.length) {
      game.player.hand.push(game.player.deck.shift());
    }
  }

  Object.assign(turnState, {
    spellPlayed: false,
    fieldPlayed: false,
    itemsPlayed: 0,
    cardsPlayed: []
  });

  inPlayEl.innerHTML = "";
  updateTSVPreview();
  renderHand();

  statusEl.textContent = "AI thinking...";
  setTimeout(aiTurn, 800);
};

/* ======================
   START GAME
====================== */
startBtn.onclick = () => {
  resetGame();
  game.player.deck = buildDeck(playerDeckSelect.value);
  game.player.hand = game.player.deck.splice(0, 7);
  statusEl.textContent = "Your turn";
  renderHand();
};

resetBtn.onclick = resetGame;