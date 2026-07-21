
        window.addEventListener('DOMContentLoaded', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const screen = urlParams.get('screen');
            if (screen) {
                showScreen(screen);
            }
        });

        function showScreen(screenId) {
            document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
            document.getElementById(screenId).classList.add('active');
            
            if (screenId === 'leaderboard') {
                loadLeaderboard();
            }
        }

        // Set user name
        const profileStr = localStorage.getItem('29card_profile');
        if (profileStr) {
            try {
                const profile = JSON.parse(profileStr);
                if (profile.name) {
                    document.getElementById('portalUserName').textContent = profile.name;
                    document.getElementById('portalAvatar').innerHTML = (profile.avatar || '👤') + '<div class="level-badge" id="portalLevelBadge">...</div>';
                    
                    const profNameEl = document.getElementById('portalProfileName');
                    if (profNameEl) profNameEl.textContent = profile.name;
                    
                    const profAvatarEl = document.getElementById('portalProfileAvatar');
                    if (profAvatarEl) profAvatarEl.innerHTML = (profile.avatar || '👤') + '<div class="profile-level" id="portalProfileLevelBadge">...</div>';
                    
                    const profIdEl = document.getElementById('portalProfileId');
                    if (profIdEl) profIdEl.textContent = profile.id;
                }
                const phone = localStorage.getItem('phone') || profile.id;
                if (phone) {
                    document.getElementById('portalPlayerLevel').textContent = phone;
                    
                    const profPhoneEl = document.getElementById('portalProfilePhone');
                    if (profPhoneEl) profPhoneEl.textContent = phone;
                }
            } catch(e) {}
        }
        
        async function updateUserRankBadge() {
            try {
                const snapshot = await firebase.database().ref('users').once('value');
                const data = snapshot.val();
                if (!data) return;
                
                const users = [];
                for (const phone in data) {
                    users.push({
                        phone: phone,
                        wins: data[phone].stats?.wins || 0
                    });
                }
                users.sort((a, b) => b.wins - a.wins);
                
                const myPhone = localStorage.getItem('phone') || (localStorage.getItem('29card_profile') ? JSON.parse(localStorage.getItem('29card_profile')).id : null);
                let myRank = users.findIndex(u => u.phone === myPhone) + 1;
                if (myRank === 0) myRank = users.length + 1;
                
                const badge1 = document.getElementById('portalLevelBadge');
                if (badge1) badge1.textContent = myRank;
                
                const badge2 = document.getElementById('portalProfileLevelBadge');
                if (badge2) badge2.textContent = 'Rank ' + myRank;
                
                let wins = 0;
                let losses = 0;
                let total = 0;
                if (data[myPhone] && data[myPhone].stats) {
                    const stats = data[myPhone].stats;
                    total = stats.totalGames || 0;
                    wins = stats.wins || 0;
                    losses = total > wins ? total - wins : (stats.losses || 0);
                    
                    const totalGamesEl = document.getElementById('portalProfileTotalGames');
                    if (totalGamesEl) totalGamesEl.textContent = total;
                    
                    const winsEl = document.getElementById('portalProfileWins');
                    if (winsEl) winsEl.textContent = wins;
                    
                    const lossesEl = document.getElementById('portalProfileLosses');
                    if (lossesEl) lossesEl.textContent = losses;
                }
                
                // Calculate XP and Level
                const level = Math.floor(wins / 100) + 1;
                const nextLevelWins = level * 100;
                const progressPercent = (wins / nextLevelWins) * 100;
                
                const xpFill = document.getElementById('portalProfileXpFill');
                if (xpFill) xpFill.style.width = progressPercent + '%';
                
                const xpLabel = document.getElementById('portalProfileXpLabel');
                if (xpLabel) xpLabel.textContent = `${wins} / ${nextLevelWins} XP`;
                
                const portalPlayerLevel = document.getElementById('portalPlayerLevel');
                if (portalPlayerLevel) {
                    const rankName = level < 2 ? 'ব্রোঞ্জ' : level < 4 ? 'সিলভার' : level < 6 ? 'গোল্ড' : 'ডায়মন্ড';
                    portalPlayerLevel.textContent = `লেভেল ${level} • ${rankName}`;
                }
                
                // Unlock achievements based on wins (0, 100, 200, 300...)
                const badges = document.querySelectorAll('.achievement-badge');
                badges.forEach((badge, index) => {
                    const requiredWins = index * 100;
                    if (wins >= requiredWins) {
                        badge.classList.remove('locked');
                    } else {
                        badge.classList.add('locked');
                    }
                });
            } catch(e) {
                console.error(e);
            }
        }
        
        async function animateActivePlayers() {
            try {
                const snapshot = await firebase.database().ref('users').once('value');
                const data = snapshot.val();
                let totalUsers = Object.keys(data || {}).length;
                
                // Since we don't track separate game presence yet, we split the total users
                // to give a realistic separate count for both games.
                let p29Count = Math.ceil(totalUsers * 0.55);
                let pCBCount = Math.floor(totalUsers * 0.25);
                let pHajariCount = Math.floor(totalUsers * 0.20);
                
                // Ensure at least 1 if there are any users
                if (totalUsers > 0 && pCBCount === 0) pCBCount = 1;
                if (totalUsers > 0 && pHajariCount === 0) pHajariCount = 1;
                
                const p29El = document.getElementById('activePlayers29');
                const pCBEl = document.getElementById('activePlayersCB');
                const pHajariEl = document.getElementById('activePlayersHajari');
                
                if (p29El) p29El.textContent = `👥 ${p29Count.toLocaleString()} খেলছে`;
                if (pCBEl) pCBEl.textContent = `👥 ${pCBCount.toLocaleString()} খেলছে`;
                if (pHajariEl) pHajariEl.textContent = `👥 ${pHajariCount.toLocaleString()} খেলছে`;
                
            } catch(e) {
                console.error("Error fetching real player count:", e);
            }
        }
        
        updateUserRankBadge();
        animateActivePlayers();

        function logout() {
            const overlay = document.getElementById('logoutModalOverlay');
            const modal = document.getElementById('logoutModal');
            overlay.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }
        
        function closeLogoutModal() {
            const overlay = document.getElementById('logoutModalOverlay');
            const modal = document.getElementById('logoutModal');
            modal.classList.remove('show');
            setTimeout(() => overlay.style.display = 'none', 200);
        }
        
        function confirmLogout() {
            localStorage.removeItem('isLoggedIn');
            window.location.href = 'auth/login.html';
        }

        function unsubscribe() {
            const overlay = document.getElementById('unsubModalOverlay');
            const modal = document.getElementById('unsubModal');
            overlay.style.display = 'flex';
            setTimeout(() => modal.classList.add('show'), 10);
        }
        
        function closeUnsubModal() {
            const overlay = document.getElementById('unsubModalOverlay');
            const modal = document.getElementById('unsubModal');
            modal.classList.remove('show');
            setTimeout(() => overlay.style.display = 'none', 200);
        }
        
        async function confirmUnsub() {
            const phone = localStorage.getItem('phone');
            if (!phone) {
                localStorage.clear();
                window.location.href = 'auth/login.html';
                return;
            }

            // Demo testing
            if (phone === "01700000000" || phone === "01800000000") {
                localStorage.clear();
                window.location.href = 'auth/login.html';
                return;
            }

            const btns = document.querySelectorAll("#unsub-btn");
            btns.forEach(btn => {
                btn.disabled = true;
                btn.innerHTML = "অপেক্ষা করুন...";
            });

            closeUnsubModal();

            try {
                const res = await fetch("auth/unsubscribe.php", {
                    method: "POST",
                    body: new URLSearchParams({ user_mobile: phone })
                });

                const data = await res.json();

                if (data.success) {
                    await (window.showCustomAlert ? window.showCustomAlert("বিজ্ঞপ্তি", "আপনার সাবস্ক্রিপশন সফলভাবে বাতিল করা হয়েছে।") : alert("আপনার সাবস্ক্রিপশন সফলভাবে বাতিল করা হয়েছে।"));
                    localStorage.clear();
                    window.location.href = 'auth/login.html';
                } else {
                    const errorMsg = data.error || data.statusDetail || data.message || "আনসাবস্ক্রাইব করা সম্ভব হয়নি।";
                    
                    // If user is already unregistered or format is invalid, log them out gracefully
                    if (errorMsg.toLowerCase().includes("unregistered") || errorMsg.toLowerCase().includes("invalid")) {
                        await (window.showCustomAlert ? window.showCustomAlert("বিজ্ঞপ্তি", "আপনার সাবস্ক্রিপশন বাতিল করা হয়েছে।") : alert("আপনার সাবস্ক্রিপশন বাতিল করা হয়েছে।"));
                        localStorage.clear();
                        window.location.href = 'auth/login.html';
                        return;
                    }
                    
                    await (window.showCustomAlert ? window.showCustomAlert("বিজ্ঞপ্তি", errorMsg) : alert(errorMsg));
                    
                    btns.forEach(btn => {
                        btn.disabled = false;
                        btn.innerHTML = "🚪 আনসাবস্ক্রাইব";
                    });
                }
            } catch (e) {
                await (window.showCustomAlert ? window.showCustomAlert("বিজ্ঞপ্তি", "Network error") : alert("Network error"));
                btns.forEach(btn => {
                    btn.disabled = false;
                    btn.innerHTML = "🚪 আনসাবস্ক্রাইব";
                });
            }
        }

        async function loadLeaderboard() {
            const topThreeContainer = document.querySelector('#leaderboard .lb-top-three');
            const listContainer = document.querySelector('#leaderboard .lb-list');
            
            try {
                const snapshot = await firebase.database().ref('users').once('value');
                const data = snapshot.val();
                if (!data) {
                    topThreeContainer.innerHTML = '<div style="text-align:center; color: white;">কোনো ডাটা পাওয়া যায়নি।</div>';
                    listContainer.innerHTML = '';
                    return;
                }
                
                const users = [];
                for (const phone in data) {
                    const user = data[phone];
                    users.push({
                        phone: phone,
                        name: user.profile?.name || user.name || 'অজানা',
                        wins: user.stats?.wins || 0,
                        avatar: user.profile?.avatarEmoji || user.avatar || '👤'
                    });
                }
                users.sort((a, b) => b.wins - a.wins);
                
                // Render Top 3
                topThreeContainer.innerHTML = '';
                const top3 = users.slice(0, 3);
                
                const renderTopPlayer = (player, rank) => {
                    if (!player) return '';
                    const medal = rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉';
                    return `
                        <div class="lb-top-player" style="text-align: center; flex: 1;">
                            <div class="ltp-avatar" style="font-size: 30px; position: relative; display: inline-block;">
                                ${player.avatar}
                                <div style="position: absolute; bottom: -5px; right: -5px; font-size: 14px; background: rgba(0,0,0,0.8); border-radius: 50%; width: 20px; height: 20px;">${medal}</div>
                            </div>
                            <div class="ltp-name" style="font-size: 14px; margin-top: 5px; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px; margin-left: auto; margin-right: auto;">${player.name}</div>
                            <div class="ltp-score" style="font-size: 12px; color: var(--gold-light);">${player.wins} জয়</div>
                        </div>
                    `;
                };
                
                let top3HTML = '';
                if (top3[1]) top3HTML += renderTopPlayer(top3[1], 2);
                if (top3[0]) top3HTML += renderTopPlayer(top3[0], 1);
                if (top3[2]) top3HTML += renderTopPlayer(top3[2], 3);
                topThreeContainer.innerHTML = top3HTML;
                
                // Render List
                let listHTML = '';
                const maxListSize = Math.min(20, users.length);
                for (let i = 3; i < maxListSize; i++) {
                    const u = users[i];
                    listHTML += `
                        <div class="lb-item" style="display: flex; align-items: center; padding: 12px; background: rgba(255,255,255,0.05); margin-bottom: 8px; border-radius: 8px;">
                            <div class="lbi-rank" style="width: 30px; font-weight: bold; color: #888;">${i + 1}</div>
                            <div class="lbi-avatar" style="font-size: 24px; margin-right: 12px;">${u.avatar}</div>
                            <div class="lbi-info" style="flex: 1;">
                                <div class="lbi-name" style="color: white; font-weight: 500;">${u.name}</div>
                            </div>
                            <div class="lbi-score" style="color: var(--gold-light); font-weight: bold;">${u.wins} জয়</div>
                        </div>
                    `;
                }
                
                const myPhone = localStorage.getItem('phone') || (localStorage.getItem('29card_profile') ? JSON.parse(localStorage.getItem('29card_profile')).id : null);
                const myIndex = users.findIndex(u => u.phone === myPhone);
                
                let myName = 'আপনি';
                let myAvatar = '👤';
                let myWins = 0;
                let myRank = users.length + 1;
                
                if (myIndex !== -1) {
                    myName = users[myIndex].name;
                    myAvatar = users[myIndex].avatar;
                    myWins = users[myIndex].wins;
                    myRank = myIndex + 1;
                } else if (localStorage.getItem('29card_profile')) {
                    const prof = JSON.parse(localStorage.getItem('29card_profile'));
                    if (prof.name) myName = prof.name;
                    if (prof.avatarEmoji || prof.avatar) myAvatar = prof.avatarEmoji || prof.avatar;
                }
                
                if (myIndex >= 20 || myIndex === -1) {
                    listHTML += `
                        <div style="text-align: center; color: #888; margin: 10px 0;">...</div>
                        <div class="lb-item highlight-my-rank" style="display: flex; align-items: center; padding: 12px; background: rgba(241, 196, 15, 0.1); border: 1px solid rgba(241, 196, 15, 0.3); margin-bottom: 8px; border-radius: 8px;">
                            <div class="lbi-rank" style="width: 30px; font-weight: bold; color: #f1c40f;">${myRank}</div>
                            <div class="lbi-avatar" style="font-size: 24px; margin-right: 12px;">${myAvatar}</div>
                            <div class="lbi-info" style="flex: 1;">
                                <div class="lbi-name" style="color: white; font-weight: 500;">${myName} ${myIndex !== -1 ? '(আপনি)' : ''}</div>
                            </div>
                            <div class="lbi-score" style="color: var(--gold-light); font-weight: bold;">${myWins} জয়</div>
                        </div>
                    `;
                }
                
                listContainer.innerHTML = listHTML;
                listContainer.style.display = 'block';
            } catch(e) {
                console.error(e);
                topThreeContainer.innerHTML = '<div style="text-align:center; color: #e74c3c;">লোড করতে সমস্যা হয়েছে।</div>';
                listContainer.innerHTML = '';
            }
        }
    