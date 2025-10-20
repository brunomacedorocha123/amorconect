// Configuração do Supabase - NOVAS CREDENCIAIS
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';

// Inicializar Supabase
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== FUNÇÕES DE VALIDAÇÃO DE SENHA ====================

/**
 * Verifica a força da senha
 */
function checkPasswordStrength(password) {
    const requirements = {
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    };
    
    const strength = Object.values(requirements).filter(Boolean).length;
    return { requirements, strength };
}

/**
 * Atualiza a visualização dos requisitos da senha
 */
function updatePasswordRequirements(password) {
    const { requirements, strength } = checkPasswordStrength(password);
    
    // Elementos dos requisitos
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
    
    if (strengthBar) {
        strengthBar.className = 'strength-bar';
        
        if (password.length > 0) {
            switch(strength) {
                case 1:
                case 2:
                    strengthBar.classList.add('strength-weak');
                    break;
                case 3:
                    strengthBar.classList.add('strength-fair');
                    break;
                case 4:
                    strengthBar.classList.add('strength-good');
                    break;
                case 5:
                    strengthBar.classList.add('strength-strong');
                    break;
            }
        }
    }
    
    if (strengthText) {
        strengthText.textContent = '';
        
        if (password.length > 0) {
            switch(strength) {
                case 1:
                case 2:
                    strengthText.textContent = 'Fraca';
                    strengthText.style.color = '#ef4444';
                    break;
                case 3:
                    strengthText.textContent = 'Razoável';
                    strengthText.style.color = '#f59e0b';
                    break;
                case 4:
                    strengthText.textContent = 'Boa';
                    strengthText.style.color = '#eab308';
                    break;
                case 5:
                    strengthText.textContent = 'Forte';
                    strengthText.style.color = '#22c55e';
                    break;
            }
        }
    }
}

/**
 * Validação completa da senha
 */
function validatePassword(password) {
    const { requirements, strength } = checkPasswordStrength(password);
    
    // Verificar se atende a todos os requisitos
    const allMet = Object.values(requirements).every(Boolean);
    
    return {
        isValid: allMet,
        requirements,
        strength,
        message: allMet ? '' : 'A senha não atende a todos os requisitos de segurança'
    };
}

// ==================== FUNÇÕES DE REDIRECIONAMENTO ====================

/**
 * Redireciona para página de sucesso
 */
function redirectToSuccess(email) {
    const successUrl = `success-cadastro.html?email=${encodeURIComponent(email)}`;
    console.log('🔄 Redirecionando para:', successUrl);
    window.location.href = successUrl;
}

// ==================== FUNÇÕES DE VALIDAÇÃO DE FORMULÁRIO ====================

function validateName(e) {
    const field = e.target;
    const errorElement = document.getElementById(field.id + 'Error');
    if (!errorElement) return;
    
    if (field.value.trim().length < 2) {
        errorElement.textContent = field.id === 'firstName' ? 
            'Nome deve ter pelo menos 2 caracteres' : 
            'Sobrenome deve ter pelo menos 2 caracteres';
        errorElement.style.display = 'block';
        field.classList.add('error');
    } else {
        errorElement.style.display = 'none';
        field.classList.remove('error');
    }
}

function validateNickname() {
    const field = document.getElementById('nickname');
    const errorElement = document.getElementById('nicknameError');
    if (!field || !errorElement) return;
    
    if (field.value.trim().length < 3) {
        errorElement.textContent = 'Nickname deve ter pelo menos 3 caracteres';
        errorElement.style.display = 'block';
        field.classList.add('error');
    } else {
        errorElement.style.display = 'none';
        field.classList.remove('error');
    }
}

