/**
 * ২৯ কার্ড গেম — App Controller
 * Manages screen navigation, initializes game loop, and handles events.
 */
const App = (() => {

    let currentScreen = 'splash';
    let gameState = null;
    let localPlayerIndex = 0; // The human player
    
    // Core game loop timers
    let botActionTimer = null;

    // Initialization
    function init() {
        if (!localStorage.getItem("isLoggedIn")) {
            window.location.href = "auth/login.html";
            return;
        }

        Storage.init();
        
        // Initialize Firebase Online Status
        if (typeof FirebaseManager !== 'undefined') {
            FirebaseManager.initOnlineStatus();
            
            // Listen for incoming invites
            FirebaseManager.listenForInvites((inviteData) => {
                const modal = document.getElementById('incomingInviteModal');
                const avatar = document.getElementById('ii-avatar');
                const msg = document.getElementById('ii-message');
                const btnAccept = document.getElementById('ii-accept-btn');
                const btnReject = document.getElementById('ii-reject-btn');
                
                if (modal && msg) {
                    avatar.innerText = inviteData.hostAvatar || '😎';
                    msg.innerHTML = `<b>${inviteData.hostName}</b> আপনাকে গেম খেলার জন্য আমন্ত্রণ জানিয়েছে।`;
                    
                    modal.style.display = 'flex';
                    // small delay to allow display:flex to apply before transition
                    setTimeout(() => modal.classList.add('show'), 10);
                    
                    btnAccept.onclick = () => {
                        modal.classList.remove('show');
                        setTimeout(() => modal.style.display = 'none', 300);
                        FirebaseManager.respondToInvite(inviteData.hostPhone, 'accepted');
                        showScreen('online'); // Go to online lobby
                        App.startMatchmaking('online', 'medium'); // Directly enter the lobby
                    };
                    
                    btnReject.onclick = () => {
                        modal.classList.remove('show');
                        setTimeout(() => modal.style.display = 'none', 300);
                        FirebaseManager.respondToInvite(inviteData.hostPhone, 'rejected');
                    };
                }
            });
            
            // Listen for responses to my invites
            FirebaseManager.listenForInviteResponses((responderPhone, data) => {
                if (data.status === 'accepted') {
                    const lobbySlots = document.querySelectorAll('#onlineLobbySlots .empty-slot');
                    if (lobbySlots.length > 0) {
                        const slot = lobbySlots[0];
                        slot.classList.remove('empty-slot');
                        
                        const slotAvatar = slot.querySelector('.fi-avatar');
                        if (slotAvatar) {
                            slotAvatar.innerHTML = data.responderAvatar || '😎';
                            slotAvatar.style.background = '';
                        }
                        
                        const slotName = slot.querySelector('.fi-name');
                        if (slotName) {
                            slotName.innerText = data.responderName || 'Player';
                            slotName.style.color = 'var(--text-primary)';
                        }
                        
                        const slotStatus = document.createElement('div');
                        slotStatus.className = 'fi-status';
                        slotStatus.innerText = 'সংযুক্ত';
                        slot.querySelector('.fi-info').appendChild(slotStatus);
                        
                        // Check if full
                        const remainingEmpty = document.querySelectorAll('#onlineLobbySlots .empty-slot');
                        if (remainingEmpty.length === 0) {
                            const startBtn = document.getElementById('startOnlineMatchBtn');
                            if (startBtn) {
                                startBtn.disabled = false;
                                startBtn.style.opacity = '1';
                            }
                        }
                        
                        // Update button status in the list
                        const listContainer = document.getElementById('dynamicOnlineUsersList');
                        if (listContainer) {
                            const btns = listContainer.querySelectorAll('.fi-invite-btn');
                            btns.forEach(b => {
                                if (b.dataset.phone === responderPhone) {
                                    b.innerText = 'যুক্ত হয়েছে';
                                    b.style.color = 'var(--gold-primary)';
                                    b.style.background = 'transparent';
                                    b.style.border = '1px solid var(--gold-primary)';
                                    b.style.opacity = '1';
                                }
                            });
                        }
                        // Clear the invite so it doesn't trigger again on reload
                        FirebaseManager.clearInvite(responderPhone);
                        
                        // Sync lobby state for guests
                        const playersList = [];
                        let hName = "Host", hAvatar = "😎";
                        try {
                            const p = JSON.parse(localStorage.getItem('29card_profile'));
                            if (p && p.name) hName = p.name;
                            if (p && p.avatarEmoji) hAvatar = p.avatarEmoji;
                        } catch(e){}
                        playersList.push({ name: hName, avatar: hAvatar, isHost: true });
                        
                        document.querySelectorAll('#onlineLobbySlots .friend-item:not(.empty-slot)').forEach(sl => {
                            const nEl = sl.querySelector('.fi-name');
                            const aEl = sl.querySelector('.fi-avatar');
                            if (nEl && !nEl.innerText.includes('Host')) {
                                playersList.push({ 
                                    name: nEl.innerText, 
                                    avatar: aEl ? aEl.innerHTML.trim() : '😎',
                                    isHost: false 
                                });
                            }
                        });
                        FirebaseManager.syncLobbyState(playersList);
                    }
                } else if (data.status === 'rejected') {
                    const listContainer = document.getElementById('dynamicOnlineUsersList');
                    if (listContainer) {
                        const btns = listContainer.querySelectorAll('.fi-invite-btn');
                        btns.forEach(b => {
                            if (b.dataset.phone === responderPhone) {
                                b.innerText = 'বাতিল করেছে';
                                b.style.color = '#ff4444';
                                b.style.background = 'transparent';
                                b.style.border = '1px solid #ff4444';
                                b.style.opacity = '0.8';
                                setTimeout(() => {
                                    b.innerText = 'আমন্ত্রণ';
                                    b.style.color = '#ffffff';
                                    b.style.background = 'rgba(255, 255, 255, 0.1)';
                                    b.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                                }, 3000);
                            }
                        });
                    }
                }
            });
        }
        
        // Show splash, then transition to home
        showScreen('splash');
        
        setTimeout(() => {
            showScreen('home');
        }, 2500); // 2.5s splash
        
        setupEventListeners();
    }

    function setupEventListeners() {
        // Navigation is mostly handled inline via onclick="showScreen('name')" in HTML
        // Attach any specific listeners here
        
        // Bot mode difficulty selector
        const diffCards = document.querySelectorAll('#botMode .diff-card');
        diffCards.forEach(card => {
            card.onclick = function() {
                diffCards.forEach(c => c.classList.remove('active'));
                this.classList.add('active');
            };
        });
        
        // Start Bot Match btn
        const startBotBtn = document.querySelector('#botMode .btn-gold');
        if (startBotBtn) {
            startBotBtn.onclick = () => {
                const activeDiff = document.querySelector('#botMode .diff-card.active .diff-label');
                let diff = 'medium';
                if (activeDiff) {
                    if (activeDiff.innerText === 'সহজ') diff = 'easy';
                    if (activeDiff.innerText === 'কঠিন') diff = 'hard';
                    if (activeDiff.innerText === 'এক্সপার্ট') diff = 'expert';
                }
                startGame('bot', diff);
            };
        }
        
        // Friend invite buttons
        const inviteBtns = document.querySelectorAll('.fi-invite-btn');
        inviteBtns.forEach(btn => {
            btn.onclick = function() {
                if (this.innerText === 'আমন্ত্রিত' || this.innerText === 'অপেক্ষারত' || this.style.opacity === '0.4') return;
                
                const friendNameEl = this.parentElement.querySelector('.fi-name');
                const friendName = friendNameEl ? friendNameEl.innerText : 'আপনার বন্ধু';
                const avatarEl = this.parentElement.querySelector('.fi-avatar');
                const avatarHTML = avatarEl ? avatarEl.innerHTML : '😎';
                
                const isOnlineLobby = this.classList.contains('online-lobby-invite');
                
                this.innerText = isOnlineLobby ? 'অপেক্ষারত' : 'আমন্ত্রিত';
                this.style.opacity = '0.8';
                this.style.background = 'rgba(255, 255, 255, 0.1)';
                this.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                this.style.color = '#ffffff';
                
                // Show a toast
                const toast = document.createElement('div');
                toast.innerText = 'আমন্ত্রণ পাঠানো হয়েছে!';
                toast.style.position = 'fixed';
                toast.style.bottom = '40px';
                toast.style.left = '50%';
                toast.style.transform = 'translateX(-50%)';
                toast.style.background = 'var(--green-primary)';
                toast.style.color = '#fff';
                toast.style.padding = '12px 24px';
                toast.style.borderRadius = '24px';
                toast.style.zIndex = '9999';
                toast.style.boxShadow = 'var(--shadow-card)';
                toast.style.fontWeight = '600';
                toast.style.animation = 'fadeInOut 2s ease forwards';
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    if(document.body.contains(toast)) {
                        toast.remove();
                    }
                    
                    if (isOnlineLobby) {
                        // Logic for Online Lobby Slots
                        setTimeout(() => {
                            const lobbySlots = document.querySelectorAll('#onlineLobbySlots .empty-slot');
                            if (lobbySlots.length > 0) {
                                const slot = lobbySlots[0];
                                slot.classList.remove('empty-slot');
                                
                                const slotAvatar = slot.querySelector('.fi-avatar');
                                if (slotAvatar) {
                                    slotAvatar.innerHTML = avatarHTML;
                                    slotAvatar.style.background = '';
                                }
                                
                                const slotName = slot.querySelector('.fi-name');
                                if (slotName) {
                                    slotName.dataset.realname = friendName;
                                    slotName.innerText = friendName.replace(' (Bot)', '');
                                    slotName.style.color = 'var(--text-primary)';
                                }
                                
                                const slotStatus = document.createElement('div');
                                slotStatus.className = 'fi-status';
                                slotStatus.innerText = 'সংযুক্ত';
                                slot.querySelector('.fi-info').appendChild(slotStatus);
                                
                                this.innerText = 'যুক্ত হয়েছে';
                                this.style.color = 'var(--gold-primary)';
                                
                                // Check if full
                                const remainingEmpty = document.querySelectorAll('#onlineLobbySlots .empty-slot');
                                if (remainingEmpty.length === 0) {
                                    const startBtn = document.getElementById('startOnlineMatchBtn');
                                    if (startBtn) {
                                        startBtn.disabled = false;
                                        startBtn.style.opacity = '1';
                                    }
                                }
                            }
                        }, 1000);
                    } else {
                        // Regular invite logic (direct confirm)
                        setTimeout(async () => {
                            const confirmStart = await showCustomConfirm("আমন্ত্রণ গ্রহণ", `${friendName} আপনার আমন্ত্রণ গ্রহণ করেছেন! ম্যাচ শুরু করবেন?`);
                            if (confirmStart) {
                                startGame('online', 'medium', ['আপনি', friendName, 'প্লেয়ার ৩', 'প্লেয়ার ৪']);
                            } else {
                                this.innerText = 'আমন্ত্রণ';
                                this.style.opacity = '1';
                                this.style.background = '';
                                this.style.border = '';
                            }
                        }, 1000);
                    }
                }, 2000);
            };
        });
        
        // Share buttons
        const shareBtns = document.querySelectorAll('.share-btn');
        shareBtns.forEach(btn => {
            btn.onclick = function() {
                const toast = document.createElement('div');
                toast.innerText = 'খোলার চেষ্টা করা হচ্ছে...';
                toast.style.position = 'fixed';
                toast.style.bottom = '40px';
                toast.style.left = '50%';
                toast.style.transform = 'translateX(-50%)';
                toast.style.background = 'var(--blue-accent)';
                toast.style.color = '#fff';
                toast.style.padding = '12px 24px';
                toast.style.borderRadius = '24px';
                toast.style.zIndex = '9999';
                toast.style.boxShadow = 'var(--shadow-card)';
                toast.style.fontWeight = '600';
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    if(document.body.contains(toast)) {
                        toast.remove();
                    }
                }, 1500);
            };
        });
    }

    // ---- Screen Navigation ----

    function showScreen(screenId) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        
        // Show target screen
        const target = document.getElementById(screenId);
        if (target) {
            target.classList.add('active');
            currentScreen = screenId;
            
            // Render specific screen data
            UIRenderer.renderScreen(screenId);
        } else {
            console.error('Screen not found:', screenId);
        }
    }

    // ---- Game Flow Control ----

    let bluetoothPlayers = 1; // 1 is Host

    async function startBluetoothMatchmaking(mode, diff) {
        try {
            if (!navigator.bluetooth) {
                alert("আপনার ব্রাউজারে ব্লুটুথ সাপোর্ট করে না। দয়া করে লেটেস্ট ক্রোম (Chrome) বা এজ (Edge) ব্যবহার করুন।");
                return;
            }
            
            // This opens the real OS Bluetooth scanning dialog
            const device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true
            });
            
            // Fill an empty slot in the lobby
            const emptySlots = document.querySelectorAll('#bluetoothSlots .empty-slot');
            if (emptySlots.length > 0) {
                const slot = emptySlots[0];
                slot.classList.remove('empty-slot');
                
                const avatar = slot.querySelector('.fi-avatar');
                avatar.style.background = '';
                avatar.innerHTML = '📱<div class="online-dot" style="background:#3498db"></div>';
                
                const name = slot.querySelector('.fi-name');
                name.style.color = '';
                name.innerText = device.name || 'অজানা ডিভাইস';
                
                const status = slot.querySelector('.fi-info');
                const statusHtml = document.createElement('div');
                statusHtml.className = 'fi-status';
                statusHtml.innerText = 'কানেক্টেড';
                status.appendChild(statusHtml);

                bluetoothPlayers++;
                checkBluetoothLobbyReady();
            }
            
        } catch (error) {
            console.log("Bluetooth Error: ", error);
        }
    }

    function fillLobbyWithBots() {
        const emptySlots = document.querySelectorAll('#bluetoothSlots .empty-slot');
        emptySlots.forEach((slot, index) => {
            slot.classList.remove('empty-slot');
            
            const avatar = slot.querySelector('.fi-avatar');
            avatar.style.background = '';
            avatar.innerHTML = '🤖<div class="online-dot" style="background:#e74c3c"></div>';
            
            const name = slot.querySelector('.fi-name');
            name.style.color = '';
            name.innerText = `বট প্লেয়ার ${index + 1}`;
            
            const status = slot.querySelector('.fi-info');
            const statusHtml = document.createElement('div');
            statusHtml.className = 'fi-status';
            statusHtml.innerText = 'বট (Bot)';
            status.appendChild(statusHtml);

            bluetoothPlayers++;
        });
        checkBluetoothLobbyReady();
    }

    function checkBluetoothLobbyReady() {
        if (bluetoothPlayers >= 4) {
            const startBtn = document.getElementById('startBluetoothBtn');
            if (startBtn) {
                startBtn.disabled = false;
                startBtn.style.opacity = '1';
                startBtn.innerText = 'গেম শুরু করুন';
            }
        }
    }

    function startMatchmaking(mode, diff, customText) {
        const activeScreen = document.querySelector('.screen.active');
        if (!activeScreen) return startGame(mode, diff);

        const cardsContainer = activeScreen.querySelector('.match-cards, .local-modes');
        const panel = activeScreen.querySelector('.matchmaking-panel');
        if (!panel) return startGame(mode, diff); // Fallback
        
        const timeEl = panel.querySelector('.mm-time');
        const textEl = panel.querySelector('.mm-text');
        
        if (customText && textEl) textEl.innerText = customText;
        
        if (cardsContainer) cardsContainer.style.display = 'none';
        panel.style.display = 'block';
        
        if (panel.classList.contains('online-lobby-panel')) {
            if (typeof FirebaseManager !== 'undefined') {
                const currentHost = localStorage.getItem('currentHost');
                const listContainer = document.getElementById('dynamicOnlineUsersList');
                const startBtn = document.getElementById('startOnlineMatchBtn');
                
                if (currentHost) {
                    // --- GUEST MODE ---
                    // Hide friends list
                    if (listContainer) {
                        listContainer.style.display = 'none';
                        const h3 = listContainer.previousElementSibling;
                        if (h3 && h3.tagName.toLowerCase() === 'h3') h3.style.display = 'none';
                    }
                    
                    // Disable start button
                    if (startBtn) {
                        startBtn.innerText = 'হোস্টের জন্য অপেক্ষায়...';
                        startBtn.disabled = true;
                        startBtn.style.opacity = '0.5';
                    }
                    
                    // Listen to host's lobby changes
                    let lobbyCreated = false;
                    let lobbyTimeout = setTimeout(() => {
                        if (!lobbyCreated) {
                            // Host never created it, or host left before we reconnected
                            localStorage.removeItem('currentHost');
                            // Only redirect if we are still on the online screen
                            const activeScreen = document.querySelector('.screen.active');
                            if (activeScreen && activeScreen.id === 'online') {
                                showScreen('home');
                            }
                        }
                    }, 5000); // 5 seconds timeout
                    
                    FirebaseManager.listenToLobby(currentHost, (lobbyData) => {
                        if (!lobbyData) {
                            if (lobbyCreated) {
                                // Host left or lobby destroyed
                                localStorage.removeItem('currentHost');
                                showScreen('home');
                            }
                            return;
                        }
                        
                        lobbyCreated = true;
                        clearTimeout(lobbyTimeout);
                        
                        if (lobbyData.status === 'started') {
                            localStorage.removeItem('currentHost');
                            
                            // Gather names and avatars from the authoritative Firebase lobbyData.players array
                            const names = [];
                            const avatars = [];
                            
                            if (lobbyData.players) {
                                lobbyData.players.forEach(p => {
                                    names.push(p.name);
                                    avatars.push(p.avatar || '👤');
                                });
                            }
                            
                            startGame(mode, diff, names.length === 4 ? names : null, avatars.length === 4 ? avatars : null, lobbyData.deck || null, false, currentHost);
                            return;
                        }
                        
                        if (lobbyData.players && lobbyData.players.length > 0) {
                            const slots = document.querySelectorAll('#onlineLobbySlots .friend-item');
                            
                            slots.forEach((slot, index) => {
                                if (index < lobbyData.players.length) {
                                    const p = lobbyData.players[index];
                                    slot.classList.remove('empty-slot');
                                    
                                    const avatar = slot.querySelector('.fi-avatar');
                                    if (avatar) avatar.innerHTML = p.avatar || '😎';
                                    
                                    const name = slot.querySelector('.fi-name');
                                    if (name) name.innerText = p.name || 'Player';
                                    
                                    let statusDiv = slot.querySelector('.fi-info .fi-status');
                                    if (!statusDiv) {
                                        statusDiv = document.createElement('div');
                                        statusDiv.className = 'fi-status';
                                        slot.querySelector('.fi-info').appendChild(statusDiv);
                                    }
                                    statusDiv.innerText = p.isHost ? 'হোস্ট' : 'সংযুক্ত';
                                    
                                } else {
                                    // Empty slot
                                    slot.classList.add('empty-slot');
                                    slot.innerHTML = `
                                        <div class="fi-avatar" style="background: rgba(255, 255, 255, 0.05); color: rgba(255, 255, 255, 0.3);">?</div>
                                        <div class="fi-info">
                                            <div class="fi-name" style="color: rgba(255, 255, 255, 0.5);">অপেক্ষায়...</div>
                                        </div>
                                    `;
                                }
                            });
                        }
                    });
                    
                } else {
                    // --- HOST MODE ---
                    // Populate Slot 0 with Host's actual profile info
                    const slot0 = document.querySelector('#onlineLobbySlots .friend-item:first-child');
                    if (slot0) {
                        let myName = "Player";
                        let myAvatar = "😎";
                        try {
                            const p = JSON.parse(localStorage.getItem('29card_profile'));
                            if (p && p.name) myName = p.name;
                            if (p && p.avatarEmoji) myAvatar = p.avatarEmoji;
                        } catch(e) {}
                        
                        const nameEl = slot0.querySelector('.fi-name');
                        const avatarEl = slot0.querySelector('.fi-avatar');
                        if (nameEl) {
                            nameEl.dataset.realname = myName;
                            nameEl.innerText = myName + ' (Host)';
                        }
                        if (avatarEl) avatarEl.innerHTML = myAvatar + '<div class="online-dot"></div>';
                    }

                    // Listen to online users to invite them
                    FirebaseManager.listenForOnlineUsers((users) => {
                        if (!listContainer) return;
                        
                        listContainer.innerHTML = '';
                        if (users.length === 0) {
                            listContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">অন্য কোনো প্লেয়ার অনলাইনে নেই।</div>';
                            return;
                        }
                    
                    users.forEach(user => {
                        const div = document.createElement('div');
                        div.className = 'friend-item';
                        div.innerHTML = `
                            <div class="fi-avatar">${user.avatar || '😎'}<div class="online-dot"></div></div>
                            <div class="fi-info">
                                <div class="fi-name">${(user.name || 'Unknown').replace(' (Bot)', '')}</div>
                                <div class="fi-status">অনলাইন</div>
                            </div>
                            <button class="fi-invite-btn online-lobby-invite">আমন্ত্রণ</button>
                        `;
                        
                        // Attach the click listener
                        const btn = div.querySelector('.online-lobby-invite');
                        btn.dataset.phone = user.phone; // Store phone for response matching
                        
                        btn.onclick = function() {
                            if (this.innerText === 'আমন্ত্রিত' || this.innerText === 'অপেক্ষারত' || this.style.opacity === '0.4' || this.innerText === 'যুক্ত হয়েছে') return;
                            
                            // Check if lobby is full (no empty slots)
                            const emptySlots = document.querySelectorAll('#onlineLobbySlots .empty-slot');
                            if (emptySlots.length === 0) {
                                const toast = document.createElement('div');
                                toast.innerText = 'লবি পূর্ণ হয়ে গেছে! আর কাউকে আমন্ত্রণ করা যাবে না।';
                                toast.style.position = 'fixed';
                                toast.style.bottom = '40px';
                                toast.style.left = '50%';
                                toast.style.transform = 'translateX(-50%)';
                                toast.style.background = '#d32f2f'; // Red for error
                                toast.style.color = '#fff';
                                toast.style.padding = '12px 24px';
                                toast.style.borderRadius = '24px';
                                toast.style.zIndex = '9999';
                                toast.style.boxShadow = 'var(--shadow-card)';
                                toast.style.fontWeight = '600';
                                toast.style.animation = 'fadeInOut 2s ease forwards';
                                toast.style.textAlign = 'center';
                                toast.style.width = 'calc(100% - 40px)';
                                toast.style.maxWidth = '320px';
                                toast.style.boxSizing = 'border-box';
                                toast.style.wordWrap = 'break-word';
                                document.body.appendChild(toast);
                                
                                setTimeout(() => {
                                    if(document.body.contains(toast)) toast.remove();
                                }, 2500);
                                return;
                            }
                            
                            this.innerText = 'অপেক্ষারত';
                            this.style.opacity = '0.8';
                            this.style.background = 'rgba(255, 255, 255, 0.1)';
                            this.style.border = '1px solid rgba(255, 255, 255, 0.2)';
                            this.style.color = '#ffffff';
                            
                            FirebaseManager.sendInvite(user.phone);
                            
                            // Toast
                            const toast = document.createElement('div');
                            toast.innerText = 'আমন্ত্রণ পাঠানো হয়েছে!';
                            toast.style.position = 'fixed';
                            toast.style.bottom = '40px';
                            toast.style.left = '50%';
                            toast.style.transform = 'translateX(-50%)';
                            toast.style.background = 'var(--green-primary)';
                            toast.style.color = '#fff';
                            toast.style.padding = '12px 24px';
                            toast.style.borderRadius = '24px';
                            toast.style.zIndex = '9999';
                            toast.style.boxShadow = 'var(--shadow-card)';
                            toast.style.fontWeight = '600';
                            toast.style.animation = 'fadeInOut 2s ease forwards';
                            document.body.appendChild(toast);
                            
                            setTimeout(() => {
                                if(document.body.contains(toast)) toast.remove();
                            }, 2000);
                        };
                        
                        listContainer.appendChild(div);
                    }); // End users.forEach
                    }); // End FirebaseManager.listenForOnlineUsers
                } // End if/else currentHost
            }
            return; // Don't do auto countdown for the lobby
        }
        
        let time = 3; // 3 seconds fake loading
        if (timeEl) timeEl.innerText = `আনুমানিক সময়: ${time} সেকেন্ড`;
        
        const interval = setInterval(() => {
            time--;
            if (timeEl) timeEl.innerText = `আনুমানিক সময়: ${time} সেকেন্ড`;
            
            if (time <= 0) {
                clearInterval(interval);
                if (cardsContainer) cardsContainer.style.display = ''; // reset
                panel.style.display = 'none'; // reset
                startGame(mode, diff);
            }
        }, 1000);
    }

    function startLobbyGame(mode, diff) {
        const names = [];
        const avatars = [];
        const selector = mode === 'online' ? '#onlineLobbySlots .friend-item' : '#bluetoothSlots .friend-item';
        const slots = document.querySelectorAll(selector);
        if (slots.length === 4) {
            slots.forEach(slot => {
                const nameEl = slot.querySelector('.fi-name');
                const avatarEl = slot.querySelector('.fi-avatar');
                if (nameEl) {
                    const rName = nameEl.dataset.realname || nameEl.innerText;
                    names.push(rName.replace(' (Host)', ''));
                }
                if (avatarEl) avatars.push(avatarEl.innerHTML.replace('<div class="online-dot"></div>', '').trim());
            });
        }
        
        let initialDeck = null;
        let hostPhone = null;
        if (mode === 'online' && typeof FirebaseManager !== 'undefined' && !localStorage.getItem('currentHost')) {
            initialDeck = GameEngine.shuffleDeck(GameEngine.createDeck());
            // Create authoritative players array from DOM for the Host
            const authPlayers = [];
            for (let i = 0; i < 4; i++) {
                authPlayers.push({
                    name: names[i] || `Player ${i+1}`,
                    avatar: avatars[i] || '👤'
                });
            }
            FirebaseManager.startOnlineGame(initialDeck, authPlayers);
            hostPhone = FirebaseManager.myUserId;
        }
        
        startGame(mode, diff, names.length === 4 ? names : null, avatars.length === 4 ? avatars : null, initialDeck, true, hostPhone);
    }
    
    function leaveLobby() {
        localStorage.removeItem('currentHost');
        
        const activeScreen = document.querySelector('.screen.active');
        if (activeScreen) {
            const panel = activeScreen.querySelector('.matchmaking-panel');
            const cardsContainer = activeScreen.querySelector('.match-cards, .local-modes');
            
            // If panel is visible, go back to cards list
            if (panel && panel.style.display === 'block') {
                panel.style.display = 'none';
                if (cardsContainer) cardsContainer.style.display = 'block';
                return;
            }
        }
        
        showScreen('home');
    }

    function startGame(mode = 'bot', botDifficulty = 'medium', playerNames = null, playerAvatars = null, initialDeck = null, isHost = true, hostPhone = null) {
        let myAbsoluteIndex = 0;
        // Rotate arrays so local player is always at index 0
        if (playerNames && playerNames.length === 4) {
            let localName = "Player";
            try {
                const profileStr = localStorage.getItem('29card_profile');
                if (profileStr) {
                    const profile = JSON.parse(profileStr);
                    if (profile.name) localName = profile.name;
                }
            } catch(e) {}
            
            // Find local player's index
            let localIndex = playerNames.findIndex(name => name.trim() === localName.trim());
            
            // If the local player's name is not in the array, it might be the host who is named "আপনি" in the UI
            if (localIndex === -1 && playerNames[0].includes('আপনি')) {
                localIndex = 0;
            } else if (localIndex === -1) {
                // Fallback
                localIndex = 0;
            }
            
            myAbsoluteIndex = localIndex;
            
            // Rotate both arrays if localIndex > 0
            if (localIndex > 0) {
                const newNames = [];
                const newAvatars = [];
                for (let i = 0; i < 4; i++) {
                    const mappedIndex = (localIndex + i) % 4;
                    newNames.push(playerNames[mappedIndex]);
                    if (playerAvatars) newAvatars.push(playerAvatars[mappedIndex]);
                }
                playerNames = newNames;
                if (playerAvatars) playerAvatars = newAvatars;
            }
            
            // Replace "আপনি" with localName for consistency
            if (playerNames[0].includes('আপনি')) {
                playerNames[0] = localName;
            }
        }
        
        const activeScreen = document.querySelector('.screen.active');
        const sourceScreenId = activeScreen ? activeScreen.id : 'home';
        
        gameState = GameEngine.createGameState({
            gameMode: mode,
            botDifficulty: botDifficulty,
            targetScore: 29,
            playerNames: playerNames,
            playerAvatars: playerAvatars,
            initialDeck: initialDeck,
            isHost: isHost,
            hostPhone: hostPhone,
            myAbsoluteIndex: myAbsoluteIndex,
            initialDealer: (0 - myAbsoluteIndex + 4) % 4,
            sourceScreen: sourceScreenId
        });
        
        localPlayerIndex = 0; // Human is bottom
        
        showScreen('gameplay');
        
        // Initial setup
        GameplayUI.init(gameState, localPlayerIndex);
        
        // Listen for network actions
        if (mode === 'online' && hostPhone && typeof FirebaseManager !== 'undefined') {
            FirebaseManager.listenForGameActions(hostPhone, (actionObj) => {
                // Map the absolute network index to the local relative index
                const myAbs = gameState.config.myAbsoluteIndex;
                const localMappedIndex = (actionObj.playerIndex - myAbs + 4) % 4;
                
                // If the action is from someone else, execute it
                if (localMappedIndex !== localPlayerIndex) {
                    handlePlayerAction(actionObj.action, actionObj.data, localMappedIndex, true);
                }
            });
        }
        
        // Start first deal
        setTimeout(startRound, 500);
    }

    function startRound() {
        gameState = GameEngine.dealFirstFour(gameState);
        GameplayUI.renderTable();
        GameplayUI.renderHand();
        GameplayUI.updateScores();
        
        // Proceed to bidding
        processBiddingPhase();
    }

    // ---- Phase: Bidding ----

    function processBiddingPhase() {
        if (gameState.phase !== 'bidding') return;
        
        GameplayUI.renderTable(); // Update dealer badge, active turn
        GameplayUI.renderHand();
        
        if (gameState.currentPlayer === localPlayerIndex) {
            // Human turn
            const minBid = gameState.highestBid > 0 ? gameState.highestBid + 1 : 15;
            GameplayUI.showBiddingUI(minBid);
        } else {
            // Check if it's a Bot
            const isBot = gameState.config.gameMode === 'bot' || 
                          (gameState.config.playerNames && gameState.config.playerNames[gameState.currentPlayer] && 
                          (gameState.config.playerNames[gameState.currentPlayer].includes('(Bot)') || 
                           gameState.config.playerNames[gameState.currentPlayer].includes('বট')));
            
            GameplayUI.hideBiddingUI();
            
            if (isBot && (gameState.config.gameMode === 'bot' || gameState.config.isHost)) {
                // Host runs bot logic
                botActionTimer = setTimeout(() => {
                    const bid = BotAI.getBid(gameState, gameState.currentPlayer, gameState.config.botDifficulty);
                    handlePlayerAction('bid', bid, gameState.currentPlayer);
                }, 1000 + Math.random() * 1000); // 1-2s delay
            }
            // If it's a remote human (or bot run by host, and we are guest), just wait for network
        }
    }

    // ---- Phase: Trump Selection ----
    
    function processTrumpSelection() {
        if (gameState.phase !== 'trump-select') return;
        
        GameplayUI.renderTable();
        
        if (gameState.currentPlayer === localPlayerIndex) {
            // Human turn
            GameplayUI.showTrumpSelectionUI();
        } else {
            const isBot = gameState.config.gameMode === 'bot' || 
                          (gameState.config.playerNames && gameState.config.playerNames[gameState.currentPlayer] && 
                          (gameState.config.playerNames[gameState.currentPlayer].includes('(Bot)') || 
                           gameState.config.playerNames[gameState.currentPlayer].includes('বট')));
            
            if (isBot && (gameState.config.gameMode === 'bot' || gameState.config.isHost)) {
                // Host runs bot logic
                botActionTimer = setTimeout(() => {
                    const suit = BotAI.getTrump(gameState, gameState.currentPlayer, gameState.config.botDifficulty);
                    handlePlayerAction('set_trump', suit, gameState.currentPlayer);
                }, 1500);
            }
            // Else wait for network
        }
    }

    // ---- Phase: Playing ----

    function processPlayingPhase() {
        if (gameState.phase !== 'playing') return;
        
        GameplayUI.renderTable();
        GameplayUI.renderHand();
        
        if (gameState.currentPlayer === localPlayerIndex) {
            // Human turn - handled by click events on hand-card in GameplayUI
        } else {
            const isBot = gameState.config.gameMode === 'bot' || 
                          (gameState.config.playerNames && gameState.config.playerNames[gameState.currentPlayer] && 
                          (gameState.config.playerNames[gameState.currentPlayer].includes('(Bot)') || 
                           gameState.config.playerNames[gameState.currentPlayer].includes('বট')));
                          
            if (isBot && (gameState.config.gameMode === 'bot' || gameState.config.isHost)) {
                // Host runs bot logic
                botActionTimer = setTimeout(() => {
                    const cardId = BotAI.getPlayCard(gameState, gameState.currentPlayer, gameState.config.botDifficulty);
                    
                    // If bot is playing a trump card when they don't have the lead suit, they must explicitly reveal it
                    const hand = gameState.hands[gameState.currentPlayer];
                    const card = hand.find(c => c.id === cardId);
                    if (card && gameState.currentTrick.length > 0 && !gameState.trumpRevealed && gameState.trump) {
                        const leadSuit = gameState.currentTrick[0].card.suit;
                        if (card.suit === gameState.trump && card.suit !== leadSuit) {
                            handlePlayerAction('reveal_trump', null, gameState.currentPlayer);
                        }
                    }
                    
                    handlePlayerAction('play_card', cardId, gameState.currentPlayer);
                }, 1000 + Math.random() * 1000);
            }
            // Else wait for network
        }
    }

    // ---- Action Handler ----

    async function handlePlayerAction(action, data, playerIndex = localPlayerIndex, fromNetwork = false) {
        // Prevent actions if not turn
        if (gameState.currentPlayer !== playerIndex && action !== 'leave_game') return;

        // Sync to network if local and online
        if (!fromNetwork && gameState.config.gameMode === 'online' && gameState.config.hostPhone && typeof FirebaseManager !== 'undefined') {
            const absoluteIndex = (playerIndex + gameState.config.myAbsoluteIndex) % 4;
            FirebaseManager.sendGameAction(gameState.config.hostPhone, action, data, absoluteIndex);
        }

        switch (action) {
            case 'bid':
                const bidResult = GameEngine.placeBid(gameState, playerIndex, data);
                if (bidResult.success) {
                    if (bidResult.redeal) {
                        // Everyone passed
                        Animations.showFloatingScore(document.querySelector('.game-table'), 'Re-deal', '#f1c40f');
                        setTimeout(startRound, 2000);
                    } else if (bidResult.biddingComplete) {
                        // Bidding done, deal remaining cards
                        gameState = GameEngine.dealSecondFour(gameState);
                        processTrumpSelection();
                    } else {
                        // Next bidder
                        processBiddingPhase();
                    }
                }
                break;
                
            case 'set_trump':
                if (GameEngine.selectTrump(gameState, data)) {
                    GameplayUI.hideBiddingUI();
                    processPlayingPhase();
                }
                break;
                
            case 'reveal_trump':
                if (gameState.phase === 'playing' && !gameState.trumpRevealed) {
                    GameEngine.revealTrump(gameState);
                    GameplayUI.renderTable();
                    
                    if (gameState.pairShown) {
                        Animations.showFloatingScore(document.querySelector('.game-table'), 'ম্যারিজ! (Pair)', '#f39c12');
                    }
                }
                break;
                
            case 'play_card':
                const playResult = GameEngine.playCard(gameState, playerIndex, data);
                if (playResult.success) {
                    GameplayUI.renderTable();
                    GameplayUI.renderHand();
                    
                    if (playResult.trickComplete) {
                        // Trick is complete
                        setTimeout(resolveTrick, 1000);
                    } else {
                        // Next player
                        processPlayingPhase();
                    }
                }
                break;
                
            case 'leave_game':
                const confirmLeave = await showCustomConfirm("গেম থেকে বের হতে চান?", "আপনি কি নিশ্চিত যে গেম থেকে বের হতে চান? আপনার বর্তমান গেমটি বাতিল হয়ে যাবে।");
                if (confirmLeave) {
                    if (botActionTimer) clearTimeout(botActionTimer);
                    
                    let targetScreen = 'home';
                    if (gameState && gameState.config && gameState.config.sourceScreen) {
                        targetScreen = gameState.config.sourceScreen;
                    } else if (gameState && gameState.config) {
                        switch (gameState.config.gameMode) {
                            case 'online': targetScreen = 'online'; break;
                            case 'bot': targetScreen = 'botMode'; break;
                            case 'lan': targetScreen = 'localMulti'; break;
                        }
                    }
                    showScreen(targetScreen);
                }
                break;
        }
    }

    function sendChat(msg) {
        document.getElementById('quickChatPopup').classList.remove('show');
        Animations.showChatBubble('bottom', msg);
        
        // Simulate a bot replying occasionally
        if (Math.random() > 0.5) {
            const replies = ['ঠিক বলেছেন!', 'খেলুন!', 'হুমম...', 'দেখা যাক!'];
            const randomReply = replies[Math.floor(Math.random() * replies.length)];
            const bots = ['left', 'top', 'right'];
            const randomBot = bots[Math.floor(Math.random() * bots.length)];
            
            setTimeout(() => {
                Animations.showChatBubble(randomBot, randomReply);
            }, 1500 + Math.random() * 2000);
        }
    }

    // ---- Resolution ----

    function resolveTrick() {
        const result = GameEngine.resolveTrick(gameState);
        
        // Animate trick collection
        const trickArea = document.querySelector('.trick-area');
        const winnerPos = GameplayUI.getRelativePosition(result.winner, localPlayerIndex);
        
        if (trickArea) {
             // Visual only, GameEngine already updated state
             Animations.showFloatingScore(trickArea, `+${result.points}`, '#d4a843');
        }

        setTimeout(() => {
            GameplayUI.renderTable();
            GameplayUI.updateScores();
            
            if (result.roundOver) {
                resolveRound();
            } else {
                processPlayingPhase();
            }
        }, 1500);
    }

    function resolveRound() {
        const roundResult = GameEngine.resolveRound(gameState);
        GameplayUI.updateScores();
        
        let msg = roundResult.bidMet ? 'ডাক সফল! ১ পয়েন্ট' : 'ডাক ব্যর্থ! বিপক্ষ দল ১ পয়েন্ট পেল';
        Animations.showFloatingScore(document.querySelector('.game-table'), msg, roundResult.bidMet ? '#2ecc71' : '#e74c3c');
        
        setTimeout(() => {
            if (roundResult.gameOver) {
                finishGame(roundResult);
            } else {
                startRound();
            }
        }, 3000);
    }

    function finishGame(result) {
        const myTeam = GameEngine.getTeam(localPlayerIndex);
        const won = result.gameWinner === myTeam;
        
        // Calculate rewards
        const coinsEarned = won ? 250 : 50;
        const xpEarned = won ? 100 : 20;
        
        // Save stats
        Storage.recordGameResult(won, myTeam === 'A' ? result.teamAGameScore : result.teamBGameScore, myTeam === 'A' ? result.teamBGameScore : result.teamAGameScore, gameState.highestBidder !== -1 ? gameState.highestBid : 0);
        Storage.addCoins(coinsEarned);
        Storage.addXP(xpEarned);
        
        // Add to history
        Storage.addToHistory({
            mode: gameState.config.gameMode,
            won: won,
            score: myTeam === 'A' ? result.teamAGameScore : result.teamBGameScore,
            oppScore: myTeam === 'A' ? result.teamBGameScore : result.teamAGameScore
        });
        
        // Render Result Screen
        UIRenderer.renderScreen('result');
        const rData = {
            won,
            coins: coinsEarned,
            xp: xpEarned,
            score: myTeam === 'A' ? result.teamAGameScore : result.teamBGameScore,
            oppScore: myTeam === 'A' ? result.teamBGameScore : result.teamAGameScore
        };
        // Quick hack: pass data to renderer
        UIRenderer.renderScreen = (function(original) {
            return function(screenId) {
                original(screenId);
                if (screenId === 'result') UIRenderer.renderResult(rData);
            };
        })(UIRenderer.renderScreen);
        
        showScreen('result');
        
        // Reset renderer hack
        UIRenderer.renderScreen = UIRenderer.renderScreen.name === 'renderScreen' ? UIRenderer.renderScreen : arguments.callee;
    }

    function showCustomConfirm(title, message) {
        return new Promise((resolve) => {
            const overlay = document.getElementById("customConfirmModal");
            const titleEl = document.getElementById("cm-title");
            const msgEl = document.getElementById("cm-message");
            const btnCancel = document.getElementById("cm-cancel-btn");
            const btnConfirm = document.getElementById("cm-confirm-btn");

            titleEl.textContent = title;
            msgEl.textContent = message;

            const cleanup = (result) => {
                overlay.classList.remove("show");
                btnCancel.removeEventListener("click", onCancel);
                btnConfirm.removeEventListener("click", onConfirm);
                resolve(result);
            };

            const onCancel = () => cleanup(false);
            const onConfirm = () => cleanup(true);

            btnCancel.addEventListener("click", onCancel);
            btnConfirm.addEventListener("click", onConfirm);

            overlay.classList.add("show");
        });
    }

    async function unsubscribe() {
        const phone = localStorage.getItem('phone');
        if (!phone) {
            localStorage.clear();
            window.location.href = 'auth/login.html';
            return;
        }

        const confirmUnsub = await showCustomConfirm(
            "নিশ্চিত করুন", 
            "আপনি কি নিশ্চিত যে আপনি সাবস্ক্রিপশন বাতিল করতে চান?"
        );
        
        if (!confirmUnsub) return;

        // Demo testing
        if (phone === "01700000000" || phone === "01800000000") {
            localStorage.clear();
            window.location.href = 'auth/login.html';
            return;
        }

        const btn = document.getElementById("unsub-btn");
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = "অপেক্ষা করুন...";
        }

        try {
            const res = await fetch("auth/unsubscribe.php", {
                method: "POST",
                body: new URLSearchParams({ user_mobile: phone })
            });

            const data = await res.json();

            if (data.success) {
                alert("আপনার সাবস্ক্রিপশন সফলভাবে বাতিল করা হয়েছে।");
                localStorage.clear();
                window.location.href = 'auth/login.html';
            } else {
                const errorMsg = data.error || data.statusDetail || data.message || "আনসাবস্ক্রাইব করা সম্ভব হয়নি।";
                alert(errorMsg);
                
                // If user is already unregistered or format is invalid, log them out
                if (errorMsg.toLowerCase().includes("unregistered") || errorMsg.toLowerCase().includes("invalid")) {
                    localStorage.clear();
                    window.location.href = 'auth/login.html';
                    return;
                }
                
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = "🚪 আনসাবস্ক্রাইব";
                }
            }
        } catch (e) {
            alert("Network error");
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = "🚪 আনসাবস্ক্রাইব";
            }
        }
    }
    
    // Expose to global scope for HTML onclick handlers
    window.showScreen = showScreen;

    return {
        init,
        showScreen,
        startMatchmaking,
        startBluetoothMatchmaking,
        fillLobbyWithBots,
        startLobbyGame,
        startGame,
        handlePlayerAction,
        sendChat,
        unsubscribe,
        leaveLobby
    };
})();

// Boot App on load
window.onload = () => {
    App.init();
};
