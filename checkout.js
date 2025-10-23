// ==================== CONFIGURAÇÕES ====================
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VARIÁVEIS GLOBAIS ====================
let selectedPlan = {};
let selectedPayment = 'pix';
let pixTimer = 30 * 60;
let timerInterval;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    loadPlanFromURL();
    checkAuth();
    setupCardInputs();
});

// ==================== FUNÇÕES PRINCIPAIS ====================
function loadPlanFromURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const planType = urlParams.get('plano');
    
    const plans = {
        'weekly': { name: 'Semanal', price: 8.90, period: 'por semana' },
        'monthly': { name: 'Mensal', price: 24.90, period: 'por mês' },
        'semestral': { name: 'Semestral', price: 104.90, period: 'por 6 meses' },
        'annual': { name: 'Anual', price: 179.90, period: 'por ano' }
    };

    selectedPlan = plans[planType] || plans['monthly'];
    
    document.getElementById('planName').textContent = `Plano ${selectedPlan.name}`;
    document.getElementById('planPrice').textContent = `R$ ${selectedPlan.price.toFixed(2).replace('.', ',')}`;
    document.getElementById('planPeriod').textContent = selectedPlan.period;
}

function selectPayment(method) {
    selectedPayment = method;
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.currentTarget.classList.add('selected');
}

function showPaymentSimulation() {
    const continueBtn = document.getElementById('continueButton');
    const pixSimulation = document.getElementById('pixSimulation');
    const cardSimulation = document.getElementById('cardSimulation');
    
    continueBtn.style.display = 'none';
    
    if (selectedPayment === 'pix') {
        pixSimulation.style.display = 'block';
        startPixTimer();
    } else {
        cardSimulation.style.display = 'block';
    }
}

// ==================== PIX SIMULATION ====================
function startPixTimer() {
    pixTimer = 30 * 60;
    
    timerInterval = setInterval(() => {
        pixTimer--;
        const minutes = Math.floor(pixTimer / 60);
        const seconds = pixTimer % 60;
        
        document.getElementById('pixTimer').textContent =
            `⏳ Tempo restante: ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        if (pixTimer <= 0) {
            clearInterval(timerInterval);
            alert('Tempo esgotado! Por favor, gere um novo código PIX.');
        }
    }, 1000);
}

function copyPixCode() {
    const pixCode = document.getElementById('pixCode').textContent;
    navigator.clipboard.writeText(pixCode).then(() => {
        alert('Código PIX copiado! Cole no seu app de banco.');
    });
}

async function simulatePixPayment() {
    clearInterval(timerInterval);
    document.getElementById('loading').style.display = 'block';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const subscription = await createSubscriptionInBothTables(user.id, getPlanType());
        
        setTimeout(() => {
            window.location.href = `pagamento-sucesso.html?plano=${getPlanType()}&valor=${selectedPlan.price}&metodo=pix&subscription_id=${subscription.id}`;
        }, 2000);
        
    } catch (error) {
        alert('Erro ao processar PIX: ' + error.message);
        document.getElementById('loading').style.display = 'none';
    }
}

// ==================== CARD SIMULATION ====================
function setupCardInputs() {
    document.getElementById('cardNumber').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
        e.target.value = value.substring(0, 19);
    });

    document.getElementById('cardExpiry').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length >= 2) {
            value = value.substring(0, 2) + '/' + value.substring(2, 4);
        }
        e.target.value = value.substring(0, 5);
    });

    document.getElementById('cardCvv').addEventListener('input', function(e) {
        e.target.value = e.target.value.replace(/\D/g, '').substring(0, 3);
    });

    document.getElementById('cardCpf').addEventListener('input', function(e) {
        let value = e.target.value.replace(/\D/g, '');
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2')
                        .replace(/(\d{3})(\d)/, '$1.$2')
                        .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        e.target.value = value.substring(0, 14);
    });
}

async function processCardPayment() {
    const cardNumber = document.getElementById('cardNumber').value.replace(/\D/g, '');
    const cardExpiry = document.getElementById('cardExpiry').value;
    const cardCvv = document.getElementById('cardCvv').value;
    const cardName = document.getElementById('cardName').value;
    const cardCpf = document.getElementById('cardCpf').value.replace(/\D/g, '');

    if (!cardNumber || !cardExpiry || !cardCvv || !cardName || !cardCpf) {
        alert('Por favor, preencha todos os campos do cartão.');
        return;
    }

    document.getElementById('loading').style.display = 'block';

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Usuário não autenticado');

        const subscription = await createSubscriptionInBothTables(user.id, getPlanType());
        
        setTimeout(() => {
            window.location.href = `pagamento-sucesso.html?plano=${getPlanType()}&valor=${selectedPlan.price}&metodo=cartao&subscription_id=${subscription.id}`;
        }, 2000);
        
    } catch (error) {
        alert('Erro ao processar pagamento: ' + error.message);
        document.getElementById('loading').style.display = 'none';
    }
}

// ==================== FUNÇÕES DE BANCO DE DADOS ====================
async function createSubscriptionInBothTables(userId, planType) {
    try {
        const { data: realPlan } = await supabase
            .from('subscription_plans')
            .select('id, period_days, price')
            .eq('name', planType)
            .single();

        if (!realPlan) {
            throw new Error('Plano não encontrado: ' + planType);
        }

        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + realPlan.period_days);

        // ✅ CORREÇÃO: Removido o onConflict que causava o erro
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .upsert({
                user_id: userId,
                plan_id: realPlan.id,
                status: 'active',
                starts_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
                auto_renew: false,
                payment_method: selectedPayment,
                payment_gateway: 'mercadopago'
            })
            .select()
            .single();

        if (subError) {
            throw subError;
        }

        await supabase
            .from('profiles')
            .update({
                is_premium: true,
                premium_expires_at: expiresAt.toISOString(),
                current_plan_id: realPlan.id
            })
            .eq('id', userId);

        await supabase
            .from('payment_transactions')
            .insert({
                user_id: userId,
                plan_id: realPlan.id,
                subscription_id: subscription.id,
                amount: realPlan.price,
                payment_method: selectedPayment,
                payment_gateway: 'mercadopago',
                gateway_transaction_id: 'mp_' + Date.now(),
                gateway_status: 'approved',
                status: 'completed'
            });

        return subscription;

    } catch (error) {
        throw error;
    }
}

// ==================== FUNÇÕES AUXILIARES ====================
async function checkAuth() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            window.location.href = 'login.html';
            return;
        }
    } catch (error) {
        window.location.href = 'login.html';
    }
}

function getPlanType() {
    for (const [key, value] of Object.entries({
        'weekly': { name: 'Semanal', price: 8.90 },
        'monthly': { name: 'Mensal', price: 24.90 },
        'semestral': { name: 'Semestral', price: 104.90 },
        'annual': { name: 'Anual', price: 179.90 }
    })) {
        if (value.price === selectedPlan.price) return key;
    }
    return 'monthly';
}