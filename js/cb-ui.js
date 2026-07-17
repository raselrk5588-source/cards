// Call Bridge UI Renderer
class CBUI {
    static renderHand(hand, containerId = 'myHand', isHuman = true) {
        const container = document.getElementById(containerId);
        container.innerHTML = '';
        
        // Ensure engine is loaded to check validity
        const engine = window.CBApp ? CBApp.engine : null;
        const isMyTurn = engine && engine.currentTurn === 0 && engine.state === 'PLAYING';

        hand.forEach((card, index) => {
            const colorClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
            const cardEl = document.createElement('div');
            
            // Validate the play for the human
            let isValid = true;
            if (isHuman && isMyTurn && engine) {
                isValid = engine.isValidPlay(0, card);
            }
            
            // Add disabled-card class if it's the human's turn but the card is invalid
            const disabledClass = (!isValid && isHuman && isMyTurn) ? ' disabled-card' : '';
            const highlightClass = (isValid && isHuman && isMyTurn) ? ' highlight-card' : '';
            cardEl.className = `hand-card ${colorClass}${disabledClass}${highlightClass}`;
            
            if (isHuman) {
                cardEl.innerHTML = `<span class="hc-rank">${card.rank}</span><span class="hc-suit">${card.suit}</span>`;
                cardEl.onclick = () => {
                    if (!isValid && isMyTurn) return; // Prevent click on invalid cards
                    if (window.CBApp) CBApp.handleCardClick(index);
                };
            } else {
                cardEl.innerHTML = `<div style="width:100%;height:100%;background:repeating-linear-gradient(45deg, #2c3e50, #2c3e50 5px, #34495e 5px, #34495e 10px);border-radius:4px;"></div>`;
            }
            container.appendChild(cardEl);
        });
    }

