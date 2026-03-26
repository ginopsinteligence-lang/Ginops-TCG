// DASHBOARD – GINOPS TCG (Firebase)
var NIVEL_NOMES = ['','Iniciante','Aprendiz','Treinador','Expert','Especialista','Mestre','Veterano','Elite','Lenda','Campeão'];

document.addEventListener('DOMContentLoaded', function() {
    var currentUser = getCurrentUser();
    if (!currentUser || currentUser.isAdmin) { window.location.href = 'index.html'; return; }

    getUserById(currentUser.id, function(user) {
        if (!user) { window.location.href = 'index.html'; return; }

        // Verificar reset mensal
        checkMonthlyReset(user, function(user) {
            checkPointsExpiry(user, function(user) {
                setCurrentUser(user);
                document.getElementById('userNameDisplay').textContent = 'Olá, ' + user.name + '! 👋';
                loadProfile(user);
                loadStats(user);
                loadPokedex(user);
                loadRanking(user);
                loadHistory(user);
                loadMissions(user);
                loadGinPix(user);
            });
        });
    });

    document.getElementById('btnLogout').addEventListener('click', function() {
        clearCurrentUser(); window.location.href = 'index.html';
    });

    // TABS
    document.querySelectorAll('.tab-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var tab = this.getAttribute('data-tab');
            document.querySelectorAll('.tab-btn').forEach(function(b){b.classList.remove('active');});
            document.querySelectorAll('.tab-content').forEach(function(c){c.classList.remove('active');});
            btn.classList.add('active');
            var el = document.getElementById(tab);
            if(el) el.classList.add('active');
        });
    });

    document.getElementById('filterRarity').addEventListener('change', function() {
        var u = getCurrentUser(); getUserById(u.id, function(user){if(user) loadPokedex(user);});
    });
    document.getElementById('sortBy').addEventListener('change', function() {
        var u = getCurrentUser(); getUserById(u.id, function(user){if(user) loadPokedex(user);});
    });

    document.getElementById('resgatarQtd').addEventListener('input', function() {
        var pts     = parseInt(this.value)||0;
        var u       = getCurrentUser();
        var saldo   = u ? ((u.monthPoints||0)+(u.historicPoints||0)) : 0;
        var val     = (pts*0.3).toFixed(2).replace('.',',');
        var infoEl  = document.getElementById('resgatarInfo');
        if(pts > saldo) infoEl.innerHTML='<span style="color:#ff6060;">Saldo insuficiente! Você tem '+saldo+' pts</span>';
        else if(pts>0)  infoEl.innerHTML='Você receberá <strong style="color:#FFCB05;">R$'+val+'</strong>';
        else            infoEl.textContent='Digite a quantidade de pontos para ver o valor';
    });
});

// ===== PERFIL =====
function loadProfile(user) {
    var pts  = user.monthPoints||0;
    var lvl  = user.level||1;
    var lv   = getLevelByIndex(lvl); // emblema baseado no nível REAL
    var next = lvl < 10 ? getLevelByIndex(lvl+1) : null;

    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileLevelName').textContent = 'Nível '+lvl+' — '+NIVEL_NOMES[lvl];
    document.getElementById('profileLevelName').style.color = lv.color;
    document.getElementById('profileBadge').innerHTML =
        '<svg width="80" height="80" viewBox="0 0 48 56" style="overflow:visible;filter:drop-shadow(0 0 12px '+lv.glow+')">'+lv.svgPath+'</svg>';

    var fillEl = document.getElementById('levelBarFill');
    var progEl = document.getElementById('levelProgressText');
    fillEl.style.background = lv.color;
    // Progresso baseado em missões concluídas
    getAllMissions(function(missions) {
        var lvlMissions = missions.filter(function(m){return m.level===lvl;});
        var completed   = user.completedMissions||[];
        var doneCount   = lvlMissions.filter(function(m){return completed.includes(m.id);}).length;
        var total       = lvlMissions.length||1;
        var prog        = Math.round((doneCount/total)*100);
        fillEl.style.width = prog+'%';
        if(next){
            progEl.textContent = doneCount+'/'+total+' missões concluídas';
        } else {
            fillEl.style.width='100%';
            progEl.textContent = '👑 Nível máximo!';
        }
    });
}

