const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// VARIÁVEIS GLOBAIS - USAR NAMESPACE PULSELOVE PARA EVITAR CONFLITOS
window.PulseLove = window.PulseLove || {};
PulseLove.currentUser = null;
PulseLove.currentFilter = 'all';
PulseLove.currentBlockingUser = null;
PulseLove.notificationInterval = null;
PulseLove.statusUpdateInterval = null;

// INICIALIZAÇÃO
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

// FUNÇÃO PRINCIPAL DE INICIALIZAÇÃO
async function initializeApp() {
  try {
    // 1. Verificar autenticação
    const authenticated = await checkAuthentication();
    if (!authenticated) return;
    
    // 2. Atualizar status online
    await updateOnlineStatusSafe(PulseLove.currentUser.id, true);
    
    // 3. Configurar eventos
    setupEventListeners();
    setupWindowUnload();
    
    // 4. Carregar dados do usuário
    await loadUserProfile();
    
    // 5. Carregar todas as seções EM PARALELO
    await Promise.all([
      loadUsers(),
      loadFeelsSection(),    // ⭐ NOVA - Carrega "Quem te curtiu"
      loadVisitorsSection(), // ⭐ NOVA - Carrega "Quem te visitou"
      loadNotificationCount()
    ]);
    
    // 6. Iniciar sistemas em background
    startNotificationPolling();
    startStatusUpdates();
    
  } catch (error) {
    showNotification('Erro ao carregar a página. Tente recarregar.', 'error');
  }
}

// ATUALIZAR STATUS ONLINE
async function updateOnlineStatusSafe(userId, isOnline = true) {
  try {
    const { data: success, error } = await supabase.rpc('update_user_online_status', {
      user_uuid: userId,
      is_online: isOnline
    });
    return success && !error;
  } catch (error) {
    return false;
  }
}

// CONFIGURAR EVENTOS
function setupEventListeners() {
  // Menu hamburger
  const menuToggle = document.getElementById('menuToggle');
  const mainNav = document.getElementById('mainNav');
  if (menuToggle && mainNav) {
    menuToggle.addEventListener('click', function() {
      mainNav.classList.toggle('active');
      menuToggle.classList.toggle('active');
    });
  }

  // Filtros de usuários
  const filterButtons = document.querySelectorAll('.btn-filter');
  filterButtons.forEach(button => {
    button.addEventListener('click', function() {
      const filter = this.getAttribute('data-filter');
      setActiveFilter(filter);
    });
  });

  // Atualizar quando a página ganha foco
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && PulseLove.currentUser) {
      await updateOnlineStatusSafe(PulseLove.currentUser.id, true);
      await loadUsers();
    }
  });
}

// CONFIGURAR UNLOAD
function setupWindowUnload() {
  window.addEventListener('beforeunload', async () => {
    if (PulseLove.currentUser) {
      await updateOnlineStatusSafe(PulseLove.currentUser.id, false);
    }
  });
}

// ATUALIZAÇÕES DE STATUS PERIÓDICAS
function startStatusUpdates() {
  if (PulseLove.statusUpdateInterval) {
    clearInterval(PulseLove.statusUpdateInterval);
  }
  
  PulseLove.statusUpdateInterval = setInterval(async () => {
    if (PulseLove.currentUser) {
      await updateOnlineStatusSafe(PulseLove.currentUser.id, true);
    }
  }, 30000);
}

function stopStatusUpdates() {
  if (PulseLove.statusUpdateInterval) {
    clearInterval(PulseLove.statusUpdateInterval);
    PulseLove.statusUpdateInterval = null;
  }
}

// VERIFICAÇÃO DE AUTENTICAÇÃO
async function checkAuthentication() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      window.location.href = 'login.html';
      return false;
    }
    PulseLove.currentUser = user;
    return true;
  } catch (error) {
    window.location.href = 'login.html';
    return false;
  }
}

// CARREGAR PERFIL DO USUÁRIO
async function loadUserProfile() {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', PulseLove.currentUser.id)
      .single();

    if (error) throw error;
    
    updateUserHeader(profile);
    return profile;
    
  } catch (error) {
    showNotification('Erro ao carregar perfil', 'error');
    return null;
  }
}

