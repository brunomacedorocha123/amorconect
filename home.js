// home.js - VERSÃO FINAL CORRIGIDA
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

    // Event listener para fechar modais ao clicar fora
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Event listener para tecla Escape
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
    usersGrid.innerHTML = '<div class="loading-state"><div class="loading-spinner"></div><p>Carregando pessoas compatíveis...</p></div>';

    try {
        const { data: currentUserDetails, error: detailsError } = await supabase
            .from('user_details')
            .select('gender, sexual_orientation')
            .eq('user_id', currentUser.id)
            .single();

        let userGender = '';
        let userOrientation = '';

        if (!detailsError && currentUserDetails) {
            userGender = currentUserDetails.gender || '';
            userOrientation = currentUserDetails.sexual_orientation || '';
        }

        let query = supabase
            .from('profiles')
            .select('*')
            .neq('id', currentUser.id)
            .eq('is_invisible', false);

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

        const profileIds = profiles.map(p => p.id);
        const { data: allUserDetails, error: detailsError2 } = await supabase
            .from('user_details')
            .select('user_id, gender, sexual_orientation')
            .in('user_id', profileIds);

        const profilesWithDetails = profiles.map(profile => {
            const details = allUserDetails?.find(d => d.user_id === profile.id) || {};
            return {
                ...profile,
                user_details: details
            };
        });

        const compatibleProfiles = filterCompatibleUsers(profilesWithDetails, userGender, userOrientation);
        
        if (compatibleProfiles.length === 0) {
            usersGrid.innerHTML = `
                <div class="loading-state">
                    <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; color: #ccc;"></i>
                    <p>Nenhuma pessoa compatível encontrada no momento.</p>
                    <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                        Complete seu perfil com gênero e orientação sexual para ver mais matches.
                    </p>
                </div>
            `;
            return;
        }

        const filteredProfiles = await filterBlockedUsers(compatibleProfiles);
        
        if (filteredProfiles.length === 0) {
            usersGrid.innerHTML = '<div class="loading-state"><p>Nenhuma pessoa disponível no momento.</p></div>';
            return;
        }

        const profilesToShow = filteredProfiles.slice(0, 8);
        displayUsers(profilesToShow);

    } catch (error) {
        usersGrid.innerHTML = '<div class="loading-state"><p>Erro ao carregar. Tente novamente.</p></div>';
    }
}

function filterCompatibleUsers(profiles, userGender, userOrientation) {
    if (!userOrientation) {
        return profiles;
    }

    return profiles.filter(profile => {
        const profileGender = profile.user_details?.gender;

        if (!profileGender) {
            return true;
        }

        const userGenderNormalized = userGender.toLowerCase();
        const profileGenderNormalized = profileGender.toLowerCase();

        switch (userOrientation.toLowerCase()) {
            case 'heterossexual':
                if (userGenderNormalized === 'masculino' || userGenderNormalized === 'homem') {
                    return profileGenderNormalized === 'feminino' || profileGenderNormalized === 'mulher';
                } else if (userGenderNormalized === 'feminino' || userGenderNormalized === 'mulher') {
                    return profileGenderNormalized === 'masculino' || profileGenderNormalized === 'homem';
                }
                return true;

            case 'homossexual':
                if (userGenderNormalized === 'masculino' || userGenderNormalized === 'homem') {
                    return profileGenderNormalized === 'masculino' || profileGenderNormalized === 'homem';
                } else if (userGenderNormalized === 'feminino' || userGenderNormalized === 'mulher') {
                    return profileGenderNormalized === 'feminino' || profileGenderNormalized === 'mulher';
                }
                return true;

            case 'bissexual':
                return true;

            default:
                return true;
        }
    });
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

function displayUsers(profiles) {
    const usersGrid = document.getElementById('usersGrid');
    
    usersGrid.innerHTML = profiles.map(profile => {
        const userDetails = profile.user_details || {};
        const safeNickname = (profile.nickname || 'Usuário').replace(/'/g, "\\'");
        const safeCity = (profile.display_city || 'Localização não informada').replace(/'/g, "\\'");
        const profileGender = userDetails.gender || 'Não informado';
        
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
                    <div class="user-gender">
                        <i class="fas fa-venus-mars"></i>
                        ${formatGenderForDisplay(profileGender)}
                    </div>
                    <div class="user-premium-badge ${profile.is_premium ? 'premium' : 'free'}">
                        ${profile.is_premium ? '👑 Premium' : '👤 Free'}
                    </div>
                </div>
            </div>
            <div class="user-details">
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

function formatGenderForDisplay(gender) {
    if (!gender) return 'Não informado';
    
    const genderMap = {
        'masculino': 'Masculino',
        'feminino': 'Feminino',
        'homem': 'Masculino',
        'mulher': 'Feminino',
        'nao_informar': 'Não informado',
        'prefiro_nao_informar': 'Não informado',
        'outro': 'Outro'
    };
    return genderMap[gender.toLowerCase()] || gender;
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

// === SISTEMA DE MODAIS SIMPLES E FUNCIONAL ===
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

// === FUNÇÕES DE MODAL SIMPLES ===
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.style.display = 'none';
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