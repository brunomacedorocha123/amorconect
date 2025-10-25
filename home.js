// home.js - VERSÃO RÁPIDA
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
}

async function loadUsers() {
    const usersGrid = document.getElementById('usersGrid');
    usersGrid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Carregando pessoas...</p></div>';

    let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id)
        .eq('is_invisible', false)
        .limit(8);

    if (currentFilter === 'online') {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        query = query.gte('last_online_at', fifteenMinutesAgo);
    } else if (currentFilter === 'premium') {
        query = query.eq('is_premium', true);
    }

    const { data: profiles, error } = await query;

    if (error) {
        usersGrid.innerHTML = '<div class="loading-state"><p>Erro ao carregar.</p></div>';
        return;
    }

    if (!profiles || profiles.length === 0) {
        usersGrid.innerHTML = '<div class="loading-state"><p>Nenhuma pessoa encontrada.</p></div>';
        return;
    }

    displayUsers(profiles);
}

function displayUsers(profiles) {
    const usersGrid = document.getElementById('usersGrid');
    usersGrid.innerHTML = profiles.map(profile => `
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
                    <div class="user-premium-badge ${profile.is_premium ? 'premium' : 'free'}">
                        ${profile.is_premium ? '👑 Premium' : '👤 Free'}
                    </div>
                </div>
            </div>
            <div class="user-details">
                <div class="user-detail">
                    <strong>Status:</strong> <span>Ativo</span>
                </div>
                <div class="online-status ${isUserOnline(profile.last_online_at) ? 'status-online' : 'status-offline'}">
                    <span class="status-dot"></span>
                    <span>${isUserOnline(profile.last_online_at) ? 'Online agora' : 'Offline'}</span>
                </div>
            </div>
            <button class="view-profile-btn" onclick="event.stopPropagation(); viewUserProfile('${profile.id}')">
                <i class="fas fa-user"></i> Ver Perfil
            </button>
        </div>
    `).join('');
}

function setActiveFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
    loadUsers();
}

function getUserInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
}

function isUserOnline(lastOnlineAt) {
    if (!lastOnlineAt) return false;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return new Date(lastOnlineAt) > fifteenMinutesAgo;
}

function viewUserProfile(userId) {
    window.location.href = `perfil.html?id=${userId}`;
}

function goToPerfil() { window.location.href = 'painel.html'; }
function goToMensagens() { window.location.href = 'mensagens.html'; }
function goToBusca() { window.location.href = 'busca.html'; }
function goToPricing() { window.location.href = 'pricing.html'; }

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = 'login.html';
}

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') window.location.href = 'login.html';
});