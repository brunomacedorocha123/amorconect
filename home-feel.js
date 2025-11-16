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
    // INICIALIZAR STATUS SYSTEM - ÚNICA MODIFICAÇÃO
    statusSystem = window.StatusSystem;
    if (statusSystem) {
      await statusSystem.initialize(currentUser);
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

  // ATUALIZAR STATUS QUANDO PÁGINA GANHA FOCO - MODIFICAÇÃO
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && statusSystem && currentUser) {
      await statusSystem.updateMyStatus();
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

    // USAR STATUS SYSTEM PARA STATUS - MODIFICAÇÃO
    const userIds = filteredProfiles.map(p => p.id);
    const statusMap = statusSystem ? await statusSystem.getMultipleUsersStatus(userIds) : {};

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
    
    // USAR STATUS SYSTEM PARA STATUS - MODIFICAÇÃO
    let statusInfo;
    if (statusSystem && statusMap[profile.id]) {
      statusInfo = statusMap[profile.id];
    } else {
      statusInfo = statusSystem ? 
        statusSystem.calculateUserStatus(profile.last_online_at, profile.is_invisible, profile.id) :
        { status: 'offline', text: 'Offline', class: 'status-offline' };
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

// === SISTEMA DE MODAIS SIMPLES ===
function openUserActions(userId, userName) {
  currentBlockingUser = { id: userId, name: userName };
  
  // Fecha todos os modais primeiro
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });
  
  // Abre o modal de ações
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
  
  // Fecha o modal de ações
  closeUserActionsModal();
  
  // Configura o modal de confirmação
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

  // Abre o modal de confirmação
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

// === SISTEMA DE DENÚNCIA COMPLETO ===
function reportUser() {
  if (!currentBlockingUser) {
    showNotification('Erro: usuário não selecionado');
    return;
  }
  
  // Fecha o modal de ações
  closeUserActionsModal();
  
  // Abre o modal de denúncia
  openReportModal();
}

function openReportModal() {
  // Criar modal de denúncia dinamicamente
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
  
  // Remove modal existente se houver
  const existingModal = document.getElementById('reportModal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Adiciona o novo modal
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Configura contador de caracteres
  const textarea = document.getElementById('reportDetails');
  const charCount = document.getElementById('charCount');
  
  if (textarea && charCount) {
    textarea.addEventListener('input', function() {
      charCount.textContent = this.value.length;
    });
  }
  
  // Mostra o modal
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
    // Verificar se já existe uma denúncia pendente para este usuário
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

    // Enviar a denúncia
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
    console.error('Erro ao enviar denúncia:', error);
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
  
  // Remove modal de denúncia se existir
  const reportModal = document.getElementById('reportModal');
  if (reportModal) {
    reportModal.remove();
  }
  
  currentBlockingUser = null;
}

// === SISTEMA DE NOTIFICAÇÕES ===
async function loadNotificationCount() {
  try {
    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('id, type, is_read')
      .eq('user_id', currentUser.id)
      .eq('is_read', false);

    if (!error && notifications) {
      updateNotificationBadge(notifications);
    } else if (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  } catch (error) {
    console.error('Erro no sistema de notificações:', error);
  }
}

function updateNotificationBadge(notifications) {
  const badge = document.getElementById('notificationBadge');
  if (!badge) return;

  const unreadCount = notifications.filter(n => !n.is_read).length;
  
  if (unreadCount > 0) {
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    badge.style.display = 'flex';
    
    // Adiciona classe de urgência se houver muitas notificações
    if (unreadCount > 5) {
      badge.classList.add('urgent');
    } else {
      badge.classList.remove('urgent');
    }

    // Adiciona animação de pulso para notificações importantes
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
  // Atualiza notificações a cada 30 segundos
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

// Função para marcar notificações como lidas
async function markNotificationsAsRead() {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', currentUser.id)
      .eq('is_read', false);

    if (!error) {
      // Atualiza o badge imediatamente
      const badge = document.getElementById('notificationBadge');
      if (badge) {
        badge.style.display = 'none';
        badge.classList.remove('urgent', 'pulse');
      }
    }
  } catch (error) {
    console.error('Erro ao marcar notificações como lidas:', error);
  }
}

// Função para criar uma nova notificação (útil para testes)
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
    console.error('Erro ao criar notificação de teste:', error);
  }
}

// === SISTEMA DE NOTIFICAÇÕES VISUAIS ===
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
  
  // Ícone baseado no tipo
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

// === NAVEGAÇÃO ===
function goToPerfil() { window.location.href = 'painel.html'; }
function goToMensagens() { window.location.href = 'mensagens.html'; }
function goToBusca() { window.location.href = 'busca.html'; }
function goToBloqueados() { window.location.href = 'bloqueados.html'; }
function goToPricing() { window.location.href = 'pricing.html'; }
function goToNotificacoes() {
  // Marca notificações como lidas ao acessar a página
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

// === EXPORTA FUNÇÕES PARA O HTML ===
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

// Funções de teste (pode remover em produção)
window.createTestNotification = createTestNotification;

// Listener de autenticação
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

// Adiciona CSS dinâmico para notificações
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

// Injeta o CSS na página
const style = document.createElement('style');
style.textContent = notificationCSS;
document.head.appendChild(style);

// Cleanup quando a página for fechada
window.addEventListener('beforeunload', () => {
  stopNotificationPolling();
  stopStatusUpdates();
  if (statusSystem) {
    statusSystem.destroy();
  }
});

// Função para verificar se usuário está online (ORIGINAL - mantida para compatibilidade)
function isUserOnline(lastOnlineAt) {
  if (!lastOnlineAt) return false;
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  return new Date(lastOnlineAt) > fifteenMinutesAgo;
}

// Sistema de feels básico integrado na home (ORIGINAL)
async function sendQuickFeel(receiverId) {
  try {
    if (!currentUser || !receiverId) {
      showNotification('Erro ao enviar feel', 'error');
      return;
    }

    // Verificar se já existe um feel
    const { data: existingFeel, error: checkError } = await supabase
      .from('user_feels')
      .select('id')
      .eq('sender_id', currentUser.id)
      .eq('receiver_id', receiverId)
      .single();

    if (existingFeel && !checkError) {
      showNotification('Você já enviou um feel para este usuário!', 'warning');
      return;
    }

    // Inserir o feel
    const { error } = await supabase
      .from('user_feels')
      .insert({
        sender_id: currentUser.id,
        receiver_id: receiverId,
        created_at: new Date().toISOString()
      });

    if (error) {
      if (error.code === '23505') {
        showNotification('Você já enviou um feel para este usuário!', 'warning');
      } else {
        throw error;
      }
      return;
    }

    showNotification('❤️ Feel enviado com sucesso!', 'success');

    // Verificar match
    setTimeout(() => checkForQuickMatch(receiverId), 1000);

  } catch (error) {
    console.error('Erro ao enviar feel:', error);
    showNotification('Erro ao enviar feel. Tente novamente.', 'error');
  }
}

// Verificar match rápido (ORIGINAL)
async function checkForQuickMatch(receiverId) {
  try {
    const { data: reciprocalFeel, error } = await supabase
      .from('user_feels')
      .select('id')
      .eq('sender_id', receiverId)
      .eq('receiver_id', currentUser.id)
      .single();

    if (reciprocalFeel && !error) {
      // Match encontrado!
      showNotification('🎉 Match! Vocês se curtiram mutuamente!', 'success');
      
      // Criar notificação de match
      await createQuickMatchNotification(receiverId);
    }
  } catch (error) {
    // Silencioso - não é crítico
  }
}

// Criar notificação de match (ORIGINAL)
async function createQuickMatchNotification(matchedUserId) {
  try {
    const { data: matchedProfile } = await supabase
      .from('profiles')
      .select('nickname')
      .eq('id', matchedUserId)
      .single();

    if (matchedProfile) {
      await supabase
        .from('notifications')
        .insert({
          user_id: currentUser.id,
          type: 'new_match',
          title: 'Novo Match! 🎉',
          message: `Você deu match com ${matchedProfile.nickname}!`,
          is_read: false,
          created_at: new Date().toISOString()
        });
    }
  } catch (error) {
    // Silencioso
  }
}

// Sistema de visitantes básico (ORIGINAL)
async function recordProfileView(viewedUserId) {
  try {
    if (!currentUser || !viewedUserId || currentUser.id === viewedUserId) {
      return;
    }

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

// Carregar estatísticas básicas do usuário (ORIGINAL)
async function loadBasicUserStats() {
  try {
    const [viewsResult, feelsResult, matchesResult] = await Promise.all([
      supabase
        .from('profile_views')
        .select('id', { count: 'exact' })
        .eq('viewed_user_id', currentUser.id),
      
      supabase
        .from('user_feels')
        .select('id', { count: 'exact' })
        .eq('receiver_id', currentUser.id),
      
      supabase
        .from('user_matches')
        .select('id', { count: 'exact' })
        .or(`user_id_1.eq.${currentUser.id},user_id_2.eq.${currentUser.id}`)
    ]);

    return {
      views: viewsResult.count || 0,
      feels: feelsResult.count || 0,
      matches: matchesResult.count || 0
    };
  } catch (error) {
    return {
      views: 0,
      feels: 0,
      matches: 0
    };
  }
}

// Função utilitária para formatar tempo (ORIGINAL)
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

// Sistema de compatibilidade básica (ORIGINAL)
function checkBasicCompatibility(userProfile, targetProfile) {
  let score = 0;
  const matches = [];

  // Compatibilidade de gênero/orientação
  const userGender = userProfile.user_details?.gender?.toLowerCase();
  const userOrientation = userProfile.user_details?.sexual_orientation?.toLowerCase();
  const targetGender = targetProfile.user_details?.gender?.toLowerCase();

  if (userOrientation && targetGender) {
    switch (userOrientation) {
      case 'heterossexual':
        if ((userGender === 'masculino' || userGender === 'homem') && 
            (targetGender === 'feminino' || targetGender === 'mulher')) {
          score += 30;
          matches.push('Compatível');
        } else if ((userGender === 'feminino' || userGender === 'mulher') && 
                   (targetGender === 'masculino' || targetGender === 'homem')) {
          score += 30;
          matches.push('Compatível');
        }
        break;
      case 'homossexual':
        if (userGender === targetGender) {
          score += 30;
          matches.push('Compatível');
        }
        break;
      case 'bissexual':
        score += 25;
        matches.push('Compatível');
        break;
    }
  }

  // Interesses em comum
  const userInterests = userProfile.user_details?.interests || [];
  const targetInterests = targetProfile.user_details?.interests || [];
  const commonInterests = userInterests.filter(interest => 
    targetInterests.includes(interest)
  );

  if (commonInterests.length > 0) {
    score += commonInterests.length * 5;
    matches.push(`${commonInterests.length} interesses em comum`);
  }

  return {
    score: Math.min(score, 100),
    matches: matches
  };
}

// Carregar usuários visitantes recentes (ORIGINAL)
async function loadRecentVisitors() {
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
      .limit(5);

    if (error) return [];

    return views.map(view => ({
      ...view.profiles,
      viewed_at: view.viewed_at
    }));
  } catch (error) {
    return [];
  }
}

// Carregar feels recebidos recentes (ORIGINAL)
async function loadRecentFeels() {
  try {
    const { data: feels, error } = await supabase
      .from('user_feels')
      .select(`
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
      .limit(5);

    if (error) return [];

    return feels.map(feel => ({
      ...feel.profiles,
      feel_at: feel.created_at
    }));
  } catch (error) {
    return [];
  }
}

// Exportar funções adicionais (ORIGINAL)
window.sendQuickFeel = sendQuickFeel;
window.recordProfileView = recordProfileView;
window.formatTimeAgo = formatTimeAgo;
window.loadBasicUserStats = loadBasicUserStats;

// Inicialização final quando a página carrega completamente (ORIGINAL)
window.addEventListener('load', function() {
  // Inicializar sistemas adicionais se existirem
  if (typeof FeelManager !== 'undefined' && FeelManager.initialize) {
    setTimeout(() => {
      FeelManager.initialize();
    }, 1500);
  }

  // Atualizar status inicial
  if (statusSystem && currentUser) {
    setTimeout(() => {
      statusSystem.updateMyStatus();
    }, 2000);
  }
});

// Função para recarregar a página de feels (ORIGINAL)
function goToFeelsPage() {
  window.location.href = 'feels.html';
}

// Função para recarregar a página de visitantes (ORIGINAL)
function goToVisitorsPage() {
  window.location.href = 'visitantes.html';
}

// Sistema de atualização automática periódica (ORIGINAL)
let autoRefreshInterval = setInterval(() => {
  if (document.visibilityState === 'visible') {
    // Recarregar usuários a cada 2 minutos se a página estiver visível
    loadUsers();
  }
}, 120000);

// Cleanup do intervalo de auto-refresh (ORIGINAL)
window.addEventListener('beforeunload', () => {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
  }
});

// Função para forçar atualização (ORIGINAL)
function forceRefresh() {
  showNotification('Atualizando...', 'info');
  loadUsers();
  loadNotificationCount();
  
  if (typeof FeelManager !== 'undefined' && FeelManager.loadFeelsData) {
    FeelManager.loadFeelsData();
  }
}

// Adicionar botão de refresh se necessário (ORIGINAL)
function addRefreshButton() {
  const headerActions = document.querySelector('.section-actions');
  if (headerActions && !document.getElementById('refreshBtn')) {
    const refreshBtn = document.createElement('button');
    refreshBtn.id = 'refreshBtn';
    refreshBtn.className = 'btn-filter';
    refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
    refreshBtn.onclick = forceRefresh;
    headerActions.appendChild(refreshBtn);
  }
}

// Inicializar botão de refresh quando a página carrega (ORIGINAL)
setTimeout(addRefreshButton, 3000);