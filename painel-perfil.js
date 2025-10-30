// Configuração do Supabase
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// Sistema principal
async function initializeApp() {
    const authenticated = await checkAuthentication();
    if (authenticated) {
        setupEventListeners();
        await loadUserProfile();
        
        // AGUARDAR O PREMIUM MANAGER ATUALIZAR A UI
        setTimeout(async () => {
            if (window.PremiumManager && typeof window.PremiumManager.updateUIWithPremiumStatus === 'function') {
                await window.PremiumManager.updateUIWithPremiumStatus();
            }
            await updateInvisibleModeUI(); // Atualizar UI do modo invisível
        }, 500);
    }
}

// Verificar autenticação
async function checkAuthentication() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            window.location.href = 'login.html';
            return false;
        }
        
        currentUser = user;
        return true;
    } catch (error) {
        window.location.href = 'login.html';
        return false;
    }
}

// Configurar eventos
function setupEventListeners() {
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSave);
    }

    // Máscaras
    const cpfInput = document.getElementById('cpf');
    const phoneInput = document.getElementById('phone');
    const zipCodeInput = document.getElementById('zipCode');
    
    if (cpfInput) cpfInput.addEventListener('input', maskCPF);
    if (phoneInput) phoneInput.addEventListener('input', maskPhone);
    if (zipCodeInput) zipCodeInput.addEventListener('input', maskCEP);

    // Contador de caracteres
    const description = document.getElementById('description');
    if (description) {
        description.addEventListener('input', updateCharCount);
    }

    // Botão de upgrade
    const upgradeBtn = document.getElementById('upgradePlanBtn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', () => {
            window.location.href = 'pricing.html';
        });
    }

    // Modo invisível
    const invisibleCheckbox = document.getElementById('isInvisible');
    if (invisibleCheckbox) {
        invisibleCheckbox.addEventListener('change', handleInvisibleToggle);
    }

    // Busca automática de CEP
    const zipCodeInputCEP = document.getElementById('zipCode');
    if (zipCodeInputCEP) {
        zipCodeInputCEP.addEventListener('blur', function(e) {
            const cep = e.target.value.replace(/\D/g, '');
            if (cep.length === 8) {
                buscarCEP(cep);
            }
        });
    }
}

// Carregar perfil do usuário
async function loadUserProfile() {
    try {
        if (!currentUser) {
            throw new Error('Usuário não autenticado');
        }

        // Carregar dados principais
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        if (profileError) {
            throw new Error('Erro ao carregar perfil');
        }

        // Carregar detalhes públicos
        const { data: userDetails, error: detailsError } = await supabase
            .from('user_details')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        if (detailsError && detailsError.code !== 'PGRST116') {
            // Ignorar erro se não encontrar detalhes
        }

        // Preencher formulário E ATUALIZAR HEADER
        fillProfileForm(profile, userDetails || {});
        
    } catch (error) {
        showNotification('Erro ao carregar perfil', 'error');
    }
}

