/*************************
 * Mage Craft – ai.js
 * Basic Competitive AI
 *************************/

function aiTurn() {
  log("— AI Turn Begins —");

  // Draw up to 7 cards
  while (game.ai.hand.length < 7 && game.ai.deck.length > 0) {
    game.ai.hand.push(game.ai.deck.shift());
  }

  let bestPlay = null;
  let bestTSV = game.currentTSV;

  // Identify legal spell
  const spells = game.ai.hand.filter(c => c.type === "Spell");
  const fields = game.ai.hand.filter(c => c.type === "Field");
  const items = game.ai.hand.filter(c => c.type === "Item");

  spells.forEach(spell => {
    fields.forEach(field => {
      const affinityKey = "affinity" + field.element.toLowerCase();
      let tsv =
        game.currentTSV +
        (spell.basetsv || 0) +
        (spell[affinityKey] || 0);

      let usedItems = [];
      let itemTSV = 0;

      items.slice(0, 2).forEach(item => {
        let value = item.modifier || 0;
        if (item.element === spell.element) value += 1;
        if (item.element === field.element) value += 1;
        itemTSV += value;
        usedItems.push(item);
      });

      tsv += itemTSV;

      game.activeSummons.forEach(s => {
        if (s.auraValue) tsv += s.auraValue;
      });

      if (tsv > bestTSV) {
        bestTSV = tsv;
        bestPlay = { spell, field, items: usedItems, tsv };
      }
    });
  });

  // Summon play if threshold allows
  const summons = game.ai.hand.filter(
    c => c.type === "Summon" && game.threshold >= c.threshold
  );

  if (summons.length) {
    const summon = summons[0];
    game.activeSummons.push({ ...summon, burstUsed: false });
    game.ai.hand = game.ai.hand.filter(c => c !== summon);
    log(`AI summons ${summon.name}`);
  }

  // If AI cannot beat TSV → chain ends
  if (!bestPlay) {
    log("AI cannot beat the TSV.");
    resolveSpellChain("player");
    game.currentTSV = 0;
    game.threshold = 0;
    game.round++;
    statusEl.textContent = "Your turn";
    return;
  }

  // Execute AI play
  log(`AI plays ${bestPlay.spell.name}`);
  game.currentTSV = bestPlay.tsv;
  game.spellChain++;
  game.threshold++;

  // Remove cards from AI hand
  game.ai.hand = game.ai.hand.filter(
    c =>
      c !== bestPlay.spell &&
      c !== bestPlay.field &&
      !bestPlay.items.includes(c)
  );

  statusEl.textContent = "Your turn";
}