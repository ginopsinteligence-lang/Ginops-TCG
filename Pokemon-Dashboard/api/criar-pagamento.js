// api/criar-pagamento.js
// Vercel Function — cria preferência de pagamento no Mercado Pago
// Variável de ambiente necessária: MP_ACCESS_TOKEN

export default async function handler(req, res) {
    // Só aceita POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método não permitido' });
    }

    // CORS para o domínio da Ginops
    res.setHeader('Access-Control-Allow-Origin', 'https://www.ginopstcg.com.br');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const {
            pedidoId,
            nomeCliente,
            emailCliente,
            descricaoFrete,   // ex: "Frete - Caixa Média (PAC)"
            valorFrete,       // em reais, número
            caixaTipo,        // "pequena" | "media" | "grande"
            itensDeclarados,  // array de strings
            enderecoEntrega   // objeto com cep, rua, numero, etc
        } = req.body;

        if (!pedidoId || !valorFrete || !emailCliente) {
            return res.status(400).json({ error: 'Dados obrigatórios ausentes' });
        }

        const ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;
        if (!ACCESS_TOKEN) {
            return res.status(500).json({ error: 'Token MP não configurado' });
        }

        // Monta preferência de pagamento
        const preferencia = {
            external_reference: pedidoId,
            items: [
                {
                    id: pedidoId,
                    title: descricaoFrete || 'Frete Ginops TCG',
                    description: `Envio: ${itensDeclarados?.join(', ') || ''}`,
                    quantity: 1,
                    unit_price: Number(valorFrete),
                    currency_id: 'BRL'
                }
            ],
            payer: {
                name: nomeCliente || '',
                email: emailCliente
            },
            back_urls: {
                success: `https://www.ginopstcg.com.br/envio-sucesso.html?pedido=${pedidoId}`,
                failure: `https://www.ginopstcg.com.br/envio.html?erro=pagamento`,
                pending: `https://www.ginopstcg.com.br/envio-pendente.html?pedido=${pedidoId}`
            },
            auto_return: 'approved',
            notification_url: `https://www.ginopstcg.com.br/api/webhook-pagamento`,
            metadata: {
                pedido_id: pedidoId,
                caixa_tipo: caixaTipo,
                itens_declarados: itensDeclarados,
                endereco_entrega: enderecoEntrega
            },
            statement_descriptor: 'GINOPS TCG',
            expires: false
        };

        // Cria preferência na API do Mercado Pago
        const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${ACCESS_TOKEN}`
            },
            body: JSON.stringify(preferencia)
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('Erro MP:', data);
            return res.status(response.status).json({ error: 'Erro ao criar pagamento', detalhes: data });
        }

        // Retorna ID e URL de pagamento para o frontend
        return res.status(200).json({
            preferenceId: data.id,
            initPoint: data.init_point,          // URL produção
            sandboxInitPoint: data.sandbox_init_point  // URL sandbox (testes)
        });

    } catch (error) {
        console.error('Erro interno:', error);
        return res.status(500).json({ error: 'Erro interno do servidor' });
    }
}