function validateEmail() {
    const field = document.getElementById('email');
    const errorElement = document.getElementById('emailError');
    if (!field || !errorElement) return;
    
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

function validateBirthDate() {
    const field = document.getElementById('birthDate');
    const errorElement = document.getElementById('birthDateError');
    if (!field || !errorElement) return;
    
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    
    if (!field.value) {
        errorElement.textContent = 'Data de nascimento é obrigatória';
        errorElement.style.display = 'block';
        field.classList.add('error');
    } else {
        const selectedDate = new Date(field.value);
        if (selectedDate > maxDate) {
            errorElement.textContent = 'Você deve ter pelo menos 18 anos';
            errorElement.style.display = 'block';
            field.classList.add('error');
        } else {
            errorElement.style.display = 'none';
            field.classList.remove('error');
        }
    }
}

function validatePasswordRealTime() {
    const field = document.getElementById('password');
    const errorElement = document.getElementById('passwordError');
    if (!field || !errorElement) return;
    
    const passwordValidation = validatePassword(field.value);
    
    if (field.value && !passwordValidation.isValid) {
        errorElement.textContent = passwordValidation.message;
        errorElement.style.display = 'block';
        field.classList.add('error');
    } else {
        errorElement.style.display = 'none';
        field.classList.remove('error');
    }
}

function validateConfirmPassword() {
    const field = document.getElementById('confirmPassword');
    const passwordField = document.getElementById('password');
    const errorElement = document.getElementById('confirmPasswordError');
    
    if (!field || !passwordField || !errorElement) return;
    
    if (field.value !== passwordField.value) {
        errorElement.textContent = 'As senhas não coincidem';
        errorElement.style.display = 'block';
        field.classList.add('error');
    } else {
        errorElement.style.display = 'none';
        field.classList.remove('error');
    }
}

// ==================== FUNÇÕES DE ALERTA E UI ====================

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
    const successAlert = document.getElementById('successAlert');
    
    if (errorAlert) errorAlert.style.display = 'none';
    if (successAlert) successAlert.style.display = 'none';
}

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Inicializando PulseLove Cadastro...');
    
    const form = document.getElementById('registerForm');
    const loading = document.getElementById('loading');
    const errorAlert = document.getElementById('errorAlert');
    const successAlert = document.getElementById('successAlert');
    
    if (!form) {
        console.error('❌ Formulário de cadastro não encontrado!');
        return;
    }
    
    // Configurar data máxima (18 anos atrás)
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    const birthDateField = document.getElementById('birthDate');
    
    if (birthDateField) {
        birthDateField.max = maxDate.toISOString().split('T')[0];
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

    // Event Listener para o formulário
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        console.log('🔄 Iniciando processo de cadastro...');
        
        // Reset de erros
        hideAlerts();
        document.querySelectorAll('.error-message').forEach(el => {
            if (el) el.style.display = 'none';
        });
        document.querySelectorAll('.form-control').forEach(el => {
            if (el) el.classList.remove('error');
        });

        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;
        if (loading) loading.style.display = 'block';
        
        try {
            // Coletar dados do formulário
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const nickname = document.getElementById('nickname').value.trim();
            const email = document.getElementById('email').value.trim();
            const birthDate = document.getElementById('birthDate').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const termsCheckbox = document.getElementById('terms');
            const terms = termsCheckbox ? termsCheckbox.checked : false;

            console.log('📝 Dados coletados:', { firstName, lastName, nickname, email, birthDate, terms });

            // VALIDAÇÕES BÁSICAS
            let hasError = false;

            // Validar nome
            if (firstName.length < 2) {
                const errorElement = document.getElementById('firstNameError');
                if (errorElement) {
                    errorElement.textContent = 'Nome deve ter pelo menos 2 caracteres';
                    errorElement.style.display = 'block';
                }
                document.getElementById('firstName').classList.add('error');
                hasError = true;
            }

            // Validar sobrenome
            if (lastName.length < 2) {
                const errorElement = document.getElementById('lastNameError');
                if (errorElement) {
                    errorElement.textContent = 'Sobrenome deve ter pelo menos 2 caracteres';
                    errorElement.style.display = 'block';
                }
                document.getElementById('lastName').classList.add('error');
                hasError = true;
            }

            // Validar nickname
            if (nickname.length < 3) {
                const errorElement = document.getElementById('nicknameError');
                if (errorElement) {
                    errorElement.textContent = 'Nickname deve ter pelo menos 3 caracteres';
                    errorElement.style.display = 'block';
                }
                document.getElementById('nickname').classList.add('error');
                hasError = true;
            }

            // Validar email
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                const errorElement = document.getElementById('emailError');
                if (errorElement) {
                    errorElement.textContent = 'Por favor, insira um e-mail válido';
                    errorElement.style.display = 'block';
                }
                document.getElementById('email').classList.add('error');
                hasError = true;
            }

            // Validar data de nascimento
            if (!birthDate) {
                const errorElement = document.getElementById('birthDateError');
                if (errorElement) {
                    errorElement.textContent = 'Data de nascimento é obrigatória';
                    errorElement.style.display = 'block';
                }
                document.getElementById('birthDate').classList.add('error');
                hasError = true;
            } else {
                const selectedDate = new Date(birthDate);
                if (selectedDate > maxDate) {
                    const errorElement = document.getElementById('birthDateError');
                    if (errorElement) {
                        errorElement.textContent = 'Você deve ter pelo menos 18 anos';
                        errorElement.style.display = 'block';
                    }
                    document.getElementById('birthDate').classList.add('error');
                    hasError = true;
                }
            }

            // Validar senha
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                const errorElement = document.getElementById('passwordError');
                if (errorElement) {
                    errorElement.textContent = passwordValidation.message;
                    errorElement.style.display = 'block';
                }
                document.getElementById('password').classList.add('error');
                hasError = true;
            }

            // Validar confirmação de senha
            if (password !== confirmPassword) {
                const errorElement = document.getElementById('confirmPasswordError');
                if (errorElement) {
                    errorElement.textContent = 'As senhas não coincidem';
                    errorElement.style.display = 'block';
                }
                document.getElementById('confirmPassword').classList.add('error');
                hasError = true;
            }

            // Validar termos
            if (!terms) {
                showAlert(errorAlert, 'Você deve aceitar os termos e condições');
                hasError = true;
            }

            if (hasError) {
                throw new Error('Por favor, corrija os erros no formulário');
            }

            console.log('✅ Validações passadas, registrando usuário...');

            // REGISTRAR USUÁRIO NO SUPABASE
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: `${firstName} ${lastName}`,
                        nickname: nickname,
                        birth_date: birthDate
                    },
                    emailRedirectTo: `${window.location.origin}/login.html`
                }
            });

            if (authError) {
                console.error('❌ Erro no Auth:', authError);
                throw authError;
            }

            console.log('✅ Auth criado:', authData);

            if (authData.user) {
                // Verificar se é um usuário novo
                if (authData.user.identities && authData.user.identities.length === 0) {
                    showAlert(errorAlert, '❌ Este e-mail já está cadastrado. Tente fazer login.');
                    if (submitBtn) submitBtn.disabled = false;
                    if (loading) loading.style.display = 'none';
                    return;
                }

                // ✅ SUCESSO - CADASTRO REALIZADO
                console.log('✅ Cadastro completo! Redirecionando...');
                
                // REDIRECIONAMENTO IMEDIATO PARA PÁGINA DE SUCESSO
                redirectToSuccess(email);

            } else {
                throw new Error('Falha ao criar usuário');
            }

        } catch (error) {
            console.error('❌ Erro no cadastro:', error);
            
            let errorMessage = 'Erro ao realizar cadastro. Tente novamente.';
            
            if (error.message.includes('already registered') || 
                error.message.includes('user already exists') ||
                error.message.includes('User already registered')) {
                errorMessage = '❌ Este e-mail já está cadastrado. Tente fazer login.';
            } else if (error.message.includes('password')) {
                errorMessage = '❌ A senha deve atender a todos os requisitos de segurança.';
            } else if (error.message.includes('email')) {
                errorMessage = '❌ Por favor, insira um e-mail válido.';
            } else if (error.message.includes('rate limit')) {
                errorMessage = '⏰ Muitas tentativas. Aguarde alguns minutos.';
            } else if (error.message.includes('corrija os erros')) {
                errorMessage = '❌ ' + error.message;
            } else if (error.message.includes('Invalid login credentials')) {
                errorMessage = '❌ Credenciais inválidas. Verifique seus dados.';
            }
            
            showAlert(errorAlert, errorMessage);
            
            if (submitBtn) submitBtn.disabled = false;
            if (loading) loading.style.display = 'none';
        }
    });

    // Verificar se o usuário já está logado
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            console.log('🔑 Usuário já logado, redirecionando para home...');
            window.location.href = 'home.html';
        }
    }).catch(error => {
        console.error('Erro ao verificar usuário:', error);
    });

    // Validação em tempo real dos campos
    const setupFieldValidation = (fieldId, validationFunction) => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', validationFunction);
        }
    };

    // Configurar validações em tempo real
    setupFieldValidation('firstName', validateName);
    setupFieldValidation('lastName', validateName);
    setupFieldValidation('nickname', validateNickname);
    setupFieldValidation('email', validateEmail);
    
    const birthDateFieldRealTime = document.getElementById('birthDate');
    if (birthDateFieldRealTime) {
        birthDateFieldRealTime.addEventListener('change', validateBirthDate);
    }
    
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            updatePasswordRequirements(this.value);
            validatePasswordRealTime();
        });
    }
    
    const confirmPasswordField = document.getElementById('confirmPassword');
    if (confirmPasswordField) {
        confirmPasswordField.addEventListener('blur', validateConfirmPassword);
    }

    // Fechar menu mobile ao clicar em um link
    const navLinks = document.querySelectorAll('.nav-list a');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (menuToggle && nav) {
                menuToggle.classList.remove('active');
                nav.classList.remove('active');
            }
        });
    });

    console.log('✅ Cadastro.js inicializado com sucesso!');
});