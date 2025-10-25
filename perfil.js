let currentUser = null;
let visitedUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeProfile();
});

async function initializeProfile() {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        const urlParams = new URLSearchParams(window.location.search);
        visitedUserId = urlParams.get('id');
        
        if (!visitedUserId) {
            alert('Perfil não encontrado');
            window.location.href = 'home.html';
            return;
        }

        await loadUserData();

    } catch (error) {
        alert('Erro ao carregar perfil');
        window.location.href = 'home.html';
    }
}

async function loadUserData() {
    try {
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', visitedUserId)
            .single();

        if (profileError) throw profileError;

        const { data: userDetails, error: detailsError } = await supabase
            .from('user_details')
            .select('*')
            .eq('user_id', visitedUserId)
            .single();

        const details = userDetails || {};
        fillProfileData(profile, details);

    } catch (error) {
        alert('Erro ao carregar dados do usuário');
    }
}

function fillProfileData(profile, details) {
    document.getElementById('profileNickname').textContent = profile.nickname || 'Usuário';
    document.getElementById('profileLocation').textContent = profile.display_city || 'Cidade não informada';
    
    // ✅ INDICADOR ONLINE/OFFLINE - CORREÇÃO COMPLETA
    const isOnline = isUserOnline(profile.last_online_at);
    console.log('🟢 Status online:', isOnline, 'Último online:', profile.last_online_at);
    
    // Processar avatar e adicionar indicador
    processAvatarAndStatus(profile.avatar_url, isOnline);

    if (profile.birth_date) {
        const age = calculateAge(profile.birth_date);
        document.getElementById('profileAge').textContent = age;
    }

    updatePremiumBadge(profile);

    // ✅ Verificar se usuário está invisível
    if (profile.is_invisible) {
        document.getElementById('profileLocation').textContent = 'Localização oculta';
        hideSensitiveInfo();
    }

    updateField('profileRelationshipStatus', details.relationship_status);
    updateField('profileLookingFor', details.looking_for);
    updateField('profileGender', details.gender);
    updateField('profileOrientation', details.sexual_orientation);
    updateField('profileProfession', details.profession);
    updateField('profileZodiac', details.zodiac);
    updateField('profileReligion', details.religion);
    updateField('profileDrinking', details.drinking);
    updateField('profileSmoking', details.smoking);
    updateField('profileExercise', details.exercise);
    updateField('profilePets', details.has_pets);

    if (details.description) {
        document.getElementById('profileDescription').textContent = details.description;
    } else {
        document.getElementById('descriptionSection').style.display = 'none';
    }

    updateList('profileCharacteristics', details.characteristics, 'characteristicsSection');
    updateList('profileInterests', details.interests, 'interestsSection');

    checkGalleryAccess();
}

// ✅ FUNÇÃO CORRIGIDA: Processar avatar e status
function processAvatarAndStatus(avatarUrl, isOnline) {
    const avatarImg = document.getElementById('profileAvatar');
    const avatarFallback = document.getElementById('profileAvatarFallback');
    const avatarContainer = document.querySelector('.profile-avatar-large');
    
    if (!avatarContainer) {
        console.error('❌ Container do avatar não encontrado');
        return;
    }

    // Limpar indicadores existentes
    const existingIndicators = avatarContainer.querySelectorAll('.online-status-indicator');
    existingIndicators.forEach(indicator => indicator.remove());

    // Criar novo indicador
    const indicator = document.createElement('div');
    indicator.className = `online-status-indicator ${isOnline ? 'online' : 'offline'}`;
    indicator.title = isOnline ? 'Online agora' : 'Offline';
    
    // Adicionar ao container
    avatarContainer.appendChild(indicator);

    // Processar imagem do avatar
    if (avatarUrl) {
        avatarImg.src = avatarUrl;
        avatarImg.style.display = 'block';
        avatarFallback.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        avatarFallback.style.display = 'flex';
    }
}

// ✅ FUNÇÃO PARA OCULTAR INFORMAÇÕES SENSÍVEIS (MODO INVISÍVEL)
function hideSensitiveInfo() {
    // Ocultar informações detalhadas de localização
    const locationElements = document.querySelectorAll('.profile-location, [data-location]');
    locationElements.forEach(el => {
        if (el.id !== 'profileLocation') {
            el.style.display = 'none';
        }
    });
    
    // Adicionar aviso de modo invisível
    const profileHeader = document.querySelector('.profile-basic-info');
    if (profileHeader && !document.getElementById('invisibleWarning')) {
        const warning = document.createElement('div');
        warning.id = 'invisibleWarning';
        warning.className = 'invisible-warning';
        warning.innerHTML = '<i class="fas fa-eye-slash"></i> Modo invisível ativado';
        profileHeader.appendChild(warning);
    }
}