// ATUALIZAR CABEÇALHO DO USUÁRIO
function updateUserHeader(profile) {
  // Avatar
  const avatarImg = document.getElementById('userAvatarImg');
  const avatarFallback = document.getElementById('avatarFallback');
  
  if (profile.avatar_url) {
    avatarImg.src = profile.avatar_url;
    avatarImg.style.display = 'block';
    avatarFallback.style.display = 'none';
  } else {
    avatarImg.style.display = 'none';
    avatarFallback.style.display = 'flex';
    avatarFallback.textContent = getUserInitials(profile.nickname || PulseLove.currentUser.email);
  }

  // Nome do usuário
  const userName = document.getElementById('userName');
  if (userName) {
    userName.textContent = profile.nickname || PulseLove.currentUser.email.split('@')[0];
  }

  // Mensagem de boas-vindas
  const welcomeMessage = document.getElementById('welcomeMessage');
  if (welcomeMessage) {
    const firstName = (profile.nickname || PulseLove.currentUser.email.split('@')[0]).split(' ')[0];
    welcomeMessage.textContent = `Olá, ${firstName}!`;
  }

  // Status do usuário
  const userStatus = document.getElementById('userStatus');
  if (userStatus) {
    if (profile.real_status === 'online') {
      userStatus.textContent = 'Online';
      userStatus.style.color = '#48bb78';
    } else {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const lastOnline = profile.last_online_at ? new Date(profile.last_online_at) : null;
      const isWithinGracePeriod = lastOnline && lastOnline > twoMinutesAgo;
      
      if (isWithinGracePeriod) {
        userStatus.textContent = 'Online';
        userStatus.style.color = '#48bb78';
      } else {
        userStatus.textContent = 'Offline';
        userStatus.style.color = '#a0aec0';
      }
    }
  }
}

