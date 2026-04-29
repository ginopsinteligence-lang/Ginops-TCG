// ADMIN – GINOPS TCG
var NIVEL_NOMES = ['','Iniciante','Aprendiz','Treinador','Expert','Especialista','Mestre','Veterano','Elite','Lenda','Campeão'];
var BONUS_RANKING = [0,50,30,20,10,10,10,10,10,10,10]; // posição 1-10

document.addEventListener('DOMContentLoaded', function() {
    var currentUser = getCurrentUser();
    if (!currentUser || !currentUser.isAdmin) {
        alert('Acesso negado!'); window.location.href = 'index.html'; return;
    }
    var adminNameEl = document.querySelector('.admin-name');
    if (adminNameEl) adminNameEl.textContent = currentUser.name;

    document.getElementById('btnLogout').addEventListener('click', function() {
        clearCurrentUser(); window.location.href = 'index.html';
    });

    loadAdminStats();
    loadPlayers();

    document.getElementById('searchPlayer').addEventListener('input', function() { loadPlayers(this.value); });
    var cs = document.getElementById('cardSearch');
    if (cs) cs.addEventListener('keydown', function(e) { if(e.key==='Enter') searchCards(); });
});

// ===== STATS =====
function loadAdminStats() {
    getAllUsers(function(users) {
        var totalCards=0, totalPts=0, totalMonthPts=0, topPlayer=null, topPts=-1;
        users.forEach(function(u) {
            totalCards   += (u.pokedex?u.pokedex.length:0);
            totalPts     += (u.monthPoints||0)+(u.historicPoints||0);
            totalMonthPts+= (u.monthPoints||0);
            if((u.monthPoints||0)>topPts){topPts=u.monthPoints||0;topPlayer=u.name;}
        });
        document.getElementById('totalPlayers').textContent = users.length;
        document.getElementById('totalCards').textContent   = totalCards;
        document.getElementById('totalPoints').textContent  = totalMonthPts;
        var t = document.getElementById('topPlayer');
        if(t) t.textContent = topPlayer||'–';

        // Reserva financeira
        var reserva = (totalMonthPts + users.reduce(function(s,u){return s+(u.historicPoints||0);},0)) * 0.3;
        var reservaEl = document.getElementById('reservaFinanceira');
        if(reservaEl) reservaEl.textContent = 'R$'+reserva.toFixed(2).replace('.',',');
    });
}

// ===== PLAYERS =====
function loadPlayers(searchTerm) {
    searchTerm = searchTerm||'';
    var playersList = document.getElementById('playersList');
    playersList.innerHTML = '<div class="loading">🔍 Carregando...</div>';

    getAllUsers(function(users) {
        if(searchTerm) users = users.filter(function(u){
            return u.name.toLowerCase().includes(searchTerm.toLowerCase())||
                   u.email.toLowerCase().includes(searchTerm.toLowerCase());
        });
        users.sort(function(a,b){return(b.monthPoints||0)-(a.monthPoints||0);});

        if(users.length===0){
            playersList.innerHTML='<div class="empty-state"><div class="empty-icon">👤</div><h3>Nenhum player</h3></div>';
            return;
        }

        playersList.innerHTML = users.map(function(user) {
            var lvl = user.level||1;
            var totalSaldo = (user.monthPoints||0)+(user.historicPoints||0);
            return '<div class="player-card">' +
                '<div class="player-header">' +
                    '<div class="player-info">' +
                        '<h3>'+escapeHtml(user.name)+'</h3>' +
                        '<div class="player-email">📧 '+escapeHtml(user.email)+'</div>' +
                        '<div class="player-email">📱 '+escapeHtml(user.phone||'Não informado')+'</div>' +
                        (user.pixKey ? '<div class="player-email" style="color:#3B4CCA;font-weight:800;">💳 PIX: '+escapeHtml(user.pixKey)+'</div>' : '') +
                        '<div class="player-email">🏅 Nível '+lvl+' — '+NIVEL_NOMES[lvl]+'</div>' +
                    '</div>' +
                    '<div>' +
                        '<div class="player-points">⭐ '+( user.monthPoints||0)+' pts/mês</div>' +
                        '<div style="font-size:13px;color:#888;">Saldo: '+(totalSaldo)+' pts = R$'+(totalSaldo*0.3).toFixed(2).replace('.',',')+'</div>' +
                    '</div>' +
                '</div>' +
                '<div class="player-stats">' +
                    '<div class="player-stat">📖 <strong>'+(user.pokedex?user.pokedex.length:0)+'</strong> Pokédex</div>' +
                    '<div class="player-stat">📅 Desde '+formatDate(user.createdAt)+'</div>' +
                '</div>' +
                '<div class="player-actions">' +
                    '<button class="btn-sm red"    onclick="openAddPointsModal(\''+user.id+'\')">⭐ Pontos</button>' +
                    '<button class="btn-sm gray"   onclick="openRemovePointsModal(\''+user.id+'\')">➖ Remover</button>' +
                    '<button class="btn-sm blue"   onclick="openAddCardModal(\''+user.id+'\')">🎴 Pokédex</button>' +
                    '<button class="btn-sm gray"   onclick="viewPlayerCollection(\''+user.id+'\')">👁️ Ver</button>' +
                    '<button class="btn-sm danger" onclick="deletePlayerById(\''+user.id+'\')">🗑️</button>' +
                '</div>' +
            '</div>';
        }).join('');
    });
}

