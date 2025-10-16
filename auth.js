// ==================== AUTH.JS COMPLETO ====================
// Sistema completo de autenticação do Amor Conect

console.log('🔐 Auth.js - Inicializando sistema de autenticação...');

// ==================== CONFIGURAÇÕES DE AUTENTICAÇÃO ====================
const AUTH_CONFIG = {
    minPasswordLength: 8,
    maxPasswordLength: 128,
    minNameLength: 2,
    minNicknameLength: 3,
    minAge: 18,
    emailConfirmationRequired: true
};

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Auth.js - DOM carregado');
    
    // Só inicializar se estiver em página de autenticação
    if (document.getElementById('loginForm') || document.getElementById('registerForm')) {
        initializeAuth();
    }
    
    // Verificar parâmetros de URL para confirmação de email
    checkEmailConfirmationStatus();
});

function initializeAuth() {
    console.log('🔐 Inicializando sistemas de autenticação...');
    
    // Configurar formulários
    setupLoginForm();
    setupRegisterForm();
    
    // Configurar "Lembrar-me"
    setupRememberMe();
    
    console.log('✅ Sistemas de autenticação inicializados');
}

// ==================== FORMULÁRIO DE LOGIN ====================
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    console.log('🔐 Configurando formulário de login...');

    // Toggle de visibilidade da senha
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.textContent = type === 'password' ? '👁️' : '🔒';
            togglePassword.setAttribute('aria-label', type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
        });
    }

    // Validação em tempo real
    const emailInput = document.getElementById('email');
    const passwordInputElement = document.getElementById('password');

    if (emailInput) {
        emailInput.addEventListener('blur', validateEmailRealTime);
        emailInput.addEventListener('input', clearFieldError.bind(null, 'email'));
    }

    if (passwordInputElement) {
        passwordInputElement.addEventListener('blur', validatePasswordLoginRealTime);
        passwordInputElement.addEventListener('input', clearFieldError.bind(null, 'password'));
    }

    // Submit do formulário
    loginForm.addEventListener('submit', handleLoginSubmit);
    
    // Prevenir envio com Enter em campos individuais
    loginForm.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                if (this.type !== 'submit') {
                    loginForm.dispatchEvent(new Event('submit'));
                }
            }
        });
    });
}

// ==================== FORMULÁRIO DE CADASTRO ====================
function setupRegisterForm() {
    const registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    console.log('📝 Configurando formulário de cadastro...');

    // Configurar data máxima (18 anos atrás)
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - AUTH_CONFIG.minAge, today.getMonth(), today.getDate());
    const birthDateInput = document.getElementById('birthDate');
    if (birthDateInput) {
        birthDateInput.max = maxDate.toISOString().split('T')[0];
        birthDateInput.addEventListener('change', validateBirthDateRealTime);
        birthDateInput.addEventListener('input', clearFieldError.bind(null, 'birthDate'));
    }

    // Validações em tempo real
    const inputs = ['firstName', 'lastName', 'nickname', 'email', 'password', 'confirmPassword'];
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('blur', function() {
                validateFieldRealTime(inputId);
            });
            input.addEventListener('input', function() {
                clearFieldError(inputId);
            });
        }
    });

    // Validação específica para senha
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            updatePasswordRequirements(this.value);
            validatePasswordRealTime();
            clearFieldError('password');
            
            // Validar confirmação de senha também
            const confirmPassword = document.getElementById('confirmPassword').value;
            if (confirmPassword) {
                validateConfirmPasswordRealTime();
            }
        });
    }

    // Validação para confirmação de senha
    const confirmPasswordInput = document.getElementById('confirmPassword');
    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', function() {
            validateConfirmPasswordRealTime();
            clearFieldError('confirmPassword');
        });
    }

    // Validação para termos
    const termsInput = document.getElementById('terms');
    if (termsInput) {
        termsInput.addEventListener('change', function() {
            clearFieldError('terms');
        });
    }

    // Submit do formulário
    registerForm.addEventListener('submit', handleRegisterSubmit);
}

