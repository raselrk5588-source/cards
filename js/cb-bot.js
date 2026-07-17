// Call Bridge Bot AI
class CBBot {
    static calculateBid(hand) {
        let bid = 0;
        const rankOrder = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        
        hand.forEach(card => {
            if (card.rank === 'A') bid++;
            if (card.rank === 'K' && Math.random() > 0.5) bid++;
            if (card.suit === '♠' && rankOrder[card.rank] >= 11) bid++; 
        });

        if (bid < 1) bid = 1;
        if (bid > 8) bid = 8;
        return bid;
    }

    static playCard(hand, leadSuit, trumpSuit, currentTrick) {
        const rankOrder = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        
        // Find valid cards to play
        let validCards = [];
        if (leadSuit === null) {
            validCards = [...hand]; // Can lead any card
        } else {
            const suitCards = hand.filter(c => c.suit === leadSuit);
            if (suitCards.length > 0) {
                validCards = suitCards; // Must follow suit
            } else {
                const trumpCards = hand.filter(c => c.suit === trumpSuit);
                if (trumpCards.length > 0) {
                    let highestTrumpInTrick = -1;
                    currentTrick.forEach(p => {
                        if (p.card.suit === trumpSuit) {
                            const val = rankOrder[p.card.rank];
                            if (val > highestTrumpInTrick) highestTrumpInTrick = val;
                        }
                    });
                    
                    const higherTrumps = trumpCards.filter(c => rankOrder[c.rank] > highestTrumpInTrick);
                    if (higherTrumps.length > 0) {
                        validCards = higherTrumps; // Must overtrump
                    } else {
                        validCards = trumpCards; // Must play trump even if losing
                    }
                } else {
                    validCards = [...hand]; // Can play any card (including trump)
                }
            }
        }

        // Extremely simple AI: play a random valid card
        // Let's sort valid cards by rank
        validCards.sort((a, b) => rankOrder[a.rank] - rankOrder[b.rank]);

        if (leadSuit === null) {
            // Leading: Play highest card
            return hand.findIndex(c => c === validCards[validCards.length - 1]);
        }

        // If we have to follow suit or trump, play lowest to be safe
        return hand.findIndex(c => c === validCards[0]);
    }
}
window.CBBot = CBBot;
