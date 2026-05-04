// ===== GINOPS TCG — SISTEMA DE LEILÕES =====

var _leiloes       = [];
var _allUsers      = [];
var _currentLeilao = null;
var _searchMode    = 'name';

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', function() {
    loadLeiloes();
    getAllUsers(function(users) { _allUsers = users; });

    var cs = document.getElementById('cardSearchLeilao');
    if(cs) cs.addEventListener('keydown', function(e){ if(e.key==='Enter') searchCardsLeilao(); });

    var ns = document.getElementById('numberSearchLeilao');
    if(ns) ns.addEventListener('keydown', function(e){ if(e.key==='Enter') searchCardsLeilao(); });
});

// ===== FIRESTORE: LEILÕES =====
function getAllLeiloes(callback) {
    db.collection('leiloes').orderBy('createdAt','desc').get().then(function(snap) {
        var list = [];
        snap.forEach(function(doc){ list.push(Object.assign({id:doc.id}, doc.data())); });
        callback(list);
    }).catch(function(){ callback([]); });
}

function getLeilaoById(id, callback) {
    db.collection('leiloes').doc(id).get().then(function(doc){
        callback(doc.exists ? Object.assign({id:doc.id}, doc.data()) : null);
    }).catch(function(){ callback(null); });
}

function saveLeilao(id, data, callback) {
    db.collection('leiloes').doc(id).set(data, {merge:true}).then(function(){
        if(callback) callback(true);
    }).catch(function(){ if(callback) callback(false); });
}

function createLeilao(data, callback) {
    db.collection('leiloes').add(data).then(function(ref){
        callback(Object.assign({id:ref.id}, data));
    }).catch(function(){ callback(null); });
}

function deleteLeilaoById(id, callback) {
    db.collection('leiloes').doc(id).delete().then(function(){
        if(callback) callback(true);
    }).catch(function(){ if(callback) callback(false); });
}

