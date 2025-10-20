// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Iniciando PulseLove Home...');
    
    try {
        // 1. Verificar autenticação
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) return;
        
        // 2. Carregar dados do usuário
        await loadUserData();
        
        // 3. Configurar sistemas
        setupEventListeners();
        setupMobileMenu();
        
        // 4. Carregar conteúdo
        await loadUsers();
        await updateStats();
        
        // 5. Iniciar sistemas em tempo real
        startOnlineStatusUpdater();
        
        console.log('✅ Home carregada com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro crítico na inicialização:', error);
        showToast('Erro ao carregar a página', 'error');
    }
});

// ==================== SISTEMA DE USUÁRIOS ====================
async function loadUsers() {
    try {
        console.log('👥 Carregando usuários...');
        
        const limit = window.innerWidth <= 768 ? 4 : 8;
        
        const { data: users, error } = await supabase
            .from('profiles')
            .select(`
                id,
                nickname,
                full_name,
                birth_date,
                avatar_url,
                last_online_at,
                is_invisible,
                user_details (
                    gender,
                    zodiac,
                    profession,
                    interests,
                    looking_for,
                    description
                )
            `)
            .neq('id', currentUser.id)
            .limit(limit)
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`✅ ${users?.length || 0} usuários encontrados`);

        if (!users || users.length === 0) {
            showEmptyState('Ainda não há outros usuários cadastrados.');
            return;
        }
        
        await displayUsers(users);

    } catch (error) {
        console.error('❌ Erro ao carregar usuários:', error);
        showEmptyState('Erro ao carregar usuários.');
    }
}

async function displayUsers(users) {
    const usersGrid = document.getElementById('usersGrid');
    if (!usersGrid) return;
    
    const userCards = [];
    
    for (const user of users) {
        const card = await createUserCard(user);
        if (card) userCards.push(card);
    }
    
    usersGrid.innerHTML = userCards.join('');
    
    if (userCards.length === 0) {
        showEmptyState('Nenhum usuário disponível no momento.');
    }
}