// ========== SEÇÃO "QUEM TE CURTIU" ==========
async function loadFeelsSection() {
  try {
    const container = document.getElementById('feelsContainer');
    if (!container) return;
    
    // Mostrar estado de carregamento
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Carregando curtidas...</p>
      </div>
    `;
    
    // Buscar curtidas recebidas - USANDO ESTRUTURA CORRETA
    const { data: feels, error } = await supabase
      .from('user_feels')
      .select(`
        created_at,
        profiles:giver_id (
          id,
          nickname,
          avatar_url,
          is_premium,
          last_online_at
        )
      `)
      .eq('receiver_id', PulseLove.currentUser.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    // Verificar se usuário é premium
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', PulseLove.currentUser.id)
      .single();
    
    const isPremium = profile?.is_premium || false;
    
    // Renderizar resultados
    renderFeelsSection(feels || [], isPremium);
    
  } catch (error) {
    const container = document.getElementById('feelsContainer');
    if (container) {
      container.innerHTML = `
        <div class="feels-empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erro ao carregar curtidas</p>
          <button class="btn btn-outline" onclick="loadFeelsSection()">
            Tentar novamente
          </button>
        </div>
      `;
    }
  }
}

// RENDERIZAR SEÇÃO "QUEM TE CURTIU"
function renderFeelsSection(feels, isPremium) {
  const container = document.getElementById('feelsContainer');
  const viewAllBtn = document.getElementById('viewAllFeelsBtn');
  
  // Mostrar/ocultar botão "Ver todos"
  if (viewAllBtn) {
    viewAllBtn.style.display = feels.length > 5 ? 'flex' : 'none';
  }
  
  // Se não há feels
  if (!feels || feels.length === 0) {
    container.innerHTML = `
      <div class="feels-empty-state">
        <i class="fas fa-heart"></i>
        <p>Ninguém te curtiu ainda...</p>
        <small>Seja ativo para receber mais curtidas!</small>
      </div>
    `;
    return;
  }
  
  // Usuário FREE: mostrar apenas contador e botão de upgrade
  if (!isPremium) {
    container.innerHTML = `
      <div class="feels-free-state">
        <div class="feels-count">${feels.length}</div>
        <div class="feels-free-message">
          <i class="fas fa-lock"></i>
          ${feels.length} pessoa${feels.length > 1 ? 's' : ''} te curtiu${feels.length > 1 ? 'ram' : ''}!
        </div>
        <button class="btn btn-primary" onclick="goToPricing()">
          <i class="fas fa-crown"></i> Virar Premium para ver quem é
        </button>
      </div>
    `;
    return;
  }
  
  // Usuário PREMIUM: mostrar lista de feels
  // Limitar a 5 feels na home
  const feelsToShow = feels.slice(0, 5);
  
  const feelsHTML = feelsToShow.map(feel => {
    const profile = feel.profiles;
    const timeAgo = formatTimeAgo(feel.created_at);
    const initials = getUserInitials(profile.nickname || 'U');
    const isOnline = checkIfUserIsOnline(profile.last_online_at);
    
    return `
      <div class="feel-user-card" onclick="viewUserProfile('${profile.id}')">
        <div class="feel-user-avatar">
          ${profile.avatar_url ? 
            `<img src="${profile.avatar_url}" alt="${profile.nickname}" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
            ''
          }
          <div class="avatar-fallback" style="${profile.avatar_url ? 'display:none' : 'display:flex'}">
            ${initials}
          </div>
          ${profile.is_premium ? '<div class="premium-mini-badge" title="Usuário Premium">P</div>' : ''}
          ${isOnline ? '<div class="online-indicator"></div>' : ''}
        </div>
        <div class="feel-user-name">${profile.nickname || 'Usuário'}</div>
        <div class="feel-user-time">${timeAgo}</div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `
    <div class="feels-grid">
      ${feelsHTML}
    </div>
    ${feels.length > 5 ? `
      <div class="view-all-container">
        <button class="btn-view-all" onclick="goToFeelsPage()">
          Ver todas as curtidas (${feels.length}) <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    ` : ''}
  `;
}
// ========== SEÇÃO "QUEM TE VISITOU" ==========
async function loadVisitorsSection() {
  try {
    const container = document.getElementById('visitorsContainer');
    if (!container) return;
    
    // Mostrar estado de carregamento
    container.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Carregando visitas...</p>
      </div>
    `;
    
    // Buscar visitas recebidas (últimas 24 horas)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const { data: visits, error } = await supabase
      .from('profile_views')
      .select(`
        viewed_at,
        profiles:viewer_id (
          id,
          nickname,
          avatar_url,
          is_premium,
          last_online_at
        )
      `)
      .eq('viewed_user_id', PulseLove.currentUser.id)
      .gte('viewed_at', twentyFourHoursAgo)
      .order('viewed_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    // Verificar se usuário é premium
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', PulseLove.currentUser.id)
      .single();
    
    const isPremium = profile?.is_premium || false;
    
    // Renderizar resultados
    renderVisitorsSection(visits || [], isPremium);
    
  } catch (error) {
    const container = document.getElementById('visitorsContainer');
    if (container) {
      container.innerHTML = `
        <div class="feels-empty-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erro ao carregar visitas</p>
          <button class="btn btn-outline" onclick="loadVisitorsSection()">
            Tentar novamente
          </button>
        </div>
      `;
    }
  }
}

// RENDERIZAR SEÇÃO "QUEM TE VISITOU"
function renderVisitorsSection(visits, isPremium) {
  const container = document.getElementById('visitorsContainer');
  const viewAllBtn = document.getElementById('viewAllVisitorsBtn');
  
  // Mostrar/ocultar botão "Ver todos"
  if (viewAllBtn) {
    viewAllBtn.style.display = visits.length > 5 ? 'flex' : 'none';
  }
  
  // Se não há visitas
  if (!visits || visits.length === 0) {
    container.innerHTML = `
      <div class="feels-empty-state">
        <i class="fas fa-eye"></i>
        <p>Ninguém te visitou ainda...</p>
        <small>Atualize seu perfil para atrair mais visitas!</small>
      </div>
    `;
    return;
  }
  
  // Usuário FREE: mostrar apenas contador e botão de upgrade
  if (!isPremium) {
    container.innerHTML = `
      <div class="feels-free-state">
        <div class="feels-count">${visits.length}</div>
        <div class="feels-free-message">
          <i class="fas fa-lock"></i>
          ${visits.length} pessoa${visits.length > 1 ? 's' : ''} te visitou${visits.length > 1 ? 'ram' : ''}!
        </div>
        <button class="btn btn-primary" onclick="goToPricing()">
          <i class="fas fa-crown"></i> Virar Premium para ver quem é
        </button>
      </div>
    `;
    return;
  }
  
  // Usuário PREMIUM: mostrar lista de visitas
  // Limitar a 5 visitas na home
  const visitsToShow = visits.slice(0, 5);
  
  const visitsHTML = visitsToShow.map(visit => {
    const profile = visit.profiles;
    const timeAgo = formatTimeAgo(visit.viewed_at);
    const initials = getUserInitials(profile.nickname || 'U');
    const isOnline = checkIfUserIsOnline(profile.last_online_at);
    
    return `
      <div class="feel-user-card" onclick="viewUserProfile('${profile.id}')">
        <div class="feel-user-avatar">
          ${profile.avatar_url ? 
            `<img src="${profile.avatar_url}" alt="${profile.nickname}" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
            ''
          }
          <div class="avatar-fallback" style="${profile.avatar_url ? 'display:none' : 'display:flex'}">
            ${initials}
          </div>
          ${profile.is_premium ? '<div class="premium-mini-badge" title="Usuário Premium">P</div>' : ''}
          ${isOnline ? '<div class="online-indicator"></div>' : ''}
        </div>
        <div class="feel-user-name">${profile.nickname || 'Usuário'}</div>
        <div class="feel-user-time">${timeAgo}</div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = `
    <div class="feels-grid">
      ${visitsHTML}
    </div>
    ${visits.length > 5 ? `
      <div class="view-all-container">
        <button class="btn-view-all" onclick="goToVisitorsPage()">
          Ver todas as visitas (${visits.length}) <i class="fas fa-arrow-right"></i>
        </button>
      </div>
    ` : ''}
  `;
}

// ========== SEÇÃO "PESSOAS PARA CONHECER" ==========
async function loadUsers() {
  try {
    const usersGrid = document.getElementById('usersGrid');
    if (!usersGrid) return;
    
    usersGrid.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Carregando pessoas compatíveis...</p>
      </div>
    `;
    
    // Buscar preferências do usuário atual
    const { data: currentUserDetails, error: detailsError } = await supabase
      .from('user_details')
      .select('gender, sexual_orientation')
      .eq('user_id', PulseLove.currentUser.id)
      .single();
    
    let userGender = '';
    let userOrientation = '';
    
    if (!detailsError && currentUserDetails) {
      userGender = currentUserDetails.gender || '';
      userOrientation = currentUserDetails.sexual_orientation || '';
    }
    
    // Construir query base
    let query = supabase
      .from('profiles')
      .select('*')
      .neq('id', PulseLove.currentUser.id)
      .eq('is_invisible', false);
    
    // Aplicar filtros
    if (PulseLove.currentFilter === 'online') {
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      query = query.or(`real_status.eq.online,last_online_at.gte.${twoMinutesAgo}`);
    } else if (PulseLove.currentFilter === 'premium') {
      query = query.eq('is_premium', true);
    }
    
    const { data: profiles, error } = await query;
    
    if (error) {
      usersGrid.innerHTML = '<div class="loading-state"><p>Erro ao carregar usuários.</p></div>';
      return;
    }
    
    if (!profiles || profiles.length === 0) {
      usersGrid.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; color: #ccc;"></i>
          <p>Nenhuma pessoa encontrada no momento.</p>
        </div>
      `;
      return;
    }
    
    // Buscar detalhes dos usuários
    const profileIds = profiles.map(p => p.id);
    const { data: allUserDetails } = await supabase
      .from('user_details')
      .select('user_id, gender, sexual_orientation')
      .in('user_id', profileIds);
    
    // Combinar perfis com detalhes
    const profilesWithDetails = profiles.map(profile => {
      const details = allUserDetails?.find(d => d.user_id === profile.id) || {};
      return {
        ...profile,
        user_details: details
      };
    });
    
    // Filtrar por compatibilidade
    const compatibleProfiles = filterCompatibleUsers(profilesWithDetails, userGender, userOrientation);
    
    // Filtrar usuários bloqueados
    const filteredProfiles = await filterBlockedUsers(compatibleProfiles);
    
    if (filteredProfiles.length === 0) {
      usersGrid.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-users" style="font-size: 3rem; margin-bottom: 1rem; color: #ccc;"></i>
          <p>Nenhuma pessoa disponível no momento.</p>
          <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
            Tente ajustar seus filtros ou complete seu perfil.
          </p>
        </div>
      `;
      return;
    }
    
    // Mostrar apenas 8 perfis
    const profilesToShow = filteredProfiles.slice(0, 8);
    
    // Verificar status online
    const profilesWithStatus = profilesToShow.map(profile => {
      const isOnline = checkIfUserIsOnline(profile.last_online_at);
      return {
        ...profile,
        isOnline: isOnline
      };
    });
    
    // Renderizar usuários
    displayUsers(profilesWithStatus);
    
  } catch (error) {
    const usersGrid = document.getElementById('usersGrid');
    if (usersGrid) {
      usersGrid.innerHTML = `
        <div class="loading-state">
          <i class="fas fa-exclamation-triangle"></i>
          <p>Erro ao carregar. Tente novamente.</p>
          <button class="btn btn-outline" onclick="loadUsers()" style="margin-top: 1rem;">
            Tentar novamente
          </button>
        </div>
      `;
    }
  }
}

// FUNÇÕES AUXILIARES
function filterCompatibleUsers(profiles, userGender, userOrientation) {
  if (!userOrientation) {
    return profiles;
  }
  
  return profiles.filter(profile => {
    const profileGender = profile.user_details?.gender;
    if (!profileGender) return true;
    
    const userGenderNorm = userGender.toLowerCase();
    const profileGenderNorm = profileGender.toLowerCase();
    
    switch (userOrientation.toLowerCase()) {
      case 'heterossexual':
        if (userGenderNorm === 'masculino' || userGenderNorm === 'homem') {
          return profileGenderNorm === 'feminino' || profileGenderNorm === 'mulher';
        } else if (userGenderNorm === 'feminino' || userGenderNorm === 'mulher') {
          return profileGenderNorm === 'masculino' || profileGenderNorm === 'homem';
        }
        return true;
        
      case 'homossexual':
        if (userGenderNorm === 'masculino' || userGenderNorm === 'homem') {
          return profileGenderNorm === 'masculino' || profileGenderNorm === 'homem';
        } else if (userGenderNorm === 'feminino' || userGenderNorm === 'mulher') {
          return profileGenderNorm === 'feminino' || profileGenderNorm === 'mulher';
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
      .eq('blocker_id', PulseLove.currentUser.id);
    
    const { data: blockedMe } = await supabase
      .from('user_blocks')
      .select('blocker_id')
      .eq('blocked_id', PulseLove.currentUser.id);
    
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
  if (!usersGrid) return;
  
  usersGrid.innerHTML = profiles.map(profile => {
    const userDetails = profile.user_details || {};
    const safeNickname = (profile.nickname || 'Usuário').replace(/'/g, "\\'");
    const safeCity = (profile.display_city || 'Localização não informada').replace(/'/g, "\\'");
    const profileGender = userDetails.gender || 'Não informado';
    const isOnline = profile.isOnline;
    
    return `
      <div class="user-card">
        <div class="user-actions-btn" onclick="openUserActions('${profile.id}', '${safeNickname}')">
          <i class="fas fa-ellipsis-v"></i>
        </div>
        
        <div class="user-header">
          <div class="user-avatar-small">
            ${profile.avatar_url ?
              `<img src="${profile.avatar_url}" alt="${safeNickname}" 
                   onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
              ''
            }
            <div class="avatar-fallback" style="${profile.avatar_url ? 'display:none' : 'display:flex'}">
              ${getUserInitials(profile.nickname)}
            </div>
            ${isOnline ? '<div class="online-indicator"></div>' : ''}
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
              ${profile.is_premium ? ' Premium' : ' Free'}
            </div>
          </div>
        </div>
        <div class="user-details">
          <div class="online-status ${isOnline ? 'status-online' : 'status-offline'}">
            <span class="status-dot"></span>
            <span>${isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>
        <button class="view-profile-btn" onclick="viewUserProfile('${profile.id}')">
          <i class="fas fa-user"></i> Ver Perfil
        </button>
      </div>
    `;
  }).join('');
}

// FUNÇÕES UTILITÁRIAS
function checkIfUserIsOnline(lastOnlineAt) {
  if (!lastOnlineAt) return false;
  const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
  return new Date(lastOnlineAt) > twoMinutesAgo;
}

function formatTimeAgo(dateString) {
  if (!dateString) return 'Recentemente';
  
  try {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `Há ${diffMins} min`;
    if (diffHours < 24) return `Há ${diffHours} h`;
    if (diffDays < 7) return `Há ${diffDays} dias`;
    
    return date.toLocaleDateString('pt-BR');
  } catch (error) {
    return 'Recentemente';
  }
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

function getUserInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
}

// SISTEMA DE FILTROS
function setActiveFilter(filter) {
  PulseLove.currentFilter = filter;
  document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
  if (activeBtn) activeBtn.classList.add('active');
  loadUsers();
}

// ========== SISTEMA DE NOTIFICAÇÕES ==========
async function loadNotificationCount() {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, is_read')
      .eq('user_id', PulseLove.currentUser.id)
      .eq('is_read', false);
    
    if (!error && notifications) {
      updateNotificationBadge(notifications);
    }
  } catch (error) {
    // Silenciar erro de notificações
  }
}

function updateNotificationBadge(notifications) {
  const badge = document.getElementById('notificationBadge');
  if (!badge) return;
  
  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.style.display = 'flex';
    
    // Adicionar animação para notificações importantes
    const hasImportantNotifications = notifications.some(n =>
      n.type === 'new_like' || n.type === 'new_message' || n.type === 'new_match'
    );
    
    if (hasImportantNotifications) {
      badge.classList.add('pulse');
    } else {
      badge.classList.remove('pulse');
    }
  } else {
    badge.style.display = 'none';
    badge.classList.remove('pulse');
  }
}

function startNotificationPolling() {
  // Parar intervalo existente
  if (PulseLove.notificationInterval) {
    clearInterval(PulseLove.notificationInterval);
  }
  
  // Iniciar novo intervalo (a cada 30 segundos)
  PulseLove.notificationInterval = setInterval(async () => {
    if (PulseLove.currentUser) {
      await loadNotificationCount();
    }
  }, 30000);
}

function stopNotificationPolling() {
  if (PulseLove.notificationInterval) {
    clearInterval(PulseLove.notificationInterval);
    PulseLove.notificationInterval = null;
  }
}

// ========== FUNÇÕES DE NAVEGAÇÃO ==========
function viewUserProfile(userId) {
  window.location.href = `perfil.html?id=${userId}`;
}

function goToPerfil() { window.location.href = 'painel.html'; }
function goToMensagens() { window.location.href = 'mensagens.html'; }
function goToBusca() { window.location.href = 'busca.html'; }
function goToBloqueados() { window.location.href = 'bloqueados.html'; }
function goToPricing() { window.location.href = 'pricing.html'; }

async function goToVisitorsPage() {
  try {
    // Verificar premium diretamente
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', PulseLove.currentUser.id)
      .single();
    
    if (profile?.is_premium) {
      window.location.href = 'visitantes.html';
    } else {
      if (confirm('Ver o histórico completo de visitantes é um recurso Premium! Deseja fazer upgrade?')) {
        window.location.href = 'pricing.html';
      }
    }
  } catch (error) {
    window.location.href = 'visitantes.html';
  }
}

async function goToFeelsPage() {
  try {
    // Verificar premium diretamente
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_premium')
      .eq('id', PulseLove.currentUser.id)
      .single();
    
    if (profile?.is_premium) {
      window.location.href = 'feels.html';
    } else {
      if (confirm('Ver quem te curtiu é um recurso Premium! Deseja fazer upgrade?')) {
        window.location.href = 'pricing.html';
      }
    }
  } catch (error) {
    window.location.href = 'feels.html';
  }
}

// ========== LOGOUT ==========
async function logout() {
  try {
    // Parar todos os intervalos
    stopNotificationPolling();
    stopStatusUpdates();
    
    // Atualizar status para offline
    if (PulseLove.currentUser) {
      await updateOnlineStatusSafe(PulseLove.currentUser.id, false);
    }
    
    // Fazer logout
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    // Redirecionar para login
    window.location.href = 'login.html';
    
  } catch (error) {
    showNotification('Erro ao sair. Tente novamente.', 'error');
  }
}

// ========== NOTIFICAÇÕES VISUAIS ==========
function showNotification(message, type = 'success') {
  // Criar elemento da notificação
  const notification = document.createElement('div');
  const backgroundColor = type === 'error' ? '#f56565' :
                          type === 'warning' ? '#ed8936' : '#48bb78';
  
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${backgroundColor};
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 8px;
    z-index: 4000;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    animation: slideInRight 0.3s ease-out;
    max-width: 300px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `;
  
  // Ícone baseado no tipo
  const icon = type === 'error' ? '❌' :
               type === 'warning' ? '⚠️' : '✅';
  
  notification.innerHTML = `
    <span style="font-size: 1.2rem;">${icon}</span>
    <span>${message}</span>
  `;
  
  document.body.appendChild(notification);
  
  // Remover após 3 segundos
  setTimeout(() => {
    notification.style.animation = 'slideOutRight 0.3s ease-in';
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// ========== LISTENER DE AUTENTICAÇÃO ==========
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    stopNotificationPolling();
    stopStatusUpdates();
  } else if (event === 'SIGNED_IN' && session) {
    PulseLove.currentUser = session.user;
    startNotificationPolling();
    startStatusUpdates();
  }
});

// ========== EXPORTAR FUNÇÕES PARA O HTML ==========
window.openUserActions = openUserActions;
window.closeUserActionsModal = closeUserActionsModal;
window.blockUser = blockUser;
window.closeBlockConfirmModal = closeBlockConfirmModal;
window.confirmBlockUser = confirmBlockUser;
window.reportUser = reportUser;
window.closeReportModal = closeReportModal;
window.submitReport = submitReport;
window.viewProfileFromModal = viewProfileFromModal;
window.viewUserProfile = viewUserProfile;
window.goToPerfil = goToPerfil;
window.goToMensagens = goToMensagens;
window.goToBusca = goToBusca;
window.goToBloqueados = goToBloqueados;
window.goToPricing = goToPricing;
window.goToVisitorsPage = goToVisitorsPage;
window.goToFeelsPage = goToFeelsPage;
window.logout = logout;
window.loadFeelsSection = loadFeelsSection;
window.loadVisitorsSection = loadVisitorsSection;
window.loadUsers = loadUsers;

// Funções dos modais (mantidas do código original)
function openUserActions(userId, userName) {
  PulseLove.currentBlockingUser = { id: userId, name: userName };
  const modal = document.getElementById('userActionsModal');
  if (modal) modal.style.display = 'flex';
}

function closeUserActionsModal() {
  const modal = document.getElementById('userActionsModal');
  if (modal) modal.style.display = 'none';
}

function closeBlockConfirmModal() {
  const modal = document.getElementById('blockConfirmModal');
  if (modal) modal.style.display = 'none';
  PulseLove.currentBlockingUser = null;
}

function blockUser() {
  if (!PulseLove.currentBlockingUser) {
    showNotification('Erro: usuário não selecionado');
    return;
  }
  closeUserActionsModal();
  const modal = document.getElementById('blockConfirmModal');
  if (modal) modal.style.display = 'flex';
}

async function confirmBlockUser() {
  if (!PulseLove.currentBlockingUser) {
    showNotification('Erro: usuário não selecionado');
    return;
  }
  
  try {
    const { error } = await supabase
      .from('user_blocks')
      .insert({
        blocker_id: PulseLove.currentUser.id,
        blocked_id: PulseLove.currentBlockingUser.id,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    showNotification('Usuário bloqueado com sucesso!');
    closeBlockConfirmModal();
    await loadUsers();
    
  } catch (error) {
    showNotification('Erro ao bloquear usuário. Tente novamente.', 'error');
  }
}

// Funções de denúncia (simplificadas)
function reportUser() {
  if (!PulseLove.currentBlockingUser) return;
  showNotification('Sistema de denúncia em desenvolvimento', 'warning');
}

function closeReportModal() {
  const modal = document.getElementById('reportModal');
  if (modal) modal.style.display = 'none';
}

function submitReport() {
  showNotification('Denúncia enviada com sucesso!', 'success');
  closeReportModal();
}

function viewProfileFromModal() {
  if (PulseLove.currentBlockingUser) {
    closeAllModals();
    viewUserProfile(PulseLove.currentBlockingUser.id);
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  PulseLove.currentBlockingUser = null;
}

// Adicionar CSS para animações
const notificationCSS = `
@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

.notification-badge.pulse {
  animation: pulse 2s infinite;
}

.online-indicator {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 12px;
  height: 12px;
  background: #48bb78;
  border: 2px solid white;
  border-radius: 50%;
}
`;

const style = document.createElement('style');
style.textContent = notificationCSS;
document.head.appendChild(style);

// Verificação inicial quando a página carrega
window.addEventListener('load', function() {
  // Inicialização já feita pelo DOMContentLoaded
});