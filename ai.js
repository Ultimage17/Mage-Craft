/*************************
 * Mage Craft – ai.js
 *************************/

const AI = {
  deck: [],
  hand: [],
  activeSummons: [],
  victoryPoints: 0,

  draw(count = 1) {
    for (let i = 0; i < count; i++) {
      if (this.deck.length > 0) {
        this.hand.push(this.deck.shift());
      }
    }
  },

  /**
   * MAIN ENTRY POINT
   * Called from game.js after player locks TSV
   */
  takeTurn(playerTSV) {
    log("=== AI TURN ===");

    let bestPlay = null;
    let bestTSV = -Infinity;

    const spells = this.hand.filter(c => c.type === "Spell");
    const items = this.hand.filter(c => c.type === "Item");

    // Try every spell
    spells.forEach(spell => {
      const itemCombos = this.getItemCombos(items);

      itemCombos.forEach(combo => {
        const simulated = this.simulateTSV(spell, combo);
        if (simulated > bestTSV) {
          bestTSV = simulated;
          bestPlay = { spell, items: combo };
        }
      });
    });

    if (!bestPlay) {
      log("AI cannot play a spell.");
      return { tsv: 0, cardsPlayed: [] };
    }

    // Commit play
    const played = [];
    played.push(bestPlay.spell);
    bestPlay.items.forEach(i => played.push(i));

    // Remove cards from hand
    this.hand = this.hand.filter(
      c => !played.includes(c)
    );

    this.draw(played.length);

    log(`AI plays ${bestPlay.spell.name}`);
    log(`AI TSV: ${bestTSV}`);

    return {
      tsv: bestTSV,
      cardsPlayed: played
    };
  },

  /**
   * Generate all legal item combos (0–2)
   */
  getItemCombos(items) {
    const combos = [[]];

    for (let i = 0; i < items.length; i++) {
      combos.push([items[i]]);
      for (let j = i + 1; j < items.length; j++) {
        combos.push([items[i], items[j]]);
      }
    }

    return combos;
  },

  /**
   * TSV simulation using same rules as player
   */
  simulateTSV(spell, items) {
    let tsv = spell.basetsv || 0;

    // Field
    if (game.activeField) {
      const key =
        "affinity" + game.activeField.element.toLowerCase();
      tsv += spell[key] || 0;
    }

    // Items
    items.forEach(item => {
      if (item.modifier) tsv += item.modifier;
      if (item.element === spell.element) tsv += 1;
    });

    // Summon auras
    game.activeSummons.forEach(s => {
      if (s.aura?.tsvBonus) tsv += s.aura.tsvBonus;
    });

    return tsv;
  }
};