// ==================== HANDLER DE LOGIN ====================
async function handleLoginSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.querySelector('#loginForm button[type="submit"]');
    const loading = document.getElementById('loading');
    const errorAlert = document.getElementById('errorAlert');

    // Esconder alertas
    hideAlerts();
    clearFormErrors();

    // Coletar dados
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe')?.checked || false;

    // Validar
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
        showFormErrors(validation.errors);
        return;
    }

    // Mostrar loading
    setLoadingState(true, submitBtn, loading);

    try {
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

        // Verificar se o e-mail foi confirmado
        if (!data.user.email_confirmed_at && AUTH_CONFIG.emailConfirmationRequired) {
            showAlert('📧 Sua conta precisa ser verificada. Verifique seu e-mail antes de fazer login.', 'warning');
            
            // Oferecer reenvio de confirmação
            setTimeout(() => {
                if (confirm('Deseja reenviar o e-mail de confirmação?')) {
                    resendEmailConfirmation(email);
                }
            }, 2000);
        } else {
            showAlert('✅ Login realizado com sucesso! Redirecionando...', 'success');
            
            // Salvar e-mail se "Lembrar-me" estiver marcado
            if (rememberMe) {
                localStorage.setItem('rememberedEmail', email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            
            // Redirecionar para home após 2 segundos
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 2000);
        }
        
    } catch (error) {
        console.error('❌ Erro completo no login:', error);
        handleAuthError(error);
    } finally {
        setLoadingState(false, submitBtn, loading);
    }
}

// ==================== HANDLER DE CADASTRO ====================
async function handleRegisterSubmit(e) {
    e.preventDefault();
    
    const submitBtn = document.querySelector('#registerForm button[type="submit"]');
    const loading = document.getElementById('loading');

    // Esconder alertas e erros
    hideAlerts();
    clearFormErrors();

    // Coletar dados
    const formData = {
        firstName: document.getElementById('firstName').value.trim(),
        lastName: document.getElementById('lastName').value.trim(),
        nickname: document.getElementById('nickname').value.trim(),
        email: document.getElementById('email').value.trim(),
        birthDate: document.getElementById('birthDate').value,
        password: document.getElementById('password').value,
        confirmPassword: document.getElementById('confirmPassword').value,
        terms: document.getElementById('terms').checked
    };

    // Validar
    const validation = validateRegisterForm(formData);
    if (!validation.isValid) {
        showFormErrors(validation.errors);
        return;
    }

    // Mostrar loading
    setLoadingState(true, submitBtn, loading);

    try {
        console.log('🔄 Iniciando cadastro para:', formData.email);

        // ✅ URL de redirecionamento correta para confirmação de email
        const redirectTo = `${window.location.origin}/verificacao-email.html`;
        
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: {
                data: {
                    full_name: `${formData.firstName} ${formData.lastName}`,
                    nickname: formData.nickname,
                    birth_date: formData.birthDate
                },
                // ✅ CORREÇÃO: Redirect URL para confirmação de email
                emailRedirectTo: redirectTo
            }
        });

        if (authError) {
            console.error('❌ Erro no Auth:', authError);
            throw authError;
        }

        console.log('✅ Resposta completa do Supabase:', authData);

        // ✅ CORREÇÃO: Verificar se o usuário já existe
        if (authData.user && authData.user.identities && authData.user.identities.length === 0) {
            showAlert('❌ Este e-mail já está cadastrado. <a href="login.html" style="color: inherit; text-decoration: underline;">Faça login aqui</a>.', 'error');
            return;
        }

        if (authData.user) {
            // ✅ SUCESSO - Verificar se confirmation foi enviado
            if (authData.user.confirmation_sent_at || !AUTH_CONFIG.emailConfirmationRequired) {
                console.log('✅ Email de confirmação enviado em:', authData.user.confirmation_sent_at);
                
                const successMessage = AUTH_CONFIG.emailConfirmationRequired 
                    ? `✅ Cadastro realizado com sucesso!<br><br>
                       📧 Enviamos um link de confirmação para:<br>
                       <strong>${formData.email}</strong><br><br>
                       💡 <strong>Dica:</strong> Verifique sua pasta de spam caso não encontre o e-mail.`
                    : '✅ Cadastro realizado com sucesso! Redirecionando...';
                
                showAlert(successMessage, 'success');
                
                // Limpar formulário
                document.getElementById('registerForm').reset();
                
                // Redirecionar para página de verificação
                if (AUTH_CONFIG.emailConfirmationRequired) {
                    setTimeout(() => {
                        window.location.href = `verificacao-email.html?email=${encodeURIComponent(formData.email)}`;
                    }, 4000);
                } else {
                    setTimeout(() => {
                        window.location.href = 'home.html';
                    }, 2000);
                }
                
            } else {
                // ❌ Email NÃO foi enviado
                console.warn('⚠️ Email de confirmação NÃO foi enviado');
                showAlert('✅ Cadastro realizado, mas houve um problema com o email de confirmação. Entre em contato com o suporte.', 'warning');
            }

        } else {
            throw new Error('Falha ao criar usuário - nenhum usuário retornado');
        }

    } catch (error) {
        console.error('❌ Erro no cadastro:', error);
        handleAuthError(error);
    } finally {
        setLoadingState(false, submitBtn, loading);
    }
}

