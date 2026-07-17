/**
 * ২৯ কার্ড গেম — UI Renderer
 * Handles data population for non-gameplay screens.
 */
const UIRenderer = (() => {

    function renderScreen(screenId) {
        switch (screenId) {
            case 'home': renderHome(); break;
            case 'profile': renderProfile(); break;
            case 'result': renderResult(); break;
            case 'settings': renderSettings(); break;
            case 'leaderboard': renderLeaderboard(); break;
        }
    }

    function renderHome() {
        const profile = Storage.getProfile();
        
        // Update top bar
        const nameEl = document.querySelector('#home .player-name');
        if (nameEl) nameEl.innerText = profile.name;
        
        const avatarEl = document.querySelector('#home .avatar');
        if (avatarEl) avatarEl.innerHTML = `${profile.avatarEmoji}<div class="level-badge" id="c29LevelBadge">...</div>`;
        
        const phone = localStorage.getItem('phone') || profile.id; // fallback to ID if no phone
        
        // Fetch from firebase to get dynamic rank and level
        if (typeof firebase !== 'undefined' && firebase.database) {
            firebase.database().ref('users').once('value').then(snapshot => {
                const data = snapshot.val();
                if (data) {
                    // 1. Calculate Rank
                    const users = Object.values(data);
                    users.sort((a, b) => {
                        const aWins = (a.stats && a.stats.wins) ? a.stats.wins : 0;
                        const bWins = (b.stats && b.stats.wins) ? b.stats.wins : 0;
                        return bWins - aWins;
                    });
                    let myRank = users.findIndex(u => u.phone === phone) + 1;
                    if (myRank === 0) myRank = users.length + 1;
                    
                    const badge = document.querySelector('#home .level-badge');
                    if (badge) badge.textContent = myRank;
                    
                    // 2. Calculate Level
                    let wins = 0;
                    if (data[phone] && data[phone].stats && data[phone].stats.wins) {
                        wins = data[phone].stats.wins;
                    }
                    const level = Math.floor(wins / 100) + 1;
                    const rankName = level < 2 ? 'ব্রোঞ্জ' : level < 4 ? 'সিলভার' : level < 6 ? 'গোল্ড' : 'ডায়মন্ড';
                    
                    const levelEl = document.querySelector('#home .player-level');
                    if (levelEl) levelEl.textContent = `লেভেল ${level} • ${rankName}`;
                }
            }).catch(err => console.error(err));
        }
    }

    function renderProfile() {
        const profile = Storage.getProfile();
        const stats = Storage.getStats();
        
        // Header
        const nameEl = document.querySelector('#profile .profile-name');
        if (nameEl) nameEl.innerText = profile.name;
        
        const idEl = document.querySelector('#profile .profile-id');
        if (idEl) idEl.innerText = `ID: ${profile.id}`;
        
        const phoneEl = document.querySelector('#profile .profile-phone');
        const phone = localStorage.getItem('phone') || '';
        if (phoneEl) phoneEl.innerText = phone;
        
        const avatarEl = document.querySelector('#profile .profile-avatar');
        if (avatarEl) avatarEl.innerHTML = `${profile.avatarEmoji}<div class="profile-level">Lv.${profile.level}</div>`;
        
        // XP Bar
        const xpFill = document.querySelector('#profile .xp-fill');
        const xpLabel = document.querySelector('#profile .xp-label');
        if (xpFill && xpLabel) {
            const pct = Math.min(100, (profile.xp / profile.xpToNext) * 100);
            xpFill.style.width = `${pct}%`;
            xpLabel.innerText = `${profile.xp} / ${profile.xpToNext} XP`;
        }
        
        // Stats
        const statValues = document.querySelectorAll('#profile .stat-value');
        if (statValues.length >= 2) {
            statValues[0].innerText = `${stats.winRate}%`; // Win rate
            statValues[1].innerText = stats.totalGames; // Matches played
        }
        
        // Match history
        const historyContainer = document.querySelector('#profile .match-history');
        if (historyContainer) {
            const history = Storage.getHistory();
            
            // Keep the section title
            const titleHtml = '<div class="section-title">🕒 সাম্প্রতিক ম্যাচ</div>';
            
            if (history.length === 0) {
                historyContainer.innerHTML = titleHtml + '<div style="text-align:center; padding: 20px; color: var(--text-muted); font-size: 13px;">কোন ম্যাচ খেলা হয়নি</div>';
            } else {
                let html = titleHtml;
                history.forEach(match => {
                    const isWin = match.won;
                    
                    // Format Date (আজ, গতকাল, or date)
                    const dateObj = new Date(match.timestamp);
                    const today = new Date();
                    const yesterday = new Date(today);
                    yesterday.setDate(yesterday.getDate() - 1);
                    
                    let dateStr = '';
                    if (dateObj.toDateString() === today.toDateString()) {
                        dateStr = 'আজ, ' + dateObj.toLocaleTimeString('bn-BD', {hour: 'numeric', minute:'2-digit', hour12: true});
                    } else if (dateObj.toDateString() === yesterday.toDateString()) {
                        dateStr = 'গতকাল, ' + dateObj.toLocaleTimeString('bn-BD', {hour: 'numeric', minute:'2-digit', hour12: true});
                    } else {
                        dateStr = dateObj.toLocaleDateString('bn-BD') + ', ' + dateObj.toLocaleTimeString('bn-BD', {hour: 'numeric', minute:'2-digit', hour12: true});
                    }
                    
                    let modeName = 'বট ম্যাচ';
                    if (match.mode === 'lan') modeName = 'ল্যান ম্যাচ';
                    else if (match.mode === 'online') modeName = 'র‍্যাঙ্কড ম্যাচ';
                    
                    html += `
                    <div class="history-item">
                        <div class="hi-result ${isWin ? 'win' : 'loss'}">${isWin ? 'W' : 'L'}</div>
                        <div class="hi-info">
                            <div class="hi-mode">${modeName}</div>
                            <div class="hi-date">${dateStr}</div>
                        </div>
                        <div class="hi-score">${match.score} - ${match.oppScore}</div>
                    </div>`;
                });
                historyContainer.innerHTML = html;
            }
        }
    }

    function renderResult(resultData) {
        if (!resultData) return;
        
        const titleEl = document.querySelector('#result .result-title');
        const scoreEl = document.querySelector('#result .result-score');
        const rewardValues = document.querySelectorAll('#result .reward-value');
        
        if (resultData.won) {
            if (titleEl) {
                titleEl.innerText = 'বিজয়ী!';
                titleEl.style.background = 'var(--gold-text-gradient)';
                titleEl.style.webkitTextFillColor = 'transparent';
                titleEl.style.webkitBackgroundClip = 'text';
            }
            if (rewardValues.length >= 2) {
                rewardValues[0].innerText = `+${resultData.coins}`;
                rewardValues[1].innerText = `+${resultData.xp} XP`;
            }
        } else {
            if (titleEl) {
                titleEl.innerText = 'পরাজিত';
                titleEl.style.background = 'linear-gradient(135deg, #e74c3c, #c0392b)';
                titleEl.style.webkitTextFillColor = 'transparent';
                titleEl.style.webkitBackgroundClip = 'text';
            }
            if (rewardValues.length >= 2) {
                rewardValues[0].innerText = `+${resultData.coins}`; // Consolation
                rewardValues[1].innerText = `+${resultData.xp} XP`;
            }
        }
        
        if (scoreEl) {
            scoreEl.innerText = `স্কোর: ${resultData.score} - ${resultData.oppScore}`;
        }
    }

    function renderSettings() {
        const settings = Storage.getSettings();
        
        // Find toggles (assuming order: Sound, Music, Vibration)
        const toggles = document.querySelectorAll('#settings .toggle');
        if (toggles.length >= 3) {
            if (settings.sound) toggles[0].classList.add('on'); else toggles[0].classList.remove('on');
            if (settings.music) toggles[1].classList.add('on'); else toggles[1].classList.remove('on');
            if (settings.vibration) toggles[2].classList.add('on'); else toggles[2].classList.remove('on');
            
            // Add click listeners if not added yet
            if (!toggles[0].hasAttribute('data-init')) {
                toggles[0].setAttribute('data-init', 'true');
                toggles[0].onclick = function() {
                    this.classList.toggle('on');
                    Storage.updateSetting('sound', this.classList.contains('on'));
                };
                toggles[1].onclick = function() {
                    this.classList.toggle('on');
                    Storage.updateSetting('music', this.classList.contains('on'));
                };
                toggles[2].onclick = function() {
                    this.classList.toggle('on');
                    Storage.updateSetting('vibration', this.classList.contains('on'));
                };
            }
        }
    }

    async function renderLeaderboard() {
        const topThreeContainer = document.querySelector('#leaderboard .lb-top-three');
        const listContainer = document.querySelector('#leaderboard .lb-list');
        
        if (!topThreeContainer || !listContainer) return;
        
        if (typeof Network === 'undefined' || !Network.fetchLeaderboard) return;
        
        // Show loading (optional)
        topThreeContainer.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--gold-light);">লোড হচ্ছে...</div>';
        listContainer.innerHTML = '';
        
        const users = await Network.fetchLeaderboard();
        if (users.length === 0) {
            topThreeContainer.innerHTML = '<div style="text-align:center; color: white;">কোনো ডাটা পাওয়া যায়নি।</div>';
            return;
        }
        
        const currentUserPhone = localStorage.getItem('phone');
        
        // --- Render Top 3 ---
        topThreeContainer.innerHTML = '';
        const top3 = users.slice(0, 3);
        
        const renderTopPlayer = (player, rank) => {
            if (!player) return '';
            const medal = rank === 1 ? '👑' : rank === 2 ? '🥈' : '🥉';
            return `
                <div class="lb-top-player">
                    <div class="ltp-avatar">${medal}<div class="ltp-rank">${rank}</div></div>
                    <div class="ltp-name">${player.name}</div>
                    <div class="ltp-score">${player.wins} জয়</div>
                </div>
            `;
        };
        
        let top3HTML = '';
        if (top3[1]) top3HTML += renderTopPlayer(top3[1], 2);
        if (top3[0]) top3HTML += renderTopPlayer(top3[0], 1);
        if (top3[2]) top3HTML += renderTopPlayer(top3[2], 3);
        
        topThreeContainer.innerHTML = top3HTML;
        
        // --- Render List ---
        listContainer.innerHTML = '';
        let currentUserRank = users.findIndex(u => u.phone === currentUserPhone);
        
        // 1. Render logged in user right below Top 3 (if exists and is ranked)
        if (currentUserRank !== -1) {
            const myUser = users[currentUserRank];
            const isMeStyle = `style="border-color:var(--gold-primary);background:rgba(212,168,67,0.08)"`;
            const rankStyle = `style="color:var(--gold-primary)"`;
            const avatarStyle = `style="border-color:var(--gold-primary)"`;
            const nameStyle = `style="color:var(--gold-light)"`;
            
            listContainer.innerHTML += `
                <div class="lb-item" ${isMeStyle}>
                    <div class="lb-rank" ${rankStyle}>${currentUserRank + 1}</div>
                    <div class="lb-avatar" ${avatarStyle}>${myUser.avatar}</div>
                    <div class="lb-info">
                        <div class="lb-name" ${nameStyle}>${myUser.name} (আপনি)</div>
                    </div>
                    <div class="lb-pts">${myUser.wins} জয়</div>
                </div>
            `;
        }
        
        // 2. Render others (up to top 100)
        let addedCount = 0;
        for (let i = 3; i < users.length; i++) {
            if (addedCount > 100) break;
            const player = users[i];
            
            // Skip if it's the current user (already shown)
            if (player.phone === currentUserPhone) continue;
            
            listContainer.innerHTML += `
                <div class="lb-item">
                    <div class="lb-rank">${i + 1}</div>
                    <div class="lb-avatar">${player.avatar}</div>
                    <div class="lb-info">
                        <div class="lb-name">${player.name}</div>
                    </div>
                    <div class="lb-pts">${player.wins} জয়</div>
                </div>
            `;
            addedCount++;
        }
    }

    return {
        renderScreen,
        renderResult
    };
})();
