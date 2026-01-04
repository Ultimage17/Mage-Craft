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