// ===== PONTOS =====
function openAddPointsModal(userId) {
    window.selectedPlayerId = userId;
    var modal = document.getElementById('addPointsModal');
    modal.removeAttribute('data-mode');
    modal.querySelector('h2').textContent = '⭐ Adicionar Pontos';
    modal.querySelector('.btn-confirm').textContent = '✅ CONFIRMAR PONTOS';
    document.getElementById('eventType').value    = 'sorteio';
    document.getElementById('pointsAmount').value = '2';
    document.getElementById('pointsNote').value   = '';
    toggleEventType();
    getUserById(userId, function(user) {
        var el = document.getElementById('pointsPlayerName');
        if(el && user) el.textContent = user.name;
    });
    modal.style.display = 'block';
}

function openRemovePointsModal(userId) {
    window.selectedPlayerId = userId;
    var modal = document.getElementById('addPointsModal');
    modal.setAttribute('data-mode','remove');
    modal.querySelector('h2').textContent = '➖ Remover Pontos';
    modal.querySelector('.btn-confirm').textContent = '✅ CONFIRMAR REMOÇÃO';
    document.getElementById('pointsAmount').value = '';
    document.getElementById('pointsNote').value   = '';
    document.getElementById('breakTypeSection').style.display = 'none';
    getUserById(userId, function(user) {
        var el = document.getElementById('pointsPlayerName');
        if(el && user) el.textContent = user.name;
    });
    modal.style.display = 'block';
}

function toggleEventType() {
    var type    = document.getElementById('eventType').value;
    var defaults = {sorteio:2,leilao:0,break:1};
    document.getElementById('pointsAmount').value = defaults[type]!==undefined?defaults[type]:1;
    var bt = document.getElementById('breakTypeSection');
    if(bt) bt.style.display = type==='break'?'block':'none';
    // Mostrar campo de valor R$ para leilão
    var leilaoSection = document.getElementById('leilaoValueSection');
    if(leilaoSection) leilaoSection.style.display = type==='leilao'?'block':'none';
    // Esconder campo de pontos para leilão (calculado automaticamente)
    var ptsGroup = document.getElementById('pointsAmountGroup');
    if(ptsGroup) ptsGroup.style.display = type==='leilao'?'none':'block';
}

function selectBreakType(pts, el) {
    document.getElementById('pointsAmount').value = pts;
    document.querySelectorAll('.break-type-btn').forEach(function(b){b.classList.remove('active');});
    if(el) el.classList.add('active');
}

function confirmAddPoints() {
    var userId = window.selectedPlayerId;
    if(!userId) return;
    var modal  = document.getElementById('addPointsModal');
    var mode   = modal.getAttribute('data-mode')||'add';
    var type   = mode==='remove'?'correcao':document.getElementById('eventType').value;
    var pts    = parseInt(document.getElementById('pointsAmount').value);
    var note   = document.getElementById('pointsNote').value.trim();
    if(!pts||pts<1){showNotification('⚠️ Pontuação inválida!','error');return;}

    getUserById(userId, function(user) {
        if(!user) return;
        var monthPts = user.monthPoints||0;
        var histPts  = user.historicPoints||0;
        var newMonthPts, histEntry;
        var leilaoValor = 0;

        if(mode==='remove') {
            if(!pts||pts<1){showNotification('⚠️ Pontuação inválida!','error');return;}
            var totalSaldo = monthPts + histPts;
            if(pts > totalSaldo){showNotification('⚠️ Saldo insuficiente!','error');return;}
            if(pts <= monthPts) { newMonthPts=monthPts-pts; }
            else { var resto=pts-monthPts; newMonthPts=0; histPts=histPts-resto; }
            histEntry = {id:Date.now().toString(),type:'correcao',points:-pts,note:note||'Correção manual',date:new Date().toISOString()};
        } else if(type==='leilao') {
            // Leilão: admin digita valor em R$, converte pra pontos (R$100 = 1pt)
            leilaoValor = parseFloat(document.getElementById('leilaoValue').value)||0;
            if(leilaoValor<=0){showNotification('⚠️ Digite o valor em R$!','error');return;}
            pts = Math.floor(leilaoValor / 100);
            if(pts<1) pts=1; // mínimo 1 ponto
            newMonthPts = monthPts + pts;
            histEntry = {id:Date.now().toString(),type:'leilao',points:pts,note:note||'Leilão R$'+leilaoValor.toFixed(2).replace('.',','),date:new Date().toISOString()};
        } else {
            newMonthPts = monthPts + pts;
            histEntry   = {id:Date.now().toString(),type:type,points:pts,note:note,date:new Date().toISOString()};
        }

        var history = user.pointsHistory||[];
        history.push(histEntry);

        var updates = {
            monthPoints:       mode==='remove'?newMonthPts:newMonthPts,
            historicPoints:    histPts,
            pointsHistory:     history,
            lastPointActivity: new Date().toISOString()
        };

        updateUser(userId, updates, function() {
            if(mode!=='remove') {
                var updatedUser = Object.assign({},user,updates);
                var eventData = {points:pts};
                if(type==='leilao') eventData.valor = leilaoValor; // valor real em R$
                checkMissions(updatedUser, type, eventData);
            }
            modal.removeAttribute('data-mode');
            modal.style.display='none';
            loadPlayers();
            loadAdminStats();
            var sign = mode==='remove'?'-':'+';
            var typeLabel = {sorteio:'🎲 Sorteio',leilao:'🏷️ Leilão',break:'📦 Break',correcao:'✏️ Correção'};
            var extra = type==='leilao' ? ' (R$'+leilaoValor.toFixed(2).replace('.',',')+' → '+pts+' pts)' : '';
            showNotification('✅ '+sign+pts+' 🪙 GinCoins para '+user.name+' ('+(typeLabel[type]||type)+')'+extra, 'success');
        });
    });
}