// ===== STATS =====
function loadStats(user) {
    var monthPts = user.monthPoints||0;
    var histPts  = user.historicPoints||0;
    var saldo    = monthPts+histPts;
    var pokedex  = user.pokedex||[];

    document.getElementById('myCards').textContent  = pokedex.length;
    document.getElementById('myPoints').textContent = monthPts + ' 🪙';


    getAllUsers(function(users) {
        var sorted = users.slice().sort(function(a,b){return(b.monthPoints||0)-(a.monthPoints||0);});
        var myRank = sorted.findIndex(function(u){return u.id===user.id;})+1;
        document.getElementById('myRank').textContent='#'+(myRank||'–');
    });

    // Próximo nível por missões
    var lvl  = user.level||1;
    var badgeEl = document.getElementById('nextLevelBadge');
    var nameEl  = document.getElementById('nextLevelName');
    var ptsEl   = document.getElementById('nextLevelPts');
    var cardEl  = document.getElementById('nextLevelCard');

    if(lvl<10){
        var nextLv = getLevelByIndex(lvl+1); // emblema do próximo nível
        badgeEl.innerHTML='<svg width="48" height="48" viewBox="0 0 48 56" style="overflow:visible;filter:drop-shadow(0 0 8px '+nextLv.glow+')">'+nextLv.svgPath+'</svg>';
        nameEl.textContent='Lv.'+(lvl+1)+' '+NIVEL_NOMES[lvl+1];
        nameEl.style.color=nextLv.color;
        ptsEl.innerHTML='<span style="color:'+nextLv.color+';font-weight:800;">Complete as missões!</span>';
        cardEl.style.borderLeftColor=nextLv.color;
    } else {
        var lv = getLevel(monthPts);
        badgeEl.innerHTML='<svg width="48" height="48" viewBox="0 0 48 56" style="overflow:visible;filter:drop-shadow(0 0 8px '+lv.glow+')">'+lv.svgPath+'</svg>';
        nameEl.textContent='Nível máximo!'; nameEl.style.color='#ffd700';
        ptsEl.innerHTML='<span style="color:#ffd700;font-weight:800;">👑 Campeão</span>';
        cardEl.style.borderLeftColor='#ffd700';
    }
}