// ==================== FUNÇÕES DE FORMATAÇÃO PARA PORTUGUÊS ====================

function formatLookingFor(value) {
    const options = {
        'amizade': 'Amizade',
        'namoro': 'Namoro',
        'relacionamento_serio': 'Relacionamento Sério',
        'conversa': 'Apenas Conversa'
    };
    return options[value] || value;
}

function formatGender(value) {
    const options = {
        'feminino': 'Feminino',
        'masculino': 'Masculino',
        'nao_informar': 'Prefiro não informar',
        'outro': 'Outro'
    };
    return options[value] || value;
}

function formatSexualOrientation(value) {
    const options = {
        'heterossexual': 'Heterossexual',
        'homossexual': 'Homossexual',
        'bissexual': 'Bissexual',
        'assexual': 'Assexual',
        'pansexual': 'Pansexual',
        'outro': 'Outro',
        'prefiro_nao_informar': 'Prefiro não informar'
    };
    return options[value] || value;
}

function formatZodiac(value) {
    const options = {
        'aries': 'Áries',
        'touro': 'Touro',
        'gemeos': 'Gêmeos',
        'cancer': 'Câncer',
        'leao': 'Leão',
        'virgem': 'Virgem',
        'libra': 'Libra',
        'escorpiao': 'Escorpião',
        'sagitario': 'Sagitário',
        'capricornio': 'Capricórnio',
        'aquario': 'Aquário',
        'peixes': 'Peixes'
    };
    return options[value] || value;
}

function formatReligion(value) {
    const options = {
        'catolica': 'Católica',
        'evangelica': 'Evangélica',
        'espirita': 'Espírita',
        'umbanda_candomble': 'Umbanda/Candomblé',
        'budista': 'Budista',
        'judaica': 'Judaica',
        'islamica': 'Islâmica',
        'outra': 'Outra',
        'nenhuma': 'Nenhuma',
        'prefiro_nao_informar': 'Prefiro não informar'
    };
    return options[value] || value;
}

function formatDrinking(value) {
    const options = {
        'nao_bebo': 'Não bebo',
        'socialmente': 'Socialmente',
        'frequentemente': 'Frequentemente',
        'prefiro_nao_informar': 'Prefiro não informar'
    };
    return options[value] || value;
}

function formatSmoking(value) {
    const options = {
        'nao_fumo': 'Não fumo',
        'socialmente': 'Socialmente',
        'frequentemente': 'Frequentemente',
        'prefiro_nao_informar': 'Prefiro não informar'
    };
    return options[value] || value;
}

function formatExercise(value) {
    const options = {
        'nao_pratico': 'Não pratico',
        'ocasionalmente': 'Ocasionalmente',
        'regularmente': 'Regularmente',
        'prefiro_nao_informar': 'Prefiro não informar'
    };
    return options[value] || value;
}

function formatPets(value) {
    const options = {
        'nao': 'Não tenho',
        'sim': 'Tenho pets',
        'prefiro_nao_informar': 'Prefiro não informar'
    };
    return options[value] || value;
}

function updateField(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        const span = element.querySelector('span');
        if (span) {
            let displayValue = value;
            
            // APLICA FORMATAÇÃO PARA PORTUGUÊS
            if (elementId === 'profileLookingFor') {
                displayValue = formatLookingFor(value);
            } else if (elementId === 'profileGender') {
                displayValue = formatGender(value);
            } else if (elementId === 'profileOrientation') {
                displayValue = formatSexualOrientation(value);
            } else if (elementId === 'profileZodiac') {
                displayValue = formatZodiac(value);
            } else if (elementId === 'profileReligion') {
                displayValue = formatReligion(value);
            } else if (elementId === 'profileDrinking') {
                displayValue = formatDrinking(value);
            } else if (elementId === 'profileSmoking') {
                displayValue = formatSmoking(value);
            } else if (elementId === 'profileExercise') {
                displayValue = formatExercise(value);
            } else if (elementId === 'profilePets') {
                displayValue = formatPets(value);
            }
            
            span.textContent = displayValue || 'Não informado';
        }
    }
}

