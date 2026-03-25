const LEVELS = [
    {
        id:1, name:'Novato', min:0, max:19,
        color:'#888888', glow:'rgba(136,136,136,0.3)',
        svgPath:'<defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#888"/><stop offset="100%" stop-color="#333"/></linearGradient></defs><path d="M24 4 L28 14 L39 14 L30 21 L33 31 L24 24 L15 31 L18 21 L9 14 L20 14 Z" fill="url(#bg1)" stroke="#666" stroke-width="1.2"/>'
    },
    {
        id:2, name:'Treinador', min:20, max:49,
        color:'#cd7f32', glow:'rgba(205,127,50,0.3)',
        svgPath:'<defs><linearGradient id="bg2" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e8a050"/><stop offset="100%" stop-color="#7a4010"/></linearGradient></defs><circle cx="24" cy="20" r="19" fill="none" stroke="#cd7f32" stroke-width="0.8" opacity="0.4"/><path d="M24 2 L29 14 L42 14 L32 22 L36 34 L24 27 L12 34 L16 22 L6 14 L19 14 Z" fill="url(#bg2)" stroke="#cd7f32" stroke-width="1.5"/><circle cx="24" cy="20" r="4" fill="#e8a050" opacity="0.9"/>'
    },
    {
        id:3, name:'Experiente', min:50, max:99,
        color:'#c0c0c0', glow:'rgba(192,192,192,0.3)',
        svgPath:'<defs><linearGradient id="bg3" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#e0e0e0"/><stop offset="100%" stop-color="#505050"/></linearGradient></defs><path d="M8 20 Q2 15 1 19 Q1 23 5 25 Q7 26 8 24 Z" fill="#c0c0c0" opacity="0.6"/><path d="M40 20 Q46 15 47 19 Q47 23 43 25 Q41 26 40 24 Z" fill="#c0c0c0" opacity="0.6"/><path d="M24 2 L29 14 L43 14 L32 22 L36 34 L24 27 L12 34 L16 22 L5 14 L19 14 Z" fill="url(#bg3)" stroke="#c0c0c0" stroke-width="1.5"/><circle cx="24" cy="20" r="5" fill="#ddd"/><circle cx="24" cy="20" r="2.5" fill="white" opacity="0.9"/>'
    },
    {
        id:4, name:'Elite Trainer', min:100, max:179,
        color:'#ffd700', glow:'rgba(255,215,0,0.35)',
        svgPath:'<defs><linearGradient id="bg4" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ffe066"/><stop offset="50%" stop-color="#d4a017"/><stop offset="100%" stop-color="#7a5c00"/></linearGradient></defs><path d="M7 21 Q0 14 -1 19 Q-1 25 4 27 Q6 28 7 26 Z" fill="#d4a017" opacity="0.6"/><path d="M7 26 Q-1 28 0 33 Q3 36 6 34 Q7 32 7 30 Z" fill="#d4a017" opacity="0.4"/><path d="M41 21 Q48 14 49 19 Q49 25 44 27 Q42 28 41 26 Z" fill="#d4a017" opacity="0.6"/><path d="M41 26 Q49 28 48 33 Q45 36 42 34 Q41 32 41 30 Z" fill="#d4a017" opacity="0.4"/><circle cx="24" cy="22" r="20" fill="none" stroke="#ffd700" stroke-width="1" opacity="0.4"/><path d="M24 2 L30 16 L46 16 L34 25 L38 39 L24 31 L10 39 L14 25 L2 16 L18 16 Z" fill="url(#bg4)" stroke="#ffd700" stroke-width="1.5"/><circle cx="24" cy="23" r="6" fill="#d4a017"/><circle cx="24" cy="23" r="3" fill="#ffd700"/>'
    },
    {
        id:5, name:'Campeão', min:180, max:299,
        color:'#ff6060', glow:'rgba(255,80,80,0.35)',
        svgPath:'<defs><linearGradient id="bg5" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#ff8080"/><stop offset="50%" stop-color="#cc0000"/><stop offset="100%" stop-color="#500000"/></linearGradient></defs><path d="M18 6 L21 1 L24 4 L27 1 L30 6 L27 8 L24 5 L21 8 Z" fill="#ff4444" stroke="#cc0000" stroke-width="0.8"/><path d="M6 22 Q-1 13 -2 18 Q-2 25 3 28 Q5 29 6 27 Z" fill="#ff4444" opacity="0.6"/><path d="M6 27 Q-2 30 -1 36 Q2 39 5 37 Q6 35 6 32 Z" fill="#cc0000" opacity="0.5"/><path d="M42 22 Q49 13 50 18 Q50 25 45 28 Q43 29 42 27 Z" fill="#ff4444" opacity="0.6"/><path d="M42 27 Q50 30 49 36 Q46 39 43 37 Q42 35 42 32 Z" fill="#cc0000" opacity="0.5"/><path d="M24 6 L31 20 L47 20 L35 29 L39 43 L24 35 L9 43 L13 29 L1 20 L17 20 Z" fill="url(#bg5)" stroke="#ff4444" stroke-width="1.8"/><circle cx="24" cy="27" r="8" fill="#880000" stroke="#ff4444" stroke-width="1"/><circle cx="24" cy="27" r="5" fill="#cc0000"/><circle cx="24" cy="27" r="2.5" fill="#ff6060"/>'
    },
    {
        id:6, name:'Mestre', min:300, max:499,
        color:'#b794f4', glow:'rgba(183,148,244,0.35)',
        svgPath:'<defs><linearGradient id="bg6" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#d6bcfa"/><stop offset="40%" stop-color="#805ad5"/><stop offset="100%" stop-color="#2d1b69"/></linearGradient></defs><path d="M14 10 L17 4 L21 8 L24 3 L27 8 L31 4 L34 10 L30 13 L27 8 L24 5 L21 8 L18 13 Z" fill="#805ad5" stroke="#b794f4" stroke-width="0.8"/><path d="M5 25 Q-3 14 -4 20 Q-4 28 2 32 Q4 33 5 31 Z" fill="#9f7aea" opacity="0.6"/><path d="M5 31 Q-4 34 -3 41 Q0 45 4 42 Q5 39 5 36 Z" fill="#805ad5" opacity="0.5"/><path d="M43 25 Q51 14 52 20 Q52 28 46 32 Q44 33 43 31 Z" fill="#9f7aea" opacity="0.6"/><path d="M43 31 Q52 34 51 41 Q48 45 44 42 Q43 39 43 36 Z" fill="#805ad5" opacity="0.5"/><path d="M24 8 L31 23 L49 23 L36 33 L41 48 L24 39 L7 48 L12 33 L-1 23 L17 23 Z" fill="url(#bg6)" stroke="#b794f4" stroke-width="1.8"/><polygon points="24,18 30,28 24,38 18,28" fill="#2d1b69" stroke="#b794f4" stroke-width="1.2"/><polygon points="24,21 29,28 24,35 19,28" fill="#805ad5"/>'
    },
    {
        id:7, name:'Lendário', min:500, max:Infinity,
        color:'#ffd700', glow:'rgba(255,215,0,0.5)',
        svgPath:'<defs><linearGradient id="bg7" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#fffde0"/><stop offset="30%" stop-color="#ffd700"/><stop offset="70%" stop-color="#d4a017"/><stop offset="100%" stop-color="#7a5c00"/></linearGradient></defs><path d="M12 12 L15 5 L20 9 L24 2 L28 9 L33 5 L36 12 L32 15 L28 9 L24 5 L20 9 L16 15 Z" fill="#d4a017" stroke="#ffd700" stroke-width="1"/><circle cx="20" cy="6" r="2.5" fill="#fffde0"/><circle cx="28" cy="6" r="2.5" fill="#fffde0"/><path d="M4 26 Q-5 12 -6 19 Q-6 28 1 33 Q3 35 4 32 Z" fill="#ffd700" opacity="0.7"/><path d="M4 32 Q-6 36 -5 44 Q-1 48 3 45 Q4 42 4 38 Z" fill="#d4a017" opacity="0.55"/><path d="M4 38 Q-5 43 -4 50 Q0 53 3 50 L4 46 Z" fill="#b8860b" opacity="0.4"/><path d="M44 26 Q53 12 54 19 Q54 28 47 33 Q45 35 44 32 Z" fill="#ffd700" opacity="0.7"/><path d="M44 32 Q54 36 53 44 Q49 48 45 45 Q44 42 44 38 Z" fill="#d4a017" opacity="0.55"/><path d="M44 38 Q53 43 52 50 Q48 53 45 50 L44 46 Z" fill="#b8860b" opacity="0.4"/><circle cx="24" cy="30" r="24" fill="none" stroke="#ffd700" stroke-width="1.3" opacity="0.5"/><path d="M24 6 L32 24 L52 24 L37 35 L43 53 L24 43 L5 53 L11 35 L-4 24 L16 24 Z" fill="url(#bg7)" stroke="#ffd700" stroke-width="2"/><circle cx="24" cy="32" r="10" fill="#3d2c00" stroke="#ffd700" stroke-width="1.5"/><polygon points="24,22 30,32 24,42 18,32" fill="#7a5c00"/><polygon points="24,24 29,32 24,40 19,32" fill="#d4a017"/><polygon points="24,26 28,32 24,38 20,32" fill="#ffd700"/><circle cx="22" cy="30" r="2.5" fill="white" opacity="0.8"/>'
    }
];

function getLevel(points) {
    for (var i = LEVELS.length - 1; i >= 0; i--) {
        if (points >= LEVELS[i].min) return LEVELS[i];
    }
    return LEVELS[0];
}

// Retorna o emblema pelo nível real do usuário (1-7)
function getLevelByIndex(lvl) {
    // Mapear 10 níveis do jogo para 7 emblemas
    var map = [0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 6];
    var idx = map[lvl] || 0;
    return LEVELS[idx] || LEVELS[0];
}

function getBadgeSVG(points, size) {
    size = size || 48;
    var lv = getLevel(points);
    return '<svg width="'+size+'" height="'+size+'" viewBox="0 0 48 56" style="overflow:visible;filter:drop-shadow(0 0 6px '+lv.glow+')">'+lv.svgPath+'</svg>';
}
