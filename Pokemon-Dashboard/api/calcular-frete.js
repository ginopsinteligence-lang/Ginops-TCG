// api/calcular-frete.js
// Vercel Function — calcula frete via Melhor Envio

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const { cepDestino, caixaTipo } = req.body;

    if (!cepDestino || !caixaTipo) {
        return res.status(400).json({ error: 'cepDestino e caixaTipo são obrigatórios' });
    }

    const caixas = {
        pequena: { altura: 4,  largura: 16, comprimento: 20, peso: 0.3 },
        media:   { altura: 10, largura: 20, comprimento: 20, peso: 1.0 },
        grande:  { altura: 15, largura: 50, comprimento: 36, peso: 3.0 }
    };

    const caixa = caixas[caixaTipo];
    if (!caixa) return res.status(400).json({ error: 'caixaTipo inválido' });

    const ME_TOKEN = process.env.ME_TOKEN;
    if (!ME_TOKEN) return res.status(500).json({ error: 'Token Melhor Envio não configurado' });

    try {
        const body = {
            from: { postal_code: '85035330' },
            to:   { postal_code: cepDestino.replace(/\D/g, '') },
            package: {
                height: caixa.altura,
                width:  caixa.largura,
                length: caixa.comprimento,
                weight: caixa.peso
            },
            options: {
                receipt:        false,
                own_hand:       false,
                collect:        false,
                insurance_value: 0
            },
            services: '1,2,3,4,17,31,32,34'  // PAC, SEDEX, Jadlog, Mini Envios, Loggi Express, Loggi Coleta, Loggi Ponto
        };

        const response = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/calculate', {
            method: 'POST',
            headers: {
                'Accept':        'application/json',
                'Content-Type':  'application/json',
                'Authorization': `Bearer ${ME_TOKEN}`,
                'User-Agent':    'GinopsTCG (contato@ginopstcg.com.br)'
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erro Melhor Envio:', data);
            return res.status(500).json({ error: 'Erro ao calcular frete', detalhes: data });
        }

        // Filtra só opções com preço válido e ordena por preço
        const opcoes = data
            .filter(function(s) { return s.price && !s.error; })
            .map(function(s) {
                return {
                    id:           s.id,
                    nome:         s.name,
                    empresa:      s.company ? s.company.name : '',
                    preco:        parseFloat(s.price),
                    prazo:        s.delivery_time,
                    precoFormatado: 'R$ ' + parseFloat(s.price).toFixed(2).replace('.', ',')
                };
            })
            .sort(function(a, b) { return a.preco - b.preco; });

        return res.status(200).json({ opcoes });

    } catch (error) {
        console.error('Erro interno:', error);
        return res.status(500).json({ error: 'Erro interno', detalhes: error.message });
    }
}
