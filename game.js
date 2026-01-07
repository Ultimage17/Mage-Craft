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

// ---------- TSV CALCULATION ----------
function calculateTSVPreview() {
  let tsv = 0;
  let spell = null;
  let field = null;

  turnState.cardsPlayed.forEach(card => {
    if (card.type === "Spell") spell = card;
    if (card.type === "Field") field = card;
  });

  if (!spell) return 0;

  // Base TSV
  tsv += spell.basetsv || 0;

  // Field affinity
  if (field) {
    const affinityKey = "affinity" + field.element.toLowerCase();
    tsv += spell[affinityKey] || 0;
  }

  // Items
  turnState.cardsPlayed.forEach(card => {
  if (card.type === "Item") {

    // Base item modifier
    if (card.modifier !== undefined) {
      tsv += card.modifier;
    }

    // Elemental synergy bonuses
    if (card.element === spell.element) {
      tsv += 1;
    }

    if (field && card.element === field.element) {
      tsv += 1;
    }
  }
});

  return tsv;
}

function updateTSVPreview() {
  const previewEl = document.getElementById("tsvPreview");
  if (!previewEl) return;
  previewEl.textContent = calculateTSVPreview();
}

// ---------- RENDER ----------
function renderHand() {
  handEl.innerHTML = "";

  game.player.hand.forEach(card => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type} – ${card.element})`;
    li.style.cursor = "pointer";

    li.onclick = () => {
      selectedCard = card;
      document.getElementById("playCardBtn").disabled = false;
      renderCardDetails(card);
      renderHand();
    };

    handEl.appendChild(li);
  });
}

function renderInPlay() {
  inPlayEl.innerHTML = "";

  turnState.cardsPlayed.forEach((card, index) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type})`;
    li.style.cursor = "pointer";

    li.onclick = () => {
      // Remove from staged
      turnState.cardsPlayed.splice(index, 1);

      // Return to hand
      game.player.hand.push(card);

      // Reset spell lock if needed
      if (card.type === "Spell") {
        turnState.spellPlayed = false;
      }

      log(`Removed ${card.name} from play.`);

      renderHand();
      renderInPlay();
      updateTSVPreview();
    };

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
      text += `Base TSV: ${card.basetsv ?? 0}\n\n`;
      text += "Affinities:\n";
      text += `  Fire: ${card.affinityfire ?? 0}\n`;
      text += `  Water: ${card.affinitywater ?? 0}\n`;
      text += `  Air: ${card.affinityair ?? 0}\n`;
      text += `  Earth: ${card.affinityearth ?? 0}\n`;
  break;

    case "Item":
      text += "Item Effects:\n";

      if (card.modifier !== undefined) {
      text += `Modifier: +${card.modifier}\n`;
  }

      if (card.specialeffect) {
      text += `Special Effect:\n${card.specialeffect}\n`;
  }

      if (card.modifier === undefined && !card.specialeffect) {
      text += "No special effects.\n";
  }

  break;

    case "Field":
      text += "Field Effect:\n";
      text += (card.effect || "No special effect.") + "\n\n";
      text += "Duration:\n";
      text += (card.duration || "Until another field card is played") + "\n";
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
  updateTSVPreview();
  clearCardDetails();

  endTurnBtn.disabled = false;
};

// ---------- END TURN ----------
endTurnBtn.onclick = () => {
  log("Ending turn.");
  log(`Cards played: ${turnState.cardsPlayed.length}`);
  
  const finalTSV = calculateTSVPreview();
  log(`Final TSV locked: ${finalTSV}`);

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