// ===== POKÉDEX =====
function openAddCardModal(userId) {
    window.selectedPlayerId = userId;
    window.selectedCardId   = null;
    window.manualCardMode   = false;
    _searchMode = 'name';
    document.getElementById('addCardModal').style.display  = 'block';
    document.getElementById('searchResults').innerHTML     = '';
    document.getElementById('cardSearch').value            = '';
    document.getElementById('cardSearch').placeholder      = '🔍 Nome do Pokémon (ex: Charizard)';
    document.getElementById('manualPointsSection').style.display = 'none';
    document.getElementById('manualUploadSection').style.display = 'none';
    document.getElementById('cardLanguage').value = 'en';
    // Reset search mode buttons
    var btnName = document.getElementById('searchModeBtn-name');
    var btnNum  = document.getElementById('searchModeBtn-number');
    if(btnName){ btnName.style.background='#CC0000'; btnName.style.color='white'; btnName.style.borderColor='#CC0000'; }
    if(btnNum){  btnNum.style.background='white';   btnNum.style.color='#888';   btnNum.style.borderColor='#e0e0e0'; }
    var hint = document.getElementById('searchNumberHint'); if(hint) hint.style.display='none';
    var mn = document.getElementById('manualCardName'); if(mn) mn.value = '';
    var mf = document.getElementById('manualCardFile'); if(mf) mf.value = '';
    var mp = document.getElementById('manualCardPreview'); if(mp) mp.style.display = 'none';
    var mr = document.getElementById('manualCardRarity'); if(mr) mr.value = 'Common';
}

var _searchMode = 'name'; // 'name' ou 'number'

function setSearchMode(mode) {
    _searchMode = mode;
    var input = document.getElementById('cardSearch');
    var hint  = document.getElementById('searchNumberHint');
    var btnName   = document.getElementById('searchModeBtn-name');
    var btnNumber = document.getElementById('searchModeBtn-number');
    if(mode === 'number') {
        input.placeholder = '🔢 Número da carta (ex: 161/131 ou 161)';
        hint.style.display = 'block';
        btnName.style.background   = 'white';   btnName.style.color   = '#888'; btnName.style.borderColor   = '#e0e0e0';
        btnNumber.style.background = '#CC0000'; btnNumber.style.color = 'white'; btnNumber.style.borderColor = '#CC0000';
    } else {
        input.placeholder = '🔍 Nome do Pokémon (ex: Charizard)';
        hint.style.display = 'none';
        btnName.style.background   = '#CC0000'; btnName.style.color   = 'white'; btnName.style.borderColor   = '#CC0000';
        btnNumber.style.background = 'white';   btnNumber.style.color = '#888';  btnNumber.style.borderColor = '#e0e0e0';
    }
    document.getElementById('searchResults').innerHTML = '';
    document.getElementById('manualPointsSection').style.display = 'none';
    input.value = '';
    input.focus();
}

function renderCardResults(cards) {
    return '<p style="color:#888;font-size:13px;margin-bottom:12px;">'+cards.length+' resultado(s)</p>'+
        cards.map(function(card){
            var numLabel = card.number ? '<div style="font-size:11px;color:#3B4CCA;font-weight:700;">Nº '+card.number+(card.set?(' / '+card.set.total):'')+'</div>' : '';
            return '<div class="result-card" onclick="selectCard(\''+card.id+'\',this)">'+
                '<img src="'+card.images.small+'" alt="'+escapeHtml(card.name)+'" loading="lazy">'+
                '<div class="result-card-name">'+escapeHtml(card.name)+'</div>'+
                numLabel+
                '<div style="font-size:11px;color:#888;">'+(card.set?card.set.name:'')+'</div>'+
                '<span class="rarity-badge '+rarityClass(card.rarity)+'">'+(card.rarity||'Common')+'</span>'+
            '</div>';
        }).join('');
}

