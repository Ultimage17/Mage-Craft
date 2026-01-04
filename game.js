/**********************
 * GLOBAL STATE
 **********************/
let cardsDB = null;
let selectedCardIndex = null;

const game = {
  player: {
    deck: [],
    hand: []
  },
  ai: {
    deck: [],
    hand: []
  },
  chainCount: 0,

  startGame() {
    this.chainCount = 0;
    this.player.deck = buildDeck(playerDeck.value);
    this.ai.deck = buildDeck(aiDeck.value);

    shuffle(this.player.deck);
    shuffle(this.ai.deck);

    this.player.hand = drawCards(this.player.deck, 7);
    this.ai.hand = drawCards(this.ai.deck, 7);

    write("=== Mage Craft Match Started ===");
    write(`Player Deck: ${playerDeck.value}`);
    write(`AI Deck: ${aiDeck.value}`);
    write("Awaiting first spell...");
    updateStatus("Your turn – play the first spell");

    renderHand();
  },

  playPlayerCard(card) {
    this.chainCount++;
    removeFromHand(this.player.hand, card);

    return {
      message: `Chain length is now ${this.chainCount}`,
      chainEnded: false
    };
  },

  aiTurn() {
    if (this.ai.hand.length === 0) return;

    const card = this.ai.hand.shift();
    this.chainCount++;

    write(`AI plays ${card.name}`);
    write(`Chain length is now ${this.chainCount}`);
  }
};

/**********************
 * INITIAL LOAD
 **********************/
fetch("cards.json")
  .then(r => r.json())
  .then(db => {
    cardsDB = db;
    populateDecks();
    write("Cards loaded successfully.");
    write("Select decks and press Start Game.");
  });

/**********************
 * DECK SETUP
 **********************/
function populateDecks() {
  ["Flame Heart", "Tidal Soul", "Stone Body", "Clouded Mind"].forEach(d => {
    playerDeck.add(new Option(d, d));
    aiDeck.add(new Option(d, d));
  });
}

function buildDeck(deckName) {
  return cardsDB.cards.filter(c => c.deck === deckName);
}

/**********************
 * UI ACTIONS
 **********************/
startBtn.onclick = () => {
  clearLog();
  game.startGame();
  passBtn.disabled = false;
};

playCardBtn.onclick = () => {
  if (selectedCardIndex === null) return;

  const card = game.player.hand[selectedCardIndex];
  const result = game.playPlayerCard(card);

  write(`You played ${card.name}`);
  write(result.message);

  selectedCardIndex = null;
  selectedCard.textContent = "None";
  playCardBtn.disabled = true;

  game.aiTurn();
  renderHand();
};

passBtn.onclick = () => {
  write("You pass.");
  game.aiTurn();
  renderHand();
};

/**********************
 * RENDERING
 **********************/
function renderHand() {
  hand.innerHTML = "";

  game.player.hand.forEach((card, i) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type}, ${card.element})`;
    li.onclick = () => {
      selectedCardIndex = i;
      selectedCard.textContent = card.name;
      playCardBtn.disabled = false;
    };
    hand.appendChild(li);
  });
}

/**********************
 * HELPERS
 **********************/
function drawCards(deck, n) {
  return deck.splice(0, n);
}

function removeFromHand(hand, card) {
  const i = hand.indexOf(card);
  if (i >= 0) hand.splice(i, 1);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

function write(msg) {
  log.textContent += msg + "\n";
}

function clearLog() {
  log.textContent = "";
}

function updateStatus(msg) {
  status.textContent = msg;
}