// ===== MISSÕES =====
function loadMissions(user) {
    var container = document.getElementById('missionsTab');
    if(!container) return;

    var lvl = user.level||1;
    container.innerHTML = '<div style="text-align:center;padding:20px;color:#888;">Carregando missões...</div>';

    getAllMissions(function(missions) {
        var lvlMissions = missions.filter(function(m){return m.level===lvl;});
        var completed   = user.completedMissions||[];
        var progress    = user.missionProgress||{};

        if(lvlMissions.length===0){
            container.innerHTML='<div class="empty-state"><div class="empty-icon">🎯</div><h3>Nenhuma missão cadastrada ainda</h3><p>O admin está preparando as missões!</p></div>';
            return;
        }

        var doneCount = lvlMissions.filter(function(m){return completed.includes(m.id);}).length;
        var pct = Math.round((doneCount/lvlMissions.length)*100);

        var html = '<div style="background:linear-gradient(135deg,var(--poke-black),#1a1a3e);border-radius:16px;padding:20px;margin-bottom:20px;color:white;">'+
            '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'+
                '<div>'+
                    '<div style="font-family:\'Press Start 2P\',monospace;font-size:10px;color:#ffd700;margin-bottom:4px;">NÍVEL '+lvl+' — '+NIVEL_NOMES[lvl]+'</div>'+
                    '<div style="font-size:13px;color:rgba(255,255,255,0.6);">'+doneCount+' de '+lvlMissions.length+' missões concluídas</div>'+
                '</div>'+
                '<div style="font-family:\'Press Start 2P\',monospace;font-size:18px;color:#ffd700;">'+pct+'%</div>'+
            '</div>'+
            '<div style="background:rgba(255,255,255,0.1);border-radius:99px;height:8px;overflow:hidden;">'+
                '<div style="width:'+pct+'%;height:100%;background:#ffd700;border-radius:99px;transition:width 0.6s;"></div>'+
            '</div>'+
        '</div>';

        html += '<div style="display:grid;gap:12px;">';
        lvlMissions.forEach(function(m) {
            var isDone   = completed.includes(m.id);
            var required = parseFloat(m.required)||1;
            var current  = 0;

            if(m.trigger==='capture') {
                current = (user.pokedex||[]).length;
            } else if(m.trigger==='leilao') {
                current = user.totalLeilaoValue||0;
            } else if(m.trigger==='sorteio') {
                current = progress['sorteio_lv'+lvl]||0;
            } else if(m.trigger==='break') {
                current = progress['break_lv'+lvl]||0;
            }

            var progPct   = Math.min(100, Math.round((current/required)*100));
            var isLeilao  = m.trigger==='leilao';
            var progLabel = isLeilao
                ? 'R$'+current.toFixed(2).replace('.',',')+' / R$'+required.toFixed(2).replace('.',',')
                : current+' / '+required;

            html += '<div style="background:'+(isDone?'#f0fff4':'white')+';border:2px solid '+(isDone?'#2ecc71':'#e0e0e0')+';border-radius:14px;padding:16px 18px;">'+
                '<div style="display:flex;align-items:center;gap:12px;">'+
                    '<div style="width:36px;height:36px;border-radius:50%;background:'+(isDone?'#2ecc71':'#f0f0f0')+';display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">'+
                        (isDone?'✅':'🎯')+
                    '</div>'+
                    '<div style="flex:1;">'+
                        '<div style="font-weight:800;font-size:14px;color:'+(isDone?'#27ae60':'var(--poke-black)')+';">'+escapeHtml(m.title)+'</div>'+
                        (m.description?'<div style="font-size:12px;color:#888;margin-top:2px;">'+escapeHtml(m.description)+'</div>':'')+
                        (!isDone?
                            '<div style="margin-top:8px;">'+
                                '<div style="background:#f0f0f0;border-radius:99px;height:6px;overflow:hidden;">'+
                                    '<div style="width:'+progPct+'%;height:100%;background:var(--poke-blue);border-radius:99px;"></div>'+
                                '</div>'+
                                '<div style="font-size:11px;color:#888;margin-top:3px;">'+progLabel+'</div>'+
                            '</div>':'') +
                    '</div>'+
                    (isDone?'<span style="background:#2ecc71;color:white;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:800;">Concluída!</span>':'') +
                '</div>'+
            '</div>';
        });
        html += '</div>';

        if(doneCount===lvlMissions.length && lvl<10){
            html += '<div style="margin-top:20px;background:linear-gradient(135deg,#ffd700,#f39c12);border-radius:16px;padding:20px;text-align:center;">'+
                '<div style="font-family:\'Press Start 2P\',monospace;font-size:11px;color:white;margin-bottom:8px;">🎉 PARABÉNS!</div>'+
                '<div style="color:white;font-weight:700;">Você completou todas as missões do Nível '+lvl+'!</div>'+
                '<div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Aguarde o admin confirmar sua evolução para o Nível '+(lvl+1)+'</div>'+
            '</div>';
        }

        container.innerHTML = html;
    });
}

// ===== POKÉDEX =====
function loadPokedex(user) {
    var grid=document.getElementById('collectionGrid'), empty=document.getElementById('emptyCollection');
    var cards=(user.pokedex||[]).slice();
    var filterRarity=document.getElementById('filterRarity').value;
    if(filterRarity!=='all') cards=cards.filter(function(c){return c.rarity===filterRarity;});
    var sortBy=document.getElementById('sortBy').value;
    if(sortBy==='recent') cards.sort(function(a,b){return new Date(b.addedAt)-new Date(a.addedAt);});
    else if(sortBy==='name') cards.sort(function(a,b){return a.name.localeCompare(b.name);});
    else if(sortBy==='rarity'){
        var order={'Secret Rare':0,'Rare Rainbow':1,'Ultra Rare':2,'Rare Holo VMAX':3,'Rare Holo V':4,'Rare Holo EX':5,'Rare Holo GX':6,'Rare Holo':7,'Rare':8,'Uncommon':9,'Common':10};
        cards.sort(function(a,b){return(order[a.rarity]||99)-(order[b.rarity]||99);});
    }
    if(cards.length===0){grid.style.display='none';empty.style.display='block';return;}
    grid.style.display='grid'; empty.style.display='none';
    grid.innerHTML=cards.map(function(card){
        return '<div class="card-item" onclick="showCardDetails(\''+card.id+'\')">'+
            '<img src="'+card.image+'" alt="'+escapeHtml(card.name)+'" loading="lazy">'+
            '<div class="card-name">'+escapeHtml(card.name)+'</div>'+
            '<span class="card-rarity '+rarityClass(card.rarity)+'">'+card.rarity+'</span>'+
            '<div class="card-date">'+formatDate(card.addedAt)+'</div>'+
        '</div>';
    }).join('');
}

