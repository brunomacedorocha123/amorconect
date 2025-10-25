let currentUser = null;
let visitedUserId = null;

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    initializeProfile();
});

async function initializeProfile() {
    try {
        // Verificar autenticação
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            window.location.href = 'login.html';
            return;
        }
        currentUser = user;

        // Pegar ID da URL
        const urlParams = new URLSearchParams(window.location.search);
        visitedUserId = urlParams.get('id');
        
        if (!visitedUserId) {
            alert('Perfil não encontrado');
            window.location.href = 'home.html';
            return;
        }

        // Carregar dados do usuário
        await loadUserData();

    } catch (error) {
        console.error('Erro:', error);
        alert('Erro ao carregar perfil');
        window.location.href = 'home.html';
    }
}

async function loadUserData() {
    try {
        // Buscar perfil básico
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', visitedUserId)
            .single();

        if (profileError) {
            throw new Error('Perfil não encontrado');
        }

        // Buscar detalhes
        const { data: details, error: detailsError } = await supabase
            .from('user_details')
            .select('*')
            .eq('user_id', visitedUserId)
            .single();

        // Preencher dados na página
        fillProfileData(profile, details || {});

    } catch (error) {
        console.error('Erro ao carregar dados:', error);
        alert('Erro ao carregar dados do usuário');
    }
}

function fillProfileData(profile, details) {
    // Informações básicas
    document.getElementById('profileNickname').textContent = profile.nickname || 'Usuário';
    document.getElementById('profileLocation').textContent = profile.display_city || 'Cidade não informada';
    
    // Avatar
    if (profile.avatar_url) {
        document.getElementById('profileAvatar').src = profile.avatar_url;
        document.getElementById('profileAvatar').style.display = 'block';
        document.getElementById('profileAvatarFallback').style.display = 'none';
    } else {
        const initials = getInitials(profile.nickname || 'U');
        document.getElementById('avatarInitials').textContent = initials;
    }

    // Idade
    if (profile.birth_date) {
        const age = calculateAge(profile.birth_date);
        document.getElementById('profileAge').textContent = age;
    }

    // Status Premium
    updatePremiumBadge(profile);

    // Informações detalhadas
    updateDetail('profileLookingFor', details.looking_for);
    updateDetail('profileGender', details.gender);
    updateDetail('profileOrientation', details.sexual_orientation);
    updateDetail('profileProfession', details.profession);
    updateDetail('profileZodiac', details.zodiac);
    updateDetail('profileReligion', details.religion);
    updateDetail('profileDrinking', details.drinking);
    updateDetail('profileSmoking', details.smoking);
    updateDetail('profileExercise', details.exercise);
    updateDetail('profilePets', details.has_pets);

    // Descrição
    if (details.description) {
        document.getElementById('profileDescription').textContent = details.description;
    } else {
        document.getElementById('descriptionSection').style.display = 'none';
    }

    // Características
    updateListSection('profileCharacteristics', details.characteristics, 'characteristicsSection');

    // Interesses
    updateListSection('profileInterests', details.interests, 'interestsSection');

    // Verificar galeria
    checkGalleryAccess();
}

function updateDetail(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        const span = element.querySelector('span');
        if (span) {
            span.textContent = value || 'Não informado';
        }
    }
}

function updateListSection(containerId, items, sectionId) {
    const container = document.getElementById(containerId);
    const section = document.getElementById(sectionId);
    
    if (!items || items.length === 0) {
        section.style.display = 'none';
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

function updatePremiumBadge(profile) {
    const badge = document.getElementById('visitedUserPremiumBadge');
    if (!badge) return;

    // Verificação simples de premium - ajuste conforme sua lógica
    const isPremium = profile.is_premium || false;
    
    if (isPremium) {
        badge.className = 'profile-premium-badge premium';
        badge.innerHTML = '<i class="fas fa-crown"></i> Premium';
    } else {
        badge.className = 'profile-premium-badge free';
        badge.innerHTML = '<i class="fas fa-user"></i> Free';
    }
}

async function checkGalleryAccess() {
    const premiumLock = document.getElementById('galleryPremiumLock');
    const galleryContainer = document.getElementById('galleryContainer');
    const noGallery = document.getElementById('noGalleryMessage');

    // Verificar se usuário atual é premium
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
        
        // Usar sua lógica premium existente
        if (typeof PremiumManager !== 'undefined') {
            return await PremiumManager.checkPremiumStatus();
        }
        
        // Fallback simples
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

    if (images.length === 0) {
        galleryGrid.innerHTML = `
            <div class="empty-gallery">
                <i class="fas fa-images"></i>
                <p>Nenhuma foto na galeria</p>
            </div>
        `;
        return;
    }

    galleryGrid.innerHTML = images.map(image => `
        <div class="gallery-item" onclick="openImageModal('${image.image_url}')">
            <img src="${getImageUrl(image.image_url)}" 
                 alt="Foto do usuário" 
                 class="gallery-image"
                 loading="lazy">
        </div>
    `).join('');
}

function getImageUrl(imagePath) {
    if (!imagePath) return '';
    const { data } = supabase.storage.from('gallery-images').getPublicUrl(imagePath);
    return data.publicUrl;
}

function openImageModal(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImageView');
    
    if (modal && modalImg) {
        modalImg.src = getImageUrl(imageUrl);
        modal.classList.add('active');
    }
}

function calculateAge(birthDate) {
    if (!birthDate) return '--';
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    
    return age;
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    // Modal
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

    // Botão enviar mensagem
    const messageBtn = document.getElementById('sendMessageBtn');
    if (messageBtn) {
        messageBtn.addEventListener('click', function() {
            if (visitedUserId) {
                window.location.href = `mensagens.html?user=${visitedUserId}`;
            }
        });
    }
});

// Monitorar autenticação
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});