async function searchCards() {
    var searchTerm    = document.getElementById('cardSearch').value.trim();
    var searchResults = document.getElementById('searchResults');
    if(searchTerm.length<1){searchResults.innerHTML='<div class="loading">Digite para buscar...</div>';return;}
    searchResults.innerHTML='<div class="loading">🔍 Buscando...</div>';
    document.getElementById('manualPointsSection').style.display='none';

    try {
        var url, res, data, cards;

        if(_searchMode === 'number') {
            // Busca por número: aceita "161/131" ou só "161"
            var numPart = searchTerm.split('/')[0].trim(); // pega só o número antes da barra
            url = 'https://api.pokemontcg.io/v2/cards?q=number:'+encodeURIComponent(numPart)+'&pageSize=100&orderBy=name';
            res = await fetch(url); data = await res.json(); cards = data.data||[];

            // Se buscou com barra (ex: 161/131), filtra pelo total do set também
            if(searchTerm.includes('/')) {
                var totalPart = searchTerm.split('/')[1].trim();
                cards = cards.filter(function(c){ return c.set && String(c.set.total) === totalPart; });
            }
        } else {
            // Busca por nome (comportamento original)
            url = 'https://api.pokemontcg.io/v2/cards?q=name:"'+encodeURIComponent(searchTerm)+'"&pageSize=100&orderBy=name';
            res = await fetch(url); data = await res.json(); cards = data.data||[];
            if(cards.length===0){
                url='https://api.pokemontcg.io/v2/cards?q=name:'+encodeURIComponent(searchTerm)+'*&pageSize=100&orderBy=name';
                res=await fetch(url); data=await res.json(); cards=data.data||[];
            }
        }

        if(cards.length===0){
            searchResults.innerHTML='<div class="empty-state"><div class="empty-icon">😢</div><h3>Não encontrado</h3><p style="font-size:12px;color:#aaa;">'+
                (_searchMode==='number' ? 'Tente só o número (ex: 161) sem a barra' : 'Verifique o nome e tente novamente')+
            '</p></div>';
            return;
        }
        searchResults.innerHTML = renderCardResults(cards);
    } catch(e){searchResults.innerHTML='<div class="empty-state"><div class="empty-icon">❌</div><h3>Erro na busca</h3></div>';}
}

function selectCard(cardId, el) {
    document.querySelectorAll('.result-card').forEach(function(c){c.style.border='2px solid transparent';});
    if(el) el.style.border='2px solid #CC0000';
    window.selectedCardId = cardId;
    var s = document.getElementById('manualPointsSection');
    if(s){s.style.display='block';s.scrollIntoView({behavior:'smooth',block:'nearest'});}
}

async function confirmAddCard() {
    var cardId = window.selectedCardId;
    if(!cardId){showNotification('⚠️ Selecione um card!','error');return;}
    var language = document.getElementById('cardLanguage').value || 'en';
    try {
        var res = await fetch('https://api.pokemontcg.io/v2/cards/'+cardId);
        var result = await res.json(); var card = result.data;
        getUserById(window.selectedPlayerId, function(user) {
            if(!user) return;
            var pokedex = user.pokedex||[];
            if(pokedex.some(function(c){return c.apiId===card.id;})){
                showNotification('⚠️ Player já possui este Pokémon!','error'); return;
            }
            var newCard = {
                id:Date.now().toString(), apiId:card.id, name:card.name,
                image:card.images.large, rarity:card.rarity||'Common',
                set:card.set?card.set.name:'', number:card.number||'',
                language: language,
                addedAt:new Date().toISOString()
            };
            pokedex.push(newCard);
            updateUser(window.selectedPlayerId, {pokedex:pokedex}, function() {
                var updatedUser = Object.assign({},user,{pokedex:pokedex});
                checkMissions(updatedUser, 'capture', {rarity:card.rarity});
                closeAddCardModal();
                loadPlayers();
                loadAdminStats();
                showNotification('✅ "'+card.name+'" adicionado à Pokédex!','success');
            });
        });
    } catch(e){showNotification('❌ Erro!','error');}
}

// ===== UPLOAD MANUAL DE CARTA =====
var LANGUAGE_FLAGS = {
    'en':'🇺🇸','pt':'🇧🇷','ja':'🇯🇵','es':'🇪🇸','fr':'🇫🇷','de':'🇩🇪','it':'🇮🇹','ko':'🇰🇷'
};
var LANGUAGE_NAMES = {
    'en':'Inglês','pt':'Português','ja':'Japonês','es':'Espanhol','fr':'Francês','de':'Alemão','it':'Italiano','ko':'Coreano'
};

function toggleManualUpload() {
    var section = document.getElementById('manualUploadSection');
    var isVisible = section.style.display === 'block';
    section.style.display = isVisible ? 'none' : 'block';
    document.getElementById('manualPointsSection').style.display = 'none';
    document.getElementById('searchResults').innerHTML = '';
    window.selectedCardId = null;
    window.manualCardMode = !isVisible;
}

function previewManualCard() {
    var file = document.getElementById('manualCardFile').files[0];
    var prev = document.getElementById('manualCardPreview');
    if(!file) { prev.style.display='none'; return; }
    var reader = new FileReader();
    reader.onload = function(e) {
        prev.src = e.target.result;
        prev.style.display = 'block';
    };
    reader.readAsDataURL(file);
}

async function confirmManualCard() {
    var name     = document.getElementById('manualCardName').value.trim();
    var rarity   = document.getElementById('manualCardRarity').value;
    var language = document.getElementById('cardLanguage').value || 'en';
    var fileInput= document.getElementById('manualCardFile');
    var file     = fileInput.files[0];

    if(!name){ showNotification('⚠️ Digite o nome da carta!','error'); return; }
    if(!file){ showNotification('⚠️ Selecione uma foto!','error'); return; }

    showNotification('⏳ Fazendo upload...','success');

    // Upload para Cloudinary
    try {
        var formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', 'GinopsTCG');
        formData.append('folder', 'pokedex_manual');

        var uploadRes  = await fetch('https://api.cloudinary.com/v1_1/db3wvvv2l/image/upload', {
            method: 'POST',
            body: formData
        });
        var uploadData = await uploadRes.json();

        if(!uploadData.secure_url) {
            showNotification('❌ Erro no upload! Tente novamente.','error');
            return;
        }
        var imageUrl = uploadData.secure_url;

        getUserById(window.selectedPlayerId, function(user) {
            if(!user) return;
            var pokedex = user.pokedex||[];
            var newCard = {
                id:       Date.now().toString(),
                apiId:    null,
                name:     name,
                image:    imageUrl,
                rarity:   rarity,
                set:      'Manual',
                number:   '',
                language: language,
                manual:   true,
                addedAt:  new Date().toISOString()
            };
            pokedex.push(newCard);
            updateUser(window.selectedPlayerId, {pokedex:pokedex}, function() {
                var updatedUser = Object.assign({},user,{pokedex:pokedex});
                checkMissions(updatedUser, 'capture', {rarity:rarity});
                closeAddCardModal();
                loadPlayers();
                loadAdminStats();
                showNotification('✅ "'+name+'" adicionado manualmente!','success');
            });
        });
    } catch(e) {
        console.error(e);
        showNotification('❌ Erro no upload! Verifique sua conexão.','error');
    }
}

