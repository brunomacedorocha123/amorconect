// perfil.js - Sistema completo de visualização de perfil
let currentUser = null;
let visitedUserId = null;
let feelStatus = {
    hasGivenFeel: false,
    feelId: null
};

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

        await registerProfileVisit();
        await loadUserData();
        await checkFeelStatus();
        setupMessageButton();

    } catch (error) {
        alert('Erro ao carregar perfil');
        window.location.href = 'home.html';
    }
}

// Registrar visita automaticamente
async function registerProfileVisit() {
    try {
        if (!currentUser || !visitedUserId || currentUser.id === visitedUserId) {
            return;
        }

        await supabase
            .from('profile_visits')
            .upsert({
                visitor_id: currentUser.id,
                visited_id: visitedUserId,
                visited_at: new Date().toISOString()
            }, {
                onConflict: 'visitor_id,visited_id'
            });

    } catch (error) {
        // Silencioso
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
    
    // Status Online/Offline
    const isOnline = isUserOnline(profile.last_online_at);
    createOnlineStatusDisplay(isOnline);
    
    // Localização
    if (profile.is_invisible) {
        document.getElementById('profileLocation').textContent = 'Localização oculta';
        hideSensitiveInfo();
    } else {
        document.getElementById('profileLocation').textContent = profile.display_city || 'Cidade não informada';
    }

    // Avatar
    if (profile.avatar_url) {
        document.getElementById('profileAvatar').src = profile.avatar_url;
        document.getElementById('profileAvatar').style.display = 'block';
        document.getElementById('profileAvatarFallback').style.display = 'none';
    }

    if (profile.birth_date) {
        const age = calculateAge(profile.birth_date);
        document.getElementById('profileAge').textContent = age;
    }

    updatePremiumBadge(profile);

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

// ==================== BOTÃO ENVIAR MENSAGEM ====================

function setupMessageButton() {
    const sendMessageBtn = document.getElementById('sendMessageBtn');
    if (sendMessageBtn) {
        sendMessageBtn.addEventListener('click', sendMessageToUser);
    }
}

async function sendMessageToUser() {
    try {
        if (!currentUser || !visitedUserId) {
            showNotification('Erro: usuário não identificado', 'error');
            return;
        }

        if (currentUser.id === visitedUserId) {
            showNotification('Você não pode enviar mensagem para si mesmo', 'error');
            return;
        }

        const isBlocked = await checkIfBlocked();
        if (isBlocked) {
            showNotification('Não é possível enviar mensagem para este usuário', 'error');
            return;
        }

        const canSend = await checkCanSendMessage();
        if (!canSend.can_send) {
            handleSendMessageError(canSend.reason);
            return;
        }

        window.location.href = `mensagens.html?user=${visitedUserId}`;

    } catch (error) {
        showNotification('Erro ao tentar enviar mensagem', 'error');
    }
}

async function checkIfBlocked() {
    try {
        const { data, error } = await supabase
            .from('user_blocks')
            .select('id')
            .or(`and(blocker_id.eq.${currentUser.id},blocked_id.eq.${visitedUserId}),and(blocker_id.eq.${visitedUserId},blocked_id.eq.${currentUser.id})`);

        if (error) throw error;

        return data && data.length > 0;
    } catch (error) {
        return false;
    }
}

async function checkCanSendMessage() {
    try {
        const isPremium = await checkCurrentUserPremium();
        if (isPremium) {
            return { can_send: true, reason: 'premium' };
        }

        const { data: limits, error } = await supabase
            .from('user_message_limits')
            .select('messages_sent_today, last_reset_date')
            .eq('user_id', currentUser.id)
            .single();

        if (error) {
            return { can_send: true, reason: 'can_send' };
        }

        const today = new Date().toISOString().split('T')[0];
        if (limits.last_reset_date !== today) {
            return { can_send: true, reason: 'can_send' };
        }

        if (limits.messages_sent_today >= 4) {
            return { can_send: false, reason: 'limit_reached' };
        }

        return { can_send: true, reason: 'can_send' };

    } catch (error) {
        return { can_send: false, reason: 'unknown_error' };
    }
}

function handleSendMessageError(reason) {
    switch (reason) {
        case 'limit_reached':
            showNotification('Você atingiu o limite de 4 mensagens por dia. Volte amanhã!', 'error');
            break;
        case 'blocked':
            showNotification('Não é possível enviar mensagem para este usuário.', 'error');
            break;
        case 'unknown_error':
            showNotification('Erro ao verificar permissão de mensagem.', 'error');
            break;
        default:
            showNotification('Não é possível enviar mensagem no momento.', 'error');
    }
}

// ==================== SISTEMA FEEL NO PERFIL ====================

async function checkFeelStatus() {
    try {
        if (!currentUser || !visitedUserId || currentUser.id === visitedUserId) {
            hideFeelButton();
            return;
        }
        
        const { data, error } = await supabase
            .from('user_feels')
            .select('id')
            .eq('giver_id', currentUser.id)
            .eq('receiver_id', visitedUserId)
            .single();

        if (data && !error) {
            feelStatus.hasGivenFeel = true;
            feelStatus.feelId = data.id;
            updateFeelButton(true);
        } else {
            feelStatus.hasGivenFeel = false;
            feelStatus.feelId = null;
            updateFeelButton(false);
        }
    } catch (error) {
        updateFeelButton(false);
    }
}

function updateFeelButton(hasFeel) {
    const feelBtn = document.getElementById('feelBtn');
    const feelText = document.getElementById('feelText');
    const feelIcon = feelBtn.querySelector('i');
    
    if (!feelBtn) return;
    
    if (hasFeel) {
        feelBtn.classList.add('active');
        feelIcon.className = 'fas fa-heart';
        feelText.textContent = 'Feel Enviado';
        feelBtn.onclick = () => removeFeel();
    } else {
        feelBtn.classList.remove('active');
        feelIcon.className = 'far fa-heart';
        feelText.textContent = 'Dar Feel';
        feelBtn.onclick = () => sendFeel();
    }
    
    feelBtn.style.display = 'flex';
}

function hideFeelButton() {
    const feelBtn = document.getElementById('feelBtn');
    if (feelBtn) {
        feelBtn.style.display = 'none';
    }
}

async function sendFeel() {
    try {
        if (!currentUser || !visitedUserId) return;
        
        if (typeof window.FeelManager !== 'undefined') {
            const success = await window.FeelManager.sendFeel(visitedUserId);
            if (success) {
                feelStatus.hasGivenFeel = true;
                updateFeelButton(true);
            }
        } else {
            const { data, error } = await supabase
                .from('user_feels')
                .insert({
                    giver_id: currentUser.id,
                    receiver_id: visitedUserId,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') {
                    showNotification('Você já deu Feel neste perfil!');
                } else {
                    throw error;
                }
                return;
            }

            feelStatus.hasGivenFeel = true;
            feelStatus.feelId = data.id;
            updateFeelButton(true);
            showNotification('Feel enviado com sucesso! ❤️');
        }
        
    } catch (error) {
        showNotification('Erro ao enviar Feel. Tente novamente.', 'error');
    }
}

async function removeFeel() {
    try {
        if (!currentUser || !visitedUserId) return;
        
        if (typeof window.FeelManager !== 'undefined') {
            const success = await window.FeelManager.removeFeel(visitedUserId);
            if (success) {
                feelStatus.hasGivenFeel = false;
                updateFeelButton(false);
            }
        } else {
            const { error } = await supabase
                .from('user_feels')
                .delete()
                .eq('giver_id', currentUser.id)
                .eq('receiver_id', visitedUserId);

            if (error) throw error;

            feelStatus.hasGivenFeel = false;
            feelStatus.feelId = null;
            updateFeelButton(false);
            showNotification('Feel removido');
        }
        
    } catch (error) {
        showNotification('Erro ao remover Feel.', 'error');
    }
}

// ==================== SISTEMA DE GALERIA CORRIGIDO ====================

async function checkGalleryAccess() {
    const premiumLock = document.getElementById('galleryPremiumLock');
    const galleryContainer = document.getElementById('galleryContainer');
    const noGallery = document.getElementById('noGalleryMessage');

    const isVisitedUserPremium = await checkVisitedUserPremium();
    
    if (isVisitedUserPremium) {
        premiumLock.style.display = 'none';
        await loadUserGallery();
        
        const hasPhotos = document.querySelectorAll('.gallery-item').length > 0;
        if (hasPhotos) {
            galleryContainer.style.display = 'block';
            noGallery.style.display = 'none';
        } else {
            galleryContainer.style.display = 'none';
            noGallery.style.display = 'block';
        }
    } else {
        premiumLock.style.display = 'block';
        galleryContainer.style.display = 'none';
        noGallery.style.display = 'none';
    }
}

// CORREÇÃO: Verificar se o USUÁRIO VISITADO é premium
async function checkVisitedUserPremium() {
    try {
        if (!visitedUserId) return false;
        
        const { data: subscription, error: subError } = await supabase
            .from('user_subscriptions')
            .select('status, expires_at')
            .eq('user_id', visitedUserId)
            .eq('status', 'active')
            .gte('expires_at', new Date().toISOString())
            .single();

        if (subscription && !subError) {
            return true;
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('is_premium')
            .eq('id', visitedUserId)
            .single();

        return !profileError && profile?.is_premium;

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

// ==================== FUNÇÕES AUXILIARES ====================

function createOnlineStatusDisplay(isOnline) {
    const profileBasicInfo = document.querySelector('.profile-basic-info');
    if (!profileBasicInfo) return;

    const existingStatus = document.getElementById('onlineStatusDisplay');
    if (existingStatus) {
        existingStatus.remove();
    }

    const statusElement = document.createElement('div');
    statusElement.id = 'onlineStatusDisplay';
    statusElement.className = `online-status-display ${isOnline ? 'online' : 'offline'}`;
    
    if (isOnline) {
        statusElement.innerHTML = `
            <i class="fas fa-circle online-dot"></i>
            <span>Online agora</span>
        `;
    } else {
        statusElement.innerHTML = `
            <i class="fas fa-circle offline-dot"></i>
            <span>Offline</span>
        `;
    }

    const locationElement = document.getElementById('profileLocation');
    if (locationElement && locationElement.parentNode) {
        locationElement.parentNode.insertBefore(statusElement, locationElement.nextSibling);
    } else {
        profileBasicInfo.appendChild(statusElement);
    }
}

function hideSensitiveInfo() {
    const locationElements = document.querySelectorAll('.profile-location, [data-location]');
    locationElements.forEach(el => {
        if (el.id !== 'profileLocation') {
            el.style.display = 'none';
        }
    });
    
    const profileHeader = document.querySelector('.profile-basic-info');
    if (profileHeader && !document.getElementById('invisibleWarning')) {
        const warning = document.createElement('div');
        warning.id = 'invisibleWarning';
        warning.className = 'invisible-warning';
        warning.innerHTML = '<i class="fas fa-eye-slash"></i> Modo invisível ativado';
        profileHeader.appendChild(warning);
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

// ==================== FUNÇÕES DE FORMATAÇÃO ====================

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

function showNotification(message, type = 'success') {
    if (typeof window.showNotification === 'function') {
        window.showNotification(message, type);
    } else {
        alert(message);
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
    isUserOnline,
    sendFeel,
    removeFeel,
    sendMessageToUser
};