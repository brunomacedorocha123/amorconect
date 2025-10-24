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
        await initializePremiumFeatures(); // LINHA ADICIONADA
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
}

// Carregar perfil do usuário
async function loadUserProfile() {
    try {
        // Carregar dados principais
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', currentUser.id)
            .single();

        // Carregar detalhes públicos
        const { data: userDetails, error: detailsError } = await supabase
            .from('user_details')
            .select('*')
            .eq('user_id', currentUser.id)
            .single();

        // Preencher formulário
        fillProfileForm(profile, userDetails);
        
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
    
    // Endereço
    setValue('street', profile.street);
    setValue('number', profile.number);
    setValue('neighborhood', profile.neighborhood);
    setValue('city', profile.city);
    setValue('state', profile.state);
    setValue('zipCode', profile.zip_code);
    setValue('displayCity', profile.display_city);

    // Dados públicos
    if (userDetails) {
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
    }

    updateCharCount();
}

// Salvar perfil - FUNCIONALIDADE REAL
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

        // Salvar no banco - OPERAÇÃO REAL
        await saveProfileToDatabase(profileData, userDetailsData);
        
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
        display_city: getValue('displayCity')
    };
}

// Coletar dados públicos
function collectUserDetailsData() {
    const interests = Array.from(document.querySelectorAll('input[name="interests"]:checked'))
        .map(checkbox => checkbox.value);

    const characteristics = Array.from(document.querySelectorAll('input[name="characteristics"]:checked'))
        .map(checkbox => checkbox.value);

    return {
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

// Salvar no banco - OPERAÇÃO REAL
async function saveProfileToDatabase(profileData, userDetailsData) {
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

// =============================================
// SISTEMA PREMIUM INTEGRADO - FUNÇÕES NOVAS
// =============================================

// Inicializar features premium
async function initializePremiumFeatures() {
    await PremiumManager.updateUIWithPremiumStatus();
    
    // Verificar limite de fotos
    await checkPhotoLimit();
    
    // Adicionar eventos premium
    setupPremiumEventListeners();
}

// Verificar limite de fotos
async function checkPhotoLimit() {
    const photoCheck = await PremiumManager.canAddPhoto();
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    const upgradeBtn = document.getElementById('upgradePlanBtn');
    
    if (uploadBtn) {
        if (!photoCheck.canAdd) {
            uploadBtn.disabled = true;
            uploadBtn.innerHTML = '<i class="fas fa-lock"></i> Limite Free Atingido';
            uploadBtn.title = photoCheck.reason;
            
            // Mostrar botão de upgrade
            if (upgradeBtn) {
                upgradeBtn.style.display = 'inline-block';
            }
        } else {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> Escolher Foto';
            
            // Esconder botão de upgrade
            if (upgradeBtn) {
                upgradeBtn.style.display = 'none';
            }
        }
    }
}

// Configurar eventos premium
function setupPremiumEventListeners() {
    // Interceptar upload de foto para verificar limite
    const uploadBtn = document.getElementById('uploadAvatarBtn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', async function(e) {
            const photoCheck = await PremiumManager.canAddPhoto();
            if (!photoCheck.canAdd) {
                e.preventDefault();
                const upgrade = await PremiumManager.redirectToUpgradeIfNeeded('Fotos Ilimitadas');
                if (upgrade) return;
            }
        });
    }

    // Botão de upgrade
    const upgradeBtn = document.getElementById('upgradePlanBtn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', function() {
            window.location.href = 'pricing.html';
        });
    }

    // Atualizar status premium quando o usuário interagir com a página
    document.addEventListener('click', async function() {
        // Atualizar a cada 30 segundos (opcional)
        setTimeout(async () => {
            await PremiumManager.updateUIWithPremiumStatus();
            await checkPhotoLimit();
        }, 30000);
    });
}

// =============================================
// FUNÇÕES AUXILIARES
// =============================================

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