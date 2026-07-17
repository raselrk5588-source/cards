// Hajari Game Engine
class HajariEngine {
    constructor() {
        this.suits = ['♠', '♥', '♦', '♣'];
        this.ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        this.deck = [];
        this.players = [[], [], [], []]; // 0: South (Human), 1: East, 2: North, 3: West
        
        // Game state
        this.scores = [0, 0, 0, 0];
        this.roundNum = 1;
        this.state = 'INIT'; // INIT, GROUPING, SHOWDOWN, ROUND_OVER
        
        // Player sets (each player submits 4 arrays of cards: 3, 3, 3, 4)
        this.playerSets = [[], [], [], []];
    }

    generateDeck() {
        this.deck = [];
        for (let suit of this.suits) {
            for (let rank of this.ranks) {
                this.deck.push({ suit, rank, id: `${rank}${suit}`, value: this.getCardValue(rank) });
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
        this.playerSets = [[], [], [], []];
        for (let i = 0; i < 52; i++) {
            this.players[i % 4].push(this.deck[i]);
        }
        this.players.forEach(hand => {
            hand.sort((a, b) => b.value - a.value); // Sort descending
        });
    }

    startNewRound() {
        this.generateDeck();
        this.shuffleDeck();
        this.dealCards();
        this.state = 'GROUPING'; // Players are grouping cards
    }

    getCardValue(rank) {
        const order = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
        return order[rank] || 0;
    }

    /**
     * Evaluates a set of 3 cards (if 4 cards, takes top 3).
     * Returns an object { type: number, score: number, name: string }
     * Types (higher is better):
     * 6: Troy (3 of a kind)
     * 5: Color Run (Straight Flush)
     * 4: Run (Straight)
     * 3: Color (Flush)
     * 2: Pair (2 of a kind)
     * 1: High Card
     */
    evaluateSet(cards) {
        if (!cards || cards.length < 3) return { type: 0, score: 0, name: 'Invalid' };
        
        let c = [...cards].sort((a, b) => b.value - a.value);
        if (c.length === 4) {
            // For the 4-card set, usually the lowest is discarded for comparison
            // Or it acts as a kicker. We'll evaluate the top 3 cards.
            c = c.slice(0, 3);
        }

        const isColor = (c[0].suit === c[1].suit && c[1].suit === c[2].suit);
        
        // Check for Run
        let isRun = false;
        // Standard run
        if (c[0].value === c[1].value + 1 && c[1].value === c[2].value + 1) {
            isRun = true;
        } 
        // A, 2, 3 special run
        else if (c[0].rank === 'A' && c[1].rank === '3' && c[2].rank === '2') {
            isRun = true;
            // Re-order to make 3 the highest for scoring purposes, or just give it a specific score
            c = [c[1], c[2], c[0]]; // 3, 2, A
        }

        const isTroy = (c[0].value === c[1].value && c[1].value === c[2].value);
        const isPair = (c[0].value === c[1].value) || (c[1].value === c[2].value) || (c[0].value === c[2].value);

        let type = 1;
        let name = "High Card";
        let score = 0;

        if (isTroy) {
            type = 6;
            name = "Troy";
            score = c[0].value;
        } else if (isRun && isColor) {
            type = 5;
            name = "Color Run";
            score = c[0].value; // Highest card
        } else if (isRun) {
            type = 4;
            name = "Run";
            score = c[0].value;
        } else if (isColor) {
            type = 3;
            name = "Color";
            score = (c[0].value * 10000) + (c[1].value * 100) + c[2].value;
        } else if (isPair) {
            type = 2;
            name = "Pair";
            let pairVal = c[0].value === c[1].value ? c[0].value : c[1].value;
            let kicker = c[0].value === c[1].value ? c[2].value : (c[1].value === c[2].value ? c[0].value : c[2].value);
            score = (pairVal * 100) + kicker;
        } else {
            type = 1;
            name = "High Card";
            score = (c[0].value * 10000) + (c[1].value * 100) + c[2].value;
        }

        return { type, score, name, original: cards };
    }

    submitPlayerSets(playerIndex, set1, set2, set3, set4) {
        // Evaluate each set to ensure they are valid
        const e1 = this.evaluateSet(set1);
        const e2 = this.evaluateSet(set2);
        const e3 = this.evaluateSet(set3);
        const e4 = this.evaluateSet(set4);
        
        this.playerSets[playerIndex] = [
            { cards: set1, eval: e1 },
            { cards: set2, eval: e2 },
            { cards: set3, eval: e3 },
            { cards: set4, eval: e4 }
        ];
    }
}
