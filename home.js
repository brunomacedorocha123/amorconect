// home.js - VERSÃO COMPLETA CORRIGIDA
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentFilter = 'all';
let currentBlockingUser = null;

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

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeAllModals();
        }
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

    // PRIMEIRO: Busca os dados do usuário atual
    const { data: currentUserDetails, error: detailsError } = await supabase
        .from('user_details')
        .select('gender, sexual_orientation')
        .eq('user_id', currentUser.id)
        .single();

    if (detailsError || !currentUserDetails) {
        usersGrid.innerHTML = '<div class="loading-state"><p>Erro ao carregar preferências do usuário.</p></div>';
        return;
    }

    // Busca todos os perfis visíveis
    let query = supabase
        .from('profiles')
        .select('*')
        .neq('id', currentUser.id)
        .eq('is_invisible', false);

    // Aplica filtros adicionais (online, premium)
    if (currentFilter === 'online') {
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
        query = query.gte('last_online_at', fifteenMinutesAgo);
    } else if (currentFilter === 'premium') {
        query = query.eq('is_premium', true);
    }

    const { data: profiles, error } = await query;

    if (error) {
        usersGrid.innerHTML = '<div class="loading-state"><p>Erro ao carregar usuários.</p></div>';
        return;
    }

    if (!profiles || profiles.length === 0) {
        usersGrid.innerHTML = '<div class="loading-state"><p>Nenhuma pessoa encontrada.</p></div>';
        return;
    }

    // FILTRO POR ORIENTAÇÃO SEXUAL - CORRIGIDO
    const userOrientation = currentUserDetails.sexual_orientation;
    const userGender = currentUserDetails.gender;

    // Busca os user_details dos perfis encontrados
    const profileIds = profiles.map(profile => profile.id);
    const { data: allUserDetails, error: detailsError2 } = await supabase
        .from('user_details')
        .select('user_id, gender')
        .in('user_id', profileIds);

    if (detailsError2) {
        usersGrid.innerHTML = '<div class="loading-state"><p>Erro ao carregar detalhes dos usuários.</p></div>';
        return;
    }

    // Cria um mapa de gender por user_id
    const genderMap = {};
    allUserDetails?.forEach(detail => {
        genderMap[detail.user_id] = detail.gender;
    });

    // Filtra os perfis baseado na orientação sexual
    let filteredProfiles = profiles;

    if (userOrientation === 'heterossexual') {
        if (userGender === 'homem') {
            // Homem hetero: vê apenas mulheres
            filteredProfiles = profiles.filter(profile => genderMap[profile.id] === 'mulher');
        } else if (userGender === 'mulher') {
            // Mulher hetero: vê apenas homens
            filteredProfiles = profiles.filter(profile => genderMap[profile.id] === 'homem');
        }
    } else if (userOrientation === 'homossexual') {
        if (userGender === 'homem') {
            // Homem homo: vê apenas homens
            filteredProfiles = profiles.filter(profile => genderMap[profile.id] === 'homem');
        } else if (userGender === 'mulher') {
            // Mulher homo: vê apenas mulheres
            filteredProfiles = profiles.filter(profile => genderMap[profile.id] === 'mulher');
        }
    }
    // Para bissexual ou outros, não aplica filtro (vê todos)

    if (filteredProfiles.length === 0) {
        usersGrid.innerHTML = '<div class="loading-state"><p>Nenhuma pessoa encontrada com suas preferências.</p></div>';
        return;
    }

    // Limita a 8 perfis para exibição
    filteredProfiles = filteredProfiles.slice(0, 8);

    const finalProfiles = await filterBlockedUsers(filteredProfiles);
    displayUsers(finalProfiles, genderMap);
}

async function filterBlockedUsers(users) {
    try {
        const { data: blockedByMe } = await supabase
            .from('user_blocks')
            .select('blocked_id')
            .eq('blocker_id', currentUser.id);

        const { data: blockedMe } = await supabase
            .from('user_blocks')
            .select('blocker_id')
            .eq('blocked_id', currentUser.id);

        const blockedByMeIds = (blockedByMe || []).map(item => item.blocked_id);
        const blockedMeIds = (blockedMe || []).map(item => item.blocker_id);

        const allBlockedIds = [...new Set([...blockedByMeIds, ...blockedMeIds])];

        return users.filter(user => !allBlockedIds.includes(user.id));

    } catch (error) {
        return users;
    }
}

