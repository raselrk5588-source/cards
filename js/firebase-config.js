// js/firebase-config.js

/**
 * Firebase Config - Replace with your own project config!
 * You can find this in your Firebase Console -> Project Settings
 */
const firebaseConfig = {
    apiKey: "dummy-api-key-for-rtdb",
    authDomain: "cardadda-afa34.firebaseapp.com",
    databaseURL: "https://cardadda-afa34-default-rtdb.firebaseio.com",
    projectId: "cardadda-afa34",
    storageBucket: "cardadda-afa34.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:dummy"
};

// Initialize Firebase only if the script is loaded and config is set
if (typeof firebase !== 'undefined') {
    if (!firebase.apps.length) {
        try {
            firebase.initializeApp(firebaseConfig);
        } catch(e) {
            console.error("Firebase Initialization Error:", e);
        }
    }
}

const FirebaseManager = {
    myUserId: null,
    
    initOnlineStatus: function() {
        if (typeof firebase === 'undefined' || !firebase.apps.length) return;
        if (!localStorage.getItem("isLoggedIn")) return;
        
        const database = firebase.database();
        const phone = localStorage.getItem("phone") || "unknown_" + Math.random().toString(36).substr(2, 5);
        let name = "Player";
        let avatar = "😎";
        
        try {
            const profileStr = localStorage.getItem('29card_profile');
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                if (profile.name) name = profile.name;
                if (profile.avatarEmoji) avatar = profile.avatarEmoji;
            }
        } catch(e) {}
        
        this.myUserId = phone; // Using phone number as unique ID
        
        const userRef = database.ref('online_users/' + this.myUserId);
        const globalUserRef = database.ref('users/' + this.myUserId);
        
        // Listen for connection state
        const connectedRef = database.ref('.info/connected');
        connectedRef.on('value', (snap) => {
            if (snap.val() === true) {
                // Also update the global users node for leaderboard
                let stats = { wins: 0, matches: 0, winRate: 0 };
                try {
                    const statsStr = localStorage.getItem('29card_stats');
                    if (statsStr) {
                        const s = JSON.parse(statsStr);
                        stats.wins = s.wins || 0;
                        stats.matches = s.totalGames || 0;
                        stats.winRate = s.winRate || 0;
                    }
                } catch(e) {}
                
                globalUserRef.update({
                    name: name,
                    phone: phone,
                    avatar: avatar,
                    stats: stats,
                    last_login: firebase.database.ServerValue.TIMESTAMP
                });

                // When I disconnect, remove my node
                userRef.onDisconnect().remove().then(() => {
                    // Set my status to online
                    userRef.set({
                        name: name,
                        phone: phone,
                        avatar: avatar,
                        status: 'online',
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    });
                });
            }
        });
    },

    listenForOnlineUsers: function(callback) {
        if (typeof firebase === 'undefined' || !firebase.apps.length) {
            console.warn("Firebase not loaded! Simulating empty online list.");
            if (callback) callback([]);
            return;
        }

        const database = firebase.database();
        const usersRef = database.ref('online_users');
        
        usersRef.on('value', (snapshot) => {
            const users = [];
            snapshot.forEach((childSnapshot) => {
                const data = childSnapshot.val();
                // Exclude myself from the list
                if (data.phone !== this.myUserId) {
                    users.push(data);
                }
            });
            
            // --- AI BOTS ---
            const staticBots = [
                { phone: 'bot_1', name: 'Hasan', avatar: '👦', status: 'online' },
                { phone: 'bot_2', name: 'Rahim', avatar: '👨', status: 'online' },
                { phone: 'bot_3', name: 'Ayesha', avatar: '👩', status: 'online' },
                { phone: 'bot_4', name: 'Karim', avatar: '🧔', status: 'online' },
                { phone: 'bot_5', name: 'Sumi', avatar: '👱‍♀️', status: 'online' }
            ];
            
            // Append bots to the end of the users list
            users.push(...staticBots);
            
            if (callback) callback(users);
        });
    },
    
    // ---- Invite System ----
    
    sendInvite: function(recipientPhone) {
        if (typeof firebase === 'undefined' || !this.myUserId || !firebase.apps || !firebase.apps.length) return;
        
        let name = "Player";
        let avatar = "😎";
        try {
            const profileStr = localStorage.getItem('29card_profile');
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                if (profile.name) name = profile.name;
                if (profile.avatarEmoji) avatar = profile.avatarEmoji;
            }
        } catch(e) {}
        
        // --- BOT INTERCEPTION ---
        if (recipientPhone.startsWith('bot_')) {
            // Simulate bot accepting the invite after a delay
            setTimeout(() => {
                if (this._inviteResponseCallback) {
                    // Extract bot name from the bots array
                    const bots = [
                        { phone: 'bot_1', name: 'Hasan', avatar: '👦' },
                        { phone: 'bot_2', name: 'Rahim', avatar: '👨' },
                        { phone: 'bot_3', name: 'Ayesha', avatar: '👩' },
                        { phone: 'bot_4', name: 'Karim', avatar: '🧔' },
                        { phone: 'bot_5', name: 'Sumi', avatar: '👱‍♀️' }
                    ];
                    const bot = bots.find(b => b.phone === recipientPhone) || { name: 'Bot', avatar: '🤖' };
                    
                    this._inviteResponseCallback(recipientPhone, {
                        status: 'accepted',
                        responderName: bot.name,
                        responderAvatar: bot.avatar
                    });
                }
            }, 2000 + Math.random() * 2000); // 2-4 seconds delay
            return;
        }
        
        const database = firebase.database();
        const inviteRef = database.ref(`invites/${recipientPhone}/${this.myUserId}`);
        
        inviteRef.set({
            hostPhone: this.myUserId,
            hostName: name,
            hostAvatar: avatar,
            status: 'pending',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Auto remove invite after 30 seconds if no response
        setTimeout(() => {
            inviteRef.once('value').then(snap => {
                if(snap.exists() && snap.val().status === 'pending') {
                    inviteRef.remove();
                }
            });
        }, 30000);
    },
    
    listenForInvites: function(onInviteReceived) {
        if (!this.myUserId || !firebase.apps.length) return;
        
        const database = firebase.database();
        const myInvitesRef = database.ref(`invites/${this.myUserId}`);
        
        myInvitesRef.on('child_added', (snapshot) => {
            const inviteData = snapshot.val();
            if (inviteData && inviteData.status === 'pending') {
                if (onInviteReceived) onInviteReceived(inviteData);
            }
        });
        
        myInvitesRef.on('child_changed', (snapshot) => {
            const inviteData = snapshot.val();
            if (inviteData && inviteData.status === 'pending') {
                if (onInviteReceived) onInviteReceived(inviteData);
            }
        });
    },
    
    respondToInvite: function(hostPhone, responseStatus) {
        if (typeof firebase === 'undefined' || !this.myUserId || !firebase.apps.length) return;
        
        let name = "Player";
        let avatar = "😎";
        try {
            const profileStr = localStorage.getItem('29card_profile');
            if (profileStr) {
                const profile = JSON.parse(profileStr);
                if (profile.name) name = profile.name;
                if (profile.avatarEmoji) avatar = profile.avatarEmoji;
            }
        } catch(e) {}
        
        const database = firebase.database();
        const inviteRef = database.ref(`invites/${this.myUserId}/${hostPhone}`);
        
        inviteRef.update({
            status: responseStatus,
            responderName: name,
            responderAvatar: avatar
        });
        
        // If rejected, remove it after a bit
        if (responseStatus === 'rejected') {
            setTimeout(() => inviteRef.remove(), 5000);
        } else if (responseStatus === 'accepted') {
            localStorage.setItem('currentHost', hostPhone);
            // Leave it for the host to see, host will clear it
        }
    },
    
    clearInvite: function(recipientPhone) {
        if (!this.myUserId || !firebase.apps.length) return;
        if (recipientPhone.startsWith('bot_')) return; // Bots don't have real invites to clear
        
        const database = firebase.database();
        const inviteRef = database.ref(`invites/${recipientPhone}/${this.myUserId}`);
        if(inviteRef) inviteRef.remove();
    },
    
    _inviteResponseCallback: null,
    
    listenForInviteResponses: function(onResponse) {
        if (typeof firebase === 'undefined' || !this.myUserId || !firebase.apps || !firebase.apps.length) return;
        
        this._inviteResponseCallback = onResponse;
        
        const database = firebase.database();
        const usersRef = database.ref('invites');
        
        // Listen to all invites where I am the host
        usersRef.on('value', (snapshot) => {
            snapshot.forEach(recipientSnap => {
                const recipientPhone = recipientSnap.key;
                const myInviteSnap = recipientSnap.child(this.myUserId);
                
                if (myInviteSnap.exists()) {
                    const data = myInviteSnap.val();
                    if (data.status === 'accepted' || data.status === 'rejected') {
                        // Pass back the recipient's phone and their response
                        if (onResponse) onResponse(recipientPhone, data);
                    }
                }
            });
        });
    },
    
    // ---- Guest Lobby Sync ----
    
    syncLobbyState: function(playersArray) {
        if (typeof firebase === 'undefined' || !this.myUserId || !firebase.apps || !firebase.apps.length) return;
        const database = firebase.database();
        const lobbyRef = database.ref(`online_lobby/${this.myUserId}`);
        
        lobbyRef.update({
            players: playersArray,
            status: 'waiting',
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        
        // Remove lobby when host disconnects
        lobbyRef.onDisconnect().remove();
    },
    
    listenToLobby: function(hostPhone, callback) {
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length) return;
        const database = firebase.database();
        const lobbyRef = database.ref(`online_lobby/${hostPhone}`);
        
        lobbyRef.on('value', (snapshot) => {
            if (callback) callback(snapshot.val());
        });
    },
    
    startOnlineGame: function(deck, players) {
        if (typeof firebase === 'undefined' || !this.myUserId || !firebase.apps || !firebase.apps.length) return;
        const database = firebase.database();
        const lobbyRef = database.ref(`online_lobby/${this.myUserId}`);
        
        let updateData = {
            status: 'started',
            deck: deck || null
        };
        if (players) updateData.players = players;
        
        lobbyRef.update(updateData);
        
        // Clear previous match actions
        database.ref(`online_match/${this.myUserId}/actions`).remove();
    },
    
    // ---- Multiplayer Sync ----
    
    sendGameAction: function(hostPhone, action, data, playerIndex) {
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length || !hostPhone) return;
        const database = firebase.database();
        const actionsRef = database.ref(`online_match/${hostPhone}/actions`);
        
        actionsRef.push({
            action: action,
            data: data !== undefined ? data : null,
            playerIndex: playerIndex,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
    },
    
    listenForGameActions: function(hostPhone, callback) {
        if (typeof firebase === 'undefined' || !firebase.apps || !firebase.apps.length || !hostPhone) return;
        const database = firebase.database();
        const actionsRef = database.ref(`online_match/${hostPhone}/actions`);
        
        actionsRef.off('child_added'); // Prevent duplicate listeners
        // Listen for new actions added
        actionsRef.on('child_added', (snapshot) => {
            if (callback) callback(snapshot.val());
        });
    }
};
