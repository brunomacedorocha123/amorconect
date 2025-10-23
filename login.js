//// Configuração do Supabase - CHAVE ATUALIZADA E CORRIGIDA
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Funções de UI
function showAlert(alertElement, message, isError = true) {
    alertElement.textContent = message;
    alertElement.style.display = 'block';
    
    if (!isError) {
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }
}

function hideAlerts() {
    document.getElementById('errorAlert').style.display = 'none';
    document.getElementById('successAlert').style.display = 'none';
}

function clearErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.textContent = '';
        el.style.display = 'none';
    });
    document.querySelectorAll('.form-control').forEach(el => {
        el.classList.remove('error');
    });
}

// Validações em Tempo Real
function validateEmail() {
    const field = document.getElementById('email');
    const errorElement = document.getElementById('emailError');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    if (!emailRegex.test(field.value.trim())) {
        errorElement.textContent = 'Por favor, insira um e-mail válido';
        errorElement.style.display = 'block';
        field.classList.add('error');
    } else {
        errorElement.style.display = 'none';
        field.classList.remove('error');
    }
}

function validatePassword() {
    const field = document.getElementById('password');
    const errorElement = document.getElementById('passwordError');
    
    if (field.value.length === 0) {
        errorElement.textContent = 'A senha é obrigatória';
        errorElement.style.display = 'block';
        field.classList.add('error');
    } else {
        errorElement.style.display = 'none';
        field.classList.remove('error');
    }
}

// Verificar se email está banido
async function verificarEmailBanido(email) {
    try {
        const { data, error } = await supabase.rpc('is_email_banned', {
            email_to_check: email
        });
        
        if (error) {
            return false;
        }
        
        return data;
    } catch (erro) {
        return false;
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('loginForm');
    const loading = document.getElementById('loading');
    const errorAlert = document.getElementById('errorAlert');
    const successAlert = document.getElementById('successAlert');

    // Verificar se usuário já está logado
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            window.location.href = 'home.html';
        }
    });

    // Submit do Formulário
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        hideAlerts();
        clearErrors();

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        loading.style.display = 'block';
        
        try {
            // Coletar dados do formulário
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe').checked;

            // Validações
            let hasError = false;

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                document.getElementById('emailError').textContent = 'Por favor, insira um e-mail válido';
                document.getElementById('emailError').style.display = 'block';
                document.getElementById('email').classList.add('error');
                hasError = true;
            }

            if (!password) {
                document.getElementById('passwordError').textContent = 'A senha é obrigatória';
                document.getElementById('passwordError').style.display = 'block';
                document.getElementById('password').classList.add('error');
                hasError = true;
            }

            if (hasError) {
                throw new Error('Por favor, corrija os erros no formulário');
            }

            // Verificar se email está banido
            const estaBanido = await verificarEmailBanido(email);
            if (estaBanido) {
                throw new Error('Este e-mail foi permanentemente banido do Amor Conect');
            }

            // Fazer login
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (authError) throw authError;

            // Sucesso - Redirecionar para home
            showAlert(successAlert, 'Login realizado com sucesso! Redirecionando...', false);
            
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1000);

        } catch (error) {
            let errorMessage = 'Erro ao fazer login. Tente novamente.';
            
            if (error.message.includes('Invalid login credentials')) {
                errorMessage = 'E-mail ou senha incorretos. Verifique suas credenciais.';
            } else if (error.message.includes('Email not confirmed')) {
                errorMessage = 'E-mail não confirmado. Verifique sua caixa de entrada.';
            } else if (error.message.includes('banido')) {
                errorMessage = error.message;
            } else if (error.message.includes('corrija os erros')) {
                errorMessage = error.message;
            }
            
            showAlert(errorAlert, errorMessage);
            submitBtn.disabled = false;
            loading.style.display = 'none';
        }
    });

    // Validações em tempo real
    document.getElementById('email').addEventListener('blur', validateEmail);
    document.getElementById('password').addEventListener('blur', validatePassword);

    // Permitir Enter para submit
    document.getElementById('password').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            form.dispatchEvent(new Event('submit'));
        }
    });
});