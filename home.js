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

    // Filtrar usuários bloqueados
    const filteredProfiles = await filterBlockedUsers(profiles);
    displayUsers(filteredProfiles);
}

function displayUsers(profiles) {
    const usersGrid = document.getElementById('usersGrid');
    usersGrid.innerHTML = profiles.map(profile => `
        <div class="user-card" onclick="viewUserProfile('${profile.id}')">
            <!-- Botão de 3 pontos para ações -->
            <div class="user-actions-btn" onclick="event.stopPropagation(); openUserActions('${profile.id}', ${JSON.stringify(profile).replace(/'/g, "\\'")})">
                <i class="fas fa-ellipsis-v"></i>
            </div>
            
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

// Função para filtrar usuários bloqueados
async function filterBlockedUsers(users) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return users;

        // Buscar IDs de usuários que bloqueei
        const { data: blockedByMe } = await supabase
            .from('user_blocks')
            .select('blocked_id')
            .eq('blocker_id', user.id);

        // Buscar IDs de usuários que me bloquearam
        const { data: blockedMe } = await supabase
            .from('user_blocks')
            .select('blocker_id')
            .eq('blocked_id', user.id);

        const blockedByMeIds = (blockedByMe || []).map(item => item.blocked_id);
        const blockedMeIds = (blockedMe || []).map(item => item.blocker_id);

        // Combinar ambas as listas
        const allBlockedIds = [...new Set([...blockedByMeIds, ...blockedMeIds])];

        // Filtrar usuários
        return users.filter(user => !allBlockedIds.includes(user.id));

    } catch (error) {
        return users;
    }
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

// Funções de Navegação
function goToPerfil() { window.location.href = 'painel.html'; }
function goToMensagens() { window.location.href = 'mensagens.html'; }
function goToBusca() { window.location.href = 'busca.html'; }
function goToBloqueados() { window.location.href = 'bloqueados.html'; }
function goToPricing() { window.location.href = 'pricing.html'; }

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = 'login.html';
}

// Sistema de Bloqueios - Funções Globais
let currentBlockingUser = null;

// Abrir modal de ações do usuário
async function openUserActions(userId, userData) {
    currentBlockingUser = { id: userId, ...userData };
    
    // Verificar se já está bloqueado
    const isBlocked = await checkIfBlocked(userId);
    
    const blockBtn = document.getElementById('blockBtnText');
    if (blockBtn) {
        blockBtn.textContent = isBlocked ? 'Desbloquear Usuário' : 'Bloquear Usuário';
    }

    showModal('userActionsModal');
}

// Verificar se usuário está bloqueado
async function checkIfBlocked(userId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return false;

        const { data } = await supabase
            .from('user_blocks')
            .select('id')
            .eq('blocker_id', user.id)
            .eq('blocked_id', userId)
            .single();

        return data !== null;
    } catch (error) {
        return false;
    }
}

// Fechar modal de ações
function closeUserActionsModal() {
    closeAllModals();
}

// Iniciar processo de bloqueio
async function blockUser() {
    if (!currentBlockingUser) return;

    const isBlocked = await checkIfBlocked(currentBlockingUser.id);
    
    if (isBlocked) {
        await unblockUser();
        return;
    }

    showBlockConfirmationModal();
}

// Mostrar modal de confirmação de bloqueio
function showBlockConfirmationModal() {
    // Verificar se usuário é premium
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
    const userName = currentBlockingUser.nickname || 'este usuário';
    message.textContent = `Tem certeza que deseja bloquear ${userName}?`;

    showModal('blockConfirmModal');
}

// Fechar modal de confirmação
function closeBlockConfirmModal() {
    closeAllModals();
}

// Confirmar bloqueio do usuário
async function confirmBlockUser() {
    if (!currentBlockingUser) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('user_blocks')
            .insert({
                blocker_id: user.id,
                blocked_id: currentBlockingUser.id
            });

        if (error) throw error;

        showNotification('Usuário bloqueado com sucesso!');
        closeAllModals();
        
        // Recarregar a lista de usuários para remover o bloqueado
        await loadUsers();

        // Se for usuário free, recarregar a página para garantir
        const isPremium = window.PremiumManager ? window.PremiumManager.userPlanInfo?.is_premium : false;
        if (!isPremium) {
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        }

    } catch (error) {
        showNotification('Erro ao bloquear usuário. Tente novamente.');
    }
}

// Desbloquear usuário
async function unblockUser() {
    if (!currentBlockingUser) return;

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { error } = await supabase
            .from('user_blocks')
            .delete()
            .eq('blocker_id', user.id)
            .eq('blocked_id', currentBlockingUser.id);

        if (error) throw error;

        showNotification('Usuário desbloqueado com sucesso!');
        closeAllModals();

        // Recarregar lista de usuários
        await loadUsers();

    } catch (error) {
        showNotification('Erro ao desbloquear usuário. Tente novamente.');
    }
}

// Denunciar usuário
function reportUser() {
    showNotification('Funcionalidade de denúncia em desenvolvimento');
    closeAllModals();
}

// Ver perfil a partir do modal
function viewProfileFromModal() {
    if (currentBlockingUser) {
        closeAllModals();
        viewUserProfile(currentBlockingUser.id);
    }
}

// Sistema de Modais
function showModal(modalId) {
    closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = '';
    currentBlockingUser = null;
}

// Sistema de Notificações Simples
function showNotification(message) {
    // Criar notificação temporária
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--burgundy);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius-sm);
        z-index: 3000;
        box-shadow: var(--shadow-hover);
        animation: slideInRight 0.3s ease-out;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-in';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Adicionar estilos de animação para notificações
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

// Fechar modais ao clicar fora
document.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal')) {
        closeAllModals();
    }
});

// Fechar modais com ESC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeAllModals();
    }
});

// Monitorar estado de autenticação
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});