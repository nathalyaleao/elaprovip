const express = require('express');
const router = express.Router();
const axios = require('axios');

const ASAAS_API_KEY = process.env.ASAAS_API_KEY;
const ASAAS_BASE_URL = process.env.ASAAS_ENV === 'production'
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';

const asaasApi = axios.create({
    baseURL: ASAAS_BASE_URL,
    headers: {
        'access_token': ASAAS_API_KEY,
        'Content-Type': 'application/json'
    }
});

/**
 * Utility to create or find customer
 */
async function getOrCreateCustomer(data) {
    try {
        // Check if customer exists by email/cpf
        const search = await asaasApi.get(`/customers?email=${data.email}`);
        if (search.data.totalCount > 0) {
            return search.data.data[0].id;
        }

        // Create new customer
        const response = await asaasApi.post('/customers', {
            name: data.nome,
            email: data.email,
            cpfCnpj: data.cpf.replace(/\D/g, ''),
            mobilePhone: data.telefone.replace(/\D/g, '')
        });
        return response.data.id;
    } catch (error) {
        console.error('Error in getOrCreateCustomer:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * POST /api/checkout/cartao
 */
router.post('/checkout/cartao', async (req, res) => {
    const { nome, email, cpf, telefone, numeroCartao, mesValidade, anoValidade, cvv, nomeCartao } = req.body;

    try {
        const customerId = await getOrCreateCustomer({ nome, email, cpf, telefone });

        const subscriptionResponse = await asaasApi.post('/subscriptions', {
            customer: customerId,
            billingType: 'CREDIT_CARD',
            value: 22.90,
            nextDueDate: new Date().toISOString().split('T')[0],
            cycle: 'MONTHLY',
            description: 'ElaPro VIP',
            creditCard: {
                holderName: nomeCartao,
                number: numeroCartao.replace(/\D/g, ''),
                expiryMonth: mesValidade,
                expiryYear: anoValidade,
                ccv: cvv
            },
            creditCardHolderInfo: {
                name: nome,
                email: email,
                cpfCnpj: cpf.replace(/\D/g, ''),
                postalCode: '01001000', // Default or asked if needed
                addressNumber: '1',
                mobilePhone: telefone.replace(/\D/g, ''),
                remoteIp: req.ip
            }
        });

        res.json({ success: true, id: subscriptionResponse.data.id });
    } catch (error) {
        if (error.response) {
            console.error('--- ASAAS API REJECTED ---');
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
            console.log('--------------------------');
        } else {
            console.error('Network/Internal Error:', error.message);
        }

        res.status(400).json({
            success: false,
            error: error.response?.data?.errors?.[0]?.description || 'Erro ao processar o cartão. Verifique os dados e tente novamente.'
        });
    }
});

/**
 * POST /api/checkout/pix
 */
router.post('/checkout/pix', async (req, res) => {
    const { nome, email, cpf, telefone } = req.body;

    try {
        const customerId = await getOrCreateCustomer({ nome, email, cpf, telefone });

        // Create subscription
        const subscriptionResponse = await asaasApi.post('/subscriptions', {
            customer: customerId,
            billingType: 'PIX',
            value: 22.90,
            nextDueDate: new Date().toISOString().split('T')[0],
            cycle: 'MONTHLY',
            description: 'ElaPro VIP Vitalício'
        });

        const subscriptionId = subscriptionResponse.data.id;

        // Get the first payment for this subscription
        const paymentsResponse = await asaasApi.get(`/payments?subscription=${subscriptionId}`);
        if (paymentsResponse.data.totalCount === 0) {
            throw new Error('No payment found for subscription');
        }

        const firstPaymentId = paymentsResponse.data.data[0].id;

        // Get Pix QR Code for the first payment
        const pixResponse = await asaasApi.get(`/payments/${firstPaymentId}/pixQrCode`);

        res.json({
            success: true,
            qrCode: pixResponse.data.encodedImage,
            qrCodeText: pixResponse.data.payload,
            value: 22.90,
            expiresAt: paymentsResponse.data.data[0].dueDate,
            paymentId: firstPaymentId // Added for polling
        });
    } catch (error) {
        console.error('Checkout Pix Error:', error.response?.data || error.message);
        res.status(400).json({
            success: false,
            error: error.response?.data?.errors?.[0]?.description || 'Erro ao gerar Pix. Tente novamente.'
        });
    }
});

/**
 * GET /api/checkout/pix/status/:paymentId
 */
router.get('/checkout/pix/status/:paymentId', async (req, res) => {
    const { paymentId } = req.params;

    try {
        const response = await asaasApi.get(`/payments/${paymentId}`);
        res.json({ status: response.data.status });
    } catch (error) {
        console.error('Pix Status Polling Error:', error.response?.data || error.message);
        res.status(404).json({ success: false, error: 'Cobrança não encontrada.' });
    }
});

/**
 * POST /api/webhook
 */
router.post('/webhook', (req, res) => {
    const event = req.body;
    console.log('--- ASAAS WEBHOOK EVENT ---');
    console.log(JSON.stringify(event, null, 2));
    console.log('---------------------------');

    const { event: eventType, payment, subscription } = event;

    /* 
      INTEGRAÇÃO COM BANCO DE DADOS:
      
      1. PAYMENT_CONFIRMED ou PAYMENT_RECEIVED:
         - Buscar usuária pelo email ou externalReference no sistema.
         - Marcar status como "ativo" e plano como "VIP Vitalício".
         - Enviar e-mail de boas-vindas com acesso.
  
      2. SUBSCRIPTION_CREATED:
         - Registrar a nova assinatura no banco de dados vinculada à usuária.
  
      3. PAYMENT_OVERDUE:
         - Se for o pagamento inicial, não liberar acesso.
         - Se for uma mensalidade subsequente, suspender o acesso da usuária após carência.
    */

    res.status(200).send('OK');
});

module.exports = router;
