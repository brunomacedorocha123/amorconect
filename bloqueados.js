// bloqueados.js - VERSÃO COMPLETA CORRIGIDA
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

    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

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
}

async function checkPremiumAndLoad() {
    const isPremium = await PremiumManager.checkPremiumStatus();
    
    if (isPremium) {
        document.getElementById('freeUserMessage').style.display = 'none';
        document.getElementById('premiumContent').style.display = 'block';
        await loadBlockedUsers();
    } else {
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
                blocked_id,
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

        updateStats(blockedUsers);

        if (blockedUsers.length === 0) {
            usersGrid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
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

    totalBlocked.textContent = users.length;

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

    clearAllBtn.disabled = users.length === 0;
}

function displayBlockedUsers(users) {
    const usersGrid = document.getElementById('blockedUsersGrid');
    
    usersGrid.innerHTML = users.map(block => {
        const safeNickname = (block.profiles.nickname || 'Usuário').replace(/'/g, "\\'");
        const safeCity = (block.profiles.display_city || 'Localização não informada').replace(/'/g, "\\'");
        
        return `
        <div class="blocked-user-card">
            <div class="blocked-user-header">
                <div class="blocked-user-avatar">
                    ${block.profiles.avatar_url ? 
                        `<img src="${block.profiles.avatar_url}" alt="${safeNickname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="avatar-fallback" style="${block.profiles.avatar_url ? 'display:none' : 'display:flex'}">
                        ${getUserInitials(block.profiles.nickname)}
                    </div>
                </div>
                <div class="blocked-user-info">
                    <div class="blocked-user-name">${safeNickname}</div>
                    <div class="blocked-user-location">
                        <i class="fas fa-map-marker-alt"></i>
                        ${safeCity}
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
            <button class="unblock-btn" onclick="openUnblockConfirm('${block.profiles.id}', '${safeNickname}')">
                <i class="fas fa-user-check"></i> Desbloquear Usuário
            </button>
        </div>
        `;
    }).join('');
}

function openUnblockConfirm(userId, userName) {
    currentUnblockingUser = { id: userId, name: userName };
    
    const message = document.getElementById('unblockConfirmMessage');
    const safeUserName = userName.replace(/\\'/g, "'");
    message.textContent = `Tem certeza que deseja desbloquear ${safeUserName}?`;
    
    showModal('unblockConfirmModal');
}

function closeUnblockConfirmModal() {
    hideModal('unblockConfirmModal');
}

async function confirmUnblockUser() {
    if (!currentUnblockingUser) {
        showNotification('Erro: usuário não selecionado', 'error');
        return;
    }

    try {
        const { error } = await supabase
            .from('user_blocks')
            .delete()
            .eq('blocker_id', currentUser.id)
            .eq('blocked_id', currentUnblockingUser.id);

        if (error) throw error;

        showNotification(`${currentUnblockingUser.name} foi desbloqueado com sucesso!`);
        hideModal('unblockConfirmModal');
        
        await loadBlockedUsers();

    } catch (error) {
        showNotification('Erro ao desbloquear usuário. Tente novamente.', 'error');
    }
}

function clearAllBlocks() {
    if (blockedUsers.length === 0) {
        showNotification('Não há usuários para desbloquear.', 'error');
        return;
    }
    
    const countElement = document.getElementById('clearAllCount');
    countElement.textContent = blockedUsers.length;
    
    showModal('clearAllConfirmModal');
}

function closeClearAllConfirmModal() {
    hideModal('clearAllConfirmModal');
}

async function confirmClearAllBlocks() {
    try {
        const { error } = await supabase
            .from('user_blocks')
            .delete()
            .eq('blocker_id', currentUser.id);

        if (error) throw error;

        showNotification('Todos os usuários foram desbloqueados!');
        hideModal('clearAllConfirmModal');
        
        await loadBlockedUsers();

    } catch (error) {
        showNotification('Erro ao desbloquear todos os usuários. Tente novamente.', 'error');
    }
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

// === SISTEMA DE MODAIS CORRIGIDO (SCROLL FUNCIONANDO) ===
function showModal(modalId) {
    closeAllModals();
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }, 10);
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
            // RESTAURA O SCROLL DA PÁGINA
            restorePageScroll();
        }, 300);
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    });
    // RESTAURA O SCROLL DA PÁGINA
    restorePageScroll();
    currentUnblockingUser = null;
}

function restorePageScroll() {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
}

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

window.openUnblockConfirm = openUnblockConfirm;
window.closeUnblockConfirmModal = closeUnblockConfirmModal;
window.confirmUnblockUser = confirmUnblockUser;
window.clearAllBlocks = clearAllBlocks;
window.closeClearAllConfirmModal = closeClearAllConfirmModal;
window.confirmClearAllBlocks = confirmClearAllBlocks;
window.goToHome = goToHome;
window.goToPricing = goToPricing;
window.goToPerfil = goToPerfil;
window.goToMensagens = goToMensagens;
window.goToBusca = goToBusca;
window.logout = logout;

setTimeout(async () => {
    await PremiumManager.updateUIWithPremiumStatus();
}, 500);

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});