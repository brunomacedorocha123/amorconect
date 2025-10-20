// Configuração do Supabase - NOVAS CREDENCIAIS
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== FUNÇÕES DE UI ====================

function showAlert(alertElement, message, isError = true) {
    if (!alertElement) return;
    
    alertElement.textContent = message;
    alertElement.style.display = 'block';
    
    if (!isError) {
        setTimeout(() => {
            alertElement.style.display = 'none';
        }, 5000);
    }
}

function hideAlerts() {
    const errorAlert = document.getElementById('errorAlert');
    const verificationAlert = document.getElementById('verificationAlert');
    const successAlert = document.getElementById('successAlert');
    
    if (errorAlert) errorAlert.style.display = 'none';
    if (verificationAlert) verificationAlert.style.display = 'none';
    if (successAlert) successAlert.style.display = 'none';
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function hideError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// ==================== VALIDAÇÕES ====================

function validateEmail() {
    const field = document.getElementById('email');
    const errorElement = document.getElementById('emailError');
    if (!field || !errorElement) return true;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValid = emailRegex.test(field.value.trim());
    
    if (!isValid && field.value.trim() !== '') {
        showError('emailError', 'Por favor, insira um e-mail válido');
        field.classList.add('error');
        return false;
    } else {
        hideError('emailError');
        field.classList.remove('error');
        return true;
    }
}

function validatePassword() {
    const field = document.getElementById('password');
    const errorElement = document.getElementById('passwordError');
    if (!field || !errorElement) return true;
    
    const isValid = field.value.length >= 6;
    
    if (!isValid && field.value !== '') {
        showError('passwordError', 'A senha deve ter pelo menos 6 caracteres');
        field.classList.add('error');
        return false;
    } else {
        hideError('passwordError');
        field.classList.remove('error');
        return true;
    }
}

function validateForm() {
    const emailValid = validateEmail();
    const passwordValid = validatePassword();
    
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    
    if (!email) {
        showError('emailError', 'E-mail é obrigatório');
        document.getElementById('email').classList.add('error');
        return false;
    }
    
    if (!password) {
        showError('passwordError', 'Senha é obrigatória');
        document.getElementById('password').classList.add('error');
        return false;
    }
    
    return emailValid && passwordValid;
}

// ==================== VERIFICAÇÃO DE STATUS ====================

function checkVerificationStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const successAlert = document.getElementById('successAlert');
    
    if (urlParams.get('verified') === 'true') {
        showAlert(successAlert, '✅ E-mail verificado com sucesso! Faça login para continuar.', false);
        
        // Limpar parâmetro da URL
        window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    if (urlParams.get('recovered') === 'true') {
        showAlert(successAlert, '✅ Senha redefinida com sucesso! Faça login com sua nova senha.', false);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando PulseLove Login...');
    
    const form = document.getElementById('loginForm');
    const loading = document.getElementById('loading');
    const errorAlert = document.getElementById('errorAlert');
    const verificationAlert = document.getElementById('verificationAlert');
    const successAlert = document.getElementById('successAlert');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (!form) {
        console.error('❌ Formulário de login não encontrado!');
        return;
    }
    
    // Menu Mobile Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    
    if (menuToggle && nav) {
        menuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            nav.classList.toggle('active');
        });
    }
    
    // Verificar status de verificação
    checkVerificationStatus();
    
    // Verificar se já está logado
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            console.log('🔑 Usuário já logado, redirecionando...');
            window.location.href = 'home.html';
        }
    }).catch(error => {
        console.error('Erro ao verificar usuário:', error);
    });
    
    // Toggle password visibility
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? '👁️' : '🔒';
        });
    }
    
    // Validação em tempo real
    const emailField = document.getElementById('email');
    const passwordField = document.getElementById('password');
    
    if (emailField) emailField.addEventListener('blur', validateEmail);
    if (passwordField) passwordField.addEventListener('blur', validatePassword);
    
    // Lembrar dados de login
    const rememberMe = document.getElementById('rememberMe');
    const savedEmail = localStorage.getItem('rememberedEmail');
    
    if (savedEmail && emailField) {
        emailField.value = savedEmail;
        if (rememberMe) rememberMe.checked = true;
    }
    
    if (rememberMe) {
        rememberMe.addEventListener('change', function() {
            const email = emailField ? emailField.value : '';
            
            if (this.checked && email) {
                localStorage.setItem('rememberedEmail', email);
                console.log('💾 E-mail salvo:', email);
            } else {
                localStorage.removeItem('rememberedEmail');
                console.log('💾 E-mail removido do storage');
            }
        });
    }
    
    // SUBMIT DO FORMULÁRIO
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        hideAlerts();
        
        if (!validateForm()) {
            return;
        }
        
        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        if (loading) loading.style.display = 'block';
        
        try {
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;

            console.log('🔄 Tentando login para:', email);
            
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) {
                console.error('❌ Erro no login:', error);
                throw error;
            }

            console.log('✅ Login bem-sucedido:', data.user);

            if (data.user) {
                // Verificar se o e-mail foi confirmado
                if (!data.user.email_confirmed_at) {
                    showAlert(verificationAlert, '📧 Verifique seu e-mail para ativar sua conta. Não recebeu? <a href="#" id="resendVerification">Reenviar verificação</a>');
                    
                    // Adicionar evento para reenviar verificação
                    const resendLink = document.getElementById('resendVerification');
                    if (resendLink) {
                        resendLink.addEventListener('click', async function(e) {
                            e.preventDefault();
                            const { error } = await supabase.auth.resend({
                                type: 'signup',
                                email: email
                            });
                            
                            if (error) {
                                showAlert(errorAlert, '❌ Erro ao reenviar verificação: ' + error.message);
                            } else {
                                showAlert(successAlert, '✅ E-mail de verificação reenviado! Verifique sua caixa de entrada.', false);
                            }
                        });
                    }
                } else {
                    showAlert(successAlert, '✅ Login realizado com sucesso! Redirecionando...', false);
                    
                    // Salvar e-mail se "Lembrar-me" estiver marcado
                    if (rememberMe && rememberMe.checked) {
                        localStorage.setItem('rememberedEmail', email);
                    }
                    
                    // Redirecionar para home após 2 segundos
                    setTimeout(() => {
                        window.location.href = 'home.html';
                    }, 2000);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro completo no login:', error);
            
            if (error.message.includes('Invalid login credentials')) {
                showAlert(errorAlert, '❌ E-mail ou senha incorretos. Tente novamente.');
            } else if (error.message.includes('Email not confirmed')) {
                showAlert(verificationAlert, '📧 Verifique seu e-mail para ativar sua conta. <a href="#" id="resendVerification">Reenviar verificação</a>');
            } else if (error.message.includes('User not found')) {
                showAlert(errorAlert, '❌ Usuário não encontrado. Verifique o e-mail ou <a href="cadastro.html">cadastre-se</a>.');
            } else {
                showAlert(errorAlert, '❌ Erro ao fazer login: ' + error.message);
            }
        } finally {
            submitBtn.disabled = false;
            if (loading) loading.style.display = 'none';
        }
    });
    
    console.log('✅ Login.js inicializado com sucesso!');
});