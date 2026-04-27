// api/webhook-pagamento.js
// Vercel Function — recebe notificação do Mercado Pago e atualiza Firebase
// Variáveis de ambiente necessárias: MP_ACCESS_TOKEN, FIREBASE_PROJECT_ID, FIREBASE_API_KEY

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    try {
        const { type, data } = req.body;

        if (type !== 'payment') {
            return res.status(200).json({ status: 'ignorado', type });
        }

        const paymentId = data?.id;
        if (!paymentId) {
            return res.status(400).json({ error: 'ID de pagamento ausente' });
        }

        const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
        if (!ACCESS_TOKEN) {
            return res.status(500).json({ error: 'Token MP não configurado' });
        }

        // Busca detalhes do pagamento na API do MP
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}` }
        });

        const pagamento = await mpResponse.json();

        if (!mpResponse.ok) {
            console.error('Erro ao buscar pagamento:', pagamento);
            return res.status(500).json({ error: 'Erro ao consultar MP' });
        }

        const pedidoId       = pagamento.external_reference;
        const status         = pagamento.status;
        const statusDetalhe  = pagamento.status_detail;
        const valorPago      = pagamento.transaction_amount;
        const metodoPagamento= pagamento.payment_type_id;
        const dataPagamento  = pagamento.date_approved;

        if (!pedidoId) {
            return res.status(400).json({ error: 'external_reference ausente' });
        }

        const FIREBASE_PROJECT = process.env.FIREBASE_PROJECT_ID || 'ginops-tcg-7ea05';
        const FIREBASE_API_KEY  = process.env.FIREBASE_API_KEY   || 'AIzaSyAFYr9fV20jGpmTlSaYtlKVMxzz1Ksl4ME';

        // updateMask.fieldPaths garante que SÓ esses campos são alterados
        // O resto do documento (caixaTipo, enderecoEntrega, itens, etc.) fica intacto
        const camposAtualizar = [
            'status','statusPagamento','statusDetalhe',
            'valorPago','metodoPagamento','dataPagamento',
            'mpPaymentId','atualizadoEm'
        ];
        const maskQuery = camposAtualizar.map(f => `updateMask.fieldPaths=${f}`).join('&');

        const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT}/databases/(default)/documents/solicitacoesEnvio/${pedidoId}?key=${FIREBASE_API_KEY}&${maskQuery}`;

        const body = {
            fields: {
                status:          { stringValue: status === 'approved' ? 'Pendente' : status === 'pending' ? 'aguardando_pagamento' : 'Cancelado' },
                statusPagamento: { stringValue: status },
                statusDetalhe:   { stringValue: statusDetalhe || '' },
                valorPago:       { doubleValue: valorPago || 0 },
                metodoPagamento: { stringValue: metodoPagamento || '' },
                dataPagamento:   { stringValue: dataPagamento || '' },
                mpPaymentId:     { stringValue: String(paymentId) },
                atualizadoEm:    { stringValue: new Date().toISOString() }
            }
        };

        const firestoreResponse = await fetch(firestoreUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!firestoreResponse.ok) {
            const erro = await firestoreResponse.text();
            console.error('Erro Firestore:', erro);
        }

        console.log(`Pedido ${pedidoId} atualizado → status: ${status}`);
        return res.status(200).json({ status: 'processado', pedidoId, statusPagamento: status });

    } catch (error) {
        console.error('Erro interno webhook:', error);
        return res.status(200).json({ error: 'Erro interno', detalhes: error.message });
    }
}