// ==================== VALIDAÇÕES DE FORMULÁRIOS ====================
function validateLoginForm(email, password) {
    const errors = {};
    
    // Validar email
    if (!email || !validateEmail(email)) {
        errors.email = 'Por favor, insira um e-mail válido';
    }
    
    // Validar senha
    if (!password || password.length < 6) {
        errors.password = 'A senha deve ter pelo menos 6 caracteres';
    }
    
    return {
        isValid: Object.keys(errors).length === 0,
        errors: errors
    };
}

function validateRegisterForm(formData) {
    const errors = {};
    const {
        firstName,
        lastName,
        nickname,
        email,
        birthDate,
        password,
        confirmPassword,
        terms
    } = formData;

    // Validar nome
    if (!firstName || firstName.trim().length < AUTH_CONFIG.minNameLength) {
        errors.firstName = `Nome deve ter pelo menos ${AUTH_CONFIG.minNameLength} caracteres`;
    }

    // Validar sobrenome
    if (!lastName || lastName.trim().length < AUTH_CONFIG.minNameLength) {
        errors.lastName = `Sobrenome deve ter pelo menos ${AUTH_CONFIG.minNameLength} caracteres`;
    }

    // Validar nickname
    if (!nickname || nickname.trim().length < AUTH_CONFIG.minNicknameLength) {
        errors.nickname = `Nickname deve ter pelo menos ${AUTH_CONFIG.minNicknameLength} caracteres`;
    }

    // Validar email
    if (!email || !validateEmail(email)) {
        errors.email = 'Por favor, insira um e-mail válido';
    }

    // Validar data de nascimento
    if (!birthDate) {
        errors.birthDate = 'Data de nascimento é obrigatória';
    } else {
        const age = calculateAge(birthDate);
        if (age < AUTH_CONFIG.minAge) {
            errors.birthDate = `Você deve ter pelo menos ${AUTH_CONFIG.minAge} anos`;
        } else if (age > 100) {
            errors.birthDate = 'Data de nascimento inválida';
        }
    }

    // Validar senha
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.isValid) {
        errors.password = 'A senha não atende aos requisitos de segurança';
    }

    // Validar confirmação de senha
    if (password !== confirmPassword) {
        errors.confirmPassword = 'As senhas não coincidem';
    }

    // Validar termos
    if (!terms) {
        errors.terms = 'Você deve aceitar os termos e condições';
    }

    return {
        isValid: Object.keys(errors).length === 0,
        errors: errors
    };
}

// ==================== VALIDAÇÕES EM TEMPO REAL ====================
function validateEmailRealTime() {
    const field = document.getElementById('email');
    const value = field.value.trim();
    
    if (value === '') {
        hideFieldError('email');
        field.classList.remove('error');
        return;
    }
    
    const isValid = validateEmail(value);
    
    if (!isValid) {
        showFieldError('email', 'Por favor, insira um e-mail válido');
        field.classList.add('error');
    } else {
        hideFieldError('email');
        field.classList.remove('error');
    }
}