// ===== VER POKÉDEX + RESGATES =====
function viewPlayerCollection(userId) {
    getUserById(userId, function(user) {
        if(!user) return;
        var modal        = document.getElementById('collectionModal');
        var modalContent = modal.querySelector('.modal-content');
        var pokedex      = user.pokedex||[];
        var resgates     = (user.resgatarHistory||[]).slice().sort(function(a,b){return new Date(b.date)-new Date(a.date);});
        var pendentes    = resgates.filter(function(r){return !r.pago;});
        var totalPend    = pendentes.reduce(function(s,r){return s+parseFloat(r.valor||0);},0);
        var totalSaldo   = (user.monthPoints||0)+(user.historicPoints||0);

        var html = '<span class="close" onclick="closeCollectionModal()">×</span>'+
            '<h2>👤 '+escapeHtml(user.name)+'</h2>'+
            '<div style="display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap;">'+
                '<div style="background:#f8f9fa;border-radius:10px;padding:10px 14px;flex:1;min-width:100px;">'+
                    '<div style="font-size:11px;color:#888;">Pts/Mês</div>'+
                    '<div style="font-size:20px;font-weight:800;color:#CC0000;">⭐ '+(user.monthPoints||0)+'</div>'+
                '</div>'+
                '<div style="background:#f8f9fa;border-radius:10px;padding:10px 14px;flex:1;min-width:100px;">'+
                    '<div style="font-size:11px;color:#888;">Histórico</div>'+
                    '<div style="font-size:20px;font-weight:800;color:#3B4CCA;">⭐ '+(user.historicPoints||0)+'</div>'+
                '</div>'+
                '<div style="background:#f8f9fa;border-radius:10px;padding:10px 14px;flex:1;min-width:100px;">'+
                    '<div style="font-size:11px;color:#888;">Saldo R$</div>'+
                    '<div style="font-size:20px;font-weight:800;color:#27ae60;">R$'+(totalSaldo*0.3).toFixed(2).replace('.',',')+'</div>'+
                '</div>'+
                '<div style="background:'+(pendentes.length>0?'#fff8e6':'#f8f9fa')+';border-radius:10px;padding:10px 14px;flex:1;min-width:100px;'+(pendentes.length>0?'border:2px solid #FFCB05;':'')+'>'+
                    '<div style="font-size:11px;color:#888;">💰 Pendente</div>'+
                    '<div style="font-size:18px;font-weight:800;color:'+(pendentes.length>0?'#d4a017':'#aaa')+';">R$'+totalPend.toFixed(2).replace('.',',')+'</div>'+
                '</div>'+
            '</div>';

        // Nível e missões
        var lvl = user.level||1;
        html += '<div style="background:#f0f0f0;border-radius:10px;padding:10px 14px;margin-bottom:16px;">'+
            '<span style="font-weight:800;">🏅 Nível '+lvl+' — '+NIVEL_NOMES[lvl]+'</span>'+
        '</div>';

        // Resgates
        if(resgates.length>0){
            html+='<div style="margin-bottom:16px;"><div style="font-family:\'Press Start 2P\',monospace;font-size:9px;color:#1a1a2e;margin-bottom:8px;">🎁 RESGATES</div><div style="display:grid;gap:6px;">';
            resgates.forEach(function(r){
                html+='<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:'+(r.pago?'#f0fff4':'#fff8e6')+';border-radius:10px;border:1px solid '+(r.pago?'#a8e6c0':'#fcd34d')+';">'+
                    '<div style="flex:1;"><div style="font-weight:800;font-size:13px;">'+r.points+' pts = R$'+parseFloat(r.valor||0).toFixed(2).replace('.',',')+'</div>'+
                    '<div style="font-size:11px;color:#888;">'+formatDate(r.date)+(r.pago?' · Pago em '+formatDate(r.dataPago):'')+'</div></div>'+
                    (r.pago?'<span style="background:#2ecc71;color:white;padding:4px 10px;border-radius:99px;font-size:11px;font-weight:800;">✅ Pago</span>':
                    '<button class="btn-sm blue" onclick="marcarPago(\''+userId+'\',\''+r.id+'\')" style="font-size:11px;">✅ Pago</button>')+
                '</div>';
            });
            html+='</div></div>';
        }

        // Pokédex
        html+='<div style="font-family:\'Press Start 2P\',monospace;font-size:9px;color:#1a1a2e;margin-bottom:8px;">📖 POKÉDEX ('+pokedex.length+')</div>';
        if(pokedex.length===0){
            html+='<div class="empty-state"><div class="empty-icon">📭</div><h3>Pokédex vazia</h3></div>';
        } else {
            html+='<div class="collection-grid">';
            var _langFlags={'en':'🇺🇸','pt':'🇧🇷','ja':'🇯🇵','es':'🇪🇸','fr':'🇫🇷','de':'🇩🇪','it':'🇮🇹','ko':'🇰🇷'};
            var _langNames={'en':'Inglês','pt':'Português','ja':'Japonês','es':'Espanhol','fr':'Francês','de':'Alemão','it':'Italiano','ko':'Coreano'};
            pokedex.forEach(function(card){
                var lCode = card.language||'en';
                var lLabel = (_langFlags[lCode]||'🌍')+' '+(_langNames[lCode]||lCode);
                html+='<div class="collection-card">'+
                    '<img src="'+card.image+'" alt="'+escapeHtml(card.name)+'" loading="lazy">'+
                    '<div class="collection-card-name">'+escapeHtml(card.name)+'</div>'+
                    '<span class="rarity-badge '+rarityClass(card.rarity)+'">'+card.rarity+'</span>'+
                    '<div class="collection-card-date" style="font-size:11px;color:#3B4CCA;margin-top:2px;">'+lLabel+'</div>'+
                    '<div class="collection-card-date">'+formatDate(card.addedAt)+'</div>'+
                    (card.manual ? '<div style="font-size:10px;color:#888;margin-top:1px;">📷 Manual</div>' : '')+
                    '<button class="btn-sm danger" onclick="removeFromPokedex(\''+userId+'\',\''+card.id+'\')" style="margin-top:6px;width:100%;font-size:11px;">🗑️ Remover</button>'+
                '</div>';
            });
            html+='</div>';
        }

        modalContent.innerHTML = html;
        modal.style.display = 'block';
    });
}