function updateList(containerId, items, sectionId) {
    const container = document.getElementById(containerId);
    const section = document.getElementById(sectionId);
    
    if (!items || items.length === 0) {
        if (section) section.style.display = 'none';
        return;
    }

    if (containerId === 'profileCharacteristics') {
        container.innerHTML = items.map(item => `
            <div class="characteristic-item">
                <i class="fas fa-check"></i>
                <span>${item}</span>
            </div>
        `).join('');
    } else if (containerId === 'profileInterests') {
        container.innerHTML = items.map(item => `
            <div class="interest-item">
                <i class="fas fa-star"></i>
                <span>${item}</span>
            </div>
        `).join('');
    }
}

async function updatePremiumBadge(profile) {
    const badge = document.getElementById('visitedUserPremiumBadge');
    if (!badge) return;

    try {
        const { data: subscription, error } = await supabase
            .from('user_subscriptions')
            .select('status, expires_at')
            .eq('user_id', visitedUserId)
            .eq('status', 'active')
            .gte('expires_at', new Date().toISOString())
            .single();

        const isPremium = !error && subscription !== null;
        
        if (isPremium) {
            badge.className = 'profile-premium-badge premium';
            badge.innerHTML = '<i class="fas fa-crown"></i> Premium';
        } else {
            badge.className = 'profile-premium-badge free';
            badge.innerHTML = '<i class="fas fa-user"></i> Free';
        }
    } catch (error) {
        badge.className = 'profile-premium-badge free';
        badge.innerHTML = '<i class="fas fa-user"></i> Free';
    }
}

async function checkGalleryAccess() {
    const premiumLock = document.getElementById('galleryPremiumLock');
    const galleryContainer = document.getElementById('galleryContainer');
    const noGallery = document.getElementById('noGalleryMessage');

    const isCurrentUserPremium = await checkCurrentUserPremium();
    
    if (isCurrentUserPremium) {
        premiumLock.style.display = 'none';
        galleryContainer.style.display = 'block';
        noGallery.style.display = 'none';
        await loadUserGallery();
    } else {
        premiumLock.style.display = 'block';
        galleryContainer.style.display = 'none';
        noGallery.style.display = 'none';
    }
}

async function checkCurrentUserPremium() {
    try {
        if (!currentUser) return false;
        
        if (typeof PremiumManager !== 'undefined') {
            return await PremiumManager.checkPremiumStatus();
        }
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', currentUser.id)
            .single();
            
        return profile?.is_premium || false;
    } catch (error) {
        return false;
    }
}

async function loadUserGallery() {
    try {
        const { data: images, error } = await supabase
            .from('user_gallery')
            .select('*')
            .eq('user_id', visitedUserId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;

        displayGallery(images || []);

    } catch (error) {
        displayGallery([]);
    }
}

function displayGallery(images) {
    const galleryGrid = document.getElementById('visitedUserGallery');
    
    if (!galleryGrid) return;
    
    if (!images || images.length === 0) {
        galleryGrid.innerHTML = `
            <div class="empty-gallery">
                <i class="fas fa-images"></i>
                <p>Este usuário não possui fotos na galeria</p>
            </div>
        `;
        return;
    }
    
    galleryGrid.innerHTML = images.map(image => `
        <div class="gallery-item" onclick="openGalleryImage('${image.image_url}')">
            <img src="${getImageUrl(image.image_url)}" 
                 alt="${image.image_name}" 
                 class="gallery-image"
                 loading="lazy">
        </div>
    `).join('');
}

function calculateAge(birthDate) {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function isUserOnline(lastOnlineAt) {
    if (!lastOnlineAt) return false;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return new Date(lastOnlineAt) > fifteenMinutesAgo;
}

function getImageUrl(imagePath) {
    const { data } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(imagePath);
    return data.publicUrl;
}

function openGalleryImage(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImageView');
    
    if (modal && modalImg) {
        modalImg.src = getImageUrl(imageUrl);
        modal.classList.add('active');
    }
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    const modal = document.getElementById('imageModal');
    const closeBtn = document.getElementById('closeModalBtn');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            if (modal) modal.classList.remove('active');
        });
    }
    
    if (modal) {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.classList.remove('active');
            }
        });
    }

    const sendMessageBtn = document.getElementById('sendMessageBtn');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', function() {
            if (visitedUserId) {
                window.location.href = `mensagens.html?user=${visitedUserId}`;
            }
        });
    }
});

// Monitorar estado de autenticação
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});

// Exportar funções para uso global
window.profileViewer = {
    initializeProfile,
    loadUserData,
    openGalleryImage,
    isUserOnline
};