function validatePasswordLoginRealTime() {
    const field = document.getElementById('password');
    const value = field.value;
    
    if (value === '') {
        hideFieldError('password');
        field.classList.remove('error');
        return;
    }
    
    const isValid = value.length >= 6;
    
    if (!isValid) {
        showFieldError('password', 'A senha deve ter pelo menos 6 caracteres');
        field.classList.add('error');
    } else {
        hideFieldError('password');
        field.classList.remove('error');
    }
}

function validatePasswordRealTime() {
    const field = document.getElementById('password');
    const value = field.value;
    
    if (value === '') {
        hideFieldError('password');
        field.classList.remove('error');
        return;
    }
    
    const passwordValidation = validatePassword(value);
    
    if (!passwordValidation.isValid) {
        showFieldError('password', 'A senha não atende aos requisitos de segurança');
        field.classList.add('error');
    } else {
        hideFieldError('password');
        field.classList.remove('error');
    }
}

function validateConfirmPasswordRealTime() {
    const field = document.getElementById('confirmPassword');
    const password = document.getElementById('password').value;
    const value = field.value;
    
    if (value === '') {
        hideFieldError('confirmPassword');
        field.classList.remove('error');
        return;
    }
    
    if (value !== password) {
        showFieldError('confirmPassword', 'As senhas não coincidem');
        field.classList.add('error');
    } else {
        hideFieldError('confirmPassword');
        field.classList.remove('error');
    }
}

function validateBirthDateRealTime() {
    const field = document.getElementById('birthDate');
    const value = field.value;
    
    if (!value) {
        hideFieldError('birthDate');
        field.classList.remove('error');
        return;
    }
    
    const age = calculateAge(value);
    
    if (age < AUTH_CONFIG.minAge) {
        showFieldError('birthDate', `Você deve ter pelo menos ${AUTH_CONFIG.minAge} anos`);
        field.classList.add('error');
    } else if (age > 100) {
        showFieldError('birthDate', 'Data de nascimento inválida');
        field.classList.add('error');
    } else {
        hideFieldError('birthDate');
        field.classList.remove('error');
    }
}

function validateFieldRealTime(fieldId) {
    const field = document.getElementById(fieldId);
    const value = field.value.trim();
    
    if (value === '') {
        hideFieldError(fieldId);
        field.classList.remove('error');
        return;
    }
    
    let isValid = true;
    let errorMessage = '';

    switch (fieldId) {
        case 'firstName':
        case 'lastName':
            if (value.length < AUTH_CONFIG.minNameLength) {
                isValid = false;
                errorMessage = `Deve ter pelo menos ${AUTH_CONFIG.minNameLength} caracteres`;
            }
            break;
        case 'nickname':
            if (value.length < AUTH_CONFIG.minNicknameLength) {
                isValid = false;
                errorMessage = `Deve ter pelo menos ${AUTH_CONFIG.minNicknameLength} caracteres`;
            }
            break;
    }

    if (!isValid) {
        showFieldError(fieldId, errorMessage);
        field.classList.add('error');
    } else {
        hideFieldError(fieldId);
        field.classList.remove('error');
    }
}

