let cardsDB;
const log = document.getElementById("log");

fetch("cards.json")
  .then(response => response.json())
  .then(db => {
    cardsDB = db;
    populateDecks();
    write("Cards loaded successfully.");
    write("Select decks and begin playtesting.");
  });

function populateDecks() {
  const decks = [
    "Flame Heart",
    "Tidal Soul",
    "Stone Body",
    "Clouded Mind"
  ];

  const playerSelect = document.getElementById("playerDeck");
  const aiSelect = document.getElementById("aiDeck");

  decks.forEach(deck => {
    playerSelect.add(new Option(deck, deck));
    aiSelect.add(new Option(deck, deck));
  });
}

function startGame() {
  log.textContent = "";
  document.getElementById("startBtn").onclick = () => {
  game.startGame();
  document.getElementById("status").textContent = "Your turn – play the first spell";
  document.getElementById("passBtn").disabled = false;

  renderHand();
  log("Game started. You draw 7 cards.");
};
  write("=== Mage Craft Match Started ===");
  write("Player Deck: " + playerDeck.value);
  write("AI Deck: " + aiDeck.value);
  write("Ruleset: Final Validated Rulebook");
  write("Spell chains, summons, attunement, and scoring enabled.");
  write("");
  write("Awaiting first spell...");
}

function write(message) {
  log.textContent += message + "\n";
}
let selectedCardIndex = null;
function renderHand() {
  const handEl = document.getElementById("hand");
  handEl.innerHTML = "";

  game.player.hand.forEach((card, index) => {
    const li = document.createElement("li");
    li.textContent = `${card.name} (${card.type}, ${card.element})`;
    li.style.cursor = "pointer";

    li.onclick = () => {
      selectedCardIndex = index;
      document.getElementById("selectedCard").textContent =
        `${card.name} – ${card.type} – ${card.element}`;
      document.getElementById("playCardBtn").disabled = false;
    };

    handEl.appendChild(li);
  });
}
function log(message) {
  const logEl = document.getElementById("log");
  logEl.textContent += message + "\n";
}document.getElementById("playCardBtn").onclick = () => {
  if (selectedCardIndex === null) return;

  const card = game.player.hand[selectedCardIndex];

  const result = game.playPlayerCard(card);

  log(`You played ${card.name}`);
  log(result.message);

  selectedCardIndex = null;
  document.getElementById("selectedCard").textContent = "None";
  document.getElementById("playCardBtn").disabled = true;

  renderHand();

  if (result.chainEnded) {
    log("Chain ended. Scoring round.");
  } else {
    game.aiTurn(log);
    renderHand();
  }
};
document.getElementById("passBtn").onclick = () => {
  log("You pass.");
  game.aiTurn(log);
  renderHand();
};