// ===== RANKING =====
function loadRanking(currentUser) {
    var list=document.getElementById('rankingList');
    getAllUsers(function(users) {
        var top10=users.slice().sort(function(a,b){return(b.monthPoints||0)-(a.monthPoints||0);}).slice(0,10);
        if(top10.length===0){list.innerHTML='<div class="empty-state"><div class="empty-icon">🏆</div><h3>Ranking vazio</h3></div>';return;}

        list.innerHTML=top10.map(function(user,i){
            var pos=i+1,isMe=user.id===currentUser.id;
            var posClass=pos===1?'top1':pos===2?'top2':pos===3?'top3':'';
            var medal=pos===1?'🥇':pos===2?'🥈':pos===3?'🥉':'';
            var pts=user.monthPoints||0, lvl=user.level||1, lv=getLevelByIndex(lvl);
            var badge='<svg width="32" height="32" viewBox="0 0 48 56" style="overflow:visible;filter:drop-shadow(0 0 6px '+lv.glow+')">'+lv.svgPath+'</svg>';

            // Progresso missões
            var completedCount = (user.completedMissions||[]).length;

            return '<div class="rank-item '+(isMe?'me':'')+'">' +
                '<div class="rank-position '+posClass+'">'+(medal||pos+'º')+'</div>'+
                badge+
                '<div class="rank-info">'+
                    '<div class="rank-name">'+escapeHtml(user.name)+(isMe?' <span style="color:var(--poke-blue);font-size:11px">(Você)</span>':'')+'</div>'+
                    '<div class="rank-sub">'+
                        '<span style="font-family:Cinzel,serif;font-size:11px;font-weight:700;color:'+lv.color+'">Nv.'+lvl+' '+NIVEL_NOMES[lvl]+'</span>'+
                        '<span style="font-size:11px;color:#888;">🎯 '+completedCount+' missões</span>'+
                    '</div>'+
                '</div>'+
                '<div class="rank-points">⭐ '+pts+'</div>'+
            '</div>';
        }).join('');
    });
}

// ===== HISTÓRICO =====
function loadHistory(user) {
    var list=document.getElementById('historyList'), empty=document.getElementById('emptyHistory');
    var history=(user.pointsHistory||[]).concat(user.resgatarHistory||[]);
    if(history.length===0){list.style.display='none';empty.style.display='block';return;}
    list.style.display='grid'; empty.style.display='none';

    var sorted=history.slice().sort(function(a,b){return new Date(b.date)-new Date(a.date);});
    var typeLabel={sorteio:'🎲 Sorteio',leilao:'🏷️ Leilão',break:'📦 Break',resgate:'🎁 Resgate',correcao:'✏️ Correção',nivel:'⬆️ Subiu de Nível',bonus_ranking:'🏆 Bônus Ranking'};
    var typeColor={sorteio:'var(--poke-blue)',leilao:'#f39c12',break:'#2ecc71',resgate:'#ff6060',correcao:'#e74c3c',nivel:'#9b59b6',bonus_ranking:'#ffd700'};

    list.innerHTML=sorted.map(function(h){
        var icon=(typeLabel[h.type]||'⭐').split(' ')[0];
        var label=typeLabel[h.type]||h.type;
        var color=typeColor[h.type]||'var(--poke-blue)';
        var sinal=(h.type==='resgate'||(h.type==='correcao'&&h.points<0))?'-':'+';
        var ptColor=(h.type==='resgate'||h.type==='correcao')?'#ff6060':'#2ecc71';
        var statusBadge='';
        if(h.type==='resgate') statusBadge=h.pago
            ?'<div style="margin-top:4px"><span style="background:#2ecc71;color:white;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:800;">✅ Pago em '+formatDate(h.dataPago)+'</span></div>'
            :'<div style="margin-top:4px"><span style="background:#FFCB05;color:#1a1a2e;padding:3px 10px;border-radius:99px;font-size:11px;font-weight:800;">⏳ Aguardando pagamento</span></div>';

        return '<div class="history-item" style="border-left-color:'+color+'">'+
            '<div class="history-icon">'+icon+'</div>'+
            '<div class="history-info">'+
                '<div class="history-title"><strong>'+label+'</strong>'+(h.note?' — '+escapeHtml(h.note):'')+'</div>'+
                '<div class="history-date">📅 '+formatDate(h.date)+'</div>'+
                statusBadge+
            '</div>'+
            '<div class="history-points" style="color:'+ptColor+'">'+sinal+Math.abs(h.points)+' pts'+
                (h.type==='resgate'?'<div style="font-size:11px;color:#ff6060;">R$'+(Math.abs(h.points)*0.3).toFixed(2).replace('.',',')+'</div>':'')+
            '</div>'+
        '</div>';
    }).join('');
}