// ==================== SISTEMA DE REQUISITOS DE SENHA ====================
function updatePasswordRequirements(password) {
    const { requirements, strength } = checkPasswordStrength(password);
    const requirementElements = {
        length: document.getElementById('reqLength'),
        uppercase: document.getElementById('reqUppercase'),
        lowercase: document.getElementById('reqLowercase'),
        number: document.getElementById('reqNumber'),
        special: document.getElementById('reqSpecial')
    };
    
    // Atualizar cada requisito
    Object.keys(requirements).forEach(key => {
        const element = requirementElements[key];
        if (element) {
            if (requirements[key]) {
                element.classList.add('requirement-met');
                element.classList.remove('requirement-unmet');
            } else {
                element.classList.remove('requirement-met');
                element.classList.add('requirement-unmet');
            }
        }
    });

    // Atualizar barra de força
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    if (strengthBar && strengthText) {
        strengthBar.className = 'strength-bar';
        strengthText.textContent = '';
        strengthText.style.color = '';
        
        if (password.length > 0) {
            let strengthClass = '';
            let strengthMessage = '';
            let color = '';
            
            switch(strength) {
                case 0:
                case 1:
                    strengthClass = 'strength-weak';
                    strengthMessage = 'Muito Fraca';
                    color = '#ef4444';
                    break;
                case 2:
                    strengthClass = 'strength-weak';
                    strengthMessage = 'Fraca';
                    color = '#f97316';
                    break;
                case 3:
                    strengthClass = 'strength-fair';
                    strengthMessage = 'Razoável';
                    color = '#eab308';
                    break;
                case 4:
                    strengthClass = 'strength-good';
                    strengthMessage = 'Boa';
                    color = '#84cc16';
                    break;
                case 5:
                    strengthClass = 'strength-strong';
                    strengthMessage = 'Forte';
                    color = '#22c55e';
                    break;
            }
            
            strengthBar.classList.add(strengthClass);
            strengthText.textContent = strengthMessage;
            strengthText.style.color = color;
        }
    }
}

// ==================== MANIPULAÇÃO DE ERROS ====================
function handleAuthError(error) {
    let errorMessage = 'Erro ao processar a solicitação. Tente novamente.';
    
    if (error.message.includes('Invalid login credentials')) {
        errorMessage = '❌ E-mail ou senha incorretos. Tente novamente.';
    } else if (error.message.includes('Email not confirmed')) {
        errorMessage = '📧 Sua conta precisa ser verificada. Verifique seu e-mail antes de fazer login.';
    } else if (error.message.includes('User not found')) {
        errorMessage = '❌ Usuário não encontrado. Verifique o e-mail ou cadastre-se.';
    } else if (error.message.includes('already registered') || error.message.includes('user already exists')) {
        errorMessage = '❌ Este e-mail já está cadastrado. Tente fazer login.';
    } else if (error.message.includes('password')) {
        errorMessage = '❌ A senha deve atender a todos os requisitos de segurança.';
    } else if (error.message.includes('email')) {
        errorMessage = '❌ Por favor, insira um e-mail válido.';
    } else if (error.message.includes('rate limit')) {
        errorMessage = '⏰ Muitas tentativas. Aguarde alguns minutos.';
    } else if (error.message.includes('weak_password')) {
        errorMessage = '❌ A senha é muito fraca. Use uma combinação de letras, números e símbolos.';
    }
    
    showAlert(errorMessage, 'error');
}

// ==================== FUNÇÕES AUXILIARES ====================
function setLoadingState(isLoading, submitBtn, loadingElement) {
    if (submitBtn) {
        submitBtn.disabled = isLoading;
        if (isLoading) {
            submitBtn.innerHTML = '<div class="spinner-small"></div> Processando...';
        } else {
            submitBtn.innerHTML = submitBtn.getAttribute('data-original-text') || 'Continuar';
        }
    }
    
    if (loadingElement) {
        loadingElement.style.display = isLoading ? 'block' : 'none';
    }
}

function showFormErrors(errors) {
    Object.keys(errors).forEach(fieldId => {
        showFieldError(fieldId, errors[fieldId]);
        const field = document.getElementById(fieldId);
        if (field) field.classList.add('error');
    });
}

function showFieldError(fieldId, message) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        errorElement.classList.add('show');
    }
}

function hideFieldError(fieldId) {
    const errorElement = document.getElementById(fieldId + 'Error');
    if (errorElement) {
        errorElement.style.display = 'none';
        errorElement.classList.remove('show');
    }
}

function clearFieldError(fieldId) {
    hideFieldError(fieldId);
    const field = document.getElementById(fieldId);
    if (field) field.classList.remove('error');
}

