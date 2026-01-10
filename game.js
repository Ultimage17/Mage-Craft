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
const tsvPreviewEl = document.getElementById("tsvPreview");
const vpPlayerEl = document.getElementById("vpPlayer");
const vpAIEl = document.getElementById("vpAI");
const roundEl = document.getElementById("roundCounter");

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
  });

/* =======================
   DECK SELECTORS
======================= */
function populateDeckSelectors() {
  playerDeckSelect.innerHTML = "";
  aiDeckSelect.innerHTML = "";

  Object.keys(STARTER_DECKS).forEach(deck => {
    playerDeckSelect.add(new Option(deck, deck));
    aiDeckSelect.add(new Option(deck, deck));
  });
}

/* =======================
   CARD NORMALIZATION
======================= */
function getAllCards() {
  let all = [];
  for (const key in cardsDB) {
    if (Array.isArray(cardsDB[key])) {
      const type = key.slice(0, -1);
      cardsDB[key].forEach(c => all.push({ ...c, type }));
    }
  }
  return all;
}

function buildDeck(deckName) {
  const list = STARTER_DECKS[deckName];
  const allCards = getAllCards();
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

/* =======================
   GAME STATE
======================= */
const game = {
  player: { deck: [], hand: [] },
  activeField: null,
  activeSummons: [],
  lastResolvedSpell: null,
  thresholdCounter: 0,
  round: 1,
  vpPlayer: 0,
  vpAI: 0
};

let selectedCardIndex = null;

const turnState = {
  spellPlayed: false,
  cardsPlayed: []
};

/* =======================
   TSV CALCULATIONS
======================= */
function calculatePlayerTSV() {
  let tsv = 0;
  const spell = turnState.cardsPlayed.find(c => c.type === "Spell");
  if (!spell) return 0;

  tsv += spell.basetsv || 0;

  if (game.activeField) {
    const key =
      "affinity" + game.activeField.element.toLowerCase();
    tsv += spell[key] || 0;
  }

  turnState.cardsPlayed.forEach(card => {
    if (card.type === "Item") {
      if (card.modifier) tsv += card.modifier;
      if (card.element === spell.element) tsv += 1;
    }
  });

  return tsv;
}

function calculateResolvedTSV(resolved) {
  if (!resolved) return 0;

  let tsv = resolved.spell.basetsv || 0;

  if (game.activeField) {
    const key =
      "affinity" + game.activeField.element.toLowerCase();
    tsv += resolved.spell[key] || 0;
  }

  resolved.items.forEach(item => {
    if (item.modifier) tsv += item.modifier;
    if (item.element === resolved.spell.element) tsv += 1;
  });

  return tsv;
}

function updateTSVPreview() {
  tsvPreviewEl.textContent = calculatePlayerTSV();
}

/* =======================
   RENDER HAND
======================= */
function renderHand() {
  handEl.innerHTML = "";

  game.player.hand.forEach((card, index) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type} – ${card.element})`;
    li.style.cursor = "pointer";

    if (index === selectedCardIndex) {
      li.style.background = "#333";
      li.style.color = "#fff";
    }

    li.onclick = () => {
      selectedCardIndex = index;
      playCardBtn.disabled = false;
      renderCardDetails(card);
      renderHand();
    };

    handEl.appendChild(li);
  });
}

function renderInPlay() {
  inPlayEl.innerHTML = "";

  turnState.cardsPlayed.forEach(card => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type})`;
    inPlayEl.appendChild(li);
  });
}

/* =======================
   RENDER DETAILS
======================= */
function renderCardDetails(card) {
  let txt = `Name: ${card.name}\nType: ${card.type}\nElement: ${card.element}\nRarity: ${card.rarity}\n\n`;

  if (card.type === "Spell") {
    txt += `Base TSV: ${card.basetsv}\n`;
    txt += `Fire ${card.affinityfire || 0} | Water ${card.affinitywater || 0}\n`;
    txt += `Air ${card.affinityair || 0} | Earth ${card.affinityearth || 0}\n`;
  }

  if (card.type === "Item") {
    if (card.modifier) txt += `Modifier: +${card.modifier}\n`;
    if (card.specialeffect) txt += `${card.specialeffect}\n`;
  }

  if (card.type === "Field") {
    txt += `${card.effect}\n\nDuration:\n${card.duration}`;
  }

  cardDetailsEl.textContent = txt;
}

/* =======================
   PLAY CARD
======================= */
playCardBtn.onclick = () => {
  if (selectedCardIndex === null) {
    log("No card selected.");
    return;
  }

  const card = game.player.hand[selectedCardIndex];

  // Enforce one spell per turn
  if (card.type === "Spell" && turnState.spellPlayed) {
    log("Only one spell may be played per turn.");
    return;
  }

  if (card.type === "Spell") {
    turnState.spellPlayed = true;
  }

  // Remove from hand
  game.player.hand.splice(selectedCardIndex, 1);

  // Add to in-play
  turnState.cardsPlayed.push(card);

  log(`Played ${card.name}.`);

  selectedCardIndex = null;
  playCardBtn.disabled = true;

  renderHand();
  renderInPlay();
  updateTSVPreview();
  clearCardDetails();

  endTurnBtn.disabled = true;
  endTurnBtn.disabled = false;
};

/* =======================
   END TURN
======================= */
endTurnBtn.onclick = () => {
  const finalTSV = calculatePlayerTSV();

  const spell = turnState.cardsPlayed.find(c => c.type === "Spell");
  const items = turnState.cardsPlayed.filter(c => c.type === "Item");

  game.lastResolvedSpell = {
    owner: "Player",
    spell,
    items
  };

  log(`Player locks TSV: ${finalTSV}`);

  turnState.cardsPlayed = [];
  turnState.spellPlayed = false;

  while (game.player.hand.length < 7 && game.player.deck.length > 0) {
    game.player.hand.push(game.player.deck.shift());
  }

  game.thresholdCounter++;
  game.round++;

  renderHand();
  updateTSVPreview();
};

resetBtn.onclick = () => location.reload();

/* =======================
   START GAME
======================= */
startBtn.onclick = () => {
  game.player.deck = buildDeck(playerDeckSelect.value);
  game.player.hand = game.player.deck.splice(0, 7);
  renderHand();
};