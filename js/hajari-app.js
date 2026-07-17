class HajariApp {
    constructor() {
        this.engine = new HajariEngine();
        this.bots = [
            null, // Player 0 (Human)
            new HajariBot(1),
            new HajariBot(2),
            new HajariBot(3)
        ];
        
        this.isOnlineMatch = false;
        this.isHost = false;
        this.hostPhone = null;
        this.myPlayerIndex = 0;
        this.lobbyPlayers = [];
        
        this.initUI();
    }

    initUI() {
        this.board = document.getElementById('gameBoard');
        
        window.startBotMatch = () => {
            this.isOnlineMatch = false;
            this.startNewGame();
        };

        if (typeof FirebaseManager !== 'undefined') {
            FirebaseManager.initOnlineStatus();
            
            // Listen for incoming invites globally
            FirebaseManager.listenForInvites(async (invite) => {
                const msg = `${invite.hostName} আপনাকে হাজারি খেলার জন্য আমন্ত্রণ জানিয়েছে। আপনি কি যোগ দিতে চান?`;
                const accepted = confirm(msg);
                if (accepted) {
                    FirebaseManager.respondToInvite(invite.hostPhone, 'accepted');
                    this.joinLobby(invite.hostPhone);
                } else {
                    FirebaseManager.respondToInvite(invite.hostPhone, 'rejected');
                }
            });
        }
    }
    
    // --- MULTIPLAYER LOBBY ---
    startMatchmaking() {
        showScreen('onlineLobby');
        if (typeof FirebaseManager !== 'undefined') {
            FirebaseManager.listenForOnlineUsers((users) => {
                const list = document.getElementById('hajariDynamicOnlineUsersList');
                if (!list) return;
                list.innerHTML = '';
                users.forEach(user => {
                    const item = document.createElement('div');
                    item.className = 'friend-item';
                    item.innerHTML = `
                        <div class="fi-avatar">${user.avatar || '👤'}<div class="online-dot"></div></div>
                        <div class="fi-info">
                            <div class="fi-name">${user.name}</div>
                            <div class="fi-status">${user.status || 'Active'}</div>
                        </div>
                        <button class="game-btn primary fi-invite-btn" data-phone="${user.phone}" style="padding: 4px 12px; font-size: 12px;" onclick="if(window.HajariApp) window.HajariApp.invitePlayer('${user.phone}', this)">আমন্ত্রণ</button>
                    `;
                    list.appendChild(item);
                });
            });
            
            let myName = "Player";
            let myAvatar = "😎";
            try {
                const profileStr = localStorage.getItem('29card_profile') || localStorage.getItem('userProfile');
                const sessionStr = localStorage.getItem('userSession');
                
                if (sessionStr) {
                    const session = JSON.parse(sessionStr);
                    if (session.name) myName = session.name;
                    if (session.avatarEmoji) myAvatar = session.avatarEmoji;
                }
                if (profileStr) {
                    const profile = JSON.parse(profileStr);
                    if (profile.name) myName = profile.name;
                    if (profile.avatar) myAvatar = profile.avatar;
                }
            } catch(e) {}
            
            this.isHost = true;
            this.lobbyPlayers = [{ phone: FirebaseManager.myUserId, name: myName, avatar: myAvatar, isHost: true }];
            this.updateLobbyUI();
            
            FirebaseManager.listenForInviteResponses((phone, response) => {
                if (response.status === 'accepted') {
                    if (this.lobbyPlayers.length < 4) {
                        this.lobbyPlayers.push({ phone, name: response.responderName, avatar: response.responderAvatar, isHost: false });
                        this.updateLobbyUI();
                        FirebaseManager.syncLobbyState(this.lobbyPlayers);
                    }
                    FirebaseManager.clearInvite(phone);
                }
            });
            
            // Auto fill with bots for now if not enough players (like call bridge)
            setTimeout(() => {
                if (this.lobbyPlayers.length < 4) {
                    const diff = 4 - this.lobbyPlayers.length;
                    for (let i = 1; i <= diff; i++) {
                        this.lobbyPlayers.push({ phone: 'bot_' + i, name: 'বট ' + i, avatar: '🤖', isHost: false });
                    }
                    this.updateLobbyUI();
                    FirebaseManager.syncLobbyState(this.lobbyPlayers);
                }
            }, 3000);
        }
    }

    invitePlayer(phone, btn) {
        let myName = "Player";
        let myAvatar = "😎";
        try {
            const profileStr = localStorage.getItem('29card_profile');
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                if (profile.name) myName = profile.name;
                if (profile.avatarEmoji) myAvatar = profile.avatarEmoji;
            }
        } catch(e) {}
        
        btn.innerText = 'আমন্ত্রণ পাঠানো হয়েছে';
        btn.disabled = true;
        FirebaseManager.sendInvite(phone, myName, myAvatar);
    }

    updateLobbyUI() {
        const slots = document.getElementById('hajariOnlineLobbySlots');
        if (!slots) return;
        slots.innerHTML = '';
        
        for (let i = 0; i < 4; i++) {
            const p = this.lobbyPlayers[i];
            const item = document.createElement('div');
            item.className = p ? 'friend-item' : 'friend-item empty-slot';
            
            if (p) {
                item.innerHTML = `
                    <div class="fi-avatar">${p.avatar || '👤'}<div class="online-dot"></div></div>
                    <div class="fi-info">
                        <div class="fi-name">${p.name} ${p.isHost ? '(Host)' : ''}</div>
                        <div class="fi-status">${p.phone.startsWith('bot') ? 'বট' : 'সংযুক্ত'}</div>
                    </div>
                `;
            } else {
                item.innerHTML = `
                    <div class="fi-avatar" style="background: rgba(255,255,255,0.1)">?</div>
                    <div class="fi-info">
                        <div class="fi-name" style="color: var(--text-muted)">অপেক্ষায়...</div>
                    </div>
                `;
            }
            slots.appendChild(item);
        }
        
        const startBtn = document.getElementById('hajariStartOnlineMatchBtn');
        const waitMsg = document.getElementById('hajariWaitingForHostMsg');
        
        if (startBtn && waitMsg) {
            if (this.isHost) {
                startBtn.style.display = 'block';
                waitMsg.style.display = 'none';
                startBtn.disabled = (this.lobbyPlayers.length !== 4);
                startBtn.style.opacity = startBtn.disabled ? '0.5' : '1';
            } else {
                startBtn.style.display = 'none';
                waitMsg.style.display = 'block';
            }
        }
    }

    joinLobby(hostPhone) {
        this.isHost = false;
        this.hostPhone = hostPhone;
        showScreen('onlineLobby');
        
        FirebaseManager.listenToLobby(hostPhone, (lobbyData) => {
            if (!lobbyData) return;
            if (lobbyData.players) {
                this.lobbyPlayers = lobbyData.players;
                this.updateLobbyUI();
            }
            if (lobbyData.status === 'started') {
                this.startOnlineMatch(lobbyData);
            }
        });
    }

    startLobbyGame() {
        if (this.lobbyPlayers.length < 4) return;
        this.isHost = true;
        this.hostPhone = FirebaseManager.myUserId;
        this.engine.startNewRound();
        
        const lobbyData = { deck: this.engine.deck, players: this.lobbyPlayers };
        FirebaseManager.startOnlineGame(this.engine.deck, this.lobbyPlayers);
        this.startOnlineMatch(lobbyData);
    }
    
    startOnlineMatch(lobbyData) {
        this.isOnlineMatch = true;
        showScreen('gameBoard');
        
        // Find my index
        this.myPlayerIndex = Math.max(0, lobbyData.players.findIndex(p => p.phone === FirebaseManager.myUserId));
        
        if (!this.isHost) {
            // Reconstruct deck state from lobbyData
            this.engine.deck = lobbyData.deck;
            this.engine.dealCards();
        }
        
        // Setup avatars based on lobby
        this.setupAvatars();
        
        this.renderPlayerHand();
        this.showMessage("আপনার ১৩টি কার্ড সাজান");
        
        FirebaseManager.listenForGameActions(this.hostPhone, (actionObj) => {
            if (!actionObj) return;
            this.handleOnlineAction(actionObj);
        });
        
        if (this.isHost) {
            // Auto-group for bots
            for (let i = 0; i < 4; i++) {
                const p = this.lobbyPlayers[i];
                if (p && p.phone && p.phone.startsWith('bot_')) {
                    setTimeout(() => {
                        let sets = this.bots[i].arrangeCards(this.engine.players[i], this.engine);
                        // Engine submits and then we broadcast
                        this.engine.submitPlayerSets(i, sets[0], sets[1], sets[2], sets[3]);
                        
                        FirebaseManager.sendGameAction(this.hostPhone, 'SUBMIT_SETS', {
                            playerIndex: i,
                            sets: sets
                        });
                        
                        // Check if all submitted
                        let allSubmitted = true;
                        for(let j=0; j<4; j++){
                            if(!this.engine.playerSets[j]) allSubmitted = false;
                        }
                        if (allSubmitted) {
                            this.evaluateRoundOnline();
                        }
                    }, 2000 + (i * 500));
                }
            }
        }
    }

    handleOnlineAction(actionObj) {
        const type = actionObj.type;
        const data = actionObj.data || {};
        
        if (type === 'SUBMIT_SETS') {
            const pIdx = data.playerIndex;
            // Prevent duplicate submission
            if (!this.engine.playerSets[pIdx]) {
                this.engine.submitPlayerSets(pIdx, data.sets[0], data.sets[1], data.sets[2], data.sets[3]);
            }
            if (pIdx !== this.myPlayerIndex) {
                this.showMessage(`Player ${pIdx} has submitted their sets.`);
            }
            
            // If all 4 sets submitted, evaluate
            let allSubmitted = true;
            for(let i=0; i<4; i++){
                if(!this.engine.playerSets[i]) allSubmitted = false;
            }
            if (allSubmitted) {
                this.evaluateRoundOnline();
            }
        }
    }
    
    evaluateRoundOnline() {
        console.log("Online Round Evaluation:", this.engine.playerSets);
        setTimeout(() => {
            this.showMessage("খেলা শেষ! (ফলাফল কনসোলে)");
        }, 1500);
    }
    
    setupAvatars() {
        // Adjust the player names on board
        if (this.lobbyPlayers.length === 4) {
            for (let i = 0; i < 4; i++) {
                const pIndex = (this.myPlayerIndex + i) % 4;
                const p = this.lobbyPlayers[pIndex];
                const seat = document.getElementById(`playerSeat_${i}`);
                if (seat && p) {
                    const avatarEl = seat.querySelector('.player-avatar-game');
                    const nameEl = seat.querySelector('.player-name-game');
                    if (avatarEl) avatarEl.textContent = p.avatar || '👤';
                    if (nameEl) nameEl.textContent = (i === 0) ? 'আপনি' : (p.name || `Player ${i}`);
                }
            }
        }
    }
    
    // --- OFFLINE MATCH ---
    startNewGame() {
        showScreen('gameBoard');
        this.engine.startNewRound();
        
        // Reset avatars to bots
        for (let i = 1; i <= 3; i++) {
            const seat = document.getElementById(`playerSeat_${i}`);
            if (seat) {
                const avatarEl = seat.querySelector('.player-avatar-game');
                const nameEl = seat.querySelector('.player-name-game');
                if (avatarEl) avatarEl.textContent = '🤖';
                if (nameEl) nameEl.textContent = `বট ${i}`;
            }
        }
        
        this.renderPlayerHand();
        
        // Bot auto-grouping
        for (let i = 1; i <= 3; i++) {
            let sets = this.bots[i].arrangeCards(this.engine.players[i], this.engine);
            this.engine.submitPlayerSets(i, sets[0], sets[1], sets[2], sets[3]);
        }
        
        this.showMessage("আপনার ১৩টি কার্ড সাজান");
    }

    renderPlayerHand() {
        const handDiv = document.getElementById('myHand');
        if (!handDiv) return;
        
        handDiv.innerHTML = '';
        const cards = this.engine.players[this.isOnlineMatch ? this.myPlayerIndex : 0];
        
        // Render 13 cards with standard overlapping styles and drag-and-drop
        let draggedCard = null;

        cards.forEach((card, index) => {
            let el = document.createElement('div');
            const colorClass = (card.suit === '♥' || card.suit === '♦') ? 'red' : 'black';
            el.className = `hand-card ${colorClass}`;
            el.draggable = true;
            
            // --- Drag and Drop Logic ---
            el.addEventListener('dragstart', function(e) {
                draggedCard = this;
                setTimeout(() => this.style.opacity = '0.5', 0);
            });
            el.addEventListener('dragend', function() {
                setTimeout(() => this.style.opacity = '1', 0);
                draggedCard = null;
            });
            el.addEventListener('dragover', function(e) {
                e.preventDefault(); // Allow drop
            });
            el.addEventListener('drop', function(e) {
                e.preventDefault();
                if (draggedCard && draggedCard !== this) {
                    let allCards = Array.from(handDiv.children);
                    let draggedIndex = allCards.indexOf(draggedCard);
                    let targetIndex = allCards.indexOf(this);
                    
                    if (draggedIndex < targetIndex) {
                        handDiv.insertBefore(draggedCard, this.nextSibling);
                    } else {
                        handDiv.insertBefore(draggedCard, this);
                    }
                }
            });

            // --- Touch/Click Fallback Logic ---
            el.onclick = () => {
                if (!draggedCard) {
                    draggedCard = el;
                    el.classList.add('highlight-card');
                } else if (draggedCard === el) {
                    draggedCard.classList.remove('highlight-card');
                    draggedCard = null;
                } else {
                    let allCards = Array.from(handDiv.children);
                    let draggedIndex = allCards.indexOf(draggedCard);
                    let targetIndex = allCards.indexOf(el);
                    
                    if (draggedIndex < targetIndex) {
                        handDiv.insertBefore(draggedCard, el.nextSibling);
                    } else {
                        handDiv.insertBefore(draggedCard, el);
                    }
                    draggedCard.classList.remove('highlight-card');
                    draggedCard = null;
                }
            };
            
            el.innerHTML = `<span class="hc-rank">${card.rank}</span><span class="hc-suit">${card.suit}</span>`;
            handDiv.appendChild(el);
        });

        // Add a mock submit button
        let btnContainer = document.getElementById('hajariSubmitContainer');
        if (!btnContainer) {
            btnContainer = document.createElement('div');
            btnContainer.id = 'hajariSubmitContainer';
            btnContainer.style.position = 'absolute';
            btnContainer.style.bottom = '110px';
            btnContainer.style.width = '100%';
            btnContainer.style.display = 'flex';
            btnContainer.style.justifyContent = 'center';
            btnContainer.style.zIndex = '1000';
            document.getElementById('gameBoard').appendChild(btnContainer);
        }
        btnContainer.innerHTML = ''; // clear old button
        
        let btn = document.createElement('button');
        btn.className = 'game-btn primary';
        btn.textContent = 'সাবমিট করুন';
        btn.style.padding = '8px 24px';
        btn.style.fontSize = '14px';
        btn.style.borderRadius = '20px';
        btn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.5)';
        btn.style.border = '2px solid #f1c40f'; // Add gold border to make it pop
        btn.onclick = () => {
            // Create sets from DOM order
            // For now, auto group player cards like bot since UI visual grouping isn't fully 3-3-3-4 yet
            let dummyBot = new HajariBot(0);
            let sets = dummyBot.arrangeCards(cards, this.engine);
            const pIdx = this.isOnlineMatch ? this.myPlayerIndex : 0;
            
            this.engine.submitPlayerSets(pIdx, sets[0], sets[1], sets[2], sets[3]);
            this.showMessage("সেট সাবমিট হয়েছে!");
            btn.style.display = 'none'; // Hide after submit
            
            if (this.isOnlineMatch) {
                FirebaseManager.sendGameAction(this.hostPhone, 'SUBMIT_SETS', {
                    playerIndex: pIdx,
                    sets: sets
                });
                
                // If Host submits last, check if all submitted
                if (this.isHost) {
                    let allSubmitted = true;
                    for(let j=0; j<4; j++){
                        if(!this.engine.playerSets[j]) allSubmitted = false;
                    }
                    if (allSubmitted) {
                        this.evaluateRoundOnline();
                    }
                }
            } else {
                this.evaluateRound();
            }
        };
        btnContainer.appendChild(btn);
    }

    evaluateRound() {
        console.log("Offline Player Sets:", this.engine.playerSets);
        setTimeout(() => {
            this.showMessage("খেলা শেষ! (ফলাফল কনসোলে)");
        }, 1500);
    }

    showMessage(msg) {
        let el = document.getElementById('hajariMessage');
        if (!el) {
            el = document.createElement('div');
            el.id = 'hajariMessage';
            el.style.position = 'absolute';
            el.style.top = '40%';
            el.style.left = '50%';
            el.style.transform = 'translate(-50%, -50%)';
            el.style.background = 'rgba(0,0,0,0.7)';
            el.style.border = '1px solid #f1c40f';
            el.style.color = 'white';
            el.style.padding = '8px 16px';
            el.style.borderRadius = '20px';
            el.style.fontSize = '12px';
            el.style.zIndex = '9999';
            el.style.textAlign = 'center';
            el.style.whiteSpace = 'nowrap';
            document.getElementById('gameBoard').appendChild(el);
        }
        el.textContent = msg;
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            if (el && el.parentNode) {
                el.style.display = 'none';
            }
        }, 3000);
        el.style.display = 'block';
    }
}

// Global hook
let HApp = null;
window.addEventListener('DOMContentLoaded', () => {
    HApp = new HajariApp();
    window.HajariApp = HApp;
});
