// Configuração do Supabase - NOVAS CREDENCIAIS
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== FUNÇÕES DE VALIDAÇÃO DE SENHA ====================

// Função para verificar força da senha
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

// Função para atualizar visualização dos requisitos
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
    
    strengthBar.className = 'strength-bar';
    strengthText.textContent = '';
    
    if (password.length > 0) {
        switch(strength) {
            case 1:
            case 2:
                strengthBar.classList.add('strength-weak');
                strengthText.textContent = 'Fraca';
                strengthText.style.color = '#ef4444';
                break;
            case 3:
                strengthBar.classList.add('strength-fair');
                strengthText.textContent = 'Razoável';
                strengthText.style.color = '#f59e0b';
                break;
            case 4:
                strengthBar.classList.add('strength-good');
                strengthText.textContent = 'Boa';
                strengthText.style.color = '#eab308';
                break;
            case 5:
                strengthBar.classList.add('strength-strong');
                strengthText.textContent = 'Forte';
                strengthText.style.color = '#22c55e';
                break;
        }
    }
}

// Validação completa da senha
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

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const loading = document.getElementById('loading');
    const errorAlert = document.getElementById('errorAlert');
    const successAlert = document.getElementById('successAlert');
    
    // Configurar data máxima (18 anos atrás)
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    document.getElementById('birthDate').max = maxDate.toISOString().split('T')[0];

    // Menu Mobile Toggle
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('.nav');
    
    if (menuToggle) {
        menuToggle.addEventListener('click', function() {
            this.classList.toggle('active');
            nav.classList.toggle('active');
        });
    }

    // Função para mostrar alertas
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
        errorAlert.style.display = 'none';
        successAlert.style.display = 'none';
    }

    // SUBMIT CORRETO E FUNCIONAL
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Reset de erros
        hideAlerts();
        document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
        document.querySelectorAll('.form-control').forEach(el => el.classList.remove('error'));

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        loading.style.display = 'block';
        
        try {
            console.log('🔄 Iniciando cadastro...');
            
            // Coletar dados do formulário
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const nickname = document.getElementById('nickname').value.trim();
            const email = document.getElementById('email').value.trim();
            const birthDate = document.getElementById('birthDate').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const terms = document.getElementById('terms').checked;

            // VALIDAÇÕES BÁSICAS
            let hasError = false;

            if (firstName.length < 2) {
                document.getElementById('firstNameError').textContent = 'Nome deve ter pelo menos 2 caracteres';
                document.getElementById('firstNameError').style.display = 'block';
                document.getElementById('firstName').classList.add('error');
                hasError = true;
            }

            if (lastName.length < 2) {
                document.getElementById('lastNameError').textContent = 'Sobrenome deve ter pelo menos 2 caracteres';
                document.getElementById('lastNameError').style.display = 'block';
                document.getElementById('lastName').classList.add('error');
                hasError = true;
            }

            if (nickname.length < 3) {
                document.getElementById('nicknameError').textContent = 'Nickname deve ter pelo menos 3 caracteres';
                document.getElementById('nicknameError').style.display = 'block';
                document.getElementById('nickname').classList.add('error');
                hasError = true;
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                document.getElementById('emailError').textContent = 'Por favor, insira um e-mail válido';
                document.getElementById('emailError').style.display = 'block';
                document.getElementById('email').classList.add('error');
                hasError = true;
            }

            if (!birthDate) {
                document.getElementById('birthDateError').textContent = 'Data de nascimento é obrigatória';
                document.getElementById('birthDateError').style.display = 'block';
                document.getElementById('birthDate').classList.add('error');
                hasError = true;
            } else {
                const selectedDate = new Date(birthDate);
                if (selectedDate > maxDate) {
                    document.getElementById('birthDateError').textContent = 'Você deve ter pelo menos 18 anos';
                    document.getElementById('birthDateError').style.display = 'block';
                    document.getElementById('birthDate').classList.add('error');
                    hasError = true;
                }
            }

            // VALIDAÇÃO FORTE DA SENHA
            const passwordValidation = validatePassword(password);
            if (!passwordValidation.isValid) {
                document.getElementById('passwordError').textContent = passwordValidation.message;
                document.getElementById('passwordError').style.display = 'block';
                document.getElementById('password').classList.add('error');
                hasError = true;
            }

            if (password !== confirmPassword) {
                document.getElementById('confirmPasswordError').textContent = 'As senhas não coincidem';
                document.getElementById('confirmPasswordError').style.display = 'block';
                document.getElementById('confirmPassword').classList.add('error');
                hasError = true;
            }

            if (!terms) {
                showAlert(errorAlert, 'Você deve aceitar os termos e condições');
                hasError = true;
            }

            if (hasError) {
                throw new Error('Por favor, corrija os erros no formulário');
            }

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
                    submitBtn.disabled = false;
                    loading.style.display = 'none';
                    return;
                }

                // ✅ SUCESSO - CADASTRO REALIZADO
                console.log('✅ Cadastro completo!');
                showAlert(successAlert, '✅ Cadastro realizado com sucesso! Verifique seu e-mail para confirmar a conta.', false);
                
                // Limpar formulário
                form.reset();
                
                // Redirecionar para login após 3 segundos
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 3000);

            } else {
                throw new Error('Falha ao criar usuário');
            }

        } catch (error) {
            console.error('❌ Erro no cadastro:', error);
            
            let errorMessage = 'Erro ao realizar cadastro. Tente novamente.';
            
            if (error.message.includes('already registered') || error.message.includes('user already exists')) {
                errorMessage = '❌ Este e-mail já está cadastrado. Tente fazer login.';
            } else if (error.message.includes('password')) {
                errorMessage = '❌ A senha deve atender a todos os requisitos de segurança.';
            } else if (error.message.includes('email')) {
                errorMessage = '❌ Por favor, insira um e-mail válido.';
            } else if (error.message.includes('rate limit')) {
                errorMessage = '⏰ Muitas tentativas. Aguarde alguns minutos.';
            } else if (error.message.includes('corrija os erros')) {
                errorMessage = '❌ ' + error.message;
            }
            
            showAlert(errorAlert, errorMessage);
            submitBtn.disabled = false;
            loading.style.display = 'none';
        }
    });

    // Verificar se o usuário já está logado
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            console.log('🔑 Usuário já logado, redirecionando...');
            window.location.href = 'home.html';
        }
    });

    // Validação em tempo real dos campos
    document.getElementById('firstName').addEventListener('blur', validateName);
    document.getElementById('lastName').addEventListener('blur', validateName);
    document.getElementById('nickname').addEventListener('blur', validateNickname);
    document.getElementById('email').addEventListener('blur', validateEmail);
    document.getElementById('birthDate').addEventListener('change', validateBirthDate);
    document.getElementById('password').addEventListener('input', function() {
        updatePasswordRequirements(this.value);
        validatePasswordRealTime();
    });
    document.getElementById('confirmPassword').addEventListener('blur', validateConfirmPassword);

    function validateName(e) {
        const field = e.target;
        const errorElement = document.getElementById(field.id + 'Error');
        if (field.value.trim().length < 2) {
            errorElement.textContent = field.id === 'firstName' ? 'Nome deve ter pelo menos 2 caracteres' : 'Sobrenome deve ter pelo menos 2 caracteres';
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
        const password = document.getElementById('password').value;
        const errorElement = document.getElementById('confirmPasswordError');
        if (field.value !== password) {
            errorElement.textContent = 'As senhas não coincidem';
            errorElement.style.display = 'block';
            field.classList.add('error');
        } else {
            errorElement.style.display = 'none';
            field.classList.remove('error');
        }
    }
});