function marcarPago(userId, resgatId) {
    getUserById(userId, function(user) {
        if(!user) return;
        var history = user.resgatarHistory||[];
        var r = history.find(function(r){return r.id===resgatId;});
        if(r){r.pago=true;r.dataPago=new Date().toISOString();}
        updateUser(userId,{resgatarHistory:history},function(){
            viewPlayerCollection(userId);
            showNotification('✅ Resgate pago!','success');
        });
    });
}

function removeFromPokedex(userId, cardId) {
    if(!confirm('Remover?')) return;
    getUserById(userId, function(user) {
        if(!user) return;
        var pokedex = (user.pokedex||[]).filter(function(c){return c.id!==cardId;});
        updateUser(userId,{pokedex:pokedex},function(){
            viewPlayerCollection(userId); loadPlayers(); loadAdminStats();
            showNotification('✅ Removido!','success');
        });
    });
}

function deletePlayerById(userId) {
    if(!confirm('Excluir player? Irreversível!')) return;
    deleteUser(userId, function(){ loadPlayers(); loadAdminStats(); showNotification('✅ Player excluído!','success'); });
}

// ===== MISSÕES =====
function openMissionsModal() {
    var modal = document.getElementById('missionsModal');
    modal.style.display = 'block';
    loadMissionsPanel();
}

function loadMissionsPanel() {
    var container = document.getElementById('missionsContainer');
    container.innerHTML = '<div class="loading">Carregando missões...</div>';

    getAllMissions(function(missions) {
        var byLevel = {};
        for(var i=1;i<=10;i++) byLevel[i]=[];
        missions.forEach(function(m){ if(byLevel[m.level]) byLevel[m.level].push(m); });

        var html = '';
        for(var lvl=1;lvl<=10;lvl++){
            html += '<div style="margin-bottom:20px;">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">'+
                    '<div style="font-family:\'Press Start 2P\',monospace;font-size:9px;color:#1a1a2e;">LV.'+lvl+' — '+NIVEL_NOMES[lvl]+'</div>'+
                    '<button class="btn-sm blue" onclick="openAddMissionForm('+lvl+')" style="font-size:11px;">+ Missão</button>'+
                '</div>'+
                '<div id="missions-lvl-'+lvl+'" style="display:grid;gap:8px;">';

            if(byLevel[lvl].length===0){
                html += '<div style="color:#aaa;font-size:13px;padding:8px;">Nenhuma missão cadastrada</div>';
            } else {
                byLevel[lvl].forEach(function(m){
                    html += '<div style="display:flex;align-items:center;gap:10px;background:#f8f9fa;padding:10px 14px;border-radius:10px;">'+
                        '<div style="flex:1;">'+
                            '<div style="font-weight:700;font-size:14px;">'+escapeHtml(m.title)+'</div>'+
                            '<div style="font-size:12px;color:#888;">'+escapeHtml(m.description||'')+'</div>'+
                            '<div style="font-size:11px;color:#3B4CCA;margin-top:3px;">Gatilho: '+m.trigger+' · Qtd necessária: '+(m.required||1)+'</div>'+
                        '</div>'+
                        '<button class="btn-sm blue" onclick="openEditMissionForm(\''+m.id+'\'),null)" style="font-size:11px;">✏️</button>'+
                        '<button class="btn-sm danger" onclick="deleteMissionById(\''+m.id+'\')" style="font-size:11px;">🗑️</button>'+
                    '</div>';
                });
            }
            html += '</div></div>';
        }
        container.innerHTML = html;
    });
}

