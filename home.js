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

// ✅ FUNÇÃO ATUALIZADA PARA STATUS DUPLO
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

async function initializeApp() {
  const authenticated = await checkAuthentication();
  if (authenticated) {
    statusSystem = window.StatusSystem;
    if (statusSystem && currentUser) {
      await statusSystem.initialize(currentUser);
      await updateOnlineStatusSafe(currentUser.id, true);
    }
    
    setupEventListeners();
    setupWindowUnload();
    await loadUserProfile();
    await loadUsers();
    await loadNotificationCount();
    startNotificationPolling();
    startStatusUpdates();
  }
}

// ✅ NOVA FUNÇÃO PARA LIDAR COM SAÍDA DO USUÁRIO
function setupWindowUnload() {
  window.addEventListener('beforeunload', async () => {
    if (currentUser) {
      await updateOnlineStatusSafe(currentUser.id, false);
    }
  });
}

function startStatusUpdates() {
  if (statusUpdateInterval) {
    clearInterval(statusUpdateInterval);
  }
  
  statusUpdateInterval = setInterval(async () => {
    if (currentUser) {
      await updateOnlineStatusSafe(currentUser.id, true);
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

  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && currentUser) {
      await updateOnlineStatusSafe(currentUser.id, true);
      await loadUsers();
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

  const userStatus = document.getElementById('userStatus');
  if (userStatus && profile.last_online_at) {
    // ✅ AGORA USA REAL_STATUS + LAST_ONLINE_AT
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const isOnline = profile.real_status === 'online' || new Date(profile.last_online_at) > twoMinutesAgo;
    
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
      // ✅ FILTRO ONLINE USA REAL_STATUS + GRACE PERIOD
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
      query = query.or(`real_status.eq.online,last_online_at.gte.${twoMinutesAgo}`);
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

    let statusMap = {};
    
    if (statusSystem) {
      statusMap = await statusSystem.getMultipleUsersStatus(filteredProfiles.map(p => p.id));
    }

    const profilesToShow = filteredProfiles.slice(0, 8);
    displayUsers(profilesToShow, statusMap);

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

function displayUsers(profiles, statusMap = {}) {
  const usersGrid = document.getElementById('usersGrid');
  
  usersGrid.innerHTML = profiles.map(profile => {
    const userDetails = profile.user_details || {};
    const safeNickname = (profile.nickname || 'Usuário').replace(/'/g, "\\'");
    const safeCity = (profile.display_city || 'Localização não informada').replace(/'/g, "\\'");
    const profileGender = userDetails.gender || 'Não informado';
    
    let statusInfo;
    if (statusMap[profile.id]) {
      statusInfo = statusMap[profile.id];
    } else {
      // ✅ FALLBACK SE STATUS SYSTEM NÃO ESTIVER DISPONÍVEL
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      const isOnline = profile.real_status === 'online' || new Date(profile.last_online_at) > twoMinutesAgo;
      
      if (profile.is_invisible && profile.id !== currentUser?.id) {
        statusInfo = { status: 'invisible', text: 'Offline', class: 'status-offline' };
      } else if (isOnline) {
        statusInfo = { status: 'online', text: 'Online', class: 'status-online' };
      } else {
        statusInfo = { status: 'offline', text: 'Offline', class: 'status-offline' };
      }
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
  // ✅ ATUALIZA STATUS PARA OFFLINE NO LOGOUT
  if (currentUser) {
    await updateOnlineStatusSafe(currentUser.id, false);
  }
  if (statusSystem) {
    statusSystem.destroy();
  }
  const { error } = await supabase.auth.signOut();
  if (!error) window.location.href = 'login.html';
}

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

window.addEventListener('beforeunload', async () => {
  stopNotificationPolling();
  stopStatusUpdates();
  // ✅ ATUALIZA STATUS PARA OFFLINE AO FECHAR ABA/NAVEGADOR
  if (currentUser) {
    await updateOnlineStatusSafe(currentUser.id, false);
  }
  if (statusSystem) {
    statusSystem.destroy();
  }
});

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

window.addEventListener('load', function() {
  if (window.StatusSystem && currentUser && statusSystem) {
    setTimeout(() => {
      updateOnlineStatusSafe(currentUser.id, true);
    }, 2000);
  }
});