function clearFormErrors() {
    document.querySelectorAll('.error-message').forEach(el => {
        el.style.display = 'none';
        el.classList.remove('show');
    });
    document.querySelectorAll('.form-control').forEach(el => {
        el.classList.remove('error');
    });
}

function hideAlerts() {
    const alerts = document.querySelectorAll('.alert');
    alerts.forEach(alert => {
        alert.style.display = 'none';
    });
}

function showAlert(message, type = 'info') {
    hideAlerts();
    
    const alertElement = document.getElementById(`${type}Alert`) || document.getElementById('errorAlert');
    if (alertElement) {
        alertElement.innerHTML = message;
        alertElement.className = `alert alert-${type}`;
        alertElement.style.display = 'block';
        
        // Scroll para o alerta
        alertElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        // Fallback para notification global
        showNotification(message, type);
    }
}

// ==================== SISTEMA "LEMBRAR-ME" ====================
function setupRememberMe() {
    const rememberMe = document.getElementById('rememberMe');
    const savedEmail = localStorage.getItem('rememberedEmail');

    if (rememberMe && savedEmail) {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.value = savedEmail;
            rememberMe.checked = true;
        }
    }

    if (rememberMe) {
        rememberMe.addEventListener('change', function() {
            const emailInput = document.getElementById('email');
            const email = emailInput ? emailInput.value : '';
            
            if (this.checked && email) {
                localStorage.setItem('rememberedEmail', email);
                console.log('💾 E-mail salvo:', email);
            } else {
                localStorage.removeItem('rememberedEmail');
                console.log('💾 E-mail removido do storage');
            }
        });
    }
}

// ==================== VERIFICAÇÃO DE STATUS DE EMAIL ====================
function checkEmailConfirmationStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    
    if (urlParams.get('verified') === 'true') {
        showAlert('✅ E-mail verificado com sucesso! Faça login para continuar.', 'success');
        
        // Limpar parâmetro da URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
    
    if (urlParams.get('error') === 'email_verification') {
        showAlert('❌ Erro na verificação do e-mail. Tente novamente ou solicite um novo link.', 'error');
        
        // Limpar parâmetro da URL
        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
    }
}

// ==================== REENVIO DE CONFIRMAÇÃO DE EMAIL ====================
async function resendEmailConfirmation(email) {
    try {
        showNotification('📧 Reenviando e-mail de confirmação...', 'info');
        
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
            options: {
                emailRedirectTo: `${window.location.origin}/verificacao-email.html`
            }
        });
        
        if (error) throw error;
        
        showNotification('✅ E-mail de confirmação reenviado! Verifique sua caixa de entrada.', 'success');
        
    } catch (error) {
        console.error('❌ Erro ao reenviar confirmação:', error);
        showNotification('❌ Erro ao reenviar e-mail de confirmação', 'error');
    }
}

// ==================== RECUPERAÇÃO DE SENHA ====================
async function resetPassword(email) {
    try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password.html`,
        });
        
        if (error) throw error;
        
        return { success: true, message: 'E-mail de recuperação enviado!' };
    } catch (error) {
        console.error('❌ Erro ao resetar senha:', error);
        return { success: false, message: error.message };
    }
}

// ==================== EXPORTAÇÃO DE FUNÇÕES ====================
// Tornar funções disponíveis globalmente
window.validateLoginForm = validateLoginForm;
window.validateRegisterForm = validateRegisterForm;
window.handleLoginSubmit = handleLoginSubmit;
window.handleRegisterSubmit = handleRegisterSubmit;
window.setupLoginForm = setupLoginForm;
window.setupRegisterForm = setupRegisterForm;
window.updatePasswordRequirements = updatePasswordRequirements;
window.resendEmailConfirmation = resendEmailConfirmation;
window.resetPassword = resetPassword;
window.validateEmailRealTime = validateEmailRealTime;
window.validatePasswordRealTime = validatePasswordRealTime;

console.log('✅ Auth.js carregado! Sistemas de autenticação prontos.');
console.log('🎯 Configuração:', AUTH_CONFIG);