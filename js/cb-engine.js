// Call Bridge Game Engine
class CBEngine {
    constructor() {
        this.suits = ['♠', '♥', '♦', '♣'];
        this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.deck = [];
        this.players = [[], [], [], []]; // 0: Human, 1: Right, 2: Top, 3: Left
        this.bids = [0, 0, 0, 0];
        this.tricksWon = [0, 0, 0, 0];
        this.scores = [0, 0, 0, 0];
        this.currentTurn = 0;
        this.trump = '♠'; 
        
        // Trick state
        this.currentTrick = []; // [{playerIndex, card}]
        this.leadSuit = null;
        this.trickWinner = null;
        this.cardsPlayedThisRound = 0;
        this.roundNum = 1;
        this.maxRounds = 5;
        this.state = 'INIT'; // INIT, BIDDING, PLAYING, ROUND_OVER, GAME_OVER
    }

    generateDeck() {
        this.deck = [];
        for (let suit of this.suits) {
            for (let rank of this.ranks) {
                this.deck.push({ suit, rank, id: `${rank}${suit}` });
            }
        }
    }

    shuffleDeck() {
        for (let i = this.deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]];
        }
    }

    dealCards() {
        this.players = [[], [], [], []];
        for (let i = 0; i < 52; i++) {
            this.players[i % 4].push(this.deck[i]);
        }
        this.players.forEach(hand => this.sortHand(hand));
    }

    sortHand(hand) {
        const suitOrder = { '♠': 1, '♥': 2, '♣': 3, '♦': 4 };
        const rankOrder = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        hand.sort((a, b) => {
            if (suitOrder[a.suit] !== suitOrder[b.suit]) return suitOrder[a.suit] - suitOrder[b.suit];
            return rankOrder[a.rank] - rankOrder[b.rank];
        });
    }

    startNewRound() {
        this.generateDeck();
        this.shuffleDeck();
        this.dealCards();
        this.bids = [0, 0, 0, 0];
        this.tricksWon = [0, 0, 0, 0];
        this.currentTrick = [];
        this.leadSuit = null;
        this.cardsPlayedThisRound = 0;
        this.currentTurn = (this.roundNum - 1) % 4; // Dealer rotates
        this.state = 'BIDDING';
    }

    importState(deck, players, currentTurn) {
        this.deck = deck;
        this.players = players;
        this.bids = [0, 0, 0, 0];
        this.tricksWon = [0, 0, 0, 0];
        this.currentTrick = [];
        this.leadSuit = null;
        this.cardsPlayedThisRound = 0;
        this.currentTurn = currentTurn;
        this.state = 'BIDDING';
    }

    getCardValue(rank) {
        const order = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        return order[rank] || 0;
    }

    isValidPlay(playerIndex, card) {
        if (this.leadSuit === null) return true; // Leading the trick
        if (card.suit === this.leadSuit) return true; // Following suit
        
        const hand = this.players[playerIndex];
        const hasLeadSuit = hand.some(c => c.suit === this.leadSuit);
        if (hasLeadSuit) return false; // Must follow suit if possible
        
        // If they don't have the lead suit, they MUST play a spade (trump) if they have one
        const hasSpade = hand.some(c => c.suit === this.trump);
        if (hasSpade && card.suit !== this.trump) return false;
        
        // If playing a spade, they MUST beat the highest spade in the trick IF they can
        if (card.suit === this.trump) {
            let highestSpadeInTrick = -1;
            this.currentTrick.forEach(play => {
                if (play.card.suit === this.trump) {
                    const val = this.getCardValue(play.card.rank);
                    if (val > highestSpadeInTrick) highestSpadeInTrick = val;
                }
            });
            
            const cardVal = this.getCardValue(card.rank);
            const hasHigherSpade = hand.some(c => c.suit === this.trump && this.getCardValue(c.rank) > highestSpadeInTrick);
            
            if (hasHigherSpade && cardVal < highestSpadeInTrick) {
                return false;
            }
        }
        
        return true; 
    }

    playCard(playerIndex, cardIndex) {
        if (playerIndex !== this.currentTurn) return false;
        const card = this.players[playerIndex][cardIndex];
        
        if (!this.isValidPlay(playerIndex, card)) {
            console.warn(`Invalid play by player ${playerIndex}: ${card.rank}${card.suit}`);
            return false;
        }

        // Remove card from hand
        this.players[playerIndex].splice(cardIndex, 1);
        
        // Add to trick
        if (this.currentTrick.length === 0) {
            this.leadSuit = card.suit;
        }
        this.currentTrick.push({ playerIndex, card });
        
        return true;
    }

    resolveTrick() {
        let winningPlay = this.currentTrick[0];
        const rankOrder = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

        for (let i = 1; i < 4; i++) {
            const play = this.currentTrick[i];
            const wCard = winningPlay.card;
            const pCard = play.card;

            if (pCard.suit === this.trump && wCard.suit !== this.trump) {
                winningPlay = play;
            } else if (pCard.suit === wCard.suit && rankOrder[pCard.rank] > rankOrder[wCard.rank]) {
                winningPlay = play;
            }
        }

        const winnerIdx = winningPlay.playerIndex;
        this.tricksWon[winnerIdx]++;
        this.currentTurn = winnerIdx; // Winner leads next
        this.currentTrick = [];
        this.leadSuit = null;
        this.cardsPlayedThisRound += 4;
        
        return winnerIdx;
    }

    calculateScores() {
        for (let i = 0; i < 4; i++) {
            const bid = this.bids[i];
            const won = this.tricksWon[i];
            
            if (won < bid) {
                this.scores[i] -= bid; // Penalty
            } else {
                this.scores[i] += bid + ((won - bid) * 0.1); // Score + overtricks
            }
        }
    }
}
window.CBEngine = CBEngine;
