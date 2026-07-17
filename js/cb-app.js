// Call Bridge Main App
class CBApp {
    static init() {
        this.engine = new CBEngine();
        this.isOnlineMatch = false;
        this.isHost = false;
        this.hostPhone = null;
        this.myPlayerIndex = 0;
        
        if (typeof FirebaseManager !== 'undefined') {
            FirebaseManager.initOnlineStatus();
            
            // Listen for incoming invites globally
            FirebaseManager.listenForInvites(async (invite) => {
                const msg = `${invite.hostName} আপনাকে খেলার জন্য আমন্ত্রণ জানিয়েছে। আপনি কি যোগ দিতে চান?`;
                const accepted = (typeof showCustomConfirm !== 'undefined') 
                    ? await showCustomConfirm('খেলার আমন্ত্রণ', msg) 
                    : confirm(msg);
                    
                if (accepted) {
                    FirebaseManager.respondToInvite(invite.hostPhone, 'accepted');
                    CBApp.joinLobby(invite.hostPhone);
                } else {
                    FirebaseManager.respondToInvite(invite.hostPhone, 'rejected');
                }
            });
        }
    }

    static startMatchmaking() {
        showScreen('onlineLobby');
        if (typeof FirebaseManager !== 'undefined') {
            FirebaseManager.listenForOnlineUsers((users) => {
                const list = document.getElementById('cbDynamicOnlineUsersList');
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
                        <button class="game-btn primary fi-invite-btn" data-phone="${user.phone}" style="padding: 4px 12px; font-size: 12px;" onclick="CBApp.invitePlayer('${user.phone}', this)">আমন্ত্রণ</button>
                    `;
                    list.appendChild(item);
                });
            });
            
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
            
            this.isHost = true;
            this.lobbyPlayers = [{ phone: FirebaseManager.myUserId, name: myName, avatar: myAvatar, isHost: true }];
            this.updateLobbyUI();
            
            FirebaseManager.listenForInviteResponses((phone, response) => {
                const listContainer = document.getElementById('cbDynamicOnlineUsersList');
                if (response.status === 'accepted') {
                    if (this.lobbyPlayers.length < 4) {
                        this.lobbyPlayers.push({ phone, name: response.responderName, avatar: response.responderAvatar, isHost: false });
                        this.updateLobbyUI();
                        FirebaseManager.syncLobbyState(this.lobbyPlayers);
                    }
                    if (listContainer) {
                        const btns = listContainer.querySelectorAll('.fi-invite-btn');
                        btns.forEach(b => {
                            if (b.dataset.phone === phone) {
                                b.innerText = 'যুক্ত হয়েছে';
                                b.style.color = '#f1c40f';
                                b.style.background = 'transparent';
                                b.style.border = '1px solid #f1c40f';
                                b.style.opacity = '1';
                                b.disabled = true;
                            }
                        });
                    }
                    FirebaseManager.clearInvite(phone);
                } else if (response.status === 'rejected') {
                    if (listContainer) {
                        const btns = listContainer.querySelectorAll('.fi-invite-btn');
                        btns.forEach(b => {
                            if (b.dataset.phone === phone) {
                                b.innerText = 'বাতিল করেছে';
                                b.style.color = '#ff4444';
                                b.style.background = 'transparent';
                                b.style.border = '1px solid #ff4444';
                                b.style.opacity = '1';
                                b.disabled = true;
                                setTimeout(() => {
                                    b.innerText = 'আমন্ত্রণ';
                                    b.style.color = '';
                                    b.style.background = '';
                                    b.style.border = '';
                                    b.style.opacity = '1';
                                    b.disabled = false;
                                }, 3000);
                            }
                        });
                    }
                }
            });
        }
    }

    static invitePlayer(phone, btnElement) {
        FirebaseManager.sendInvite(phone);
        if (btnElement) {
            btnElement.textContent = "পাঠানো হয়েছে";
            btnElement.disabled = true;
            btnElement.style.opacity = "0.5";
        }
    }

    static updateLobbyUI() {
        const slots = document.getElementById('cbOnlineLobbySlots');
        if (!slots) return;
        slots.innerHTML = '';
        for (let i=0; i<4; i++) {
            if (i < this.lobbyPlayers.length) {
                const p = this.lobbyPlayers[i];
                slots.innerHTML += `
                    <div class="friend-item">
                        <div class="fi-avatar">${p.avatar}<div class="online-dot"></div></div>
                        <div class="fi-info">
                            <div class="fi-name">${p.name} ${p.isHost ? '(Host)' : ''}</div>
                            <div class="fi-status">সংযুক্ত</div>
                        </div>
                    </div>`;
            } else {
                slots.innerHTML += `
                    <div class="friend-item empty-slot">
                        <div class="fi-avatar" style="background: rgba(255,255,255,0.1)">?</div>
                        <div class="fi-info"><div class="fi-name" style="color: var(--text-muted)">অপেক্ষায়...</div></div>
                    </div>`;
            }
        }
        const startBtn = document.getElementById('cbStartOnlineMatchBtn');
        const waitMsg = document.getElementById('cbWaitingForHostMsg');
        if (startBtn && waitMsg) {
            if (this.isHost) {
                startBtn.style.display = 'block';
                waitMsg.style.display = 'none';
                startBtn.disabled = (this.lobbyPlayers.length !== 4 || this.lobbyPlayers[0].phone !== FirebaseManager.myUserId);
                startBtn.style.opacity = startBtn.disabled ? '0.5' : '1';
            } else {
                startBtn.style.display = 'none';
                waitMsg.style.display = 'block';
            }
        }
        
        // Hide invite section if not host
        const inviteTitle = document.getElementById('cbOnlineUsersTitle');
        const inviteList = document.getElementById('cbDynamicOnlineUsersList');
        if (inviteTitle && inviteList) {
            if (this.isHost) {
                inviteTitle.style.display = 'block';
                inviteList.style.display = 'block';
                
                // Disable invites if lobby is full
                const isFull = this.lobbyPlayers.length >= 4;
                const btns = inviteList.querySelectorAll('.fi-invite-btn');
                btns.forEach(b => {
                    if (b.innerText === 'আমন্ত্রণ') {
                        b.disabled = isFull;
                        b.style.opacity = isFull ? '0.5' : '1';
                    }
                });
            } else {
                inviteTitle.style.display = 'none';
                inviteList.style.display = 'none';
            }
        }
    }

    static joinLobby(hostPhone) {
        this.isHost = false;
        this.hostPhone = hostPhone;
        if (typeof showScreen !== 'undefined') showScreen('onlineLobby');
        
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

    static startLobbyGame() {
        if (this.lobbyPlayers.length < 4) return;
        this.isHost = true;
        this.hostPhone = FirebaseManager.myUserId;
        this.engine.startNewRound();
        
        const lobbyData = { deck: this.engine.deck, players: this.lobbyPlayers };
        FirebaseManager.startOnlineGame(this.engine.deck, this.lobbyPlayers);
        this.startOnlineMatch(lobbyData);
    }

    static startOnlineMatch(lobbyData) {
        this.isOnlineMatch = true;
        showScreen('gameBoard');
        this.myPlayerIndex = Math.max(0, lobbyData.players.findIndex(p => p.phone === FirebaseManager.myUserId));
        
        if (!this.isHost) {
            this.engine.importState(lobbyData.deck, null, 0);
            this.engine.dealCards();
        }
        
        const rotatedPlayers = [];
        for (let i = 0; i < 4; i++) {
            rotatedPlayers.push(this.engine.players[(this.myPlayerIndex + i) % 4]);
        }
        this.engine.players = rotatedPlayers;
        this.engine.currentTurn = (4 + this.engine.currentTurn - this.myPlayerIndex) % 4;
        
        CBUI.renderHand(this.engine.players[0]);
        CBUI.renderTable(this.engine.players, this.engine.currentTrick);
        
        this.lastProcessedActionId = null;
        FirebaseManager.listenForGameActions(this.hostPhone, (actionObj) => {
            if (!actionObj) return;
            this.handleOnlineAction(actionObj);
        });
        
        if (this.engine.bids[0] === 0) {
            CBUI.showBiddingModal();
        }
        
        if (this.isHost) {
            for (let i = 1; i < 4; i++) {
                const origIdx = (this.myPlayerIndex + i) % 4;
                const p = this.lobbyPlayers[origIdx];
                if (p && p.phone && p.phone.startsWith('bot_')) {
                    setTimeout(() => {
                        const bid = CBBot.calculateBid(this.engine.players[i]);
                        this.engine.bids[i] = bid;
                        CBUI.showChatBubble(i, `বিড: ${bid}`);
                        FirebaseManager.sendGameAction(this.hostPhone, 'BID', { bid: bid }, origIdx);
                        CBUI.renderTable(this.engine.players, this.engine.currentTrick);
                        
                        let bidsCount = 0;
                        for(let j=0; j<4; j++) { if(this.engine.bids[j] > 0) bidsCount++; }
                        if (bidsCount === 4 && this.engine.state === 'BIDDING') {
                            this.engine.state = 'PLAYING';
                            this.engine.currentTurn = (4 + ((this.engine.roundNum - 1) % 4) - this.myPlayerIndex) % 4;
                            CBUI.renderTable(this.engine.players, this.engine.currentTrick);
                            this.processNextTurn();
                        }
                    }, 1000 * i);
                }
            }
        }
    }

    static startBotMatch() {
        this.isOnlineMatch = false;
        this.myPlayerIndex = 0;
        this.engine.startNewRound();
        CBUI.renderHand(this.engine.players[0]);
        CBUI.renderTable(this.engine.players, this.engine.currentTrick);
        
        let currentBidder = 1;
        const processNextBid = () => {
            if (currentBidder >= 4) { CBUI.showBiddingModal(); return; }
            const bid = CBBot.calculateBid(this.engine.players[currentBidder]);
            this.engine.bids[currentBidder] = bid;
            CBUI.showChatBubble(currentBidder, `বিড: ${bid}`);
            CBUI.renderTable(this.engine.players, this.engine.currentTrick);
            currentBidder++;
            setTimeout(processNextBid, 1200);
        };
        setTimeout(processNextBid, 1000);
    }

    static handlePlayerBid(bid, playerIndex = 0) {
        this.engine.bids[playerIndex] = bid;
        if (this.isOnlineMatch) {
            if (playerIndex === 0) {
                FirebaseManager.sendGameAction(this.hostPhone, 'BID', { bid: bid }, this.myPlayerIndex);
            }
            let bidsCount = 0;
            for(let i=0; i<4; i++) { if(this.engine.bids[i] > 0) bidsCount++; }
            if (bidsCount === 4 && this.engine.state === 'BIDDING') {
                this.engine.state = 'PLAYING';
                this.engine.currentTurn = (4 + ((this.engine.roundNum - 1) % 4) - this.myPlayerIndex) % 4;
                CBUI.renderTable(this.engine.players, this.engine.currentTrick);
                this.processNextTurn();
            }
        } else {
            this.engine.state = 'PLAYING';
            this.engine.currentTurn = (4 + ((this.engine.roundNum - 1) % 4) - this.myPlayerIndex) % 4;
            CBUI.renderTable(this.engine.players, this.engine.currentTrick);
            this.processNextTurn();
        }
    }

    static processNextTurn() {
        if (this.engine.state !== 'PLAYING') return;

        if (this.engine.currentTrick.length === 4) {
            setTimeout(() => {
                this.engine.resolveTrick();
                CBUI.renderTable(this.engine.players, this.engine.currentTrick);
                if (this.engine.cardsPlayedThisRound >= 52) {
                    this.handleRoundOver();
                } else {
                    this.processNextTurn();
                }
            }, 1500);
            return;
        }

        const currPlayer = this.engine.currentTurn;
        if (currPlayer !== 0) {
            let isBot = false;
            if (this.isOnlineMatch && this.lobbyPlayers) {
                const origIdx = (this.myPlayerIndex + currPlayer) % 4;
                const p = this.lobbyPlayers[origIdx];
                if (p && p.phone && p.phone.startsWith('bot_')) isBot = true;
            }

            if (!this.isOnlineMatch || (this.isOnlineMatch && this.isHost && isBot)) {
                setTimeout(() => {
                    const cardIndex = CBBot.playCard(this.engine.players[currPlayer], this.engine.leadSuit, this.engine.trump, this.engine.currentTrick);
                    
                    const card = this.engine.players[currPlayer][cardIndex];
                    const success = this.engine.playCard(currPlayer, cardIndex);
                    if (success) {
                        if (this.isOnlineMatch) {
                            const origIdx = (this.myPlayerIndex + currPlayer) % 4;
                            FirebaseManager.sendGameAction(this.hostPhone, 'PLAY_CARD', { cardId: card.id }, origIdx);
                        }
                        this.engine.currentTurn = (this.engine.currentTurn + 1) % 4;
                        CBUI.renderTable(this.engine.players, this.engine.currentTrick);
                        this.processNextTurn();
                    }
                }, 1000);
            }
        } else {
            console.log("Waiting for human to play...");
            CBUI.renderHand(this.engine.players[0]);
        }
    }

    static async handleCardClick(cardIndex) {
        if (this.engine.state !== 'PLAYING') return;
        if (this.engine.currentTurn !== 0) return;
        if (this.engine.currentTrick.length >= 4) return; // Prevent double clicking during trick resolution

        const card = this.engine.players[0][cardIndex];
        if (!this.engine.isValidPlay(0, card)) {
            await showCustomAlert('অকার্যকর চাল!', 'নিয়ম:<br>১. আপনাকে অবশ্যই লিড সুট খেলতে হবে (যদি থাকে)।<br>২. লিড সুট না থাকলে অবশ্যই ট্রাম্প খেলতে হবে।<br>৩. কেউ আগে ট্রাম্প খেললে, আপনাকে তার চেয়ে বড় ট্রাম্প খেলতে হবে।');
            return;
        }

        const success = this.engine.playCard(0, cardIndex);
        if (success) {
            if (this.isOnlineMatch) {
                FirebaseManager.sendGameAction(this.hostPhone, 'PLAY_CARD', { cardId: card.id }, this.myPlayerIndex);
            }
            this.engine.currentTurn = (this.engine.currentTurn + 1) % 4;
            CBUI.renderHand(this.engine.players[0]);
            CBUI.renderTable(this.engine.players, this.engine.currentTrick);
            this.processNextTurn();
        }
    }

    static handleOnlineAction(actionObj) {
        const localIndex = (4 + actionObj.playerIndex - this.myPlayerIndex) % 4;
        if (localIndex === 0) return; // Skip my own

        if (actionObj.action === 'LEAVE') {
            if (this.lobbyPlayers && this.lobbyPlayers[actionObj.playerIndex]) {
                this.lobbyPlayers[actionObj.playerIndex].phone = 'bot_' + actionObj.playerIndex;
                CBUI.showChatBubble(localIndex, 'গেম ছেড়েছে');
                
                // Host Migration
                let newHostIndex = -1;
                for (let i = 0; i < 4; i++) {
                    if (this.lobbyPlayers[i] && !this.lobbyPlayers[i].phone.startsWith('bot_')) {
                        newHostIndex = i;
                        break;
                    }
                }
                if (newHostIndex === this.myPlayerIndex && !this.isHost) {
                    this.isHost = true;
                    console.log("Migrated to new host!");
                }
                
                if (this.isHost && this.engine.state === 'PLAYING' && this.engine.currentTurn === localIndex) {
                    this.processNextTurn();
                }
                
                if (this.isHost && this.engine.state === 'BIDDING' && this.engine.bids[localIndex] === 0) {
                    setTimeout(() => {
                        const bid = CBBot.calculateBid(this.engine.players[localIndex]);
                        this.engine.bids[localIndex] = bid;
                        CBUI.showChatBubble(localIndex, `বিড: ${bid}`);
                        FirebaseManager.sendGameAction(this.hostPhone, 'BID', { bid: bid }, actionObj.playerIndex);
                        CBUI.renderTable(this.engine.players, this.engine.currentTrick);
                        
                        let bidsCount = 0;
                        for(let i=0; i<4; i++) { if(this.engine.bids[i] > 0) bidsCount++; }
                        if(bidsCount === 4 && this.engine.state === 'BIDDING') {
                            this.engine.state = 'PLAYING';
                            this.engine.currentTurn = (4 + ((this.engine.roundNum - 1) % 4) - this.myPlayerIndex) % 4;
                            CBUI.renderTable(this.engine.players, this.engine.currentTrick);
                            this.processNextTurn();
                        }
                    }, 1000);
                }
            }
            return;
        }

        if (actionObj.action === 'BID') {
            this.engine.bids[localIndex] = actionObj.data.bid;
            CBUI.showChatBubble(localIndex, `বিড: ${actionObj.data.bid}`);
            
            // Assume 1 bid per round simplifies things for now in CB
            let bidsCount = 0;
            for(let i=0; i<4; i++) { if(this.engine.bids[i] > 0) bidsCount++; }
            if(bidsCount === 4 && this.engine.state === 'BIDDING') {
                this.engine.state = 'PLAYING';
                this.engine.currentTurn = (4 + ((this.engine.roundNum - 1) % 4) - this.myPlayerIndex) % 4;
                CBUI.renderTable(this.engine.players, this.engine.currentTrick);
                this.processNextTurn();
            }
        } else if (actionObj.action === 'PLAY_CARD') {
            const hand = this.engine.players[localIndex];
            const cardIdx = hand.findIndex(c => c.id === actionObj.data.cardId);
            if (cardIdx !== -1) {
                const success = this.engine.playCard(localIndex, cardIdx);
                if (success) {
                    this.engine.currentTurn = (this.engine.currentTurn + 1) % 4;
                    CBUI.renderTable(this.engine.players, this.engine.currentTrick);
                    this.processNextTurn();
                }
            }
        } else if (actionObj.action === 'CHAT') {
            if (actionObj.data && actionObj.data.msg) {
                CBUI.showChatBubble(localIndex, actionObj.data.msg);
            }
        }
    }

    static sendChat(msg) {
        // Hide popups
        const qcPopup = document.getElementById('quickChatPopup');
        const emPopup = document.getElementById('emojiPopup');
        if (qcPopup) qcPopup.classList.remove('show');
        if (emPopup) emPopup.classList.remove('show');

        // Show locally
        CBUI.showChatBubble(0, msg);

        // Send to others if online
        if (this.isOnlineMatch && this.hostPhone && typeof FirebaseManager !== 'undefined') {
            FirebaseManager.sendGameAction(this.hostPhone, 'CHAT', { msg: msg }, this.myPlayerIndex);
        } else if (!this.isOnlineMatch) {
            // Simulate bot reply in offline mode
            if (Math.random() > 0.5) {
                const replies = ['ঠিক বলেছেন!', 'দারুণ!', 'হুমম...', 'দেখা যাক!'];
                const randomReply = replies[Math.floor(Math.random() * replies.length)];
                const randomBotIndex = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3
                
                setTimeout(() => {
                    CBUI.showChatBubble(randomBotIndex, randomReply);
                }, 1500 + Math.random() * 2000);
            }
        }
    }

    static async handleRoundOver() {
        this.engine.state = 'ROUND_OVER';
        this.engine.calculateScores();
        
        let msg = `স্কোরবোর্ড:<br><br>`;
        for(let i=0; i<4; i++) {
            let name = i === 0 ? 'আপনি' : `প্লেয়ার ${i}`;
            if (this.isOnlineMatch && this.lobbyPlayers) {
                const origIdx = (this.myPlayerIndex + i) % 4;
                const p = this.lobbyPlayers[origIdx];
                if (p && p.name) name = p.name;
            } else if (!this.isOnlineMatch && i !== 0) {
                name = `বট ${i}`;
            }
            msg += `${name}: বিড ${this.engine.bids[i]}, জিতেছে ${this.engine.tricksWon[i]} -> মোট স্কোর: ${this.engine.scores[i].toFixed(1)}<br>`;
        }
        await showCustomAlert('রাউন্ড শেষ!', msg);

        if (this.engine.roundNum < this.engine.maxRounds) {
            this.engine.roundNum++;
            if (!this.isOnlineMatch) {
                this.startBotMatch();
            } else if (this.isHost) {
                this.engine.startNewRound();
                FirebaseManager.startOnlineGame(this.engine.deck, this.lobbyPlayers);
                this.startOnlineMatch({ deck: this.engine.deck, players: this.lobbyPlayers });
            }
        } else {
            await showCustomAlert('গেম শেষ!', 'সবগুলো রাউন্ড শেষ হয়েছে।');
            window.location.href = 'index.html';
        }
    }
}

window.addEventListener('load', () => {
    CBApp.init();
    window.CBApp = CBApp;
});