function openAddMissionForm(level) {
    document.getElementById('missionLevel').value    = level;
    var lbl = document.getElementById('missionLevelLabel');
    if(lbl) lbl.textContent = level + ' — ' + NIVEL_NOMES[level];
    document.getElementById('missionTitle').value    = '';
    document.getElementById('missionDesc').value     = '';
    document.getElementById('missionTrigger').value  = 'sorteio';
    document.getElementById('missionRequired').value = '1';
    var editId = document.getElementById('editingMissionId');
    if(editId) editId.value = '';
    updateRequiredLabel('sorteio');
    var formTitle = document.getElementById('addMissionFormTitle');
    if(formTitle) formTitle.textContent = '➕ Nova Missão — Nível ';
    document.getElementById('addMissionForm').style.display = 'block';
    document.getElementById('addMissionForm').scrollIntoView({behavior:'smooth'});
}

function openEditMissionForm(missionId, btn) {
    // Buscar dados da missão pelo ID nos elementos renderizados
    getAllMissions(function(missions) {
        var m = missions.find(function(x){return x.id===missionId;});
        if(!m) return;
        document.getElementById('missionLevel').value    = m.level;
        document.getElementById('missionTitle').value    = m.title;
        document.getElementById('missionDesc').value     = m.description||'';
        document.getElementById('missionTrigger').value  = m.trigger;
        document.getElementById('missionRequired').value = m.required||1;
        var editId = document.getElementById('editingMissionId');
        if(editId) editId.value = missionId;
        var lbl = document.getElementById('missionLevelLabel');
        if(lbl) lbl.textContent = m.level + ' — ' + NIVEL_NOMES[m.level];
        var formTitle = document.getElementById('addMissionFormTitle');
        if(formTitle) formTitle.textContent = '✏️ Editando Missão — Nível ';
        updateRequiredLabel(m.trigger);
        document.getElementById('addMissionForm').style.display = 'block';
        document.getElementById('addMissionForm').scrollIntoView({behavior:'smooth'});
    });
}

function updateRequiredLabel(trigger) {
    var lbl = document.getElementById('requiredLabel');
    if(!lbl) return;
    if(trigger==='leilao')        lbl.textContent = 'Valor mínimo em R$ (ex: 50 = R$50,00)';
    else if(trigger==='capture')  lbl.textContent = 'Total de Pokémons na Pokédex necessários';
    else                          lbl.textContent = 'Quantidade necessária';
}

function saveNewMission() {
    var level    = parseInt(document.getElementById('missionLevel').value);
    var title    = document.getElementById('missionTitle').value.trim();
    var desc     = document.getElementById('missionDesc').value.trim();
    var trigger  = document.getElementById('missionTrigger').value;
    var required = parseFloat(document.getElementById('missionRequired').value)||1;
    var editIdEl = document.getElementById('editingMissionId');
    var editId   = editIdEl ? editIdEl.value : '';

    if(!title){showNotification('⚠️ Digite o título!','error');return;}
    if(!level||level<1||level>10){showNotification('⚠️ Nível inválido!','error');return;}

    showNotification('⏳ Salvando...','success');

    if(editId) {
        updateMission(editId, {level:level,title:title,description:desc,trigger:trigger,required:required}, function(ok) {
            if(ok){
                document.getElementById('addMissionForm').style.display='none';
                if(editIdEl) editIdEl.value='';
                loadMissionsPanel();
                showNotification('✅ Missão atualizada!','success');
            } else { showNotification('❌ Erro ao atualizar!','error'); }
        });
    } else {
        getAllMissions(function(missions) {
            var order = missions.filter(function(m){return m.level===level;}).length+1;
            createMission({level:level,title:title,description:desc,trigger:trigger,required:required,order:order,createdAt:new Date().toISOString()}, function(m) {
                if(m){
                    document.getElementById('addMissionForm').style.display='none';
                    loadMissionsPanel();
                    showNotification('✅ Missão criada!','success');
                } else { showNotification('❌ Erro ao salvar!','error'); }
            });
        });
    }
}

function deleteMissionById(missionId) {
    if(!confirm('Excluir missão?')) return;
    deleteMission(missionId, function(){ loadMissionsPanel(); showNotification('✅ Missão excluída!','success'); });
}

// ===== RANKING MENSAL =====
function distribuirBonusRanking() {
    if(!confirm('Distribuir bônus do ranking mensal? Isso dará pontos aos Top 10!')) return;

    getAllUsers(function(users) {
        var sorted = users.slice().sort(function(a,b){return(b.monthPoints||0)-(a.monthPoints||0);}).slice(0,10);
        var processed = 0;

        sorted.forEach(function(user, i) {
            var bonus = BONUS_RANKING[i+1]||0;
            if(bonus===0){processed++;if(processed===sorted.length) showNotification('✅ Bônus distribuído!','success');return;}

            var history = user.pointsHistory||[];
            history.push({id:Date.now().toString(),type:'bonus_ranking',points:bonus,note:'🏆 '+(i+1)+'º lugar no ranking mensal!',date:new Date().toISOString()});
            updateUser(user.id,{monthPoints:(user.monthPoints||0)+bonus,pointsHistory:history,lastPointActivity:new Date().toISOString()},function(){
                processed++;
                if(processed===sorted.length){loadPlayers();loadAdminStats();showNotification('✅ Bônus distribuído para o Top 10!','success');}
            });
        });
    });
}

