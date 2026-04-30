// FIREBASE – GINOPS TCG
var firebaseConfig = {
    apiKey: "AIzaSyAFYr9fV20jGpmTlSaYtlKVMxzz1Ksl4ME",
    authDomain: "ginops-tcg-7ea05.firebaseapp.com",
    projectId: "ginops-tcg-7ea05",
    storageBucket: "ginops-tcg-7ea05.firebasestorage.app",
    messagingSenderId: "239570057234",
    appId: "1:239570057234:web:f17979f64895991a1d40cb"
};

firebase.initializeApp(firebaseConfig);
var db = firebase.firestore();

// ===== USUÁRIOS =====
function getAllUsers(callback) {
    db.collection('users').get().then(function(snapshot) {
        var users = [];
        snapshot.forEach(function(doc) { users.push(Object.assign({id:doc.id}, doc.data())); });
        callback(users);
    }).catch(function(e) { console.error(e); callback([]); });
}

function getUserById(userId, callback) {
    db.collection('users').doc(userId).get().then(function(doc) {
        callback(doc.exists ? Object.assign({id:doc.id}, doc.data()) : null);
    }).catch(function(e) { console.error(e); callback(null); });
}

function getUserByEmail(email, callback) {
    db.collection('users').where('email','==',email).get().then(function(snapshot) {
        if (!snapshot.empty) {
            var doc = snapshot.docs[0];
            callback(Object.assign({id:doc.id}, doc.data()));
        } else { callback(null); }
    }).catch(function(e) { console.error(e); callback(null); });
}

function createUser(userData, callback) {
    db.collection('users').add(userData).then(function(ref) {
        callback(Object.assign({id:ref.id}, userData));
    }).catch(function(e) { console.error(e); callback(null); });
}

function updateUser(userId, data, callback) {
    db.collection('users').doc(userId).update(data).then(function() {
        if (callback) callback(true);
    }).catch(function(e) { console.error(e); if (callback) callback(false); });
}

function deleteUser(userId, callback) {
    db.collection('users').doc(userId).delete().then(function() {
        if (callback) callback(true);
    }).catch(function(e) { console.error(e); if (callback) callback(false); });
}

// ===== MISSÕES =====
function getAllMissions(callback) {
    db.collection('missions').get().then(function(snapshot) {
        var missions = [];
        snapshot.forEach(function(doc) { missions.push(Object.assign({id:doc.id}, doc.data())); });
        callback(missions);
    }).catch(function(e) { console.error(e); callback([]); });
}

function getMissionsByLevel(level, callback) {
    db.collection('missions').where('level','==',level).get().then(function(snapshot) {
        var missions = [];
        snapshot.forEach(function(doc) { missions.push(Object.assign({id:doc.id}, doc.data())); });
        callback(missions);
    }).catch(function(e) { console.error(e); callback([]); });
}

function createMission(data, callback) {
    db.collection('missions').add(data).then(function(ref) {
        callback(Object.assign({id:ref.id}, data));
    }).catch(function(e) { console.error(e); callback(null); });
}

function updateMission(missionId, data, callback) {
    db.collection('missions').doc(missionId).update(data).then(function() {
        if (callback) callback(true);
    }).catch(function(e) { console.error(e); if (callback) callback(false); });
}

function deleteMission(missionId, callback) {
    db.collection('missions').doc(missionId).delete().then(function() {
        if (callback) callback(true);
    }).catch(function(e) { console.error(e); if (callback) callback(false); });
}

// ===== RANKING MENSAL =====
function getMonthlyRanking(callback) {
    db.collection('monthlyRanking').orderBy('points','desc').get().then(function(snapshot) {
        var ranking = [];
        snapshot.forEach(function(doc) { ranking.push(Object.assign({id:doc.id}, doc.data())); });
        callback(ranking);
    }).catch(function(e) { console.error(e); callback([]); });
}

// ===== SESSÃO =====
function getCurrentUser() {
    var u = localStorage.getItem('currentUser');
    return u ? JSON.parse(u) : null;
}
function setCurrentUser(user) { localStorage.setItem('currentUser', JSON.stringify(user)); }
function clearCurrentUser() { localStorage.removeItem('currentUser'); }

// ===== HELPERS =====