    static renderTable(players, trick) {
        const table = document.getElementById('gameTableFelt');
        if (!table) return;

        const positions = [
            { id: 'playerSeat_0', class: 'bottom', name: 'আপনি', avatar: '👤' },
            { id: 'playerSeat_1', class: 'left', name: 'বট ১', avatar: '🤖' },
            { id: 'playerSeat_2', class: 'top', name: 'বট ২', avatar: '🤖' },
            { id: 'playerSeat_3', class: 'right', name: 'বট ৩', avatar: '🤖' }
        ];

        if (window.CBApp && CBApp.isOnlineMatch && CBApp.lobbyPlayers) {
            for (let i = 0; i < 4; i++) {
                const originalIndex = (CBApp.myPlayerIndex + i) % 4;
                const playerMeta = CBApp.lobbyPlayers[originalIndex];
                if (playerMeta) {
                    positions[i].name = i === 0 ? 'আপনি' : (playerMeta.name || `Player ${originalIndex}`);
                    positions[i].avatar = playerMeta.avatar || '👤';
                }
            }
        }

        // Ensure engine is loaded
        const engine = window.CBApp ? CBApp.engine : { bids: [0,0,0,0], tricksWon: [0,0,0,0], currentTurn: 0 };
        const bids = engine.bids || [0,0,0,0];
        const tricks = engine.tricksWon || [0,0,0,0];

        // 1. Render Players
        positions.forEach((pos, i) => {
            let playerDiv = document.getElementById(pos.id);
            if (!playerDiv) {
                playerDiv = document.createElement('div');
                playerDiv.id = pos.id;
                playerDiv.className = `player-seat ${pos.class}`;
                table.appendChild(playerDiv);
            }

            const isActive = (engine.currentTurn === i && engine.state === 'PLAYING');
            
            playerDiv.innerHTML = `
                <div class="player-avatar-game${isActive ? ' active-turn' : ''}">
                    ${pos.avatar}
                    ${bids[i] > 0 ? `<div class="bot-bid-badge">${bids[i]}</div>` : ''}
                    ${isActive ? '<div class="timer-ring"></div>' : ''}
                </div>
                <div class="player-name-game">${pos.name}</div>
                <div class="player-badge">
                    <span style="color:#f1c40f;font-size:10px">Won: ${tricks[i]}</span>
                </div>
            `;
        });

        // 2. Render Trick Area
        let trickArea = document.getElementById('trickArea');
        if (!trickArea) {
            trickArea = document.createElement('div');
            trickArea.id = 'trickArea';
            trickArea.className = 'trick-area';
            table.appendChild(trickArea);
        }

        trickArea.innerHTML = '';
        if (trick && trick.length > 0) {
            trick.forEach(play => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'trick-card';
                cardDiv.innerHTML = `<span class="hc-rank">${play.card.rank}</span><span class="hc-suit">${play.card.suit}</span>`;
                
                if (play.card.suit === '♥' || play.card.suit === '♦') {
                    cardDiv.classList.add('red');
                } else {
                    cardDiv.classList.add('black');
                }

                // Position based on playerIndex
                const idx = play.playerIndex;
                if (idx === 0) { cardDiv.style.bottom = '10px'; cardDiv.style.left = '50%'; cardDiv.style.transform = 'translateX(-50%)'; }
                else if (idx === 1) { cardDiv.style.left = '10px'; cardDiv.style.top = '50%'; cardDiv.style.transform = 'translateY(-50%)'; }
                else if (idx === 2) { cardDiv.style.top = '10px'; cardDiv.style.left = '50%'; cardDiv.style.transform = 'translateX(-50%)'; }
                else if (idx === 3) { cardDiv.style.right = '10px'; cardDiv.style.top = '50%'; cardDiv.style.transform = 'translateY(-50%)'; }
                
                trickArea.appendChild(cardDiv);
            });
        }
    }

    static showBiddingModal() {
        const biddingBar = document.getElementById('biddingBar');
        if (!biddingBar) return;
        biddingBar.innerHTML = '';
        
        // Single row of buttons like 29 card game
        for (let i = 1; i <= 8; i++) {
            const btn = document.createElement('button');
            btn.className = 'game-btn primary';
            btn.textContent = `${i}`; // Just number
            btn.style.padding = '8px 16px';
            btn.style.minWidth = '44px';
            btn.style.margin = '4px';
            btn.style.fontSize = '16px';
            btn.onclick = () => {
                biddingBar.style.display = 'none';
                if (window.CBApp) CBApp.handlePlayerBid(i);
            };
            biddingBar.appendChild(btn);
        }
        
        // Show as standard flex layout, with wrap to prevent overflow
        biddingBar.style.display = 'flex';
        biddingBar.style.flexWrap = 'wrap';
        biddingBar.style.maxWidth = '320px';
        biddingBar.style.justifyContent = 'center';
    }

    static showChatBubble(playerIndex, text) {
        const gameTable = document.getElementById('gameTableFelt');
        if (!gameTable) return;

        const bubble = document.createElement('div');
        bubble.className = 'chat-bubble';
        bubble.innerText = text;
        bubble.style.position = 'absolute';
        bubble.style.zIndex = '50';
        bubble.style.opacity = '1';
        bubble.style.transform = 'translateY(0)';
        bubble.style.padding = '4px 10px';
        bubble.style.background = 'white';
        bubble.style.color = '#1a1a1a';
        bubble.style.borderRadius = '12px';
        bubble.style.fontSize = '12px';
        bubble.style.fontWeight = 'bold';
        bubble.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';

        // Position based on playerIndex
        if (playerIndex === 1) { bubble.style.left = '80px'; bubble.style.top = '40%'; } // Left bot
        else if (playerIndex === 2) { bubble.style.top = '80px'; bubble.style.left = '50%'; bubble.style.transform = 'translateX(-50%)'; } // Top bot
        else if (playerIndex === 3) { bubble.style.right = '80px'; bubble.style.top = '40%'; } // Right bot
        else { bubble.style.bottom = '120px'; bubble.style.left = '50%'; bubble.style.transform = 'translateX(-50%)'; } // Human
        
        gameTable.appendChild(bubble);

        // Remove bubble after 2 seconds
        setTimeout(() => {
            bubble.style.opacity = '0';
            setTimeout(() => bubble.remove(), 300);
        }, 1500);
    }
}
window.CBUI = CBUI;
