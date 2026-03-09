# ElaPro Checkout Transparente 🎀

Sistema de checkout transparente integrado ao Asaas para a oferta VIP vitalícia do ElaPro.

## 🚀 Como rodar localmente

1. **Instalar dependências:**
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente:**
   - Copie o arquivo `.env.example` para `.env`:
     ```bash
     cp .env.example .env
     ```
   - No `.env`, insira sua `ASAAS_API_KEY`.

3. **Iniciar o servidor:**
   ```bash
   npm start
   ```
   Acesse: `http://localhost:3000`

---

## 🔑 Configurando o Asaas (Sandbox)

1. Crie uma conta em [sandbox.asaas.com](https://sandbox.asaas.com).
2. Vá em **Minha Conta > Integração**.
3. Gere e copie sua **API Key**.
4. Cole no `.env` em `ASAAS_API_KEY`.
5. Certifique-se de que `ASAAS_ENV=sandbox` no .env.

---

## 💳 Testando Pagamentos (Cartões de Teste)

No ambiente Sandbox, utilize estes números para simular transações:

| Bandeira | Número | Nome |
| :--- | :--- | :--- |
| **Visa** | `4000 0000 0000 0001` | QUALQUER NOME |
| **Mastercard** | `5100 0000 0000 0001` | QUALQUER NOME |
| **Elo** | `4011 7800 0000 0001` | QUALQUER NOME |

*Validade: Qualquer data futura (ex: 12/28). CVV: 123.*

---

## 🔗 Configurando Webhooks

Para liberar o acesso automaticamente após o pagamento:

1. Acesse o painel do Asaas Sandbox.
2. Vá em **Minha Conta > Integração > Webhooks**.
3. Ative o Webhook e configure a URL:
   - `https://seu-dominio.com/api/webhook`
4. Selecione os eventos:
   - `PAYMENT_CONFIRMED`
   - `PAYMENT_RECEIVED`
   - `SUBSCRIPTION_CREATED`
   - `PAYMENT_OVERDUE`
5. O código no `routes/asaas.js` já está preparado para receber e logar esses eventos.

---

## 🌍 Indo para Produção

Ao finalizar os testes e querer vender real:

1. Pegue sua API Key no painel oficial ([asaas.com](https://asaas.com)).
2. Altere no `.env`:
   - `ASAAS_API_KEY=sua_chave_real`
   - `ASAAS_ENV=production`
3. Reinicie o servidor.

---

## 🛠️ Modificando o Acesso (DB)

No arquivo `routes/asaas.js`, procure pelo bloco do **WebHook**. Lá deixei comentários detalhados de onde você deve inserir sua lógica de banco de dados (ex: Prisma, Mongoose, Sequelize) para ativar ou desativar o acesso da usuária com base nos eventos recebidos.