// Verifica se precisa zerar pontos mensais (dia 1 do mês)
function checkMonthlyReset(user, callback) {
    var now       = new Date();
    var lastReset = user.lastMonthlyReset ? new Date(user.lastMonthlyReset) : null;
    var needsReset = !lastReset ||
        (lastReset.getMonth() !== now.getMonth() || lastReset.getFullYear() !== now.getFullYear());

    if (!needsReset) { callback(user); return; }

    // Mover pontos do mês pro histórico
    var monthPts   = user.monthPoints || 0;
    var histPts    = user.historicPoints || 0;
    var newHistPts = histPts + monthPts;

    // Guardar ranking do mês anterior
    var history = user.monthHistory || [];
    if (monthPts > 0) {
        history.push({
            month:  lastReset ? lastReset.toISOString().slice(0,7) : now.toISOString().slice(0,7),
            points: monthPts,
            date:   new Date().toISOString()
        });
    }

    var updates = {
        monthPoints:      0,
        historicPoints:   newHistPts,
        lastMonthlyReset: now.toISOString(),
        monthHistory:     history
    };

    updateUser(user.id, updates, function() {
        callback(Object.assign({}, user, updates));
    });
}

// Verifica expiração de pontos (a cada 6 meses)
function checkPointsExpiry(user, callback) {
    if (!user.historicPoints || user.historicPoints === 0) { callback(user); return; }

    var now          = new Date();
    var lastActivity = user.lastPointActivity ? new Date(user.lastPointActivity) : new Date(user.createdAt||now);
    var monthsDiff   = (now.getFullYear() - lastActivity.getFullYear()) * 12 + (now.getMonth() - lastActivity.getMonth());

    if (monthsDiff < 6) { callback(user); return; }

    // Expirar pontos históricos
    var updates = { historicPoints: 0, lastExpiry: now.toISOString() };
    updateUser(user.id, updates, function() {
        callback(Object.assign({}, user, updates));
    });
}

// Verifica e atualiza missões automaticamente baseado no evento
function checkMissions(user, eventType, eventData) {
    getAllMissions(function(missions) {
        var userLevel     = user.level || 1;
        var levelMissions = missions.filter(function(m) { return m.level === userLevel; });
        var completedIds  = user.completedMissions || [];
        var progress      = user.missionProgress || {};
        var newCompleted  = completedIds.slice();
        var updated       = false;

        levelMissions.forEach(function(mission) {
            if (completedIds.includes(mission.id)) return;
            if (mission.trigger !== eventType) return;

            var required = parseFloat(mission.required) || 1;
            var current  = 0;

            if (eventType === 'capture') {
                // Pokédex: usa total GLOBAL de pokémons
                current = (user.pokedex || []).length;
            } else if (eventType === 'leilao') {
                // Leilão: acumula valor total em R$ globalmente
                var addVal = parseFloat((eventData && eventData.valor) || 0);
                user.totalLeilaoValue = (user.totalLeilaoValue || 0) + addVal;
                current = user.totalLeilaoValue;
                updated = true;
            } else if (eventType === 'sorteio') {
                // Sorteio: progresso por nível, zera ao subir
                var key = 'sorteio_lv' + userLevel;
                progress[key] = (progress[key] || 0) + 1;
                current = progress[key];
                updated = true;
            } else if (eventType === 'break') {
                // Break: progresso por nível, zera ao subir
                var key = 'break_lv' + userLevel;
                progress[key] = (progress[key] || 0) + 1;
                current = progress[key];
                updated = true;
            }

            if (current >= required) {
                newCompleted.push(mission.id);
                updated = true;
            }
        });

        if (!updated) return;

        var updates = {
            completedMissions: newCompleted,
            missionProgress:   progress,
            totalLeilaoValue:  user.totalLeilaoValue || 0
        };

        var allIds  = levelMissions.map(function(m) { return m.id; });
        var allDone = allIds.length > 0 && allIds.every(function(id) { return newCompleted.includes(id); });

        if (allDone && userLevel < 10) {
            var newLevel = userLevel + 1;
            var bonusPts = 10;
            var history  = user.pointsHistory || [];
            history.push({ id:Date.now().toString(), type:'nivel', points:bonusPts, note:'Subiu para o Nível '+newLevel+'! 🎉', date:new Date().toISOString() });
            updates.level             = newLevel;
            updates.monthPoints       = (user.monthPoints||0) + bonusPts;
            updates.pointsHistory     = history;
            updates.lastPointActivity = new Date().toISOString();
        }

        updateUser(user.id, updates, function() { Object.assign(user, updates); });
    });
}