function displayUsers(profiles, genderMap) {
    const usersGrid = document.getElementById('usersGrid');
    
    usersGrid.innerHTML = profiles.map(profile => {
        const safeNickname = (profile.nickname || 'Usuário').replace(/'/g, "\\'");
        const safeCity = (profile.display_city || 'Localização não informada').replace(/'/g, "\\'");
        const userGender = genderMap[profile.id] || 'Não informado';
        
        return `
        <div class="user-card">
            <div class="user-actions-btn" onclick="openUserActions('${profile.id}', '${safeNickname}')">
                <i class="fas fa-ellipsis-v"></i>
            </div>
            
            <div class="user-header">
                <div class="user-avatar-small">
                    ${profile.avatar_url ? 
                        `<img src="${profile.avatar_url}" alt="${safeNickname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="avatar-fallback" style="${profile.avatar_url ? 'display:none' : 'display:flex'}">
                        ${getUserInitials(profile.nickname)}
                    </div>
                </div>
                <div class="user-info">
                    <div class="user-name">${safeNickname}</div>
                    <div class="user-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${safeCity}
                    </div>
                    <div class="user-premium-badge ${profile.is_premium ? 'premium' : 'free'}">
                        ${profile.is_premium ? '👑 Premium' : '👤 Free'}
                    </div>
                </div>
            </div>
            <div class="user-details">
                <div class="user-detail">
                    <strong>Gênero:</strong> <span>${userGender}</span>
                </div>
                <div class="user-detail">
                    <strong>Status:</strong> <span>Ativo</span>
                </div>
                <div class="online-status ${isUserOnline(profile.last_online_at) ? 'status-online' : 'status-offline'}">
                    <span class="status-dot"></span>
                    <span>${isUserOnline(profile.last_online_at) ? 'Online agora' : 'Offline'}</span>
                </div>
            </div>
            <button class="view-profile-btn" onclick="viewUserProfile('${profile.id}')">
                <i class="fas fa-user"></i> Ver Perfil
            </button>
        </div>
        `;
    }).join('');
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

// === SISTEMA DE BLOQUEIO ===
function openUserActions(userId, userName) {
    currentBlockingUser = { id: userId, name: userName };
    showModal('userActionsModal');
}

function closeUserActionsModal() {
    hideModal('userActionsModal');
}

function blockUser() {
    if (!currentBlockingUser) {
        showNotification('Erro: usuário não selecionado');
        return;
    }
    
    hideModal('userActionsModal');
    
    const isPremium = window.PremiumManager ? window.PremiumManager.userPlanInfo?.is_premium : false;
    
    const freeWarning = document.getElementById('freeBlockWarning');
    const premiumInfo = document.getElementById('premiumBlockInfo');
    
    if (isPremium) {
        freeWarning.style.display = 'none';
        premiumInfo.style.display = 'block';
    } else {
        freeWarning.style.display = 'block';
        premiumInfo.style.display = 'none';
    }

    const message = document.getElementById('blockConfirmMessage');
    const userName = currentBlockingUser.name || 'este usuário';
    message.textContent = `Tem certeza que deseja bloquear ${userName}?`;

    showModal('blockConfirmModal');
}

function closeBlockConfirmModal() {
    hideModal('blockConfirmModal');
    currentBlockingUser = null;
}

async function confirmBlockUser() {
    if (!currentBlockingUser) {
        showNotification('Erro: usuário não selecionado');
        return;
    }

    try {
        const { error } = await supabase
            .from('user_blocks')
            .insert({
                blocker_id: currentUser.id,
                blocked_id: currentBlockingUser.id,
                created_at: new Date().toISOString()
            });

        if (error) {
            if (error.code === '23505') {
                showNotification('Este usuário já está bloqueado!');
            } else {
                throw error;
            }
        } else {
            const isPremium = window.PremiumManager ? window.PremiumManager.userPlanInfo?.is_premium : false;
            
            if (isPremium) {
                showNotification('Usuário bloqueado com sucesso! Acesse a página "Bloqueados" para gerenciar.');
            } else {
                showNotification('Usuário bloqueado com sucesso!');
            }
            
            hideModal('blockConfirmModal');
            
            await loadUsers();

            if (!isPremium) {
                setTimeout(() => {
                    window.location.reload();
                }, 1500);
            }
        }

    } catch (error) {
        showNotification('Erro ao bloquear usuário. Tente novamente.');
    }
}

function reportUser() {
    showNotification('Funcionalidade de denúncia em desenvolvimento');
    closeAllModals();
}

function viewProfileFromModal() {
    if (currentBlockingUser) {
        closeAllModals();
        viewUserProfile(currentBlockingUser.id);
    }
}

// === SISTEMA DE MODAIS ===
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('active'), 10);
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
    document.body.style.overflow = '';
    currentBlockingUser = null;
}

// === SISTEMA DE NOTIFICAÇÕES ===
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    const backgroundColor = type === 'error' ? 'var(--error)' : 'var(--success)';
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${backgroundColor};
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius-sm);
        z-index: 4000;
        box-shadow: var(--shadow-hover);
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// === ESTILOS DE ANIMAÇÃO ===
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// === NAVEGAÇÃO ===
function goToPerfil() { window.location.href = 'painel.html'; }
function goToMensagens() { window.location.href = 'mensagens.html'; }
function goToBusca() { window.location.href = 'busca.html'; }
function goToBloqueados() { window.location.href = 'bloqueados.html'; }
function goToPricing() { window.location.href = 'pricing.html'; }

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = 'login.html';
}

// === EXPORTA FUNÇÕES PARA O HTML ===
window.openUserActions = openUserActions;
window.closeUserActionsModal = closeUserActionsModal;
window.blockUser = blockUser;
window.closeBlockConfirmModal = closeBlockConfirmModal;
window.confirmBlockUser = confirmBlockUser;
window.reportUser = reportUser;
window.viewProfileFromModal = viewProfileFromModal;
window.viewUserProfile = viewUserProfile;
window.goToPerfil = goToPerfil;
window.goToMensagens = goToMensagens;
window.goToBusca = goToBusca;
window.goToBloqueados = goToBloqueados;
window.goToPricing = goToPricing;
window.logout = logout;

// Listener de autenticação
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') window.location.href = 'login.html';
});