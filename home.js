// home.js - VERSÃO CORRIGIDA
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentFilter = 'all';
const maxHomeCards = 8;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    const authenticated = await checkAuthentication();
    if (authenticated) {
        setupEventListeners();
        await loadUserProfile();
        await loadUsers();
    }
}

async function checkAuthentication() {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        window.location.href = 'login.html';
        return false;
    }
    
    currentUser = user;
    return true;
}

function setupEventListeners() {
    const menuToggle = document.getElementById('menuToggle');
    const mainNav = document.getElementById('mainNav');
    
    if (menuToggle && mainNav) {
        menuToggle.addEventListener('click', function() {
            mainNav.classList.toggle('active');
            menuToggle.classList.toggle('active');
        });
    }

    const filterButtons = document.querySelectorAll('.btn-filter');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            const filter = this.getAttribute('data-filter');
            setActiveFilter(filter);
        });
    });

    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            mainNav.classList.remove('active');
            menuToggle.classList.remove('active');
        });
    });
}

async function loadUserProfile() {
    const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();

    if (!error) {
        updateUserHeader(profile);
    }
}

function updateUserHeader(profile) {
    const avatarImg = document.getElementById('userAvatarImg');
    const avatarFallback = document.getElementById('avatarFallback');
    
    if (profile.avatar_url) {
        avatarImg.src = profile.avatar_url;
        avatarImg.style.display = 'block';
        avatarFallback.style.display = 'none';
    } else {
        avatarImg.style.display = 'none';
        avatarFallback.style.display = 'flex';
        avatarFallback.textContent = getUserInitials(profile.nickname || currentUser.email);
    }

    const userName = document.getElementById('userName');
    if (userName) {
        userName.textContent = profile.nickname || currentUser.email.split('@')[0];
    }

    const welcomeMessage = document.getElementById('welcomeMessage');
    if (welcomeMessage) {
        const firstName = (profile.nickname || currentUser.email.split('@')[0]).split(' ')[0];
        welcomeMessage.textContent = `Olá, ${firstName}!`;
    }

    const userStatus = document.getElementById('userStatus');
    if (userStatus && isUserOnline(profile.last_online_at)) {
        userStatus.textContent = 'Online';
        userStatus.style.color = 'var(--online)';
    }
}