// Preencher formulário com dados reais
function fillProfileForm(profile, userDetails) {
    if (!profile) return;

    // Dados principais
    setValue('email', currentUser.email);
    setValue('fullName', profile.full_name);
    setValue('nickname', profile.nickname);
    setValue('birthDate', profile.birth_date);
    setValue('cpf', profile.cpf);
    setValue('phone', profile.phone);
    
    // ATUALIZAR NICKNAME NO HEADER
    const userNicknameElement = document.getElementById('userNickname');
    if (userNicknameElement && profile.nickname) {
        userNicknameElement.textContent = profile.nickname;
    }
    
    // Endereço
    setValue('street', profile.street);
    setValue('number', profile.number);
    setValue('neighborhood', profile.neighborhood);
    setValue('city', profile.city);
    setValue('state', profile.state);
    setValue('zipCode', profile.zip_code);
    setValue('displayCity', profile.display_city);

    // Modo Invisível
    const invisibleCheckbox = document.getElementById('isInvisible');
    if (invisibleCheckbox) {
        invisibleCheckbox.checked = profile.is_invisible || false;
    }

    // Dados públicos
    setValue('relationshipStatus', userDetails.relationship_status);
    setValue('gender', userDetails.gender);
    setValue('sexualOrientation', userDetails.sexual_orientation);
    setValue('profession', userDetails.profession);
    setValue('education', userDetails.education);
    setValue('zodiac', userDetails.zodiac);
    setValue('lookingFor', userDetails.looking_for);
    setValue('description', userDetails.description);
    setValue('religion', userDetails.religion);
    setValue('drinking', userDetails.drinking);
    setValue('smoking', userDetails.smoking);
    setValue('exercise', userDetails.exercise);
    setValue('exerciseDetails', userDetails.exercise_details);
    setValue('hasPets', userDetails.has_pets);
    setValue('petsDetails', userDetails.pets_details);

    // Interesses
    if (userDetails.interests) {
        userDetails.interests.forEach(interest => {
            const checkbox = document.querySelector(`input[name="interests"][value="${interest}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    // Características
    if (userDetails.characteristics) {
        userDetails.characteristics.forEach(characteristic => {
            const checkbox = document.querySelector(`input[name="characteristics"][value="${characteristic}"]`);
            if (checkbox) checkbox.checked = true;
        });
    }

    updateCharCount();
}

// Atualizar UI do modo invisível
async function updateInvisibleModeUI() {
    try {
        let isPremium = false;
        
        // Verificar se PremiumManager existe
        if (window.PremiumManager && typeof window.PremiumManager.checkPremiumStatus === 'function') {
            isPremium = await window.PremiumManager.checkPremiumStatus();
        }
        
        const invisibleControl = document.getElementById('invisibleModeControl');
        const upgradeCTA = document.getElementById('invisibleUpgradeCTA');
        const featureStatus = document.getElementById('invisibleFeatureStatus');
        const invisibleCheckbox = document.getElementById('isInvisible');

        if (isPremium) {
            // Usuário Premium - mostrar controle
            if (invisibleControl) invisibleControl.style.display = 'block';
            if (upgradeCTA) upgradeCTA.style.display = 'none';
            
            // Mostrar status baseado no checkbox
            const isCurrentlyInvisible = invisibleCheckbox ? invisibleCheckbox.checked : false;
            
            if (featureStatus) {
                if (isCurrentlyInvisible) {
                    featureStatus.innerHTML = `
                        <span class="premium-feature-active">
                            <i class="fas fa-eye-slash"></i> Modo Ativo
                        </span>
                    `;
                } else {
                    featureStatus.innerHTML = `
                        <span class="premium-feature-inactive">
                            <i class="fas fa-eye"></i> Modo Inativo
                        </span>
                    `;
                }
            }
        } else {
            // Usuário Free - mostrar CTA de upgrade
            if (invisibleControl) invisibleControl.style.display = 'none';
            if (upgradeCTA) upgradeCTA.style.display = 'block';
            if (featureStatus) {
                featureStatus.innerHTML = `
                    <span class="premium-feature-locked">
                        <i class="fas fa-lock"></i> Bloqueado
                    </span>
                `;
            }
        }
    } catch (error) {
        // Ignorar erro
    }
}

// Manipular toggle do modo invisível
async function handleInvisibleToggle(event) {
    const isInvisible = event.target.checked;
    
    try {
        if (!currentUser) {
            throw new Error('Usuário não autenticado');
        }

        const { error } = await supabase
            .from('profiles')
            .update({
                is_invisible: isInvisible,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);

        if (error) throw error;

        // Atualizar UI imediatamente após mudança
        await updateInvisibleModeUI();

        showNotification(
            `Modo invisível ${isInvisible ? 'ativado' : 'desativado'} com sucesso!`,
            'success'
        );

    } catch (error) {
        showNotification('Erro ao atualizar modo invisível', 'error');
        // Reverter o checkbox em caso de erro
        event.target.checked = !isInvisible;
    }
}

// Salvar perfil
async function handleProfileSave(event) {
    event.preventDefault();
    
    const saveButton = document.getElementById('saveButton');
    if (!saveButton) return;

    const originalText = saveButton.innerHTML;
    
    try {
        saveButton.innerHTML = 'Salvando...';
        saveButton.disabled = true;

        // Coletar dados do formulário
        const profileData = collectProfileData();
        const userDetailsData = collectUserDetailsData();

        // Validações
        if (!validateProfileData(profileData, userDetailsData)) {
            saveButton.innerHTML = originalText;
            saveButton.disabled = false;
            return;
        }

        // Salvar no banco
        await saveProfileToDatabase(profileData, userDetailsData);
        
        // ATUALIZAR NICKNAME NO HEADER APÓS SALVAR
        const userNicknameElement = document.getElementById('userNickname');
        if (userNicknameElement && profileData.nickname) {
            userNicknameElement.textContent = profileData.nickname;
        }
        
        showNotification('Perfil salvo com sucesso!', 'success');
        
    } catch (error) {
        showNotification('Erro ao salvar perfil: ' + error.message, 'error');
    } finally {
        saveButton.innerHTML = originalText;
        saveButton.disabled = false;
    }
}

// Coletar dados do perfil
function collectProfileData() {
    const invisibleCheckbox = document.getElementById('isInvisible');
    const isInvisible = invisibleCheckbox ? invisibleCheckbox.checked : false;

    return {
        full_name: getValue('fullName'),
        nickname: getValue('nickname'),
        birth_date: getValue('birthDate'),
        cpf: getValue('cpf').replace(/\D/g, ''),
        phone: getValue('phone').replace(/\D/g, ''),
        street: getValue('street'),
        number: getValue('number'),
        neighborhood: getValue('neighborhood'),
        city: getValue('city'),
        state: getValue('state'),
        zip_code: getValue('zipCode').replace(/\D/g, ''),
        display_city: getValue('displayCity'),
        is_invisible: isInvisible
    };
}

// Coletar dados públicos
function collectUserDetailsData() {
    const interests = Array.from(document.querySelectorAll('input[name="interests"]:checked'))
        .map(checkbox => checkbox.value);

    const characteristics = Array.from(document.querySelectorAll('input[name="characteristics"]:checked'))
        .map(checkbox => checkbox.value);

    return {
        relationship_status: getValue('relationshipStatus'),
        gender: getValue('gender'),
        sexual_orientation: getValue('sexualOrientation'),
        profession: getValue('profession'),
        education: getValue('education'),
        zodiac: getValue('zodiac'),
        looking_for: getValue('lookingFor'),
        description: getValue('description'),
        religion: getValue('religion'),
        drinking: getValue('drinking'),
        smoking: getValue('smoking'),
        exercise: getValue('exercise'),
        exercise_details: getValue('exerciseDetails'),
        has_pets: getValue('hasPets'),
        pets_details: getValue('petsDetails'),
        interests: interests,
        characteristics: characteristics
    };
}

// Validar dados antes de salvar
function validateProfileData(profileData, userDetailsData) {
    if (!profileData.nickname) {
        showNotification('Informe um nickname!', 'error');
        return false;
    }
    
    if (!profileData.birth_date) {
        showNotification('Informe a data de nascimento!', 'error');
        return false;
    }

    // Validar idade mínima
    const birthDate = new Date(profileData.birth_date);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    
    if (age < 18) {
        showNotification('Você deve ter pelo menos 18 anos!', 'error');
        return false;
    }
    
    if (!userDetailsData.relationship_status) {
        showNotification('Informe seu status de relacionamento!', 'error');
        return false;
    }
    
    if (!userDetailsData.gender) {
        showNotification('Informe o gênero!', 'error');
        return false;
    }
    
    if (!userDetailsData.looking_for) {
        showNotification('Informe o que você procura!', 'error');
        return false;
    }

    return true;
}

// Salvar no banco
async function saveProfileToDatabase(profileData, userDetailsData) {
    if (!currentUser) {
        throw new Error('Usuário não autenticado');
    }

    // Atualizar perfil principal
    const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: currentUser.id,
            ...profileData,
            updated_at: new Date().toISOString()
        });

    if (profileError) throw new Error(`Perfil: ${profileError.message}`);

    // Atualizar detalhes públicos
    const { error: detailsError } = await supabase
        .from('user_details')
        .upsert({
            user_id: currentUser.id,
            ...userDetailsData,
            updated_at: new Date().toISOString()
        });

    if (detailsError) throw new Error(`Detalhes: ${detailsError.message}`);
}

// Funções auxiliares
function getValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : '';
}

function setValue(id, value) {
    const element = document.getElementById(id);
    if (element && value) element.value = value;
}

// Máscaras
function maskCPF(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d)/, '$1.$2');
        value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    }
    e.target.value = value;
}

function maskPhone(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 11) {
        value = value.replace(/(\d{2})(\d)/, '($1) $2');
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    e.target.value = value;
}

function maskCEP(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length <= 8) {
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    e.target.value = value;
}

// Contador de caracteres
function updateCharCount() {
    const textarea = document.getElementById('description');
    const charCount = document.getElementById('charCount');
    
    if (textarea && charCount) {
        const count = textarea.value.length;
        charCount.textContent = `${count}/100`;
        
        if (count > 100) {
            textarea.value = textarea.value.substring(0, 100);
            updateCharCount();
        }
    }
}

// Sistema de notificações
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span class="notification-message">${message}</span>
            <button class="notification-close">×</button>
        </div>
    `;

    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: ${type === 'error' ? '#f56565' : type === 'success' ? '#48bb78' : '#4299e1'};
        color: white;
        padding: 16px 20px;
        border-radius: 12px;
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 350px;
        animation: slideInRight 0.3s ease;
    `;

    document.body.appendChild(notification);

    // Fechar notificação
    notification.querySelector('.notification-close').onclick = () => notification.remove();

    setTimeout(() => {
        if (notification.parentElement) notification.remove();
    }, 5000);
}

// Função para buscar CEP
async function buscarCEP(cep) {
    try {
        const cepLimpo = cep.replace(/\D/g, '');
        if (cepLimpo.length !== 8) return;
        
        const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
            setValue('street', data.logradouro);
            setValue('neighborhood', data.bairro);
            setValue('city', data.localidade);
            setValue('state', data.uf);
            setValue('displayCity', `${data.localidade}, ${data.uf}`);
        }
    } catch (error) {
        // Ignorar erro
    }
}

// Exportar para uso global
window.supabase = supabase;
window.profileManager = {
    loadUserProfile,
    saveProfile: handleProfileSave,
    showNotification,
    updateInvisibleModeUI
};