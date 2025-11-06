const express = require('express');
const cors = require('cors');
const mercadopago = require('mercadopago');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Configurar Mercado Pago
mercadopago.configure({
  access_token: process.env.MP_ACCESS_TOKEN || 'APP_USR-471fd318-f4d1-431b-be71-d218096e41d5'
});

// Rota para criar pagamento PIX
app.post('/api/create-pix-payment', async (req, res) => {
  try {
    const { name, phone, email, referralCode } = req.body;
    
    console.log('📝 Criando pagamento PIX para:', { name, email, phone });
    
    const paymentData = {
      transaction_amount: 19.90,
      description: 'Assinatura Programa de Afiliados - Catálogo',
      payment_method_id: 'pix',
      external_reference: `affiliate_${Date.now()}`,
      payer: {
        first_name: name.split(' ')[0],
        last_name: name.split(' ').slice(1).join(' ') || 'Silva',
        email: email,
        phone: {
          area_code: phone.replace(/\D/g, '').substring(0, 2),
          number: phone.replace(/\D/g, '').substring(2)
        },
        identification: {
          type: 'CPF',
          number: '11111111111'
        },
        address: {
          zip_code: '01310-100',
          street_name: 'Av Paulista',
          street_number: 1000,
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          federal_unit: 'SP'
        }
      },
      metadata: {
        affiliate_name: name,
        affiliate_phone: phone,
        affiliate_email: email,
        referral_code: referralCode || '',
        created_at: new Date().toISOString()
      }
    };

    const payment = await mercadopago.payment.create(paymentData);
    
    console.log('✅ Pagamento criado:', payment.body.id);
    
    const response = {
      success: true,
      payment_id: payment.body.id,
      external_reference: payment.body.external_reference,
      qr_code: payment.body.point_of_interaction.transaction_data.qr_code,
      qr_code_base64: payment.body.point_of_interaction.transaction_data.qr_code_base64,
      ticket_url: payment.body.point_of_interaction.transaction_data.ticket_url,
      status: payment.body.status,
      created_date: payment.body.date_created
    };
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Erro ao criar pagamento:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

// Rota para verificar status do pagamento
app.get('/api/check-payment/:paymentId', async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    console.log('🔍 Verificando pagamento:', paymentId);
    
    const payment = await mercadopago.payment.findById(paymentId);
    
    const response = {
      success: true,
      payment_id: payment.body.id,
      status: payment.body.status,
      status_detail: payment.body.status_detail,
      external_reference: payment.body.external_reference,
      transaction_amount: payment.body.transaction_amount,
      date_created: payment.body.date_created,
      date_approved: payment.body.date_approved,
      metadata: payment.body.metadata
    };
    
    console.log('📊 Status do pagamento:', payment.body.status);
    
    res.json(response);
    
  } catch (error) {
    console.error('❌ Erro ao verificar pagamento:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao verificar pagamento',
      details: error.message
    });
  }
});

// Webhook para receber notificações do Mercado Pago
app.post('/webhook', async (req, res) => {
  try {
    console.log('🔔 Webhook recebido:', req.body);
    
    const { type, data } = req.body;
    
    if (type === 'payment') {
      const paymentId = data.id;
      
      const payment = await mercadopago.payment.findById(paymentId);
      
      console.log('💰 Pagamento atualizado:', {
        id: payment.body.id,
        status: payment.body.status,
        external_reference: payment.body.external_reference
      });
      
      if (payment.body.status === 'approved') {
        console.log('✅ Pagamento aprovado! Ativando afiliado...');
        
        const metadata = payment.body.metadata;
        console.log('👤 Dados do afiliado:', metadata);
      }
    }
    
    res.status(200).send('OK');
    
  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    res.status(500).send('Erro interno');
  }
});

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API funcionando!',
    timestamp: new Date().toISOString(),
    mercadopago_configured: true
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔗 API disponível em: http://localhost:${PORT}`);
  console.log(`🧪 Teste: http://localhost:${PORT}/api/test`);
});