async function loadUsers() {
    const usersGrid = document.getElementById('usersGrid');
    usersGrid.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Carregando pessoas...</p>
        </div>
    `;

    const users = await fetchUsers();
    displayUsers(users);
}

async function fetchUsers() {
    let query = supabase
        .from('profiles')
        .select(`
            *,
            user_details (
                zodiac,
                relationship_status,
                gender,
                sexual_orientation
            )
        `)
        .neq('id', currentUser.id)
        .eq('is_invisible', false)
        .order('last_online_at', { ascending: false })
        .limit(50);

    if (currentFilter === 'online') {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        query = query.gte('last_online_at', fifteenMinutesAgo);
    } else if (currentFilter === 'premium') {
        query = query.eq('is_premium', true);
    }

    const { data: profiles, error } = await query;

    if (error) return [];

    const filteredProfiles = await filterBySexualCompatibility(profiles);
    const prioritizedUsers = prioritizeUsers(filteredProfiles);
    
    return prioritizedUsers.slice(0, maxHomeCards);
}

async function filterBySexualCompatibility(profiles) {
    const { data: currentUserDetails, error } = await supabase
        .from('user_details')
        .select('gender, sexual_orientation')
        .eq('user_id', currentUser.id)
        .single();

    if (error || !currentUserDetails) {
        return profiles;
    }

    const currentGender = currentUserDetails.gender;
    const currentOrientation = currentUserDetails.sexual_orientation;

    return profiles.filter(profile => {
        const profileGender = profile.user_details?.[0]?.gender;
        const profileOrientation = profile.user_details?.[0]?.sexual_orientation;

        if (!profileGender || !profileOrientation) {
            return true;
        }

        return isSexuallyCompatible(currentGender, currentOrientation, profileGender, profileOrientation);
    });
}

function isSexuallyCompatible(currentGender, currentOrientation, profileGender, profileOrientation) {
    if (!currentGender || !currentOrientation || !profileGender || !profileOrientation) {
        return true;
    }

    if (currentOrientation === 'heterossexual') {
        return profileGender !== currentGender;
    } else if (currentOrientation === 'homossexual') {
        return profileGender === currentGender;
    } else if (currentOrientation === 'bissexual') {
        return true;
    }

    return true;
}

function prioritizeUsers(users) {
    return users.sort((a, b) => {
        const aPremium = a.is_premium && (!a.premium_expires_at || new Date(a.premium_expires_at) > new Date());
        const bPremium = b.is_premium && (!b.premium_expires_at || new Date(b.premium_expires_at) > new Date());
        
        if (aPremium && !bPremium) return -1;
        if (!aPremium && bPremium) return 1;
        
        const aOnline = isUserOnline(a.last_online_at);
        const bOnline = isUserOnline(b.last_online_at);
        if (aOnline && !bOnline) return -1;
        if (!aOnline && bOnline) return 1;
        
        return 0;
    });
}

function displayUsers(profiles) {
    const usersGrid = document.getElementById('usersGrid');
    
    if (!profiles || profiles.length === 0) {
        usersGrid.innerHTML = `
            <div class="loading-state">
                <p>Nenhuma pessoa encontrada no momento.</p>
            </div>
        `;
        return;
    }

    usersGrid.innerHTML = profiles.map(profile => createUserCard(profile)).join('');
}

function createUserCard(profile) {
    const details = profile.user_details?.[0] || {};
    const age = profile.birth_date ? calculateAge(profile.birth_date) : '--';
    const isOnline = isUserOnline(profile.last_online_at);
    const isPremium = profile.is_premium && 
                     (!profile.premium_expires_at || new Date(profile.premium_expires_at) > new Date());

    return `
        <div class="user-card" onclick="viewUserProfile('${profile.id}')">
            <div class="user-header">
                <div class="user-avatar-small">
                    ${profile.avatar_url ? 
                        `<img src="${profile.avatar_url}" alt="${profile.nickname}">` : 
                        `<div class="avatar-fallback">${getUserInitials(profile.nickname)}</div>`
                    }
                </div>
                <div class="user-info">
                    <div class="user-name">${profile.nickname || 'Usuário'}</div>
                    <div class="user-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${profile.display_city || 'Localização não informada'}
                    </div>
                    <div class="user-premium-badge ${isPremium ? 'premium' : 'free'}">
                        ${isPremium ? '👑 Premium' : '👤 Free'}
                    </div>
                </div>
            </div>
            <div class="user-details">
                <div class="user-detail">
                    <strong>Idade:</strong> <span>${age} anos</span>
                </div>
                <div class="user-detail">
                    <strong>Signo:</strong> <span>${formatZodiac(details.zodiac) || 'Não informado'}</span>
                </div>
                <div class="user-detail">
                    <strong>Status:</strong> <span>${formatRelationshipStatus(details.relationship_status) || 'Não informado'}</span>
                </div>
                <div class="online-status ${isOnline ? 'status-online' : 'status-offline'}">
                    <span class="status-dot"></span>
                    <span>${isOnline ? 'Online agora' : 'Offline'}</span>
                </div>
            </div>
            <button class="view-profile-btn" onclick="event.stopPropagation(); viewUserProfile('${profile.id}')">
                <i class="fas fa-user"></i> Ver Perfil
            </button>
        </div>
    `;
}

function setActiveFilter(filter) {
    currentFilter = filter;
    
    document.querySelectorAll('.btn-filter').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    
    loadUsers();
}

function goToPerfil() {
    window.location.href = 'painel.html';
}

function goToMensagens() {
    window.location.href = 'mensagens.html';
}

function goToBusca() {
    window.location.href = 'busca.html';
}

function goToPricing() {
    window.location.href = 'pricing.html';
}

function viewUserProfile(userId) {
    window.location.href = `perfil.html?id=${userId}`;
}

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = 'login.html';
    }
}

function getUserInitials(name) {
    if (!name) return 'U';
    return name
        .split(' ')
        .map(word => word.charAt(0))
        .join('')
        .toUpperCase()
        .substring(0, 2);
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

function isUserOnline(lastOnlineAt) {
    if (!lastOnlineAt) return false;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return new Date(lastOnlineAt) > fifteenMinutesAgo;
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

function formatRelationshipStatus(value) {
    const options = {
        'solteiro': 'Solteiro(a)',
        'namorando': 'Namorando',
        'casado': 'Casado(a)',
        'divorciado': 'Divorciado(a)',
        'viuvo': 'Viúvo(a)',
        'separado': 'Separado(a)'
    };
    return options[value] || value;
}

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});