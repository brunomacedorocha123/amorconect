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
        // CONSULTA SIMPLES E DIRETA - SEM JOIN COMPLEXO
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', visitedUserId)
            .single();

        if (profileError) throw profileError;

        // CONSULTA SEPARADA PARA user_details
        const { data: userDetails, error: detailsError } = await supabase
            .from('user_details')
            .select('*')
            .eq('user_id', visitedUserId)
            .single();

        // Se não encontrar detalhes, usa objeto vazio
        const details = userDetails || {};

        fillProfileData(profile, details);

    } catch (error) {
        alert('Erro ao carregar dados do usuário');
    }
}

function fillProfileData(profile, details) {
    // DADOS BÁSICOS
    document.getElementById('profileNickname').textContent = profile.nickname || 'Usuário';
    document.getElementById('profileLocation').textContent = profile.display_city || 'Cidade não informada';
    
    // AVATAR
    if (profile.avatar_url) {
        document.getElementById('profileAvatar').src = profile.avatar_url;
        document.getElementById('profileAvatar').style.display = 'block';
        document.getElementById('profileAvatarFallback').style.display = 'none';
    }

    // IDADE
    if (profile.birth_date) {
        const age = calculateAge(profile.birth_date);
        document.getElementById('profileAge').textContent = age;
    }

    // PREMIUM BADGE
    updatePremiumBadge(profile);

    // DADOS DETALHADOS - CORRIGIDOS
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

    // DESCRIÇÃO
    if (details.description) {
        document.getElementById('profileDescription').textContent = details.description;
    } else {
        document.getElementById('descriptionSection').style.display = 'none';
    }

    // CARACTERÍSTICAS
    updateList('profileCharacteristics', details.characteristics, 'characteristicsSection');

    // INTERESSES
    updateList('profileInterests', details.interests, 'interestsSection');

    // GALERIA
    checkGalleryAccess();
}

// FUNÇÃO AUXILIAR PARA ATUALIZAR CAMPOS
function updateField(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        const span = element.querySelector('span');
        if (span) {
            span.textContent = value || 'Não informado';
        }
    }
}

// FUNÇÃO AUXILIAR PARA LISTAS
function updateList(containerId, items, sectionId) {
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

// EVENT LISTENERS
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

    document.getElementById('sendMessageBtn').addEventListener('click', function() {
        if (visitedUserId) {
            window.location.href = `mensagens.html?user=${visitedUserId}`;
        }
    });
});

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});