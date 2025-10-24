// Configuração do Supabase
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let visitedUserId = null;

// Botão X
document.getElementById('closeProfile').addEventListener('click', function() {
    window.history.back();
});

// Carregar perfil
document.addEventListener('DOMContentLoaded', async function() {
    await loadProfile();
});

async function loadProfile() {
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
            window.history.back();
            return;
        }

        await loadUserData();

    } catch (error) {
        alert('Erro ao carregar perfil');
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

        const { data: details, error: detailsError } = await supabase
            .from('user_details')
            .select('*')
            .eq('user_id', visitedUserId)
            .single();

        fillProfileData(profile, details || {});

    } catch (error) {
        alert('Erro ao carregar dados do usuário');
    }
}

function fillProfileData(profile, details) {
    document.getElementById('profileNickname').textContent = profile.nickname || 'Usuário';
    document.getElementById('profileLocation').textContent = profile.display_city || 'Cidade não informada';
    
    if (profile.avatar_url) {
        const avatarImg = document.getElementById('profileAvatar');
        const avatarFallback = document.getElementById('profileAvatarFallback');
        if (avatarImg && avatarFallback) {
            avatarImg.src = profile.avatar_url;
            avatarImg.style.display = 'block';
            avatarFallback.style.display = 'none';
        }
    }

    if (profile.birth_date) {
        const age = calculateAge(profile.birth_date);
        document.getElementById('profileAge').textContent = age;
    }

    const isPremium = profile.is_premium && 
                     (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());
    
    const premiumBadge = document.getElementById('visitedUserPremiumBadge');
    if (premiumBadge) {
        if (isPremium) {
            premiumBadge.className = 'profile-premium-badge premium';
            premiumBadge.innerHTML = '<i class="fas fa-crown"></i> Premium';
        } else {
            premiumBadge.className = 'profile-premium-badge free';
            premiumBadge.innerHTML = '<i class="fas fa-user"></i> Free';
        }
    }

    document.getElementById('profileLookingFor').querySelector('span').textContent = 
        formatLookingFor(details.looking_for) || 'Não informado';
    document.getElementById('profileGender').querySelector('span').textContent = 
        details.gender || 'Não informado';
    document.getElementById('profileOrientation').querySelector('span').textContent = 
        details.sexual_orientation || 'Não informado';
    document.getElementById('profileProfession').querySelector('span').textContent = 
        details.profession || 'Não informado';
    document.getElementById('profileZodiac').querySelector('span').textContent = 
        details.zodiac || 'Não informado';

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

    document.getElementById('profileReligion').querySelector('span').textContent = 
        details.religion || 'Não informado';
    document.getElementById('profileDrinking').querySelector('span').textContent = 
        details.drinking || 'Não informado';
    document.getElementById('profileSmoking').querySelector('span').textContent = 
        details.smoking || 'Não informado';
    document.getElementById('profileExercise').querySelector('span').textContent = 
        details.exercise || 'Não informado';
    document.getElementById('profilePets').querySelector('span').textContent = 
        details.has_pets || 'Não informado';

    const lifestyleItems = ['religion', 'drinking', 'smoking', 'exercise', 'has_pets'];
    const allLifestyleEmpty = lifestyleItems.every(item => !details[item]);
    if (allLifestyleEmpty) {
        document.getElementById('lifestyleSection').style.display = 'none';
    }

    checkGalleryAccess(isPremium);
}

function checkGalleryAccess(isVisitedUserPremium) {
    const galleryPremiumLock = document.getElementById('galleryPremiumLock');
    const galleryContainer = document.getElementById('galleryContainer');
    const noGalleryMessage = document.getElementById('noGalleryMessage');

    if (!isVisitedUserPremium) {
        galleryPremiumLock.style.display = 'none';
        galleryContainer.style.display = 'none';
        noGalleryMessage.style.display = 'block';
    } else {
        checkCurrentUserPremiumStatus();
    }
}

async function checkCurrentUserPremiumStatus() {
    try {
        const { data: currentUserProfile } = await supabase
            .from('profiles')
            .select('is_premium, premium_expires_at')
            .eq('id', currentUser.id)
            .single();

        const isCurrentUserPremium = currentUserProfile?.is_premium && 
                                   (!currentUserProfile.premium_expires_at || 
                                    new Date(currentUserProfile.premium_expires_at) > new Date());

        const galleryPremiumLock = document.getElementById('galleryPremiumLock');
        const galleryContainer = document.getElementById('galleryContainer');
        const noGalleryMessage = document.getElementById('noGalleryMessage');

        if (isCurrentUserPremium) {
            galleryPremiumLock.style.display = 'none';
            galleryContainer.style.display = 'block';
            noGalleryMessage.style.display = 'none';
            await loadVisitedUserGallery();
        } else {
            galleryPremiumLock.style.display = 'block';
            galleryContainer.style.display = 'none';
            noGalleryMessage.style.display = 'none';
        }

    } catch (error) {
        const galleryPremiumLock = document.getElementById('galleryPremiumLock');
        const galleryContainer = document.getElementById('galleryContainer');
        const noGalleryMessage = document.getElementById('noGalleryMessage');
        
        galleryPremiumLock.style.display = 'block';
        galleryContainer.style.display = 'none';
        noGalleryMessage.style.display = 'none';
    }
}

async function loadVisitedUserGallery() {
    try {
        const { data: galleryImages, error } = await supabase
            .from('user_gallery')
            .select('*')
            .eq('user_id', visitedUserId)
            .eq('is_active', true)
            .order('uploaded_at', { ascending: false });

        if (error) throw error;

        displayVisitedUserGallery(galleryImages || []);

    } catch (error) {
        displayVisitedUserGallery([]);
    }
}

function displayVisitedUserGallery(images) {
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
});

document.getElementById('sendMessageBtn').addEventListener('click', function() {
    if (visitedUserId) {
        window.location.href = `mensagens.html?user=${visitedUserId}`;
    }
});

document.getElementById('likeProfileBtn').addEventListener('click', function() {
    alert('Curtido! 💖');
});