// ===== RESGATAR =====
function openResgatarModal() {
    var cu = getCurrentUser();
    getUserById(cu.id, function(user) {
        if(!user) return;
        var saldo = (user.monthPoints||0)+(user.historicPoints||0);
        var lv    = getLevel(user.monthPoints||0);
        document.getElementById('resgatarPtsAtual').textContent   = saldo;
        document.getElementById('resgatarValorAtual').textContent = '= R$'+(saldo*0.3).toFixed(2).replace('.',',');
        document.getElementById('resgatarQtd').value = '';
        document.getElementById('resgatarInfo').textContent = 'Digite a quantidade de pontos para ver o valor';
        document.getElementById('resgatarBadgePreview').innerHTML =
            '<div style="display:inline-flex;flex-direction:column;align-items:center;gap:8px;">'+
            '<svg width="60" height="60" viewBox="0 0 48 56" style="overflow:visible;filter:drop-shadow(0 0 10px '+lv.glow+')">'+lv.svgPath+'</svg>'+
            '<span style="font-family:Cinzel,serif;font-size:12px;font-weight:700;color:'+lv.color+';">'+lv.name+'</span>'+
            '</div>';
        document.getElementById('resgatarModal').style.display='block';
    });
}

function closeResgatarModal(){document.getElementById('resgatarModal').style.display='none';}

function confirmarResgate() {
    var qtd=parseInt(document.getElementById('resgatarQtd').value);
    if(!qtd||qtd<1){document.getElementById('resgatarInfo').innerHTML='<span style="color:#ff6060">Quantidade inválida!</span>';return;}

    var cu=getCurrentUser();
    getUserById(cu.id, function(user) {
        if(!user) return;
        var monthPts = user.monthPoints||0;
        var histPts  = user.historicPoints||0;
        var saldo    = monthPts+histPts;
        if(qtd>saldo){document.getElementById('resgatarInfo').innerHTML='<span style="color:#ff6060">Saldo insuficiente!</span>';return;}

        // Deduzir primeiro do histórico, depois do mês
        var newHistPts, newMonthPts;
        if(qtd<=histPts){ newHistPts=histPts-qtd; newMonthPts=monthPts; }
        else { var resto=qtd-histPts; newHistPts=0; newMonthPts=monthPts-resto; }

        var pixKey = document.getElementById('resgatarPix') ? document.getElementById('resgatarPix').value.trim() : '';
        var noteText = 'R$'+(qtd*0.3).toFixed(2).replace('.',',')+' resgatados';
        if(pixKey) noteText += ' | PIX: '+pixKey;

        var history=user.resgatarHistory||[];
        history.push({id:Date.now().toString(),type:'resgate',points:qtd,valor:(qtd*0.3).toFixed(2),note:noteText,pixKey:pixKey,date:new Date().toISOString()});

        updateUser(cu.id,{monthPoints:newMonthPts,historicPoints:newHistPts,resgatarHistory:history},function(){
            var updated=Object.assign({},user,{monthPoints:newMonthPts,historicPoints:newHistPts,resgatarHistory:history});
            setCurrentUser(updated);
            closeResgatarModal();
            var pixEl=document.getElementById('resgatarPix'); if(pixEl) pixEl.value='';
            loadProfile(updated); loadStats(updated); loadHistory(updated);
            showToast('🎁 Resgate de '+qtd+' pts (R$'+(qtd*0.3).toFixed(2).replace('.',',')+') registrado!'+(pixKey?' | PIX: '+pixKey:''));
        });
    });
}

