// Configuração do Supabase
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Funções de Validação
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

function updatePasswordRequirements(password) {
    const { requirements } = checkPasswordStrength(password);
    const requirementElements = {
        length: document.getElementById('reqLength'),
        uppercase: document.getElementById('reqUppercase'),
        lowercase: document.getElementById('reqLowercase'),
        number: document.getElementById('reqNumber'),
        special: document.getElementById('reqSpecial')
    };
    
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
}

function validatePassword(password) {
    const { requirements } = checkPasswordStrength(password);
    const allMet = Object.values(requirements).every(Boolean);
    
    return {
        isValid: allMet,
        requirements,
        message: allMet ? '' : 'A senha não atende a todos os requisitos de segurança'
    };
}

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
function validateName(e) {
    const field = e.target;
    const errorElement = document.getElementById(field.id + 'Error');
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

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('registerForm');
    const loading = document.getElementById('loading');
    const errorAlert = document.getElementById('errorAlert');
    const successAlert = document.getElementById('successAlert');
    
    // Configurar data máxima (18 anos atrás)
    const today = new Date();
    const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    document.getElementById('birthDate').max = maxDate.toISOString().split('T')[0];

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
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const nickname = document.getElementById('nickname').value.trim();
            const email = document.getElementById('email').value.trim();
            const birthDate = document.getElementById('birthDate').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            const terms = document.getElementById('terms').checked;

            // Validações
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

            // Registrar usuário no Supabase COM URL CORRETA
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: `${firstName} ${lastName}`,
                        nickname: nickname,
                        birth_date: birthDate
                    },
                    emailRedirectTo: 'https://amorconect.netlify.app/verificacao.html'
                }
            });

            if (authError) {
                if (authError.message.includes('User already registered')) {
                    throw new Error('Este e-mail já está cadastrado. Tente fazer login.');
                }
                throw authError;
            }

           if (authData.user) {
    window.location.href = 'verificacao.html'; // ← ✅ CORRETO
} else {
    throw new Error('Falha ao criar usuário');
}

        } catch (error) {
            let errorMessage = 'Erro ao realizar cadastro. Tente novamente.';
            
            if (error.message.includes('já está cadastrado')) {
                errorMessage = error.message;
            } else if (error.message.includes('password')) {
                errorMessage = 'A senha deve atender a todos os requisitos de segurança.';
            } else if (error.message.includes('email')) {
                errorMessage = 'Por favor, insira um e-mail válido.';
            } else if (error.message.includes('rate limit')) {
                errorMessage = 'Muitas tentativas. Aguarde alguns minutos.';
            } else if (error.message.includes('corrija os erros')) {
                errorMessage = error.message;
            }
            
            showAlert(errorAlert, errorMessage);
            submitBtn.disabled = false;
            loading.style.display = 'none';
        }
    });

    // Verificar se usuário já está logado
    supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
            window.location.href = 'home.html';
        }
    });

    // Validações em tempo real
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
});