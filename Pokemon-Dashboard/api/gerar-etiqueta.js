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

    const {
        pedidoId, freteId,
        nomeDestinatario, cpfDestinatario,
        cepDestino, enderecoDestino,
        caixaTipo, itensDeclarados, valorPago
    } = req.body;

    if (!pedidoId || !cepDestino) {
        return res.status(400).json({ error: 'Dados obrigatórios ausentes', recebido: req.body });
    }

    const caixas = {
        pequena: { altura: 4,  largura: 16, comprimento: 20, peso: 0.3 },
        media:   { altura: 10, largura: 20, comprimento: 20, peso: 1.0 },
        grande:  { altura: 15, largura: 50, comprimento: 36, peso: 3.0 }
    };
    const caixa = caixas[caixaTipo] || caixas.pequena;

    // freteId precisa ser número inteiro
    const serviceId = parseInt(freteId) || 1; // 1 = PAC, 2 = SEDEX

    const headers = {
        'Accept':        'application/json',
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${ME_TOKEN}`,
        'User-Agent':    'GinopsTCG (contato@ginopstcg.com.br)'
    };

    const end = enderecoDestino || {};
    const cpfLimpo = (cpfDestinatario || '').replace(/\D/g, '') || '00000000000';
    const cepLimpo = (cepDestino || '').replace(/\D/g, '');

    try {
        // 1. Adiciona ao carrinho ME
        const carrinhoBody = {
            service: serviceId,
            agency:  null,
            from: {
                name:        'Ginops TCG',
                phone:       '42999999999',
                email:       'contato@ginopstcg.com.br',
                document:    '00000000000',
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
                document:    cpfLimpo,
                address:     end.rua     || end.logradouro || 'Endereço não informado',
                number:      end.numero  || 'S/N',
                complement:  end.complemento || '',
                district:    end.bairro  || '',
                city:        end.cidade  || '',
                state_abbr:  end.estado  || '',
                postal_code: cepLimpo,
                country_id:  'BR'
            },
            products: [{
                name:          (itensDeclarados && itensDeclarados.length > 0)
                                 ? itensDeclarados.join(', ').substring(0, 100)
                                 : 'Cards TCG',
                quantity:      1,
                unitary_value: parseFloat(valorPago) || 10
            }],
            volumes: [{
                height: caixa.altura,
                width:  caixa.largura,
                length: caixa.comprimento,
                weight: caixa.peso
            }],
            options: {
                insurance_value: parseFloat(valorPago) || 10,
                receipt:         false,
                own_hand:        false,
                collect:         false,
                reverse:         false,
                non_commercial:  true,
                invoice:         { key: '' },
                platform:        'GinopsTCG',
                tags:            [{ tag: String(pedidoId), url: null }]
            }
        };

        console.log('Adicionando ao carrinho ME:', JSON.stringify(carrinhoBody, null, 2));

        const carrinhoRes = await fetch('https://melhorenvio.com.br/api/v2/me/cart', {
            method: 'POST', headers,
            body: JSON.stringify(carrinhoBody)
        });

        const carrinhoText = await carrinhoRes.text();
        let carrinho;
        try { carrinho = JSON.parse(carrinhoText); }
        catch(e) { carrinho = { raw: carrinhoText }; }

        console.log('Resposta carrinho ME (status', carrinhoRes.status, '):', JSON.stringify(carrinho));

        if (!carrinhoRes.ok || !carrinho.id) {
            return res.status(500).json({
                error: 'Erro ao adicionar ao carrinho ME',
                status: carrinhoRes.status,
                detalhes: carrinho
            });
        }

        const itemId = carrinho.id;

        // 2. Checkout (débita da carteira)
        console.log('Fazendo checkout do item:', itemId);

        const checkoutRes = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/checkout', {
            method: 'POST', headers,
            body: JSON.stringify({ orders: [itemId] })
        });

        const checkoutText = await checkoutRes.text();
        let checkout;
        try { checkout = JSON.parse(checkoutText); }
        catch(e) { checkout = { raw: checkoutText }; }

        console.log('Resposta checkout ME (status', checkoutRes.status, '):', JSON.stringify(checkout));

        if (!checkoutRes.ok) {
            return res.status(500).json({
                error: 'Erro no checkout. Verifique saldo no Melhor Envio.',
                status: checkoutRes.status,
                detalhes: checkout
            });
        }

        // 3. Gera etiqueta
        console.log('Gerando etiqueta:', itemId);

        const gerarRes = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/generate', {
            method: 'POST', headers,
            body: JSON.stringify({ orders: [itemId] })
        });

        const gerarText = await gerarRes.text();
        let gerar;
        try { gerar = JSON.parse(gerarText); }
        catch(e) { gerar = { raw: gerarText }; }

        console.log('Resposta gerar ME (status', gerarRes.status, '):', JSON.stringify(gerar));

        if (!gerarRes.ok) {
            return res.status(500).json({
                error: 'Erro ao gerar etiqueta',
                status: gerarRes.status,
                detalhes: gerar
            });
        }

        // 4. Link de impressão
        const printRes = await fetch('https://melhorenvio.com.br/api/v2/me/shipment/print', {
            method: 'POST', headers,
            body: JSON.stringify({ mode: 'private', orders: [itemId] })
        });

        const printText = await printRes.text();
        let print;
        try { print = JSON.parse(printText); }
        catch(e) { print = { raw: printText }; }

        console.log('Resposta print ME (status', printRes.status, '):', JSON.stringify(print));

        const linkImpressao = (print && print.url) ? print.url : null;

        // Rastreio: pode estar no carrinho ou no gerar
        const rastreio = carrinho.tracking
            || (gerar[itemId] && gerar[itemId].tracking)
            || null;

        return res.status(200).json({
            success: true,
            itemId,
            rastreio,
            linkImpressao
        });

    } catch (error) {
        console.error('Erro interno gerar-etiqueta:', error);
        return res.status(500).json({ error: 'Erro interno', detalhes: error.message });
    }
}