function showCardDetails(cardId) {
    var cu=getCurrentUser();
    getUserById(cu.id, function(user) {
        if(!user) return;
        var card=(user.pokedex||[]).find(function(c){return c.id===cardId;});
        if(!card) return;
        document.getElementById('cardModal').querySelector('.modal-card-content').innerHTML=
            '<span class="close" onclick="document.getElementById(\'cardModal\').style.display=\'none\'">×</span>'+
            '<div class="modal-card-image"><img src="'+card.image+'" alt="'+escapeHtml(card.name)+'"></div>'+
            '<div class="modal-card-info"><h2>'+escapeHtml(card.name)+'</h2>'+
            '<div class="modal-card-details">'+
                '<div class="detail-row"><span class="detail-label">🎴 Raridade</span><span class="detail-value">'+card.rarity+'</span></div>'+
                '<div class="detail-row"><span class="detail-label">📦 Set</span><span class="detail-value">'+(card.set||'N/A')+'</span></div>'+
                '<div class="detail-row"><span class="detail-label">🔢 Número</span><span class="detail-value">'+(card.number||'N/A')+'</span></div>'+
                '<div class="detail-row"><span class="detail-label">📅 Capturado</span><span class="detail-value">'+formatDate(card.addedAt)+'</span></div>'+
            '</div></div>';
        document.getElementById('cardModal').style.display='block';
    });
}

window.onclick=function(e){
    if(e.target===document.getElementById('resgatarModal')) closeResgatarModal();
    if(e.target===document.getElementById('cardModal'))     document.getElementById('cardModal').style.display='none';
};

