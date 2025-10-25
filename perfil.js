let currentUser = null;
let visitedUserId = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeProfile();
});

async function initializeProfile() {
    try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
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
    
    if (profile.avatar_url) {
        document.getElementById('profileAvatar').src = profile.avatar_url;
        document.getElementById('profileAvatar').style.display = 'block';
        document.getElementById('profileAvatarFallback').style.display = 'none';
    } else {
        const initials = getInitials(profile.nickname || 'U');
        document.getElementById('avatarInitials').textContent = initials;
    }

    if (profile.birth_date) {
        const age = calculateAge(profile.birth_date);
        document.getElementById('profileAge').textContent = age;
    }

    updatePremiumBadge(profile);

    document.getElementById('profileLookingFor').querySelector('span').textContent = formatLookingFor(details.looking_for) || 'Não informado';
    document.getElementById('profileGender').querySelector('span').textContent = details.gender || 'Não informado';
    document.getElementById('profileOrientation').querySelector('span').textContent = details.sexual_orientation || 'Não informado';
    document.getElementById('profileProfession').querySelector('span').textContent = details.profession || 'Não informado';
    document.getElementById('profileZodiac').querySelector('span').textContent = details.zodiac || 'Não informado';
    document.getElementById('profileReligion').querySelector('span').textContent = details.religion || 'Não informado';
    document.getElementById('profileDrinking').querySelector('span').textContent = details.drinking || 'Não informado';
    document.getElementById('profileSmoking').querySelector('span').textContent = details.smoking || 'Não informado';
    document.getElementById('profileExercise').querySelector('span').textContent = details.exercise || 'Não informado';
    document.getElementById('profilePets').querySelector('span').textContent = details.has_pets || 'Não informado';

    if (details.description) {
        document.getElementById('profileDescription').textContent = details.description;
    } else {
        document.getElementById('descriptionSection').style.display = 'none';
    }

    if (details.characteristics && details.characteristics.length > 0) {
        const container = document.getElementById('profileCharacteristics');
        container.innerHTML = details.characteristics.map(char => `
            <div class="characteristic-item">
                <i class="fas fa-check"></i>
                <span>${char}</span>
            </div>
        `).join('');
    } else {
        document.getElementById('characteristicsSection').style.display = 'none';
    }

    if (details.interests && details.interests.length > 0) {
        const container = document.getElementById('profileInterests');
        container.innerHTML = details.interests.map(interest => `
            <div class="interest-item">
                <i class="fas fa-star"></i>
                <span>${interest}</span>
            </div>
        `).join('');
    } else {
        document.getElementById('interestsSection').style.display = 'none';
    }

    checkGalleryAccess();
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

function formatLookingFor(value) {
    const options = {
        'amizade': 'Amizade',
        'namoro': 'Namoro', 
        'relacionamento_serio': 'Relacionamento Sério',
        'conversa': 'Apenas Conversa'
    };
    return options[value] || value;
}

function getImageUrl(imagePath) {
    const { data } = supabase.storage
        .from('gallery-images')
        .getPublicUrl(imagePath);
    return data.publicUrl;
}

function getInitials(name) {
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
}

function openGalleryImage(imageUrl) {
    const modal = document.getElementById('imageModal');
    const modalImg = document.getElementById('modalImageView');
    
    if (modal && modalImg) {
        modalImg.src = getImageUrl(imageUrl);
        modal.classList.add('active');
    }
}

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