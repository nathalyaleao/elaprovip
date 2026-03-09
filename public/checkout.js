document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('checkout-form');
    const submitBtn = document.getElementById('submit-btn');
    const successMsg = document.getElementById('success-message');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    let activeTab = 'cartao';

    // --- MASK IMPLEMENTATION ---
    const masks = {
        cpf: (value) => value.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').replace(/(-\d{2})\d+?$/, '$1'),
        phone: (value) => value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').substring(0, 15),
        cardNumber: (value) => value.replace(/\D/g, '').substring(0, 16).replace(/(\d{4})/g, '$1 ').trim(),
        expiry: (value) => value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').substring(0, 5),
        cvv: (value) => value.replace(/\D/g, '').substring(0, 4)
    };

    const applyMask = (id, maskFn) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', (e) => {
            e.target.value = maskFn(e.target.value);
        });
    };

    applyMask('cpf', masks.cpf);
    applyMask('telefone', masks.phone);
    applyMask('numeroCartao', masks.cardNumber);
    applyMask('validade', masks.expiry);
    applyMask('cvv', masks.cvv);

    // --- TAB SWITCHING ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.getAttribute('data-tab');
            activeTab = tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(content => {
                content.classList.remove('active');
                if (content.id === `tab-${tab}`) content.classList.add('active');
            });

            // Update button text based on tab
            const btnText = submitBtn.querySelector('.btn-text');
            if (tab === 'pix') {
                btnText.textContent = '💚 Gerar QR Code Pix';
            } else {
                btnText.textContent = '💗 Garantir meu desconto vitalício';
            }
        });
    });

    // --- FORM SUBMISSION ---
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Reset states
        submitBtn.classList.remove('btn-error', 'btn-success');
        submitBtn.classList.add('loading');
        submitBtn.disabled = true;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Basic validation
        if (!data.nome || !data.email || !data.cpf || !data.telefone) {
            showError('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        try {
            let endpoint = '/api/checkout/cartao';
            let payload = { ...data };

            if (activeTab === 'pix') {
                endpoint = '/api/checkout/pix';
            } else {
                const [mes, ano] = data.validade ? data.validade.split('/') : ['', ''];
                payload.mesValidade = mes;
                payload.anoValidade = `20${ano}`;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                handleSuccess(result);
            } else {
                showError(result.error || 'Ocorreu um erro no processamento.');
            }
        } catch (error) {
            console.error('Submission error:', error);
            showError('Erro de conexão com o servidor. Tente novamente.');
        }
    });

    const handleSuccess = (result) => {
        submitBtn.classList.remove('loading');
        submitBtn.classList.add('btn-success');

        if (activeTab === 'cartao') {
            form.style.display = 'none';
            successMsg.style.display = 'block';
        } else {
            // Show Pix result
            document.getElementById('pix-result').style.display = 'block';
            document.getElementById('qr-code-img').src = `data:image/png;base64,${result.qrCode}`;
            document.getElementById('pix-code').value = result.qrCodeText;

            // Disable submit button as it was already generated
            submitBtn.style.display = 'none';

            startCountdown(15 * 60); // 15 minutes
            startPixPolling(result.paymentId);
        }
    };

    const showError = (msg) => {
        submitBtn.classList.remove('loading');
        submitBtn.classList.add('btn-error');
        submitBtn.disabled = false;

        const originalText = submitBtn.querySelector('.btn-text').textContent;
        submitBtn.querySelector('.btn-text').textContent = msg;

        setTimeout(() => {
            submitBtn.classList.remove('btn-error');
            submitBtn.querySelector('.btn-text').textContent = originalText;
        }, 4000);
    };

    let pixPollingInterval;

    const startPixPolling = (paymentId) => {
        pixPollingInterval = setInterval(async () => {
            try {
                const response = await fetch(`/api/checkout/pix/status/${paymentId}`);
                const data = await response.json();

                if (data.status === 'CONFIRMED' || data.status === 'RECEIVED') {
                    clearInterval(pixPollingInterval);
                    handlePixConfirmed();
                } else if (data.status === 'OVERDUE') {
                    clearInterval(pixPollingInterval);
                    handlePixExpired();
                }
            } catch (error) {
                console.error('Error polling Pix status:', error);
            }
        }, 5000);
    };

    const handlePixConfirmed = () => {
        document.getElementById('pix-result').style.display = 'none';
        form.style.display = 'none';
        successMsg.style.display = 'block';
        successMsg.querySelector('p').textContent = 'Seu pagamento Pix foi confirmado. Verifique seu e-mail para acessar o ElaPro.';
    };

    const handlePixExpired = () => {
        const pixResult = document.getElementById('pix-result');
        pixResult.innerHTML = `
            <p class="pix-error" style="color: #dc3545; font-weight: 700;">QR Code expirado.</p>
            <button type="button" onclick="window.location.reload()" class="main-button" style="margin-top: 10px;">Clique aqui para gerar um novo</button>
        `;
    };

    // --- PIX HELPERS ---
    const startCountdown = (duration) => {
        let timer = duration, minutes, seconds;
        const display = document.getElementById('pix-countdown');

        const interval = setInterval(() => {
            minutes = parseInt(timer / 60, 10);
            seconds = parseInt(timer % 60, 10);

            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;

            display.textContent = minutes + ":" + seconds;

            if (--timer < 0) {
                clearInterval(interval);
                if (pixPollingInterval) clearInterval(pixPollingInterval);
                display.textContent = "EXPIRADO";
                handlePixExpired();
            }
        }, 1000);
    };

    document.getElementById('copy-pix-btn').addEventListener('click', () => {
        const copyText = document.getElementById('pix-code');
        copyText.select();
        copyText.setSelectionRange(0, 99999);
        navigator.clipboard.writeText(copyText.value);

        const originalText = document.getElementById('copy-pix-btn').textContent;
        document.getElementById('copy-pix-btn').textContent = 'Copiado!';
        setTimeout(() => {
            document.getElementById('copy-pix-btn').textContent = originalText;
        }, 2000);
    });

});