// ===== HELPERS =====
function escapeHtml(str) {
    if(!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(iso) {
    if(!iso) return '—';
    var d = new Date(iso);
    return d.toLocaleDateString('pt-BR');
}

function formatCurrency(val) {
    return 'R$ '+(parseFloat(val)||0).toFixed(2).replace('.',',');
}

function showNotification(msg, type) {
    var n = document.getElementById('notification');
    if(!n) return;
    n.textContent = msg;
    n.className = 'notification show ' + (type||'success');
    setTimeout(function(){ n.className = 'notification'; }, 3500);
}

function statusLabel(leilao) {
    if(leilao.status === 'finalizado') return '<span class="badge badge-finalizado">✅ Finalizado</span>';
    if(leilao.status === 'ativo')      return '<span class="badge badge-ativo">🔴 Ativo</span>';
    return '<span class="badge badge-rascunho">📝 Rascunho</span>';
}

// ===== CARREGAR LISTA DE LEILÕES =====
function loadLeiloes() {
    var list = document.getElementById('leiloesList');
    list.innerHTML = '<div class="loading-state">⏳ Carregando leilões...</div>';
    getAllLeiloes(function(leiloes) {
        _leiloes = leiloes;
        renderLeiloesList();
    });
}

function renderLeiloesList() {
    var list   = document.getElementById('leiloesList');
    var search = (document.getElementById('searchLeilao')||{}).value||'';
    var filter = (document.getElementById('filterStatus')||{}).value||'todos';

    var filtered = _leiloes.filter(function(l){
        var matchSearch = !search || l.nome.toLowerCase().includes(search.toLowerCase());
        var matchFilter = filter === 'todos' || l.status === filter;
        return matchSearch && matchFilter;
    });

    if(filtered.length === 0) {
        list.innerHTML = '<div class="empty-state-main"><div class="empty-icon">🏷️</div><p>Nenhum leilão encontrado</p></div>';
        return;
    }

    list.innerHTML = filtered.map(function(l) {
        var itens     = l.itens||[];
        var arrematantes = {};
        itens.forEach(function(item){
            if(item.arrematante) arrematantes[item.arrematante] = true;
        });
        var totalVal  = itens.reduce(function(s,i){ return s+(parseFloat(i.valor)||0); },0);
        var totalPago = itens.filter(function(i){ return i.pago; }).reduce(function(s,i){ return s+(parseFloat(i.valor)||0); },0);
        var pendente  = totalVal - totalPago;

        return '<div class="leilao-card" onclick="openLeilao(\''+l.id+'\')">'+
            '<div class="leilao-card-header">'+
                '<div>'+
                    '<div class="leilao-nome">'+escapeHtml(l.nome)+'</div>'+
                    '<div class="leilao-data">📅 '+formatDate(l.data)+'</div>'+
                '</div>'+
                statusLabel(l)+
            '</div>'+
            '<div class="leilao-stats">'+
                '<div class="stat-item"><span class="stat-num">'+itens.length+'</span><span class="stat-label">Itens</span></div>'+
                '<div class="stat-item"><span class="stat-num">'+Object.keys(arrematantes).length+'</span><span class="stat-label">Arrematantes</span></div>'+
                '<div class="stat-item"><span class="stat-num">'+formatCurrency(totalVal)+'</span><span class="stat-label">Total</span></div>'+
                '<div class="stat-item '+(pendente>0?'stat-pendente':'')+'"><span class="stat-num">'+formatCurrency(pendente)+'</span><span class="stat-label">Pendente</span></div>'+
            '</div>'+
        '</div>';
    }).join('');
}

// ===== CRIAR LEILÃO =====
function openCreateLeilao() {
    document.getElementById('createModal').style.display = 'block';
    document.getElementById('nomeLeilao').value = '';
    document.getElementById('dataLeilao').value = new Date().toISOString().slice(0,10);
    document.getElementById('descLeilao').value = '';
}

function closeCreateModal() {
    document.getElementById('createModal').style.display = 'none';
}

function confirmCreateLeilao() {
    var nome = document.getElementById('nomeLeilao').value.trim();
    var data = document.getElementById('dataLeilao').value;
    var desc = document.getElementById('descLeilao').value.trim();
    if(!nome){ showNotification('⚠️ Digite o nome do leilão!','error'); return; }
    var novoLeilao = {
        nome: nome, data: data, descricao: desc,
        status: 'rascunho', itens: [],
        createdAt: new Date().toISOString()
    };
    createLeilao(novoLeilao, function(l){
        if(!l){ showNotification('❌ Erro ao criar leilão!','error'); return; }
        closeCreateModal();
        showNotification('✅ Leilão "'+nome+'" criado!','success');
        loadLeiloes();
        setTimeout(function(){ openLeilao(l.id); }, 500);
    });
}

// ===== ABRIR LEILÃO (DETALHE) =====
function openLeilao(id) {
    getLeilaoById(id, function(l){
        if(!l){ showNotification('❌ Leilão não encontrado!','error'); return; }
        _currentLeilao = l;
        renderLeilaoDetalhe(l);
        document.getElementById('listView').style.display  = 'none';
        document.getElementById('detailView').style.display = 'block';
    });
}

function backToList() {
    document.getElementById('detailView').style.display = 'none';
    document.getElementById('listView').style.display   = 'block';
    _currentLeilao = null;
    loadLeiloes();
}

function renderLeilaoDetalhe(l) {
    document.getElementById('detailNome').textContent   = l.nome;
    document.getElementById('detailData').textContent   = formatDate(l.data);
    document.getElementById('detailStatus').innerHTML   = statusLabel(l);
    document.getElementById('detailDesc').textContent   = l.descricao||'';

    // Botões de status
    var btnAtivo = document.getElementById('btnAtivo');
    var btnFinal = document.getElementById('btnFinalizado');
    btnAtivo.style.display = l.status !== 'ativo'      ? 'inline-flex' : 'none';
    btnFinal.style.display = l.status !== 'finalizado' ? 'inline-flex' : 'none';

    renderItens(l);
    renderArrematantes(l);
}

// ===== ITENS DO LEILÃO =====
function renderItens(l) {
    var itens    = l.itens||[];
    var total    = itens.reduce(function(s,i){ return s+(parseFloat(i.valor)||0); },0);
    document.getElementById('totalItens').textContent = itens.length+' iten(s) — '+formatCurrency(total);

    var grid = document.getElementById('itensGrid');
    if(itens.length === 0) {
        grid.innerHTML = '<div class="empty-state-main"><div class="empty-icon">🎴</div><p>Nenhuma carta adicionada ainda</p></div>';
        return;
    }
    grid.innerHTML = itens.map(function(item, idx){
        return '<div class="item-card">'+
            (item.image
                ? '<img src="'+item.image+'" alt="'+escapeHtml(item.name)+'" loading="lazy" onerror="this.style.display=&quot;none&quot;;this.nextElementSibling.style.display=&quot;flex&quot;"><div style="display:none;width:100%;aspect-ratio:2/3;background:var(--bg3);border-radius:8px;align-items:center;justify-content:center;font-size:28px;margin-bottom:8px;">🎴</div>'
                : '<div style="width:100%;aspect-ratio:2/3;background:var(--bg3);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:8px;">🎴</div>'
            )+
            '<div class="item-name">'+escapeHtml(item.name)+'</div>'+
            '<div class="item-set">'+(item.set||'')+(item.number?' · Nº '+item.number:'')+'</div>'+
            '<div class="item-valor">'+formatCurrency(item.valor)+'</div>'+
            (item.variacao ?
                '<div style="font-size:10px;font-weight:700;color:var(--yellow);margin-bottom:2px;">'+(item.variacao==='pokebola'?'🔴 Pokébola':'🟣 Masterball')+'</div>'
            : '')+
            (item.arrematante ?
                '<div class="item-arrematante">👤 '+escapeHtml(item.arrematante)+'</div>'
            : '<div class="item-arrematante sem">Sem arrematante</div>')+
            '<div class="item-actions">'+
                '<button class="btn-icon" title="Definir arrematante" onclick="openArrematanteModal('+idx+')">👤</button>'+
                '<button class="btn-icon danger" title="Remover" onclick="removeItem('+idx+')">🗑️</button>'+
            '</div>'+
        '</div>';
    }).join('');
}

function removeItem(idx) {
    if(!confirm('Remover este item?')) return;
    var itens = (_currentLeilao.itens||[]);
    itens.splice(idx,1);
    _currentLeilao.itens = itens;
    saveLeilao(_currentLeilao.id, {itens:itens}, function(){
        renderItens(_currentLeilao);
        renderArrematantes(_currentLeilao);
        showNotification('✅ Item removido!','success');
    });
}

// ===== BUSCA DE CARTAS =====
function setSearchModeLeilao(mode) {
    _searchMode = mode;
    var byName   = document.getElementById('searchByName');
    var byNumber = document.getElementById('searchByNumber');
    var byManual = document.getElementById('searchByManual');

    byName.style.display   = 'none';
    byNumber.style.display = 'none';
    if (byManual) byManual.style.display = 'none';

    // Reset botões
    ['modeByName','modeByNumber','modeByManual'].forEach(function(id){
        var el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    if (mode === 'name') {
        byName.style.display = 'flex';
        document.getElementById('modeByName').classList.add('active');
    } else if (mode === 'number') {
        byNumber.style.display = 'flex';
        document.getElementById('modeByNumber').classList.add('active');
    } else if (mode === 'manual') {
        if (byManual) byManual.style.display = 'block';
        document.getElementById('modeByManual').classList.add('active');
    }

    document.getElementById('cardResultsLeilao').innerHTML='';
    document.getElementById('addItemSection').style.display='none';
    window._selectedCardLeilao = null;
    window._manualCardData = null;
}

async function searchCardsLeilao() {
    var results = document.getElementById('cardResultsLeilao');
    results.innerHTML='<div class="loading-state">🔍 Buscando...</div>';

    try {
        var url, res, data, cards;
        if(_searchMode==='number') {
            var numInput = document.getElementById('numberSearchLeilao').value.trim();
            if(!numInput){ results.innerHTML=''; return; }
            var numPart   = numInput.split('/')[0].trim();
            var numInt    = String(parseInt(numPart, 10)); // sem zeros: "018" → "18"

            // Busca com o número sem zeros (a API normaliza internamente)
            url = 'https://api.pokemontcg.io/v2/cards?q=number:'+encodeURIComponent(numInt)+'&pageSize=60&orderBy=name';
            res = await fetch(url); data = await res.json(); cards = data.data||[];

            // Se não achou, tenta também com o número exato (com zeros)
            if(cards.length === 0 && numPart !== numInt) {
                url = 'https://api.pokemontcg.io/v2/cards?q=number:'+encodeURIComponent(numPart)+'&pageSize=60&orderBy=name';
                res = await fetch(url); data = await res.json(); cards = data.data||[];
            }

            if(numInput.includes('/')) {
                var totalPart = numInput.split('/')[1].trim();
                cards = cards.filter(function(c){ return c.set && String(c.set.total)===totalPart; });
            }

            // Filtra pelo número exato digitado (considera zeros à esquerda)
            // Ex: digitou "018" → só mostra cartas cujo number é "018" ou "18"
            cards = cards.filter(function(c){
                return c.number === numPart || c.number === numInt;
            });
        } else {
            var term = document.getElementById('cardSearchLeilao').value.trim();
            if(term.length<1){ results.innerHTML=''; return; }
            url = 'https://api.pokemontcg.io/v2/cards?q=name:"'+encodeURIComponent(term)+'"&pageSize=60&orderBy=name';
            res = await fetch(url); data = await res.json(); cards = data.data||[];
            if(cards.length===0){
                url='https://api.pokemontcg.io/v2/cards?q=name:'+encodeURIComponent(term)+'*&pageSize=60&orderBy=name';
                res=await fetch(url); data=await res.json(); cards=data.data||[];
            }
        }

        if(cards.length===0){
            results.innerHTML='<div class="empty-state-main"><p>😢 Não encontrado</p></div>';
            return;
        }

        results.innerHTML = cards.map(function(card){
            return '<div class="search-result-card" onclick="selectCardLeilao(\''+card.id+'\',this)">'+
                '<img src="'+card.images.small+'" alt="'+escapeHtml(card.name)+'" loading="lazy">'+
                '<div class="src-name">'+escapeHtml(card.name)+'</div>'+
                '<div class="src-info">'+(card.number?'Nº '+card.number:'')+(card.set?' · '+card.set.name:'')+'</div>'+
                '<div class="src-rarity">'+(card.rarity||'Common')+'</div>'+
            '</div>';
        }).join('');
    } catch(e) {
        results.innerHTML='<div class="empty-state-main"><p>❌ Erro na busca</p></div>';
    }
}

var _selectedCardLeilao = null;

function selectCardLeilao(cardId, el) {
    document.querySelectorAll('.search-result-card').forEach(function(c){ c.classList.remove('selected'); });
    el.classList.add('selected');
    _selectedCardLeilao = cardId;
    document.getElementById('addItemSection').style.display='block';
    document.getElementById('itemValor').focus();
}

async function addItemToLeilao() {
    if(!_selectedCardLeilao){ showNotification('⚠️ Selecione uma carta!','error'); return; }
    var valor = parseFloat(document.getElementById('itemValor').value);
    if(!valor||valor<=0){ showNotification('⚠️ Digite o valor!','error'); return; }

    var _arr = window._pendingArrematante || null;

    var _variacao = (window._variacaoSelecionada || '');

    // ── MODO MANUAL ──
    if (_selectedCardLeilao === '__manual__') {
        var m = window._manualCardData || {};
        if (!m.nome) { showNotification('⚠️ Nome da carta é obrigatório!','error'); return; }
        var novoItem = {
            id:       Date.now().toString(),
            apiId:    null,
            name:     m.nome,
            image:    m.imagem || '',
            rarity:   m.raridade || 'Common',
            set:      m.set || '',
            number:   m.numero || '',
            valor:    valor,
            variacao: _variacao,
            arrematante:       _arr ? _arr.nome : '',
            arrematanteUserId: _arr ? (_arr.userId || null) : null,
            pago:     false,
            enviado:  false,
            integrado:false,
            manual:   true,
            addedAt:  new Date().toISOString()
        };
        window._pendingArrematante = null;
        window._manualCardData = null;
        window._variacaoSelecionada = '';
        var itens = (_currentLeilao.itens||[]);
        itens.push(novoItem);
        _currentLeilao.itens = itens;
        saveLeilao(_currentLeilao.id, {itens:itens}, function(){
            renderItens(_currentLeilao);
            renderArrematantes(_currentLeilao);
            document.getElementById('itemValor').value='';
            document.getElementById('addItemSection').style.display='none';
            _selectedCardLeilao = null;
            ['manualNome','manualSet','manualNumero'].forEach(function(id){ var el=document.getElementById(id); if(el) el.value=''; });
            var prev = document.getElementById('manualImagePreview');
            if (prev) prev.style.display='none';
            var statusEl = document.getElementById('manualImageUploadStatus');
            if (statusEl) { statusEl.style.display='none'; statusEl.textContent='⏳ Enviando imagem...'; statusEl.style.color='var(--accent)'; }
            document.getElementById('manualImageName').textContent='Nenhuma imagem';
            window._manualImageUrl = null;
            showNotification('✅ "'+m.nome+'" adicionado!','success');
        });
        return;
    }

    // ── MODO API (por nome / número) ──
    try {
        var res  = await fetch('https://api.pokemontcg.io/v2/cards/'+_selectedCardLeilao);
        var data = await res.json();
        var card = data.data;

        var novoItem = {
            id:       Date.now().toString(),
            apiId:    card.id,
            name:     card.name,
            image:    card.images.large,
            rarity:   card.rarity||'Common',
            set:      card.set ? card.set.name : '',
            number:   card.number||'',
            valor:    valor,
            variacao: _variacao,
            arrematante:       _arr ? _arr.nome : '',
            arrematanteUserId: _arr ? (_arr.userId || null) : null,
            pago:     false,
            enviado:  false,
            integrado:false,
            manual:   false,
            addedAt:  new Date().toISOString()
        };
        window._pendingArrematante = null;
        window._variacaoSelecionada = '';

        var itens = (_currentLeilao.itens||[]);
        itens.push(novoItem);
        _currentLeilao.itens = itens;

        saveLeilao(_currentLeilao.id, {itens:itens}, function(){
            renderItens(_currentLeilao);
            renderArrematantes(_currentLeilao);
            document.getElementById('itemValor').value='';
            document.getElementById('addItemSection').style.display='none';
            _selectedCardLeilao = null;
            document.querySelectorAll('.search-result-card').forEach(function(c){ c.classList.remove('selected'); });
            showNotification('✅ "'+card.name+'" adicionado!','success');
        });
    } catch(e){ showNotification('❌ Erro ao adicionar!','error'); }
}

// ===== ARREMATANTE =====
var _arrematanteItemIdx = null;

function openArrematanteModal(idx) {
    _arrematanteItemIdx = idx;
    var item = (_currentLeilao.itens||[])[idx];
    document.getElementById('arrematanteModal').style.display='block';
    document.getElementById('arrNomeExterno').value  = item.arrematante && !item.arrematanteUserId ? item.arrematante : '';
    document.getElementById('arrUserSearch').value   = '';
    document.getElementById('arrUserResults').innerHTML='';
    document.getElementById('arrSelectedInfo').style.display='none';

    // Se já tem player cadastrado associado, mostrar
    if(item.arrematanteUserId) {
        var user = _allUsers.find(function(u){ return u.id===item.arrematanteUserId; });
        if(user) showSelectedUser(user);
    }
}

function closeArrematanteModal() {
    document.getElementById('arrematanteModal').style.display='none';
    _arrematanteItemIdx = null;
}

function searchArrematanteUser() {
    var term = document.getElementById('arrUserSearch').value.trim().toLowerCase();
    var results = document.getElementById('arrUserResults');
    if(term.length < 1){ results.innerHTML=''; return; }
    var found = _allUsers.filter(function(u){
        return (u.name||'').toLowerCase().includes(term) || (u.email||'').toLowerCase().includes(term);
    });
    if(found.length===0){ results.innerHTML='<div style="padding:8px;color:#aaa;font-size:12px;">Nenhum player encontrado</div>'; return; }
    results.innerHTML = found.map(function(u){
        return '<div class="user-result" onclick="showSelectedUser('+JSON.stringify(u).replace(/"/g,'&quot;')+')">'+
            '<div class="user-avatar">'+((u.name||'?')[0].toUpperCase())+'</div>'+
            '<div><div class="user-name">'+escapeHtml(u.name)+'</div>'+
            '<div class="user-email">'+escapeHtml(u.email||'')+'</div></div>'+
        '</div>';
    }).join('');
}

var _selectedUser = null;
function showSelectedUser(user) {
    _selectedUser = user;
    document.getElementById('arrUserResults').innerHTML='';
    document.getElementById('arrUserSearch').value='';
    document.getElementById('arrNomeExterno').value='';
    document.getElementById('arrSelectedInfo').style.display='flex';
    document.getElementById('arrSelectedName').textContent  = user.name;
    document.getElementById('arrSelectedEmail').textContent = user.email||'';
}

function clearSelectedUser() {
    _selectedUser = null;
    document.getElementById('arrSelectedInfo').style.display='none';
}

function confirmArrematante() {
    if(_arrematanteItemIdx === null) return;
    var nomeExterno = document.getElementById('arrNomeExterno').value.trim();

    var arrematante       = '';
    var arrematanteUserId = null;

    if(_selectedUser) {
        arrematante       = _selectedUser.name;
        arrematanteUserId = _selectedUser.id;
    } else if(nomeExterno) {
        arrematante = nomeExterno;
    } else {
        showNotification('⚠️ Selecione um player ou digite o nome!','error'); return;
    }

    var itens = _currentLeilao.itens||[];
    itens[_arrematanteItemIdx].arrematante       = arrematante;
    itens[_arrematanteItemIdx].arrematanteUserId = arrematanteUserId;
    _currentLeilao.itens = itens;

    saveLeilao(_currentLeilao.id, {itens:itens}, function(){
        closeArrematanteModal();
        renderItens(_currentLeilao);
        renderArrematantes(_currentLeilao);
        _selectedUser = null;
        showNotification('✅ Arrematante definido!','success');
    });
}

// ===== PAINEL DE ARREMATANTES =====
function abrirRelatorio(nomeKey) {
    if(!_currentLeilao || !_currentLeilao.itens) return;
    var itens = _currentLeilao.itens.filter(function(i){ return i.arrematante === nomeKey; });
    if(!itens.length) return;

    var modal = document.getElementById('relatorioModal');
    var nome  = document.getElementById('relatorioNome');
    var grid  = document.getElementById('relatorioGrid');

    nome.textContent = itens[0].arrematante;
    grid.innerHTML = itens.map(function(item){
        return '<img src="'+(item.image||'')+'" alt="'+escapeHtml(item.name)+'" '+
            'style="width:100%;aspect-ratio:2/3;object-fit:contain;border-radius:8px;background:#111;" '+
            'onerror="this.style.background=\'#222\';this.alt=\''+escapeHtml(item.name)+'\'">';
    }).join('');

    modal.style.display = 'flex';
}

function fecharRelatorio() {
    document.getElementById('relatorioModal').style.display = 'none';
}

function renderArrematantes(l) {
    var itens = l.itens||[];
    var grupos = {};

    itens.forEach(function(item){
        if(!item.arrematante) return;
        var key = item.arrematante;
        if(!grupos[key]) grupos[key] = {
            nome: item.arrematante,
            userId: item.arrematanteUserId,
            itens: [], total:0, totalPago:0
        };
        grupos[key].itens.push(item);
        grupos[key].total      += parseFloat(item.valor)||0;
        grupos[key].totalPago  += item.pago ? (parseFloat(item.valor)||0) : 0;
    });

    var container = document.getElementById('arrematantesPanel');
    var keys = Object.keys(grupos);

    if(keys.length===0){
        container.innerHTML='<div class="empty-state-main"><p>Nenhum arrematante definido ainda</p></div>';
        return;
    }

    container.innerHTML = keys.map(function(key){
        var g         = grupos[key];
        var pendente  = g.total - g.totalPago;
        var todoPago  = g.itens.every(function(i){ return i.pago; });
        var todoEnv   = g.itens.every(function(i){ return i.enviado; });
        var todoInteg = g.itens.every(function(i){ return i.integrado; }) || !g.userId;

        return '<div class="arrematante-card '+(todoPago?'pago':'')+'">'+
            '<div class="arr-header">'+
                '<div class="arr-avatar">'+(g.nome[0]||'?').toUpperCase()+'</div>'+
                '<div class="arr-info">'+
                    '<div class="arr-nome">'+escapeHtml(g.nome)+(g.userId?'  <span class="badge-player">Player</span>':'  <span class="badge-externo">Externo</span>')+'</div>'+
                    '<div class="arr-resumo">'+g.itens.length+' item(s) · '+formatCurrency(g.total)+'</div>'+
                '</div>'+
                '<div class="arr-status">'+
                    (todoPago   ? '<span class="status-ok">✅ Pago</span>'   : '<span class="status-pend">💰 '+formatCurrency(pendente)+' pendente</span>')+
                    (todoEnv    ? '<span class="status-ok">📦 Enviado</span>' : '')+
                '</div>'+
                '<button class="btn btn-ghost btn-sm" style="margin-left:8px;flex-shrink:0;" onclick="abrirRelatorio(\''+key.replace(/'/g,"\\'")+'\')" title="Relatório de cartas">📸 Relatório</button>'+
            '</div>'+

            // Lista de itens
            '<div class="arr-itens">'+
            g.itens.map(function(item){
                var iIdx = itens.indexOf(item);
                return '<div class="arr-item">'+
                    '<img src="'+item.image+'" alt="'+escapeHtml(item.name)+'" class="arr-item-img">'+
                    '<div class="arr-item-info">'+
                        '<div class="arr-item-name">'+escapeHtml(item.name)+'</div>'+
                        '<div class="arr-item-val">'+formatCurrency(item.valor)+'</div>'+
                    '</div>'+
                    '<div class="arr-item-checks">'+
                        '<label class="check-label">'+
                            '<input type="checkbox" '+(item.pago?'checked':'')+' onchange="togglePago('+iIdx+',this.checked)"> Pago'+
                        '</label>'+
                        '<label class="check-label">'+
                            '<input type="checkbox" '+(item.enviado?'checked':'')+' onchange="toggleEnviado('+iIdx+',this.checked)"> Enviado'+
                        '</label>'+
                    '</div>'+
                '</div>';
            }).join('')+
            '</div>'+

            // Botão integrar pokédex
            (g.userId && !todoInteg ?
                '<button class="btn-integrar" onclick="integrarPokedex(\''+escapeHtml(g.nome)+'\',\''+g.userId+'\')">'+
                    '📖 Integrar à Pokédex'+
                '</button>'
            : (g.userId && todoInteg ?
                '<div style="text-align:center;font-size:12px;color:#2ecc71;padding:8px;">✅ Já integrado à Pokédex</div>'
            : ''))+

        '</div>';
    }).join('');
}

function togglePago(idx, checked) {
    var itens = _currentLeilao.itens||[];
    itens[idx].pago = checked;
    _currentLeilao.itens = itens;
    saveLeilao(_currentLeilao.id, {itens:itens}, function(){
        renderArrematantes(_currentLeilao);
        // Dispara missão de leilão se tem player cadastrado e está marcando como pago
        if(checked) {
            var item = itens[idx];
            if(item.arrematanteUserId) {
                getUserById(item.arrematanteUserId, function(user){
                    if(user) checkMissions(user, 'leilao', {valor: item.valor});
                });
            }
        }
    });
}

function toggleEnviado(idx, checked) {
    var itens = _currentLeilao.itens||[];
    itens[idx].enviado = checked;
    _currentLeilao.itens = itens;
    saveLeilao(_currentLeilao.id, {itens:itens}, function(){
        renderArrematantes(_currentLeilao);
    });
}

// ===== INTEGRAR À POKÉDEX =====
function integrarPokedex(nomeArrematante, userId) {
    if(!confirm('Integrar cartas de "'+nomeArrematante+'" à Pokédex?')) return;

    var itensDoUser = (_currentLeilao.itens||[]).filter(function(i){
        return i.arrematante === nomeArrematante && !i.integrado;
    });

    if(itensDoUser.length===0){
        showNotification('⚠️ Nenhuma carta para integrar!','error'); return;
    }

    getUserById(userId, function(user){
        if(!user){ showNotification('❌ Player não encontrado!','error'); return; }

        var pokedex = user.pokedex||[];
        var novasCartas = itensDoUser.map(function(item){
            return {
                id:       Date.now().toString()+'_'+Math.random().toString(36).slice(2),
                apiId:    item.apiId||null,
                name:     item.name,
                image:    item.image,
                rarity:   item.rarity||'Common',
                set:      item.set||'',
                number:   item.number||'',
                language: 'en',
                leilao:   true,
                leilaoId: _currentLeilao.id,
                addedAt:  new Date().toISOString()
            };
        });

        pokedex = pokedex.concat(novasCartas);

        updateUser(userId, {pokedex:pokedex}, function(){
            // Marcar itens como integrados
            var itens = _currentLeilao.itens||[];
            itens.forEach(function(item){
                if(item.arrematante===nomeArrematante) item.integrado=true;
            });
            _currentLeilao.itens = itens;
            saveLeilao(_currentLeilao.id, {itens:itens}, function(){
                renderArrematantes(_currentLeilao);
                // Verificar missão
                novasCartas.forEach(function(c){
                    checkMissions(Object.assign({},user,{pokedex:pokedex}), 'capture', {rarity:c.rarity});
                });
                showNotification('✅ '+novasCartas.length+' carta(s) integrada(s) à Pokédex de "'+user.name+'"!','success');
            });
        });
    });
}

// ===== STATUS DO LEILÃO =====
function setStatus(status) {
    if(!_currentLeilao) return;
    saveLeilao(_currentLeilao.id, {status:status}, function(){
        _currentLeilao.status = status;
        renderLeilaoDetalhe(_currentLeilao);
        showNotification('✅ Status atualizado!','success');
    });
}

function deleteLeilao() {
    if(!_currentLeilao) return;
    if(!confirm('Excluir leilão "'+_currentLeilao.nome+'"? Irreversível!')) return;
    deleteLeilaoById(_currentLeilao.id, function(){
        backToList();
        showNotification('✅ Leilão excluído!','success');
    });
}

// ===== PAINEL DE BUSCA: TOGGLE =====
function toggleAddCard() {
    var panel = document.getElementById('addCardPanel');
    panel.style.display = panel.style.display==='none' ? 'block' : 'none';
    if(panel.style.display==='block') {
        setSearchModeLeilao('name');
        document.getElementById('cardSearchLeilao').value='';
        document.getElementById('cardResultsLeilao').innerHTML='';
        document.getElementById('addItemSection').style.display='none';
        _selectedCardLeilao = null;
    }
}
