/*************************
 * Mage Craft – game.js
 *************************/

let cardsDB = null;

// ---------- DOM ----------
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const handEl = document.getElementById("hand");
const inPlayEl = document.getElementById("inPlay");
const playerDeckSelect = document.getElementById("playerDeck");
const aiDeckSelect = document.getElementById("aiDeck");

const startBtn = document.getElementById("startBtn");
const playCardBtn = document.getElementById("playCardBtn");
const endTurnBtn = document.getElementById("endTurnBtn");

// ---------- UTIL ----------
function log(msg) {
  logEl.textContent += msg + "\n";
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ---------- LOAD CARDS ----------
fetch("cards.json")
  .then(res => res.json())
  .then(db => {
    cardsDB = db;
    populateDeckSelectors();
    log("Cards loaded successfully.");
  })
  .catch(err => {
    console.error(err);
    log("ERROR: Failed to load cards.json");
  });

// ---------- DECK SELECT ----------
function populateDeckSelectors() {
  playerDeckSelect.innerHTML = "";
  aiDeckSelect.innerHTML = "";

  Object.keys(STARTER_DECKS).forEach(deckName => {
    playerDeckSelect.add(new Option(deckName, deckName));
    aiDeckSelect.add(new Option(deckName, deckName));
  });
}

// ---------- DECK BUILDER ----------
function getAllCardsArray() {
  if (Array.isArray(cardsDB)) return cardsDB;

  let all = [];
  for (const key in cardsDB) {
    if (Array.isArray(cardsDB[key])) {
      const type = key.slice(0, -1); // Spells → Spell
      cardsDB[key].forEach(card => {
        all.push({ ...card, type });
      });
    }
  }
  return all;
}

function buildDeck(deckName) {
  const deckList = STARTER_DECKS[deckName];
  if (!deckList) throw new Error("Deck not found: " + deckName);

  const allCards = getAllCardsArray();
  const deck = [];

  deckList.forEach(([cardName, count]) => {
    const card = allCards.find(c => c.name === cardName);
    if (!card) {
      throw new Error(`Card "${cardName}" not found in cards database`);
    }
    for (let i = 0; i < count; i++) {
      deck.push(JSON.parse(JSON.stringify(card)));
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

let selectedCard = null;

const turnState = {
  spellPlayed: false,
  cardsPlayed: []
};

// ---------- RENDER ----------
function renderHand() {
  handEl.innerHTML = "";

  game.player.hand.forEach(card => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type} – ${card.element})`;
    li.style.cursor = "pointer";

    if (card === selectedCard) {
      li.style.background = "#333";
      li.style.color = "#fff";
    }

    li.onclick = () => {
      selectedCard = card;
      playCardBtn.disabled = false;
      renderHand();
      renderCardDetails(card);
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

// ---------- CARD DETAILS ----------
function renderCardDetails(card) {
  const el = document.getElementById("cardDetails");
  let text = `Name: ${card.name}\n`;
  text += `Type: ${card.type}\n`;
  text += `Element: ${card.element}\n`;
  text += `Rarity: ${card.rarity || "—"}\n\n`;

  switch (card.type) {
    case "Spell":
      text += "Affinities:\n";
      text += `Fire: ${card.affinityfire ?? 0}\n`;
      text += `Water: ${card.affinitywater ?? 0}\n`;
      text += `Air: ${card.affinityair ?? 0}\n`;
      text += `Earth: ${card.affinityearth ?? 0}`;
      break;

    case "Item":
      text += "Item Effect:\n";
      text += card.specialeffect || "None";
      break;

    case "Field":
      text += "Field Effect:\n";
      text += (card.effect || "None") + "\n";
      text += `Duration: ${card.duration || "Until replaced"}`;
      break;

    case "Summon":
      text += `Threshold: ${card.threshold}\n\n`;
      text += "Aura:\n";
      text += card.aura || "None";
      text += "\n\nBurst Skill:\n";
      text += card.burstskill || "None";
      break;
  }

  el.textContent = text;
}

function clearCardDetails() {
  document.getElementById("cardDetails").textContent = "";
}

// ---------- PLAY CARD ----------
playCardBtn.onclick = () => {
  if (!selectedCard) return;

  if (selectedCard.type === "Spell" && turnState.spellPlayed) {
    log("Only one spell may be played per turn.");
    return;
  }

  if (selectedCard.type === "Spell") {
    turnState.spellPlayed = true;
  }

  game.player.hand = game.player.hand.filter(c => c !== selectedCard);
  turnState.cardsPlayed.push(selectedCard);

  log(`Played ${selectedCard.name}.`);

  selectedCard = null;
  playCardBtn.disabled = true;

  renderHand();
  renderInPlay();
  clearCardDetails();

  endTurnBtn.disabled = false;
};

// ---------- END TURN ----------
endTurnBtn.onclick = () => {
  log("Ending turn.");
  log(`Cards played: ${turnState.cardsPlayed.length}`);

  turnState.spellPlayed = false;
  turnState.cardsPlayed = [];
  inPlayEl.innerHTML = "";

  endTurnBtn.disabled = true;
  playCardBtn.disabled = true;

  statusEl.textContent = "Opponent's turn (AI coming next)";
};

// ---------- START GAME ----------
startBtn.onclick = () => {
  logEl.textContent = "";
  handEl.innerHTML = "";
  inPlayEl.innerHTML = "";

  if (!cardsDB) {
    log("Cards not loaded yet.");
    return;
  }

  const deckName = playerDeckSelect.value;
  log("Starting game with deck: " + deckName);

  game.player.deck = buildDeck(deckName);
  game.player.hand = game.player.deck.splice(0, 7);

  log("You draw 7 cards.");
  statusEl.textContent = "Your turn – play cards";

  renderHand();
};