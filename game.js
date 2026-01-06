/*************************************************
 * Mage Craft – Digital Playtest (Stable Build)
 *************************************************/

let cardsDB = null;

// ---------- DOM ----------
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const handEl = document.getElementById("hand");
const playerDeckSelect = document.getElementById("playerDeck");
const aiDeckSelect = document.getElementById("aiDeck");
const startBtn = document.getElementById("startBtn");

// ---------- UTIL ----------
function log(msg) {
  logEl.textContent += msg + "\n";
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
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

// ---------- CARD NORMALIZATION ----------
function getAllCards() {
  const all = [];

  if (!cardsDB) return all;

  for (const groupName in cardsDB) {
    const group = cardsDB[groupName];

    if (!Array.isArray(group)) continue;

    // Derive card type from the group name
    let derivedType = groupName.toLowerCase();
    if (derivedType.endsWith("s")) {
      derivedType = derivedType.slice(0, -1); // Spells → spell
    }

    group.forEach(card => {
      all.push({
        ...card,
        type: derivedType.charAt(0).toUpperCase() + derivedType.slice(1)
      });
    });
  }

  return all;
}

// ---------- DECK BUILDER ----------
function buildDeck(deckName) {
  const deckDef = STARTER_DECKS[deckName];
  if (!deckDef) {
    throw new Error("Deck not found: " + deckName);
  }

  const allCards = getAllCards();
  const deck = [];

  deckDef.forEach(([cardName, count]) => {
    const card = allCards.find(c => c.name.trim() === cardName.trim());

    if (!card) {
      console.error("Available cards:", allCards.map(c => c.name));
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

// ---------- RENDER ----------
function renderHand() {
  handEl.innerHTML = "";

  game.player.hand.forEach((card, index) => {
    const li = document.createElement("li");

    li.textContent = `${card.name} (${card.type} – ${card.element})`;
    li.style.cursor = "pointer";

    // Highlight selected card
    if (card === selectedCard) {
      li.style.background = "#333";
      li.style.color = "#fff";
    }

    li.onclick = () => {
      selectedCard = card;
      renderHand();
      renderCardDetails(card);
    };

    handEl.appendChild(li);
  });
}

function renderCardDetails(card) {
  const detailsEl = document.getElementById("cardDetails");

  let text = `Name: ${card.name}\n`;
  text += `Type: ${card.type}\n`;
  text += `Element: ${card.element}\n`;
  text += `Rarity: ${card.rarity || "—"}\n\n`;

  switch (card.type) {
    case "Spell":
      text += "Affinities:\n";
      text += `  Fire: ${card.affinityfire ?? 0}\n`;
      text += `  Water: ${card.affinitywater ?? 0}\n`;
      text += `  Air: ${card.affinityair ?? 0}\n`;
      text += `  Earth: ${card.affinityearth ?? 0}\n`;
      break;

    case "Item":
      text += "Item Effects:\n";
      text += card.specialeffect || "No special effect.\n";
      break;

    case "Field":
      text += "Field Effects:\n";
      text += card.effect || "No special effect.\n";
      text += `Duration: ${card.duration || "Persistent"}\n`;
      break;

    case "Summon":
      text += `Threshold: ${card.threshold}\n\n`;
      text += "Aura:\n";
      text += (card.aura || "No aura.") + "\n\n";
      text += "Burst Skill:\n";
      text += (card.burstskill || "No burst skill.");
      break;

    default:
      text += "No additional information available.";
  }

  detailsEl.textContent = text;
}

// ---------- START GAME ----------
startBtn.onclick = () => {
  logEl.textContent = "";
  handEl.innerHTML = "";

  if (!cardsDB) {
    log("Cards not loaded yet.");
    return;
  }

  const deckName = playerDeckSelect.value;
  if (!deckName) {
    log("Please select a deck.");
    return;
  }

  log("Starting game with deck: " + deckName);

  game.player.deck = buildDeck(deckName);
  game.player.hand = game.player.deck.splice(0, 7);

  log(`Deck built: ${game.player.deck.length + game.player.hand.length} cards`);
  log("You draw 7 cards.");

  statusEl.textContent = "Your turn – play the first spell";
  renderHand();
};