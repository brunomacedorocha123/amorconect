const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentFilter = 'all';
let currentBlockingUser = null;
let notificationInterval = null;
let statusSystem = null;
let statusUpdateInterval = null;

document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

async function initializeApp() {
  const authenticated = await checkAuthentication();
  if (authenticated) {
    // ✅ CORREÇÃO DO STATUS: Inicializar e atualizar status imediatamente
    statusSystem = window.StatusSystem;
    if (statusSystem && currentUser) {
      await statusSystem.initialize(currentUser);
      await statusSystem.updateMyStatus(); // ✅ ATUALIZAÇÃO IMEDIATA
    }
    
    setupEventListeners();
    await loadUserProfile();
    await loadUsers();
    await loadNotificationCount();
    startNotificationPolling();
    startStatusUpdates();
  }
}

function startStatusUpdates() {
  // ✅ CORREÇÃO DO STATUS: Intervalo funcionando corretamente
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
  }
  
  statusUpdateInterval = setInterval(async () => {
    if (statusSystem && currentUser) {
      await statusSystem.updateMyStatus();
    }
  }, 30000);
}

function stopStatusUpdates() {
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
    statusUpdateInterval = null;
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

  // ✅ CORREÇÃO DO STATUS: Atualizar quando a página ganha foco
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && statusSystem && currentUser) {
      await statusSystem.updateMyStatus();
      await loadUsers(); // Recarregar usuários com status atualizado
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

  // ✅ CORREÇÃO DO STATUS: Atualizar status do usuário logado no header
  const userStatus = document.getElementById('userStatus');
  if (userStatus && profile.last_online_at) {
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const isOnline = new Date(profile.last_online_at) > fifteenMinutesAgo;
    
    if (isOnline) {
      userStatus.textContent = profile.is_invisible ? 'Invisível' : 'Online';
      userStatus.style.color = profile.is_invisible ? '#a0aec0' : '#48bb78';
    } else {
      userStatus.textContent = 'Offline';
      userStatus.style.color = '#a0aec0';
    }
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

    // ✅ CORREÇÃO DO STATUS: Sistema funcionando corretamente
    const userIds = filteredProfiles.map(p => p.id);
    let statusMap = {};
    
    if (statusSystem) {
      statusMap = await statusSystem.getMultipleUsersStatus(userIds);
    } else {
      // ✅ FALLBACK: Calcular status manualmente se o system não carregar
      filteredProfiles.forEach(profile => {
        statusMap[profile.id] = calculateUserStatusManual(
          profile.last_online_at, 
          profile.is_invisible, 
          profile.id
        );
      });
    }

    const profilesToShow = filteredProfiles.slice(0, 8);
    displayUsers(profilesToShow, statusMap);

  } catch (error) {
    usersGrid.innerHTML = '<div class="loading-state"><p>Erro ao carregar. Tente novamente.</p></div>';
  }
}

