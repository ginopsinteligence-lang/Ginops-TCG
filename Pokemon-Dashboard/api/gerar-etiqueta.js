// api/gerar-etiqueta.js
// Vercel Function — gera etiqueta no Melhor Envio e retorna link de impressão

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

    const ME_TOKEN = process.env.ME_TOKEN;
    if (!ME_TOKEN) return res.status(500).json({ error: 'Token ME não configurado' });

    const { pedidoId, freteId, nomeDestinatario, cpfDestinatario, cepDestino, enderecoDestino, caixaTipo, itensDeclarados, valorPago } = req.body;
    if (!pedidoId || !freteId || !cepDestino) return res.status(400).json({ error: 'Dados obrigatórios ausentes' });

    const caixas = {
        pequena: { altura: 4,  largura: 16, comprimento: 20, peso: 0.3 },
        media:   { altura: 10, largura: 20, comprimento: 20, peso: 1.0 },
        grande:  { altura: 15, largura: 50, comprimento: 36, peso: 3.0 }
    };
    const caixa = caixas[caixaTipo] || caixas.pequena;

    const headers = {
        'Accept':        'application/json',
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ME_TOKEN}`,
        'User-Agent':    'GinopsTCG (contato@ginopstcg.com.br)'
    };

    try {
        // 1. Adiciona pedido ao carrinho ME
        const carrinhoBody = {
            service: freteId,
            agency:  null,
            from: {
                name:        'Ginops TCG',
                phone:       '42999999999',
                email:       'contato@ginopstcg.com.br',
                document:    '00000000000', // CPF/CNPJ do remetente
                address:     'Rua Maranhao',
                number:      '369',
                complement:  'Sala 10',
                district:    'Bonsucesso',
                city:        'Guarapuava',
                state_abbr:  'PR',
                postal_code: '85035330',
                country_id:  'BR'
            },
            to: {
                name:        nomeDestinatario || 'Cliente',
                phone:       '00000000000',
                email:       'cliente@ginopstcg.com.br',
                document:    (cpfDestinatario || '').replace(/\D/g, ''),
                address:     enderecoDestino.rua     || '',
                number:      enderecoDestino.numero  || 'S/N',
                complement:  enderecoDestino.complemento || '',
                district:    enderecoDestino.bairro  || '',
                city:        enderecoDestino.cidade  || '',
                state_abbr:  enderecoDestino.estado  || '',
                postal_code: cepDestino.replace(/\D/g, ''),
                country_id:  'BR'
            },
            products: [{
                name:        (itensDeclarados && itensDeclarados.join(', ')) || 'Cards TCG',
                quantity:    1,
                unitary_value: valorPago || 10
            }],
            volumes: [{
                height:  caixa.altura,
                width:   caixa.largura,
                length:  caixa.comprimento,
                weight:  caixa.peso
            }],
            options: {
                insurance_value: valorPago || 10,
                receipt:         false,
                own_hand:        false,
                collect:         false,
                reverse:         false,
                non_commercial:  true,
                invoice:         { key: '' },
                platform:        'GinopsTCG',
                tags:            [{ tag: pedidoId, url: null }]
            }
        };

        const carrinhoRes = await fetch('https://melhorenvio.com.br/api/v2/me/cart', {
            method: 'POST', headers, body: JSON.stringify(carrinhoBody)
        });
        const carrinho = await carrinhoRes.json();

        if (!carrinhoRes.ok || !carrinho.id) {
            console.error('Erro carrinho ME:', carrinho);
            return res.status(500).json({ error: 'Erro ao adicionar ao carrinho', detalhes: carrinho });
        }

        const itemId = carrinho.id;

        // 2. Checkout (compra usando saldo da carteira)
        const checkoutRes = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/checkout', {
            method: 'POST', headers,
            body: JSON.stringify({ orders: [itemId] })
        });
        const checkout = await checkoutRes.json();

        if (!checkoutRes.ok) {
            console.error('Erro checkout ME:', checkout);
            return res.status(500).json({ error: 'Erro no checkout. Verifique seu saldo no Melhor Envio.', detalhes: checkout });
        }

        // 3. Gera etiqueta
        const gerarRes = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/generate', {
            method: 'POST', headers,
            body: JSON.stringify({ orders: [itemId] })
        });
        const gerar = await gerarRes.json();

        if (!gerarRes.ok) {
            console.error('Erro gerar ME:', gerar);
            return res.status(500).json({ error: 'Erro ao gerar etiqueta', detalhes: gerar });
        }

        // 4. Pega link de impressão
        const printRes = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/print', {
            method: 'POST', headers,
            body: JSON.stringify({ mode: 'private', orders: [itemId] })
        });
        const print = await printRes.json();

        const linkImpressao = (print && print.url) ? print.url : null;
        const rastreio = carrinho.tracking ? carrinho.tracking : null;

        return res.status(200).json({
            success: true,
            itemId,
            rastreio,
            linkImpressao
        });

    } catch (error) {
        console.error('Erro interno:', error);
        return res.status(500).json({ error: 'Erro interno', detalhes: error.message });
    }
}
