/*************************
 * Mage Craft – ai.js
 *************************/

const AI = {
  deck: [],
  hand: [],
  activeSummons: [],
  victoryPoints: 0,
  threshold: 0
};

/* -------------------------
   AI TURN ENTRY POINT
------------------------- */
function aiTakeTurn(playerTSV) {
  log("AI turn begins.");

  drawUpToSeven(AI);

  let bestPlay = evaluateBestPlay(playerTSV);

  if (!bestPlay) {
    log("AI passes. No valid play.");
    return finalizeAITurn(0);
  }

  executeAIPlay(bestPlay);

  const finalTSV = calculateAITSV(bestPlay);
  log(`AI final TSV: ${finalTSV}`);

  finalizeAITurn(finalTSV);
}

/* -------------------------
   DRAW
------------------------- */
function drawUpToSeven(actor) {
  while (actor.hand.length < 7 && actor.deck.length > 0) {
    actor.hand.push(actor.deck.shift());
  }
}

/* -------------------------
   PLAY EVALUATION
------------------------- */
function evaluateBestPlay(playerTSV) {
  let best = null;
  let bestTSV = -Infinity;

  const spells = AI.hand.filter(c => c.type === "Spell");
  const items = AI.hand.filter(c => c.type === "Item");
  const fields = AI.hand.filter(c => c.type === "Field");
  const summons = AI.hand.filter(c => c.type === "Summon");

  spells.forEach(spell => {
    fields.forEach(field => {
      const itemCombos = getItemCombos(items);

      itemCombos.forEach(combo => {
        const staged = [spell, field, ...combo];
        const tsv = calculateAITSV(staged);

        if (tsv > bestTSV && tsv >= playerTSV) {
          bestTSV = tsv;
          best = staged;
        }
      });
    });
  });

  // Summon-only or summon + spell lines
  summons.forEach(summon => {
    if (AI.threshold >= summon.threshold) {
      best = [summon];
    }
  });

  return best;
}

/* -------------------------
   ITEM COMBINATIONS (0–2)
------------------------- */
function getItemCombos(items) {
  const combos = [[]];

  for (let i = 0; i < items.length; i++) {
    combos.push([items[i]]);
    for (let j = i + 1; j < items.length; j++) {
      combos.push([items[i], items[j]]);
    }
  }

  return combos;
}

/* -------------------------
   TSV CALCULATION
------------------------- */
function calculateAITSV(cards) {
  let tsv = 0;
  let spell = cards.find(c => c.type === "Spell");
  let field = cards.find(c => c.type === "Field");

  if (!spell) return 0;

  tsv += spell.basetsv || 0;

  // Field affinity
  if (field) {
    const key = "affinity" + field.element.toLowerCase();
    tsv += spell[key] || 0;
  }

  // Items
  cards.forEach(card => {
    if (card.type === "Item") {
      if (card.modifier) tsv += card.modifier;

      if (card.specialeffect?.includes("fire") &&
          spell.element === "Fire") {
        tsv += 1;
      }
    }
  });

  // Summon Auras
  AI.activeSummons.forEach(summon => {
    if (!summon.auraActive) return;
    if (summon.aura?.element === spell.element) {
      tsv += summon.aura.bonus || 0;
    }
    if (summon.aura?.flatTSV) {
      tsv += summon.aura.flatTSV;
    }
  });

  // Attunement
  tsv += resolveAttunement(spell);

  return tsv;
}

/* -------------------------
   ATTUNEMENT
------------------------- */
function resolveAttunement(spell) {
  const roll = Math.ceil(Math.random() * 7);
  log(`AI attunement roll: ${roll}`);

  switch (spell.rarity) {
    case "Common": return roll >= 3 ? 1 : 0;
    case "Uncommon": return roll >= 5 ? 2 : 0;
    case "Rare": return roll >= 6 ? 3 : 0;
    case "Mythic": return roll >= 7 ? 5 : 0;
    default: return 0;
  }
}

/* -------------------------
   EXECUTE PLAY
------------------------- */
function executeAIPlay(cards) {
  cards.forEach(card => {
    AI.hand = AI.hand.filter(c => c !== card);

    if (card.type === "Summon") {
      AI.activeSummons.push({
        ...card,
        auraActive: true,
        burstUsed: false
      });
      log(`AI summons ${card.name}`);
    } else {
      log(`AI plays ${card.name}`);
    }
  });
}

/* -------------------------
   TURN FINALIZATION
------------------------- */
function finalizeAITurn(tsv) {
  AI.threshold += 1;

  if (tsv > game.currentTSV) {
    AI.victoryPoints += 1;
    log("AI wins the round.");
  } else {
    log("AI fails to beat TSV.");
  }

  log(`AI VP: ${AI.victoryPoints}`);
}