async function createUserCard(user) {
    try {
        const userId = user.id;
        const nickname = user.nickname || user.full_name?.split(' ')[0] || 'Usuário';
        const age = user.birth_date ? calculateAge(user.birth_date) : null;
        
        // Verificar se já é favorito
        const isFavorited = await checkIfFavorited(userId);
        
        // Status online
        const isOnline = isUserOnline(user);
        const onlineBadge = isOnline ? 
            '<div class="online-badge" title="Online"></div>' : 
            '<div class="offline-badge" title="Offline"></div>';
        
        // Avatar
        let avatarHtml = '';
        if (user.avatar_url) {
            const photoUrl = await loadUserPhoto(user.avatar_url);
            if (photoUrl) {
                avatarHtml = `
                    <div class="user-card-avatar">
                        <img class="user-card-avatar-img" src="${photoUrl}" alt="${nickname}">
                        <div class="user-card-avatar-fallback" style="display: none;">${nickname.charAt(0).toUpperCase()}</div>
                        ${onlineBadge}
                    </div>
                `;
            }
        }
        
        if (!avatarHtml) {
            avatarHtml = `
                <div class="user-card-avatar">
                    <div class="user-card-avatar-fallback">${nickname.charAt(0).toUpperCase()}</div>
                    ${onlineBadge}
                </div>
            `;
        }

        const details = user.user_details || {};
        const zodiac = details.zodiac;
        const profession = details.profession;
        const lookingFor = details.looking_for;
        const bio = details.description || 'Este usuário ainda não adicionou uma descrição.';

        return `
            <div class="user-card" data-user-id="${userId}">
                ${avatarHtml}
                <div class="user-card-name">${nickname}${age ? `, ${age}` : ''}</div>
                
                <div class="user-card-info">
                    ${zodiac ? `<div class="user-card-detail">${getZodiacIcon(zodiac)} ${formatZodiac(zodiac)}</div>` : ''}
                    ${profession ? `<div class="user-card-detail">💼 ${profession}</div>` : ''}
                    ${lookingFor ? `<div class="user-card-detail">🎯 ${formatLookingFor(lookingFor)}</div>` : ''}
                </div>
                
                <div class="user-card-bio">${bio}</div>
                
                <div class="user-card-actions">
                    <button class="btn btn-primary btn-sm" onclick="sendMessage('${userId}')">
                        💌 Mensagem
                    </button>
                    <button class="btn btn-secondary btn-sm" onclick="viewProfile('${userId}')">
                        👀 Ver Perfil
                    </button>
                    <button class="btn-favorite ${isFavorited ? 'favorited' : ''}" onclick="toggleFavorite('${userId}', this)">
                        <span class="heart-icon">${isFavorited ? '❤️' : '🤍'}</span>
                    </button>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Erro ao criar card:', error);
        return '';
    }
}

// ==================== SISTEMA DE FAVORITOS ====================
async function checkIfFavorited(userId) {
    try {
        if (!currentUser) return false;
        
        const { data, error } = await supabase
            .from('user_favorites')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('favorite_user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return false; // Não encontrado
            throw error;
        }
        
        return !!data;
    } catch (error) {
        console.warn('⚠️ Erro ao verificar favorito:', error);
        return false;
    }
}

async function toggleFavorite(userId, button) {
    try {
        if (!currentUser) {
            showToast('Faça login para favoritar', 'error');
            return;
        }

        const isCurrentlyFavorited = await checkIfFavorited(userId);
        
        if (isCurrentlyFavorited) {
            // Remover dos favoritos
            const { error } = await supabase
                .from('user_favorites')
                .delete()
                .eq('user_id', currentUser.id)
                .eq('favorite_user_id', userId);

            if (error) throw error;
            
            button.classList.remove('favorited');
            button.querySelector('.heart-icon').textContent = '🤍';
            showToast('Removido dos favoritos');
            
        } else {
            // Adicionar aos favoritos
            const favoriteData = {
                user_id: currentUser.id,
                favorite_user_id: userId,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('user_favorites')
                .insert(favoriteData);

            if (error) throw error;
            
            button.classList.add('favorited');
            button.querySelector('.heart-icon').textContent = '❤️';
            showToast('Adicionado aos favoritos!');
            
            // Verificar se é um match (o outro usuário também te favoritou)
            await checkForMatch(userId);
        }
        
    } catch (error) {
        console.error('❌ Erro ao favoritar:', error);
        showToast('Erro ao favoritar', 'error');
    }
}

async function checkForMatch(favoritedUserId) {
    try {
        const { data, error } = await supabase
            .from('user_favorites')
            .select('id')
            .eq('user_id', favoritedUserId)
            .eq('favorite_user_id', currentUser.id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return; // Não é match
            throw error;
        }
        
        if (data) {
            // É um match!
            showToast('🎉 Novo match! Vocês se curtiram mutuamente!', 'success');
            
            // Aqui você pode criar uma conversa automática, etc.
            console.log('🎉 MATCH DETECTADO!');
        }
        
    } catch (error) {
        console.warn('⚠️ Erro ao verificar match:', error);
    }
}

// ==================== INTERAÇÕES ====================
async function sendMessage(userId) {
    if (!currentUser) return;
    
    if (!userProfile?.full_name) {
        showToast('Complete seu perfil primeiro!', 'error');
        window.location.href = 'painel.html';
        return;
    }
    
    localStorage.setItem('openChatWithUserId', userId);
    window.location.href = 'mensagens.html';
}

async function viewProfile(userId) {
    if (!currentUser) return;
    
    if (!userProfile?.full_name) {
        showToast('Complete seu perfil primeiro!', 'error');
        window.location.href = 'painel.html';
        return;
    }
    
    localStorage.setItem('viewingProfileId', userId);
    window.location.href = 'perfil.html';
}

// ==================== SISTEMA DE STATS ====================
async function updateStats() {
    try {
        // Novos Matches (favoritos mútuos)
        const { data: matches, error: matchesError } = await supabase
            .from('user_favorites')
            .select('id')
            .eq('favorite_user_id', currentUser.id);

        const matchesCount = matches?.length || 0;
        document.getElementById('newMatches').textContent = matchesCount;

        // Visualizações do perfil
        const { data: visits, error: visitsError } = await supabase
            .from('profile_visits')
            .select('id', { count: 'exact' })
            .eq('visited_id', currentUser.id);

        const visitsCount = visits?.length || 0;
        document.getElementById('profileViews').textContent = visitsCount;
        document.getElementById('visitorsCount').textContent = `${visitsCount} visita${visitsCount !== 1 ? 's' : ''}`;

    } catch (error) {
        console.error('❌ Erro ao carregar estatísticas:', error);
        document.getElementById('newMatches').textContent = '0';
        document.getElementById('profileViews').textContent = '0';
        document.getElementById('visitorsCount').textContent = '0 visitas';
    }
}

// ==================== SISTEMA ONLINE ====================
async function updateOnlineStatus() {
    try {
        const { error } = await supabase
            .from('profiles')
            .update({ 
                last_online_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);
            
        if (error) {
            console.warn('⚠️ Erro ao atualizar status online:', error);
        }
    } catch (error) {
        console.error('❌ Erro crítico ao atualizar status:', error);
    }
}

function startOnlineStatusUpdater() {
    updateOnlineStatus();
    setInterval(updateOnlineStatus, 60000);
    
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) updateOnlineStatus();
    });
    
    ['click', 'mousemove', 'keypress', 'scroll'].forEach(event => {
        document.addEventListener(event, updateOnlineStatus, { passive: true });
    });
}

function isUserOnline(userProfile) {
    if (!userProfile.last_online_at) return false;
    const lastOnline = new Date(userProfile.last_online_at);
    const now = new Date();
    const minutesDiff = (now - lastOnline) / (1000 * 60);
    const isActuallyOnline = minutesDiff <= 5;
    if (userProfile.id === currentUser.id) return true;
    if (userProfile.is_invisible && userProfile.id !== currentUser.id) return false;
    return isActuallyOnline;
}

// ==================== FUNÇÕES AUXILIARES ====================
function calculateAge(birthDate) {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
}

function formatZodiac(zodiac) {
    const zodiacMap = {
        'aries': 'Áries', 'taurus': 'Touro', 'gemini': 'Gêmeos', 'cancer': 'Câncer',
        'leo': 'Leão', 'virgo': 'Virgem', 'libra': 'Libra', 'scorpio': 'Escorpião',
        'sagittarius': 'Sagitário', 'capricorn': 'Capricórnio', 'aquarius': 'Aquário', 'pisces': 'Peixes'
    };
    return zodiacMap[zodiac?.toLowerCase()] || zodiac;
}

function getZodiacIcon(zodiac) {
    const zodiacIcons = {
        'aries': '♈', 'taurus': '♉', 'gemini': '♊', 'cancer': '♋',
        'leo': '♌', 'virgo': '♍', 'libra': '♎', 'scorpio': '♏',
        'sagittarius': '♐', 'capricorn': '♑', 'aquarius': '♒', 'pisces': '♓'
    };
    return zodiacIcons[zodiac?.toLowerCase()] || '✨';
}

function formatLookingFor(lookingFor) {
    if (Array.isArray(lookingFor)) {
        return lookingFor.join(', ');
    }
    return lookingFor || 'Não informado';
}

function showEmptyState(message) {
    const usersGrid = document.getElementById('usersGrid');
    if (usersGrid) {
        usersGrid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <h3>${message}</h3>
            </div>
        `;
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');
    
    if (logoutBtn) logoutBtn.addEventListener('click', logout);
    if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', logout);
}

// ==================== MENU MOBILE ====================
function setupMobileMenu() {
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const mobileMenu = document.getElementById('mobileMenu');
    const closeMobileMenu = document.getElementById('closeMobileMenu');

    if (!hamburgerBtn || !mobileMenu) return;

    hamburgerBtn.addEventListener('click', () => {
        mobileMenu.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    });

    closeMobileMenu.addEventListener('click', () => {
        mobileMenu.style.display = 'none';
        document.body.style.overflow = 'auto';
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            mobileMenu.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    });

    function checkScreenSize() {
        const userMenu = document.querySelector('.user-menu');
        if (!userMenu) return;
        
        if (window.innerWidth <= 768) {
            userMenu.style.display = 'none';
            if (hamburgerBtn) hamburgerBtn.style.display = 'flex';
        } else {
            userMenu.style.display = 'flex';
            if (hamburgerBtn) hamburgerBtn.style.display = 'none';
            mobileMenu.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    window.addEventListener('resize', checkScreenSize);
    window.addEventListener('load', checkScreenSize);
    checkScreenSize();
}

// ==================== EXPORTAR FUNÇÕES GLOBAIS ====================
window.sendMessage = sendMessage;
window.viewProfile = viewProfile;
window.toggleFavorite = toggleFavorite;