// ===== FECHAR MODAIS =====
function closeAddPointsModal()  { document.getElementById('addPointsModal').style.display='none'; }
function closeAddCardModal()    { document.getElementById('addCardModal').style.display='none'; window.selectedCardId=null; window.manualCardMode=false; }
function closeCollectionModal() { document.getElementById('collectionModal').style.display='none'; }
function closeMissionsModal()   { document.getElementById('missionsModal').style.display='none'; }

window.onclick = function(e) {
    if(e.target===document.getElementById('addPointsModal'))  closeAddPointsModal();
    if(e.target===document.getElementById('addCardModal'))    closeAddCardModal();
    if(e.target===document.getElementById('collectionModal')) closeCollectionModal();
    if(e.target===document.getElementById('saquesModal')) document.getElementById('saquesModal').style.display='none';
    if(e.target===document.getElementById('missionsModal'))   closeMissionsModal();
};


// ===== SAQUES PENDENTES =====
function openSaquesModal() {
    var modal = document.getElementById('saquesModal');
    if(!modal) return;
    modal.style.display = 'block';
    var content = document.getElementById('saquesModalContent');
    content.innerHTML = '<div class="loading">🔍 Buscando saques...</div>';

    getAllUsers(function(users) {
        var pendentes = [];
        users.forEach(function(user) {
            (user.resgatarHistory||[]).forEach(function(r) {
                if(!r.pago) pendentes.push({
                    userId:    user.id,
                    userName:  user.name,
                    userEmail: user.email,
                    resgatId:  r.id,
                    points:    r.points,
                    valor:     parseFloat(r.valor||(r.points*0.3)),
                    date:      r.date
                });
            });
        });
        pendentes.sort(function(a,b){ return new Date(a.date)-new Date(b.date); });

        if(pendentes.length===0){
            content.innerHTML='<div class="empty-state"><div class="empty-icon">✅</div><h3>Nenhum saque pendente!</h3><p>Tudo em dia por aqui.</p></div>';
            var b=document.getElementById('saquesBadge'); if(b) b.style.display='none';
            return;
        }

        var totalVal = pendentes.reduce(function(s,p){return s+p.valor;},0);

        content.innerHTML =
            '<div style="background:#fff8e6;border:2px solid #fcd34d;border-radius:12px;padding:14px 18px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;">'+
                '<div style="font-weight:800;font-size:15px;color:#92400e;">'+pendentes.length+' saque(s) aguardando</div>'+
                '<div style="font-size:18px;font-weight:800;color:#27ae60;">Total: R$'+totalVal.toFixed(2).replace('.',',')+'</div>'+
            '</div>'+
            '<div style="display:grid;gap:10px;">'+
            pendentes.map(function(p){
                return '<div style="background:white;border:2px solid #f0f0f0;border-left:4px solid #f59e0b;border-radius:12px;padding:14px 18px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;">'+
                    '<div style="font-size:30px;">🪙</div>'+
                    '<div style="flex:1;min-width:160px;">'+
                        '<div style="font-weight:800;font-size:15px;color:#1a1a2e;">'+escapeHtml(p.userName)+'</div>'+
                        '<div style="font-size:13px;color:#888;">📧 '+escapeHtml(p.userEmail)+'</div>'+
                        '<div style="font-size:12px;color:#aaa;margin-top:2px;">📅 '+formatDate(p.date)+'</div>'+
                    '</div>'+
                    '<div style="text-align:center;">'+
                        '<div style="font-size:20px;font-weight:800;color:#c8960c;">'+p.points+' 🪙</div>'+
                        '<div style="font-size:13px;font-weight:700;color:#27ae60;">R$'+p.valor.toFixed(2).replace('.',',')+'</div>'+
                    '</div>'+
                    '<button class="btn-sm blue" onclick="pagarSaque(\''+p.userId+'\',\''+p.resgatId+'\')" style="font-size:13px;padding:10px 16px;">✅ Pago</button>'+
                '</div>';
            }).join('')+
            '</div>';
    });
}

function pagarSaque(userId, resgatId) {
    getUserById(userId, function(user) {
        if(!user) return;
        var history = user.resgatarHistory||[];
        var r = history.find(function(r){return r.id===resgatId;});
        if(r){r.pago=true;r.dataPago=new Date().toISOString();}
        updateUser(userId,{resgatarHistory:history},function(){
            openSaquesModal();
            loadAdminStats();
            showNotification('✅ Saque pago!','success');
        });
    });
}

function atualizarBadgeSaques() {
    getAllUsers(function(users) {
        var total=0;
        users.forEach(function(u){
            (u.resgatarHistory||[]).forEach(function(r){if(!r.pago)total++;});
        });
        var b=document.getElementById('saquesBadge');
        if(b){b.style.display=total>0?'inline':'none';b.textContent=total;}
    });
}

function rarityClass(r){return r?r.toLowerCase().replace(/ /g,'-'):'common';}
function escapeHtml(s){if(!s)return'';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function formatDate(ds){
    if(!ds)return'–';
    var d=new Date(ds);
    return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
}
function showNotification(msg,type){
    type=type||'success';
    var n=document.createElement('div');
    n.className='notification '+type;
    n.innerHTML='<span>'+msg+'</span>';
    document.body.appendChild(n);
    setTimeout(function(){n.remove();},3500);
}