function showToast(msg){
    var n=document.createElement('div');
    n.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1a1a2e;color:white;padding:14px 22px;border-radius:12px;font-family:Nunito,sans-serif;font-weight:700;font-size:14px;box-shadow:0 8px 30px rgba(0,0,0,0.4);z-index:9999;border:1px solid rgba(255,203,5,0.3);max-width:90vw;text-align:center;';
    n.textContent=msg; document.body.appendChild(n);
    setTimeout(function(){n.remove();},5000);
}
function rarityClass(r){return r?r.toLowerCase().replace(/ /g,'-'):'common';}
function escapeHtml(s){if(!s)return'';return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function formatDate(ds){
    if(!ds)return'–';
    var d=new Date(ds);
    return String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear()+' '+String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}


// ===== GINPIX =====
var ginpixDestino = null;

function loadGinPix(user) {
    var saldo = (user.monthPoints||0) + (user.historicPoints||0);
    var el = document.getElementById('ginpixSaldo');
    var el2 = document.getElementById('ginpixValorReal');
    if(el) el.textContent = saldo + ' GinCoins';
    if(el2) el2.textContent = '= R$' + (saldo*0.3).toFixed(2).replace('.',',');

    // Histórico de transferências
    var hist = (user.ginpixHistory||[]).slice().sort(function(a,b){return new Date(b.date)-new Date(a.date);});
    var container = document.getElementById('ginpixHistorico');
    if(!container) return;

    if(hist.length===0) {
        container.innerHTML = '<div style="color:#aaa;font-size:13px;text-align:center;padding:20px;">Nenhuma transferência ainda</div>';
        return;
    }

    container.innerHTML = hist.map(function(h) {
        var isEnvio = h.tipo === 'envio';
        var color   = isEnvio ? '#CC0000' : '#27ae60';
        var sinal   = isEnvio ? '-' : '+';
        var icon    = isEnvio ? '📤' : '📥';
        return '<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;background:white;border:2px solid #f0f0f0;border-radius:12px;margin-bottom:8px;border-left:4px solid '+color+';">' +
            '<div style="font-size:22px;">'+icon+'</div>' +
            '<div style="flex:1;">' +
                '<div style="font-weight:800;font-size:14px;color:#1a1a2e;">'+(isEnvio?'Enviado para: ':'Recebido de: ')+escapeHtml(h.nomeDestino||h.emailDestino)+'</div>' +
                '<div style="font-size:12px;color:#888;">📅 '+formatDate(h.date)+'</div>' +
            '</div>' +
            '<div style="font-weight:800;font-size:18px;color:'+color+';">'+sinal+h.coins+' 🪙</div>' +
        '</div>';
    }).join('');
}

function buscarTreinador() {
    var email = document.getElementById('ginpixEmail').value.trim();
    var cu    = getCurrentUser();

    document.getElementById('ginpixTreinador').style.display = 'none';
    document.getElementById('ginpixErroBusca').style.display = 'none';
    document.getElementById('ginpixQtdSection').style.display = 'none';
    document.getElementById('ginpixBtn').style.display = 'none';
    ginpixDestino = null;

    if(!email) { showToast('⚠️ Digite o email do treinador!'); return; }
    if(email === cu.email) { showToast('⚠️ Você não pode transferir para si mesmo!'); return; }

    getUserByEmail(email, function(user) {
        if(!user) {
            document.getElementById('ginpixErroBusca').style.display = 'block';
            return;
        }
        ginpixDestino = user;
        document.getElementById('ginpixNomeDestino').textContent = user.name;
        document.getElementById('ginpixEmailDestino').textContent = user.email;
        document.getElementById('ginpixTreinador').style.display = 'block';
        document.getElementById('ginpixQtdSection').style.display = 'block';
        document.getElementById('ginpixBtn').style.display = 'block';
        document.getElementById('ginpixQtd').value = '';
        document.getElementById('ginpixPreview').textContent = '';
    });
}

function atualizarPreviewGinPix() {
    var qtd   = parseInt(document.getElementById('ginpixQtd').value) || 0;
    var cu    = getCurrentUser();
    var saldo = (cu.monthPoints||0) + (cu.historicPoints||0);
    var prev  = document.getElementById('ginpixPreview');
    if(qtd > saldo) {
        prev.innerHTML = '<span style="color:#CC0000;font-weight:700;">⚠️ Saldo insuficiente! Você tem '+saldo+' GinCoins</span>';
    } else if(qtd > 0) {
        prev.innerHTML = 'Enviar <strong style="color:#c8960c;">'+qtd+' 🪙</strong> para <strong>'+escapeHtml(ginpixDestino.name)+'</strong>';
    } else {
        prev.textContent = '';
    }
}

function confirmarGinPix() {
    var qtd = parseInt(document.getElementById('ginpixQtd').value) || 0;
    if(!ginpixDestino) { showToast('⚠️ Busque um treinador primeiro!'); return; }
    if(qtd < 1) { showToast('⚠️ Digite uma quantidade válida!'); return; }

    var cu = getCurrentUser();
    getUserById(cu.id, function(remetente) {
        if(!remetente) return;
        var saldo = (remetente.monthPoints||0) + (remetente.historicPoints||0);
        if(qtd > saldo) { showToast('⚠️ Saldo insuficiente!'); return; }

        // Deduzir do remetente (primeiro histórico, depois mês)
        var histPts  = remetente.historicPoints||0;
        var monthPts = remetente.monthPoints||0;
        var newHistPts, newMonthPts;
        if(qtd <= histPts) { newHistPts=histPts-qtd; newMonthPts=monthPts; }
        else { var r=qtd-histPts; newHistPts=0; newMonthPts=monthPts-r; }

        var now      = new Date().toISOString();
        var histRem  = remetente.ginpixHistory||[];
        histRem.push({ tipo:'envio', coins:qtd, emailDestino:ginpixDestino.email, nomeDestino:ginpixDestino.name, date:now });

        // Atualizar remetente
        updateUser(cu.id, {
            monthPoints:    newMonthPts,
            historicPoints: newHistPts,
            ginpixHistory:  histRem
        }, function() {
            // Adicionar ao destinatário
            getUserById(ginpixDestino.id, function(destinatario) {
                if(!destinatario) return;
                var histDest = destinatario.ginpixHistory||[];
                histDest.push({ tipo:'recebido', coins:qtd, emailDestino:remetente.email, nomeDestino:remetente.name, date:now });
                updateUser(ginpixDestino.id, {
                    historicPoints: (destinatario.historicPoints||0) + qtd,
                    ginpixHistory:  histDest
                }, function() {
                    // Reset form
                    document.getElementById('ginpixEmail').value = '';
                    document.getElementById('ginpixTreinador').style.display = 'none';
                    document.getElementById('ginpixQtdSection').style.display = 'none';
                    document.getElementById('ginpixBtn').style.display = 'none';
                    document.getElementById('ginpixQtd').value = '';
                    ginpixDestino = null;

                    // Atualizar UI
                    var updated = Object.assign({}, remetente, {monthPoints:newMonthPts, historicPoints:newHistPts, ginpixHistory:histRem});
                    setCurrentUser(updated);
                    loadGinPix(updated);
                    loadProfile(updated);
                    loadStats(updated);

                    showToast('⚡ GinPix de '+qtd+' 🪙 enviado para '+destinatario.name+'!');
                });
            });
        });
    });
}