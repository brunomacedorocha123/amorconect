// bloqueados.js - Sistema da página de usuários bloqueados
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentUnblockingUser = null;
let blockedUsers = [];

document.addEventListener('DOMContentLoaded', function() {
    initializeBloqueados();
});

async function initializeBloqueados() {
    const authenticated = await checkAuthentication();
    if (authenticated) {
        setupEventListeners();
        await loadUserProfile();
        await checkPremiumAndLoad();
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

    // Fechar modais ao clicar fora
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Fechar modais com ESC
    document.addEventListener('keydown', (e) => {
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
        welcomeMessage.textContent = `Usuários Bloqueados`;
    }
}

async function checkPremiumAndLoad() {
    const isPremium = await PremiumManager.checkPremiumStatus();
    
    if (isPremium) {
        // Usuário Premium - Mostrar conteúdo completo
        document.getElementById('freeUserMessage').style.display = 'none';
        document.getElementById('premiumContent').style.display = 'block';
        await loadBlockedUsers();
    } else {
        // Usuário Free - Mostrar mensagem de upsell
        document.getElementById('freeUserMessage').style.display = 'block';
        document.getElementById('premiumContent').style.display = 'none';
    }
}

async function loadBlockedUsers() {
    const usersGrid = document.getElementById('blockedUsersGrid');
    const emptyState = document.getElementById('emptyBlockedState');
    
    usersGrid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Carregando usuários bloqueados...</p></div>';
    emptyState.style.display = 'none';

    try {
        const { data: blockedUsersData, error } = await supabase
            .from('user_blocks')
            .select(`
                id,
                created_at,
                profiles:blocked_id (
                    id,
                    nickname,
                    avatar_url,
                    display_city,
                    is_premium,
                    last_online_at
                )
            `)
            .eq('blocker_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        blockedUsers = blockedUsersData || [];

        // Atualizar estatísticas
        updateStats(blockedUsers);

        if (blockedUsers.length === 0) {
            // Lista vazia
            usersGrid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            // Mostrar usuários bloqueados
            usersGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            displayBlockedUsers(blockedUsers);
        }

    } catch (error) {
        usersGrid.innerHTML = '<div class="loading-state"><p>Erro ao carregar usuários bloqueados.</p></div>';
    }
}

function updateStats(users) {
    const totalBlocked = document.getElementById('totalBlocked');
    const oldestBlock = document.getElementById('oldestBlock');
    const clearAllBtn = document.getElementById('clearAllBtn');

    // Total bloqueados
    totalBlocked.textContent = users.length;

    // Bloqueio mais antigo
    if (users.length > 0) {
        const oldest = new Date(Math.min(...users.map(user => new Date(user.created_at))));
        const now = new Date();
        const diffTime = Math.abs(now - oldest);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) {
            oldestBlock.textContent = '1 dia';
        } else if (diffDays < 30) {
            oldestBlock.textContent = `${diffDays} dias`;
        } else {
            const diffMonths = Math.floor(diffDays / 30);
            oldestBlock.textContent = `${diffMonths} mês${diffMonths > 1 ? 'es' : ''}`;
        }
    } else {
        oldestBlock.textContent = '-';
    }

    // Habilitar/desabilitar botão limpar todos
    clearAllBtn.disabled = users.length === 0;
}

function displayBlockedUsers(users) {
    const usersGrid = document.getElementById('blockedUsersGrid');
    
    usersGrid.innerHTML = users.map(block => `
        <div class="blocked-user-card">
            <div class="blocked-user-header">
                <div class="blocked-user-avatar">
                    ${block.profiles.avatar_url ? 
                        `<img src="${block.profiles.avatar_url}" alt="${block.profiles.nickname}">` : 
                        `<div class="avatar-fallback">${getUserInitials(block.profiles.nickname)}</div>`
                    }
                </div>
                <div class="blocked-user-info">
                    <div class="blocked-user-name">${block.profiles.nickname || 'Usuário'}</div>
                    <div class="blocked-user-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${block.profiles.display_city || 'Localização não informada'}
                    </div>
                    <div class="blocked-user-premium-badge ${block.profiles.is_premium ? 'premium' : 'free'}">
                        ${block.profiles.is_premium ? '👑 Premium' : '👤 Free'}
                    </div>
                </div>
            </div>
            <div class="blocked-user-details">
                <div class="blocked-user-detail">
                    <strong>Bloqueado em:</strong> 
                    <span class="block-date">${formatDate(block.created_at)}</span>
                </div>
                <div class="blocked-user-detail">
                    <strong>Status:</strong> 
                    <span>${isUserOnline(block.profiles.last_online_at) ? 'Online' : 'Offline'}</span>
                </div>
                <div class="online-status ${isUserOnline(block.profiles.last_online_at) ? 'status-online' : 'status-offline'}">
                    <span class="status-dot"></span>
                    <span>${isUserOnline(block.profiles.last_online_at) ? 'Online agora' : 'Offline'}</span>
                </div>
            </div>
            <button class="unblock-btn" onclick="openUnblockConfirm('${block.profiles.id}', '${block.profiles.nickname}')">
                <i class="fas fa-user-check"></i> Desbloquear Usuário
            </button>
        </div>
    `).join('');
}

// Abrir modal de confirmação de desbloqueio
function openUnblockConfirm(userId, userName) {
    currentUnblockingUser = { id: userId, name: userName };
    
    const message = document.getElementById('unblockConfirmMessage');
    message.textContent = `Tem certeza que deseja desbloquear ${userName}?`;
    
    showModal('unblockConfirmModal');
}

// Fechar modal de desbloqueio
function closeUnblockConfirmModal() {
    closeAllModals();
}

// Confirmar desbloqueio
async function confirmUnblockUser() {
    if (!currentUnblockingUser) return;

    try {
        const { error } = await supabase
            .from('user_blocks')
            .delete()
            .eq('blocker_id', currentUser.id)
            .eq('blocked_id', currentUnblockingUser.id);

        if (error) throw error;

        showNotification(`${currentUnblockingUser.name} foi desbloqueado com sucesso!`);
        closeAllModals();
        
        // Recarregar lista
        await loadBlockedUsers();

    } catch (error) {
        showNotification('Erro ao desbloquear usuário. Tente novamente.');
    }
}

// Abrir modal de limpar todos
function clearAllBlocks() {
    if (blockedUsers.length === 0) return;
    
    const countElement = document.getElementById('clearAllCount');
    countElement.textContent = blockedUsers.length;
    
    showModal('clearAllConfirmModal');
}

// Fechar modal limpar todos
function closeClearAllConfirmModal() {
    closeAllModals();
}

// Confirmar limpar todos os bloqueios
async function confirmClearAllBlocks() {
    try {
        const { error } = await supabase
            .from('user_blocks')
            .delete()
            .eq('blocker_id', currentUser.id);

        if (error) throw error;

        showNotification('Todos os usuários foram desbloqueados!');
        closeAllModals();
        
        // Recarregar lista
        await loadBlockedUsers();

    } catch (error) {
        showNotification('Erro ao desbloquear todos os usuários. Tente novamente.');
    }
}

// Funções utilitárias
function getUserInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
}

function isUserOnline(lastOnlineAt) {
    if (!lastOnlineAt) return false;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return new Date(lastOnlineAt) > fifteenMinutesAgo;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
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
    currentUnblockingUser = null;
}

// Sistema de Notificações
function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: var(--success);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: var(--border-radius-sm);
        z-index: 3000;
        box-shadow: var(--shadow-hover);
        animation: slideInRight 0.3s ease-out;
        max-width: 300px;
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

// Funções de Navegação
function goToHome() {
    window.location.href = 'home.html';
}

function goToPricing() {
    window.location.href = 'pricing.html';
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

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (!error) window.location.href = 'login.html';
}

// Monitorar estado de autenticação
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});