// ✅ NOVA FUNÇÃO: Calcular status manualmente (fallback)
function calculateUserStatusManual(lastOnlineAt, isInvisible, userId) {
  if (!lastOnlineAt) {
    return { status: 'offline', text: 'Offline', class: 'status-offline' };
  }
  
  // Usuário invisível aparece como offline para outros
  if (isInvisible && userId !== currentUser?.id) {
    return { status: 'invisible', text: 'Offline', class: 'status-offline' };
  }

  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const isOnline = new Date(lastOnlineAt) > fifteenMinutesAgo;

  if (isOnline) {
    return { status: 'online', text: 'Online', class: 'status-online' };
  } else {
    return { status: 'offline', text: 'Offline', class: 'status-offline' };
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

function displayUsers(profiles, statusMap = {}) {
  const usersGrid = document.getElementById('usersGrid');
  
  usersGrid.innerHTML = profiles.map(profile => {
    const userDetails = profile.user_details || {};
    const safeNickname = (profile.nickname || 'Usuário').replace(/'/g, "\\'");
    const safeCity = (profile.display_city || 'Localização não informada').replace(/'/g, "\\'");
    const profileGender = userDetails.gender || 'Não informado';
    
    // ✅ CORREÇÃO DO STATUS: Sistema robusto
    let statusInfo;
    if (statusMap[profile.id]) {
      statusInfo = statusMap[profile.id];
    } else {
      // ✅ Calcular na hora se precisar
      statusInfo = calculateUserStatusManual(profile.last_online_at, profile.is_invisible, profile.id);
    }
    
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
            ${profile.is_premium ? ' Premium' : ' Free'}
          </div>
        </div>
      </div>
      <div class="user-details">
        <div class="online-status ${statusInfo.class}">
          <span class="status-dot"></span>
          <span>${statusInfo.text}</span>
          ${profile.is_invisible && profile.id !== currentUser?.id ? '<i class="fas fa-eye-slash" style="margin-left: 5px; font-size: 0.7rem;" title="Modo invisível ativo"></i>' : ''}
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

function getUserInitials(name) {
  if (!name) return 'U';
  return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
}

function setActiveFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
  document.querySelector(`[data-filter="${filter}"]`).classList.add('active');
  loadUsers();
}

function viewUserProfile(userId) {
  window.location.href = `perfil.html?id=${userId}`;
}

// === SISTEMA DE MODAIS === (TUDO MANTIDO ORIGINAL)
function openUserActions(userId, userName) {
  currentBlockingUser = { id: userId, name: userName };
  
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  
  const modal = document.getElementById('userActionsModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeUserActionsModal() {
  const modal = document.getElementById('userActionsModal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
}

function closeBlockConfirmModal() {
  const modal = document.getElementById('blockConfirmModal');
  modal.style.display = 'none';
  document.body.style.overflow = '';
  currentBlockingUser = null;
}

function blockUser() {
  if (!currentBlockingUser) {
    showNotification('Erro: usuário não selecionado');
    return;
  }
  
  closeUserActionsModal();
  
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

  const modal = document.getElementById('blockConfirmModal');
  modal.style.display = 'flex';
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
      
      closeBlockConfirmModal();
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

// === SISTEMA DE DENÚNCIA === (TUDO MANTIDO ORIGINAL)
function reportUser() {
  if (!currentBlockingUser) {
    showNotification('Erro: usuário não selecionado');
    return;
  }
  
  closeUserActionsModal();
  openReportModal();
}

function openReportModal() {
  const modalHTML = `
    <div class="modal" id="reportModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3> Denunciar Usuário</h3>
          <button class="modal-close" onclick="closeReportModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="report-user-info">
            <p>Você está denunciando: <strong>${currentBlockingUser.name || 'Usuário'}</strong></p>
          </div>
          
          <div class="report-form">
            <div class="form-group">
              <label for="reportReason">Motivo da Denúncia *</label>
              <select id="reportReason" class="form-select">
                <option value="">Selecione um motivo...</option>
                <option value="spam"> Spam ou propaganda</option>
                <option value="inappropriate"> Conteúdo inadequado</option>
                <option value="harassment"> Assédio ou bullying</option>
                <option value="fake_profile"> Perfil falso ou impostor</option>
                <option value="scam"> Golpe ou fraude</option>
                <option value="other">❓ Outro motivo</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="reportDetails">Detalhes (opcional)</label>
              <textarea
                id="reportDetails"
                class="form-textarea"
                placeholder="Descreva com mais detalhes o que aconteceu..."
                rows="4"
                maxlength="500"
              ></textarea>
              <div class="char-counter">
                <span id="charCount">0</span>/500 caracteres
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-outline" onclick="closeReportModal()">Cancelar</button>
          <button class="btn btn-primary" onclick="submitReport()"> Enviar Denúncia</button>
        </div>
      </div>
    </div>
  `;
  
  const existingModal = document.getElementById('reportModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  const textarea = document.getElementById('reportDetails');
  const charCount = document.getElementById('charCount');
  
  if (textarea && charCount) {
    textarea.addEventListener('input', function() {
      charCount.textContent = this.value.length;
    });
  }
  
  const modal = document.getElementById('reportModal');
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeReportModal() {
  const modal = document.getElementById('reportModal');
  if (modal) {
    modal.style.display = 'none';
    document.body.style.overflow = '';
    modal.remove();
  }
  currentBlockingUser = null;
}

async function submitReport() {
  if (!currentBlockingUser) {
    showNotification('Erro: usuário não selecionado');
    return;
  }

  const reason = document.getElementById('reportReason').value;
  const details = document.getElementById('reportDetails').value.trim();

  if (!reason) {
    showNotification('Por favor, selecione um motivo para a denúncia.', 'error');
    return;
  }

  try {
    const { data: existingReports, error: checkError } = await supabase
      .from('user_reports')
      .select('id')
      .eq('reporter_id', currentUser.id)
      .eq('reported_user_id', currentBlockingUser.id)
      .eq('status', 'pending')
      .limit(1);

    if (checkError) throw checkError;

    if (existingReports && existingReports.length > 0) {
      showNotification('Você já tem uma denúncia pendente para este usuário.', 'error');
      closeReportModal();
      return;
    }

    const { error } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: currentUser.id,
        reported_user_id: currentBlockingUser.id,
        reason: reason,
        evidence: details || null,
        status: 'pending',
        severity: getSeverityByReason(reason),
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    showNotification('✅ Denúncia enviada com sucesso! Nossa equipe irá analisar.', 'success');
    closeReportModal();

  } catch (error) {
    showNotification('❌ Erro ao enviar denúncia. Tente novamente.', 'error');
  }
}

function getSeverityByReason(reason) {
  const severityMap = {
    'harassment': 'high',
    'scam': 'high',
    'inappropriate': 'medium',
    'fake_profile': 'medium',
    'spam': 'low',
    'other': 'low'
  };
  return severityMap[reason] || 'medium';
}

function viewProfileFromModal() {
  if (currentBlockingUser) {
    closeAllModals();
    viewUserProfile(currentBlockingUser.id);
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  document.body.style.overflow = '';
  
  const reportModal = document.getElementById('reportModal');
  if (reportModal) {
    reportModal.remove();
  }
  
  currentBlockingUser = null;
}

// === SISTEMA DE NOTIFICAÇÕES === (TUDO MANTIDO ORIGINAL)
async function loadNotificationCount() {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, is_read')
      .eq('user_id', currentUser.id)
      .eq('is_read', false);

    if (!error && notifications) {
      updateNotificationBadge(notifications);
    }
  } catch (error) {
    // Silencioso
  }
}

function updateNotificationBadge(notifications) {
  const badge = document.getElementById('notificationBadge');
  if (!badge) return;

  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.style.display = 'flex';
    
    if (unreadCount > 5) {
      badge.classList.add('urgent');
    } else {
      badge.classList.remove('urgent');
    }

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
    badge.classList.remove('urgent', 'pulse');
  }
}

function startNotificationPolling() {
  notificationInterval = setInterval(async () => {
    if (currentUser) {
      await loadNotificationCount();
    }
  }, 30000);
}

function stopNotificationPolling() {
  if (notificationInterval) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }
}

async function markNotificationsAsRead() {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);

    if (!error) {
      const badge = document.getElementById('notificationBadge');
      if (badge) {
        badge.style.display = 'none';
        badge.classList.remove('urgent', 'pulse');
      }
    }
  } catch (error) {
    // Silencioso
  }
}

// === SISTEMA DE NOTIFICAÇÕES VISUAIS === (TUDO MANTIDO ORIGINAL)
function showNotification(message, type = 'success') {
  const notification = document.createElement('div');
  const backgroundColor = type === 'error' ? 'var(--error)' :
              type === 'warning' ? 'var(--warning)' :
              'var(--success)';
  
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
    display: flex;
    align-items: center;
    gap: 0.5rem;
  `;
  
  const icon = type === 'error' ? '❌' :
        type === 'warning' ? '⚠️' : '✅';
  
  notification.innerHTML = `
    <span style="font-size: 1.2rem;">${icon}</span>
    <span>${message}</span>
  `;
  
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

// === NAVEGAÇÃO === (TUDO MANTIDO ORIGINAL)
function goToPerfil() { window.location.href = 'painel.html'; }
function goToMensagens() { window.location.href = 'mensagens.html'; }
function goToBusca() { window.location.href = 'busca.html'; }
function goToBloqueados() { window.location.href = 'bloqueados.html'; }
function goToPricing() { window.location.href = 'pricing.html'; }
function goToNotificacoes() {
  markNotificationsAsRead();
  window.location.href = 'notifica.html';
}

async function logout() {
  stopNotificationPolling();
  stopStatusUpdates();
  if (statusSystem) {
    statusSystem.destroy();
  }
  const { error } = await supabase.auth.signOut();
  if (!error) window.location.href = 'login.html';
}

// === EXPORTA FUNÇÕES PARA O HTML === (TUDO MANTIDO ORIGINAL)
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
window.goToNotificacoes = goToNotificacoes;
window.logout = logout;

// Funções de teste (TUDO MANTIDO ORIGINAL)
window.createTestNotification = createTestNotification;

// Listener de autenticação (TUDO MANTIDO ORIGINAL)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    stopNotificationPolling();
    stopStatusUpdates();
    if (statusSystem) {
      statusSystem.destroy();
    }
    window.location.href = 'login.html';
  } else if (event === 'SIGNED_IN' && session) {
    currentUser = session.user;
    if (statusSystem) {
      statusSystem.initialize(currentUser);
    }
    startNotificationPolling();
    startStatusUpdates();
  }
});

// Cleanup quando a página for fechada (TUDO MANTIDO ORIGINAL)
window.addEventListener('beforeunload', () => {
  stopNotificationPolling();
  stopStatusUpdates();
  if (statusSystem) {
    statusSystem.destroy();
  }
});

// Adiciona CSS dinâmico para notificações (TUDO MANTIDO ORIGINAL)
const notificationCSS = `
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

@keyframes slideInRight {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

@keyframes slideOutRight {
  from { transform: translateX(0); opacity: 1; }
  to { transform: translateX(100%); opacity: 0; }
}

.notification-badge.urgent {
  background: var(--error) !important;
  animation: pulse 1s infinite !important;
}

.notification-badge.pulse {
  animation: pulse 2s infinite !important;
}
`;

const style = document.createElement('style');
style.textContent = notificationCSS;
document.head.appendChild(style);

// Função para criar notificação de teste (TUDO MANTIDO ORIGINAL)
async function createTestNotification(type = 'info', title = 'Teste', message = 'Esta é uma notificação de teste') {
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: currentUser.id,
        type: type,
        title: title,
        message: message,
        is_read: false,
        created_at: new Date().toISOString()
      });

    if (!error) {
      await loadNotificationCount();
      showNotification('Notificação de teste criada!');
    }
  } catch (error) {
    // Silencioso
  }
}

// Função para verificar compatibilidade avançada (TUDO MANTIDO ORIGINAL)
function checkAdvancedCompatibility(userProfile, targetProfile) {
  const compatibility = {
    score: 0,
    matches: [],
    warnings: []
  };

  // Compatibilidade de gênero e orientação
  const userGender = userProfile.user_details?.gender?.toLowerCase();
  const userOrientation = userProfile.user_details?.sexual_orientation?.toLowerCase();
  const targetGender = targetProfile.user_details?.gender?.toLowerCase();
  const targetOrientation = targetProfile.user_details?.sexual_orientation?.toLowerCase();

  if (userOrientation && targetGender) {
    switch (userOrientation) {
      case 'heterossexual':
        if ((userGender === 'masculino' || userGender === 'homem') && 
            (targetGender === 'feminino' || targetGender === 'mulher')) {
          compatibility.score += 30;
          compatibility.matches.push('Compatibilidade heterossexual');
        } else if ((userGender === 'feminino' || userGender === 'mulher') && 
                   (targetGender === 'masculino' || targetGender === 'homem')) {
          compatibility.score += 30;
          compatibility.matches.push('Compatibilidade heterossexual');
        }
        break;
      case 'homossexual':
        if (userGender === targetGender) {
          compatibility.score += 30;
          compatibility.matches.push('Compatibilidade homossexual');
        }
        break;
      case 'bissexual':
        compatibility.score += 25;
        compatibility.matches.push('Compatibilidade bissexual');
        break;
    }
  }

  // Compatibilidade de interesses
  const userInterests = userProfile.user_details?.interests || [];
  const targetInterests = targetProfile.user_details?.interests || [];
  
  const commonInterests = userInterests.filter(interest => 
    targetInterests.includes(interest)
  );
  
  if (commonInterests.length > 0) {
    compatibility.score += commonInterests.length * 5;
    compatibility.matches.push(`${commonInterests.length} interesses em comum`);
  }

  // Compatibilidade de características
  const userCharacteristics = userProfile.user_details?.characteristics || [];
  const targetCharacteristics = targetProfile.user_details?.characteristics || [];
  
  const commonCharacteristics = userCharacteristics.filter(char => 
    targetCharacteristics.includes(char)
  );
  
  if (commonCharacteristics.length > 0) {
    compatibility.score += commonCharacteristics.length * 3;
    compatibility.matches.push(`${commonCharacteristics.length} características compatíveis`);
  }

  // Bônus para premium
  if (targetProfile.is_premium) {
    compatibility.score += 10;
    compatibility.matches.push('Usuário Premium');
  }

  // Limitar score máximo
  compatibility.score = Math.min(compatibility.score, 100);

  return compatibility;
}

// CONTINUA... (preciso enviar a segunda parte)
// Função para carregar usuários com compatibilidade avançada (TUDO MANTIDO ORIGINAL)
async function loadUsersWithCompatibility() {
  try {
    const { data: userProfile, error: userError } = await supabase
      .from('profiles')
      .select(`
        *,
        user_details (*)
      `)
      .eq('id', currentUser.id)
      .single();

    if (userError) return;

    const { data: otherProfiles, error: profilesError } = await supabase
      .from('profiles')
      .select(`
        *,
        user_details (*)
      `)
      .neq('id', currentUser.id)
      .eq('is_invisible', false);

    if (profilesError) return;

    // Calcular compatibilidade para cada perfil
    const profilesWithCompatibility = otherProfiles.map(profile => {
      const compatibility = checkAdvancedCompatibility(userProfile, profile);
      return {
        ...profile,
        compatibility
      };
    });

    // Ordenar por compatibilidade
    profilesWithCompatibility.sort((a, b) => b.compatibility.score - a.compatibility.score);

    return profilesWithCompatibility;
  } catch (error) {
    return [];
  }
}

// Sistema de likes/feels (TUDO MANTIDO ORIGINAL)
async function sendFeel(targetUserId, feelType = 'like') {
  try {
    const { error } = await supabase
      .from('user_feels')
      .insert({
        sender_id: currentUser.id,
        receiver_id: targetUserId,
        feel_type: feelType,
        created_at: new Date().toISOString()
      });

    if (error) {
      if (error.code === '23505') {
        showNotification('Você já enviou um feel para este usuário!', 'warning');
      } else {
        throw error;
      }
    } else {
      showNotification('Feel enviado com sucesso! 💖', 'success');
      
      // Criar notificação para o usuário
      await createFeelNotification(targetUserId, feelType);
    }
  } catch (error) {
    showNotification('Erro ao enviar feel. Tente novamente.', 'error');
  }
}

async function createFeelNotification(targetUserId, feelType) {
  try {
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', currentUser.id)
      .single();

    await supabase
      .from('notifications')
      .insert({
        user_id: targetUserId,
        type: 'new_feel',
        title: 'Novo Feel!',
        message: `${senderProfile.nickname} enviou um ${feelType} para você!`,
        is_read: false,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    // Silencioso
  }
}

// Sistema de matches (TUDO MANTIDO ORIGINAL)
async function checkForMatch(targetUserId) {
  try {
    // Verificar se o target também deu feel no usuário atual
    const { data: reciprocalFeel, error } = await supabase
      .from('user_feels')
      .select('*')
      .eq('sender_id', targetUserId)
      .eq('receiver_id', currentUser.id)
      .single();

    if (reciprocalFeel && !error) {
      // MATCH encontrado!
      await createMatch(currentUser.id, targetUserId);
      return true;
    }

    return false;
  } catch (error) {
    return false;
  }
}

async function createMatch(userId1, userId2) {
  try {
    // Criar o match
    const { error } = await supabase
      .from('user_matches')
      .insert({
        user_id_1: userId1,
        user_id_2: userId2,
        matched_at: new Date().toISOString(),
        is_active: true
      });

    if (!error) {
      // Notificar ambos os usuários
      await createMatchNotification(userId1, userId2);
      await createMatchNotification(userId2, userId1);
      
      showNotification('🎉 Match encontrado! Vocês se curtiram mutuamente!', 'success');
    }
  } catch (error) {
    // Silencioso
  }
}

async function createMatchNotification(userId, matchedUserId) {
  try {
    const { data: matchedProfile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', matchedUserId)
      .single();

    await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type: 'new_match',
        title: 'Novo Match! 🎉',
        message: `Você deu match com ${matchedProfile.nickname}!`,
        is_read: false,
        created_at: new Date().toISOString()
      });
  } catch (error) {
    // Silencioso
  }
}

// Sistema de visualizações de perfil (TUDO MANTIDO ORIGINAL)
async function recordProfileView(viewedUserId) {
  try {
    await supabase
      .from('profile_views')
      .insert({
        viewer_id: currentUser.id,
        viewed_user_id: viewedUserId,
        viewed_at: new Date().toISOString()
      });
  } catch (error) {
    // Silencioso
  }
}

// Função para obter estatísticas do usuário (TUDO MANTIDO ORIGINAL)
async function getUserStats() {
  try {
    const [viewsCount, feelsCount, matchesCount] = await Promise.all([
      // Contar visualizações
      supabase
        .from('profile_views')
        .select('id', { count: 'exact' })
        .eq('viewed_user_id', currentUser.id),
      
      // Contar feels recebidos
      supabase
        .from('user_feels')
        .select('id', { count: 'exact' })
        .eq('receiver_id', currentUser.id),
      
      // Contar matches
      supabase
        .from('user_matches')
        .select('id', { count: 'exact' })
        .or(`user_id_1.eq.${currentUser.id},user_id_2.eq.${currentUser.id}`)
    ]);

    return {
      views: viewsCount.count || 0,
      feels: feelsCount.count || 0,
      matches: matchesCount.count || 0
    };
  } catch (error) {
    return {
      views: 0,
      feels: 0,
      matches: 0
    };
  }
}

// Função para carregar usuários que visualizaram o perfil (TUDO MANTIDO ORIGINAL)
async function loadProfileViewers() {
  try {
    const { data: views, error } = await supabase
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
      .eq('viewed_user_id', currentUser.id)
      .order('viewed_at', { ascending: false })
      .limit(10);

    if (error) return [];

    return views.map(view => ({
      ...view.profiles,
      viewed_at: view.viewed_at
    }));
  } catch (error) {
    return [];
  }
}

// Função para carregar usuários que deram feels (TUDO MANTIDO ORIGINAL)
async function loadFeelSenders() {
  try {
    const { data: feels, error } = await supabase
      .from('user_feels')
      .select(`
        feel_type,
        created_at,
        profiles:sender_id (
          id,
          nickname,
          avatar_url,
          is_premium,
          last_online_at
        )
      `)
      .eq('receiver_id', currentUser.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) return [];

    return feels.map(feel => ({
      ...feel.profiles,
      feel_type: feel.feel_type,
      created_at: feel.created_at
    }));
  } catch (error) {
    return [];
  }
}

// Função para carregar matches ativos (TUDO MANTIDO ORIGINAL)
async function loadActiveMatches() {
  try {
    const { data: matches, error } = await supabase
      .from('user_matches')
      .select(`
        matched_at,
        profiles1:user_id_1 (*),
        profiles2:user_id_2 (*)
      `)
      .or(`user_id_1.eq.${currentUser.id},user_id_2.eq.${currentUser.id}`)
      .eq('is_active', true)
      .order('matched_at', { ascending: false });

    if (error) return [];

    return matches.map(match => {
      const otherUser = match.user_id_1 === currentUser.id ? match.profiles2 : match.profiles1;
      return {
        ...otherUser,
        matched_at: match.matched_at
      };
    });
  } catch (error) {
    return [];
  }
}

// Sistema de busca avançada (TUDO MANTIDO ORIGINAL)
async function searchUsers(filters = {}) {
  try {
    let query = supabase
      .from('profiles')
      .select(`
        *,
        user_details (*)
      `)
      .neq('id', currentUser.id)
      .eq('is_invisible', false);

    // Aplicar filtros
    if (filters.gender) {
      query = query.eq('user_details.gender', filters.gender);
    }

    if (filters.sexual_orientation) {
      query = query.eq('user_details.sexual_orientation', filters.sexual_orientation);
    }

    if (filters.city) {
      query = query.ilike('display_city', `%${filters.city}%`);
    }

    if (filters.is_premium !== undefined) {
      query = query.eq('is_premium', filters.is_premium);
    }

    if (filters.online_only) {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      query = query.gte('last_online_at', fifteenMinutesAgo);
    }

    const { data: profiles, error } = await query;

    if (error) return [];

    return profiles;
  } catch (error) {
    return [];
  }
}

// Função para atualizar preferências de busca (TUDO MANTIDO ORIGINAL)
async function updateSearchPreferences(preferences) {
  try {
    const { error } = await supabase
      .from('user_search_preferences')
      .upsert({
        user_id: currentUser.id,
        preferences: preferences,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (!error) {
      showNotification('Preferências de busca atualizadas!', 'success');
    }
  } catch (error) {
    showNotification('Erro ao atualizar preferências.', 'error');
  }
}

// Sistema de favoritos (TUDO MANTIDO ORIGINAL)
async function toggleFavorite(userId) {
  try {
    // Verificar se já é favorito
    const { data: existingFavorite, error: checkError } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', currentUser.id)
      .eq('favorite_user_id', userId)
      .single();

    if (existingFavorite && !checkError) {
      // Remover dos favoritos
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('id', existingFavorite.id);

      if (!error) {
        showNotification('Removido dos favoritos', 'success');
        return false;
      }
    } else {
      // Adicionar aos favoritos
      const { error } = await supabase
        .from('user_favorites')
        .insert({
          user_id: currentUser.id,
          favorite_user_id: userId,
          created_at: new Date().toISOString()
        });

      if (!error) {
        showNotification('Adicionado aos favoritos! 💝', 'success');
        return true;
      }
    }
  } catch (error) {
    showNotification('Erro ao atualizar favoritos.', 'error');
  }
  return false;
}

// Função para carregar favoritos (TUDO MANTIDO ORIGINAL)
async function loadFavorites() {
  try {
    const { data: favorites, error } = await supabase
      .from('user_favorites')
      .select(`
        created_at,
        profiles:favorite_user_id (
          id,
          nickname,
          avatar_url,
          is_premium,
          last_online_at,
          display_city,
          user_details (
            gender,
            sexual_orientation
          )
        )
      `)
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false });

    if (error) return [];

    return favorites.map(fav => ({
      ...fav.profiles,
      favorited_at: fav.created_at
    }));
  } catch (error) {
    return [];
  }
}

// Sistema de denúncia aprimorado (TUDO MANTIDO ORIGINAL)
async function submitEnhancedReport(reportedUserId, reason, evidence, severity = 'medium') {
  try {
    const { error } = await supabase
      .from('user_reports')
      .insert({
        reporter_id: currentUser.id,
        reported_user_id: reportedUserId,
        reason: reason,
        evidence: evidence,
        severity: severity,
        status: 'pending',
        created_at: new Date().toISOString()
      });

    if (!error) {
      // Notificar administradores
      await notifyAdminsAboutReport(reportedUserId, reason, severity);
      return true;
    }
  } catch (error) {
    // Silencioso
  }
  return false;
}

async function notifyAdminsAboutReport(reportedUserId, reason, severity) {
  try {
    // Buscar administradores
    const { data: admins, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_admin', true);

    if (admins && !error) {
      const { data: reportedUser } = await supabase
        .from('profiles')
        .select('nickname')
        .eq('id', reportedUserId)
        .single();

      // Criar notificação para cada admin
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        type: 'new_report',
        title: 'Nova Denúncia 📋',
        message: `Nova denúncia ${severity} contra ${reportedUser.nickname}: ${reason}`,
        is_read: false,
        created_at: new Date().toISOString()
      }));

      await supabase
        .from('notifications')
        .insert(notifications);
    }
  } catch (error) {
    // Silencioso
  }
}

// Funções utilitárias adicionais (TUDO MANTIDO ORIGINAL)
function formatDistanceToNow(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMinutes = Math.floor((now - date) / (1000 * 60));
  
  if (diffInMinutes < 1) return 'Agora mesmo';
  if (diffInMinutes < 60) return `Há ${diffInMinutes} min`;
  if (diffInMinutes < 1440) return `Há ${Math.floor(diffInMinutes / 60)} h`;
  
  const diffInDays = Math.floor(diffInMinutes / 1440);
  if (diffInDays === 1) return 'Ontem';
  if (diffInDays < 7) return `Há ${diffInDays} dias`;
  if (diffInDays < 30) return `Há ${Math.floor(diffInDays / 7)} sem`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths === 1) return 'Há 1 mês';
  return `Há ${diffInMonths} meses`;
}

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

// Exportar funções adicionais para uso global (TUDO MANTIDO ORIGINAL)
window.sendFeel = sendFeel;
window.toggleFavorite = toggleFavorite;
window.recordProfileView = recordProfileView;
window.getUserStats = getUserStats;
window.searchUsers = searchUsers;
window.updateSearchPreferences = updateSearchPreferences;
window.formatDistanceToNow = formatDistanceToNow;
window.calculateAge = calculateAge;

// Inicialização final quando a página carrega completamente (TUDO MANTIDO ORIGINAL)
window.addEventListener('load', function() {
  // Garantir que o StatusSystem seja inicializado
  if (window.StatusSystem && currentUser && statusSystem) {
    setTimeout(() => {
      statusSystem.updateMyStatus();
    }, 2000);
  }
});