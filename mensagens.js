// mensagens.js - Sistema completo de mensagens com Vibe Exclusive
class MessagesSystem {
  constructor() {
    this.supabase = supabase;
    this.currentUser = null;
    this.currentConversation = null;
    this.conversations = [];
    this.messages = [];
    this.messageLimit = 4;
    this.isLoading = false;
    
    this.statusSystem = null;
    this.sistemaVibe = null;
    
    this.initialize();
  }

  async initialize() {
  try {
    // ⭐⭐ CORREÇÃO: Removida verificação duplicada para evitar loop
    // O auth-vibe.js já cuida de todo o redirecionamento do Vibe Exclusive
    // await this.checkAndRedirectToVibeExclusive();
    
    await this.checkAuth();
    await this.loadUserData();
    await this.initializeStatusSystem();
    await this.loadConversations();
    this.setupEventListeners();
    this.updateMessageCounter();
    this.startPeriodicChecks();
    this.checkUrlParams();
    await this.initializeSistemaVibe();
    
  } catch (error) {
    // Silencioso
  }
}

  // ⭐⭐ FUNÇÃO CRÍTICA: Verificar e redirecionar para Vibe Exclusive (CORRIGIDA)
  async checkAndRedirectToVibeExclusive() {
    try {
      // ⭐⭐ CORREÇÃO: Não redirecionar se já está na página vibe-exclusive
      if (window.location.pathname.includes('vibe-exclusive') || 
          window.location.pathname.includes('vibe-exclusivo')) {
        return false;
      }
      
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return;
      
      const { data: agreement, error } = await this.supabase
        .rpc('check_active_fidelity_agreement', {
          p_user_id: user.id
        });

      if (error) return;

      // ⭐⭐ VERIFICAÇÃO COMPLETA das possíveis estruturas
      if (agreement && agreement.has_active_agreement) {
        window.location.href = 'vibe-exclusive.html';
        throw new Error('REDIRECT_TO_VIBE');
      }
      
      if (agreement && agreement[0]?.has_active_agreement) {
        window.location.href = 'vibe-exclusive.html';
        throw new Error('REDIRECT_TO_VIBE');
      }

      if (agreement && agreement.active) {
        window.location.href = 'vibe-exclusive.html';
        throw new Error('REDIRECT_TO_VIBE');
      }
      
    } catch (error) {
      if (error.message === 'REDIRECT_TO_VIBE') {
        throw error;
      }
    }
    return false;
  }

  async initializeStatusSystem() {
    if (window.StatusSystem && this.currentUser) {
      this.statusSystem = window.StatusSystem;
      if (!this.statusSystem.currentUser) {
        await this.statusSystem.initialize(this.currentUser);
      }
    }
  }

  async initializeSistemaVibe() {
    try {
      if (window.SistemaVibe && this.currentUser) {
        this.sistemaVibe = new SistemaVibe();
        await this.sistemaVibe.initialize(this.currentUser);
        this.setupFidelityButtonHandlers();
      }
    } catch (error) {}
  }

  setupFidelityButtonHandlers() {
    document.addEventListener('click', (e) => {
      const fidelityBtn = e.target.closest('#fidelityProposeBtn');
      if (fidelityBtn && !fidelityBtn.classList.contains('active')) {
        this.handleFidelityProposal();
      }
    });
  }

  async handleFidelityProposal() {
    if (!this.currentConversation) {
      this.showNotification('Selecione uma conversa primeiro', 'error');
      return;
    }
    if (this.sistemaVibe) {
      await this.sistemaVibe.proposeFidelityAgreement(this.currentConversation);
    } else {
      this.showNotification('Sistema Vibe não disponível', 'error');
    }
  }

  async checkAuth() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error || !user) {
        window.location.href = 'login.html';
        return;
      }
      this.currentUser = user;
    } catch (error) {
      window.location.href = 'login.html';
    }
  }

  async loadUserData() {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('nickname, avatar_url, is_premium')
        .eq('id', this.currentUser.id)
        .single();

      if (error) throw error;

      if (profile) {
        this.currentUser.profile = profile;
        this.updateUserHeader(profile);
      }
    } catch (error) {}
  }

  updateUserHeader(profile) {
    const avatarImg = document.getElementById('userAvatarImg');
    const avatarFallback = document.getElementById('avatarFallback');
    
    if (profile.avatar_url) {
      avatarImg.src = profile.avatar_url;
      avatarImg.style.display = 'block';
      avatarFallback.style.display = 'none';
    } else {
      avatarImg.style.display = 'none';
      avatarFallback.style.display = 'flex';
      avatarFallback.textContent = this.getUserInitials(profile.nickname || this.currentUser.email);
    }

    const userName = document.getElementById('userName');
    if (userName) {
      userName.textContent = profile.nickname || this.currentUser.email.split('@')[0];
    }
  }

  getUserInitials(name) {
    if (!name) return 'U';
    return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
  }

  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('user');
    
    if (userId && this.currentUser && userId !== this.currentUser.id) {
      setTimeout(() => {
        this.selectConversationFromUrl(userId);
      }, 1000);
    }
  }

  async selectConversationFromUrl(userId) {
    try {
      const existingConversation = this.conversations.find(c => c.other_user_id === userId);
      
      if (existingConversation) {
        await this.selectConversation(userId);
      } else {
        await this.createNewConversation(userId);
      }
      
      window.history.replaceState({}, '', 'mensagens.html');
    } catch (error) {
      this.showNotification('Erro ao carregar conversa', 'error');
    }
  }

  async createNewConversation(userId) {
    try {
      const { data: userProfile, error } = await this.supabase
        .from('profiles')
        .select('nickname, avatar_url, last_online_at, real_status, is_invisible')
        .eq('id', userId)
        .single();
        
      if (error) throw error;

      if (userProfile) {
        const statusInfo = this.calculateUserStatus(
          userProfile.last_online_at,
          userProfile.real_status,
          userProfile.is_invisible,
          userId
        );

        const newConversation = {
          other_user_id: userId,
          other_user_nickname: userProfile.nickname,
          other_user_avatar_url: userProfile.avatar_url,
          other_user_online: statusInfo.status === 'online',
          last_message: 'Nenhuma mensagem',
          last_message_at: new Date().toISOString(),
          unread_count: 0
        };
        
        this.conversations.unshift(newConversation);
        this.renderConversations();
        await this.selectConversation(userId);
      }
    } catch (error) {
      this.showNotification('Usuário não encontrado', 'error');
    }
  }

  async loadConversations() {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      this.showLoading('conversationsList');
      
      const { data: conversations, error } = await this.supabase
        .rpc('get_user_conversations', {
          p_user_id: this.currentUser.id
        });

      if (error) {
        await this.loadConversationsFallback();
        return;
      }

      this.conversations = conversations || [];
      
      await this.updateConversationsWithRealStatus();
      
      this.renderConversations();
      
    } catch (error) {
      await this.loadConversationsFallback();
    } finally {
      this.isLoading = false;
    }
  }

  async updateConversationsWithRealStatus() {
    if (!this.conversations.length) return;
    
    try {
      const userIds = this.conversations.map(conv => conv.other_user_id);
      const statusMap = await this.getMultipleUsersStatus(userIds);
      
      this.conversations.forEach(conv => {
        if (statusMap[conv.other_user_id]) {
          const statusInfo = statusMap[conv.other_user_id];
          conv.other_user_online = statusInfo.status === 'online';
          conv.status_info = statusInfo;
        }
      });
    } catch (error) {}
  }

  calculateUserStatus(lastOnlineAt, realStatus, isInvisible = false, userId = null) {
    if (isInvisible && userId !== this.currentUser?.id) {
      return { status: 'invisible', text: 'Offline', class: 'status-offline' };
    }

    if (realStatus === 'online') {
      return { status: 'online', text: 'Online', class: 'status-online' };
    }

    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const lastOnline = lastOnlineAt ? new Date(lastOnlineAt) : null;
    const isWithinGracePeriod = lastOnline && lastOnline > twoMinutesAgo;

    if (isWithinGracePeriod) {
      return { status: 'online', text: 'Online', class: 'status-online' };
    } else {
      return { status: 'offline', text: 'Offline', class: 'status-offline' };
    }
  }

  async getMultipleUsersStatus(userIds) {
    if (!userIds || userIds.length === 0) return {};
    
    try {
      const { data: profiles, error } = await this.supabase
        .from('profiles')
        .select('id, last_online_at, real_status, is_invisible')
        .in('id', userIds);

      if (error || !profiles) return {};

      const statusMap = {};
      profiles.forEach(profile => {
        statusMap[profile.id] = this.calculateUserStatus(
          profile.last_online_at,
          profile.real_status,
          profile.is_invisible,
          profile.id
        );
      });

      return statusMap;
    } catch (error) {
      return {};
    }
  }

  async loadConversationsFallback() {
    try {
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          message,
          sent_at,
          read_at,
          sender:profiles!messages_sender_id_fkey(nickname, avatar_url, last_online_at, real_status, is_invisible),
          receiver:profiles!messages_receiver_id_fkey(nickname, avatar_url, last_online_at, real_status, is_invisible)
        `)
        .or(`sender_id.eq.${this.currentUser.id},receiver_id.eq.${this.currentUser.id}`)
        .order('sent_at', { ascending: false });

      if (error) throw error;

      const conversationsMap = new Map();
      
      messages.forEach(msg => {
        const otherUserId = msg.sender_id === this.currentUser.id ?
          msg.receiver_id : msg.sender_id;
        const otherUser = msg.sender_id === this.currentUser.id ?
          msg.receiver : msg.sender;
        
        if (!conversationsMap.has(otherUserId)) {
          const statusInfo = this.calculateUserStatus(
            otherUser?.last_online_at,
            otherUser?.real_status,
            otherUser?.is_invisible,
            otherUserId
          );

          conversationsMap.set(otherUserId, {
            other_user_id: otherUserId,
            other_user_nickname: otherUser?.nickname || 'Usuário',
            other_user_avatar_url: otherUser?.avatar_url,
            other_user_online: statusInfo.status === 'online',
            status_info: statusInfo,
            last_message: msg.message,
            last_message_at: msg.sent_at,
            unread_count: 0
          });
        }
      });
      
      this.conversations = Array.from(conversationsMap.values());
      this.renderConversations();
      
    } catch (error) {
      this.showError('conversationsList', 'Erro ao carregar conversas');
    }
  }

  renderConversations() {
    const container = document.getElementById('conversationsList');
    if (!container) return;
    
    if (!this.conversations || this.conversations.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comments"></i>
          <h3>Nenhuma conversa</h3>
          <p>Comece uma nova conversa com alguém!</p>
        </div>
      `;
      return;
    }

    container.innerHTML = this.conversations.map(conv => {
      const statusInfo = conv.status_info || this.calculateUserStatus(null, null, false, conv.other_user_id);
      
      return `
      <div class="conversation-item ${this.currentConversation === conv.other_user_id ? 'active' : ''}"
         data-user-id="${conv.other_user_id}">
        <div class="conversation-avatar">
          ${conv.other_user_avatar_url ?
            `<img src="${conv.other_user_avatar_url}" alt="${conv.other_user_nickname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
            ''
          }
          <div class="avatar-fallback" style="${conv.other_user_avatar_url ? 'display: none;' : ''}">
            ${this.getUserInitials(conv.other_user_nickname)}
          </div>
          <div class="avatar-status ${statusInfo.status === 'online' ? 'online' : 'offline'}"></div>
        </div>
        <div class="conversation-info">
          <div class="conversation-header">
            <span class="conversation-name">${this.escapeHtml(conv.other_user_nickname)}</span>
            <span class="conversation-time">${this.formatTime(conv.last_message_at)}</span>
          </div>
          <div class="conversation-preview">
            <span class="conversation-last-message">${this.escapeHtml(conv.last_message || 'Nenhuma mensagem')}</span>
            ${conv.unread_count > 0 ?
              `<span class="conversation-unread">${conv.unread_count}</span>` : ''
            }
          </div>
          <div class="conversation-status">
            <span class="${statusInfo.class}">
              <span class="status-dot"></span>
              ${statusInfo.text}
              ${statusInfo.status === 'invisible' ? '<i class="fas fa-eye-slash" style="margin-left: 5px; font-size: 0.7rem;"></i>' : ''}
            </span>
          </div>
        </div>
      </div>
    `}).join('');

    this.addConversationClickListeners();
  }

  addConversationClickListeners() {
    const conversationItems = document.querySelectorAll('.conversation-item');
    conversationItems.forEach(item => {
      item.addEventListener('click', (e) => {
        const userId = item.getAttribute('data-user-id');
        if (userId) {
          this.selectConversation(userId);
        }
      });
    });
  }

    async selectConversation(otherUserId) {
    try {
      document.querySelectorAll('.conversation-item').forEach(item => {
        item.classList.remove('active');
      });
      
      const conversationItem = document.querySelector(`[data-user-id="${otherUserId}"]`);
      if (conversationItem) {
        conversationItem.classList.add('active');
      }

      this.currentConversation = otherUserId;
      await this.loadConversationMessages(otherUserId);
      this.showChatArea();
      await this.updateChatHeader(otherUserId);
      
      if (this.sistemaVibe && typeof this.sistemaVibe.onConversationSelected === 'function') {
        await this.sistemaVibe.onConversationSelected(otherUserId);
      }
      
    } catch (error) {
      this.showNotification('Erro ao carregar conversa', 'error');
    }
  }

  async loadConversationMessages(otherUserId) {
    if (this.isLoading) return;
    
    try {
      this.isLoading = true;
      this.showLoading('messagesHistory');
      
      const { data: messages, error } = await this.supabase
        .rpc('get_conversation_messages', {
          p_user1_id: this.currentUser.id,
          p_user2_id: otherUserId
        });

      if (error) {
        await this.loadConversationMessagesFallback(otherUserId);
        return;
      }
      
      this.messages = this.formatMessages(messages);
      this.renderMessages();
      
    } catch (error) {
      await this.loadConversationMessagesFallback(otherUserId);
    } finally {
      this.isLoading = false;
    }
  }

  async loadConversationMessagesFallback(otherUserId) {
    try {
      const { data: messages, error } = await this.supabase
        .from('messages')
        .select(`
          id,
          sender_id,
          receiver_id,
          message,
          sent_at,
          read_at,
          sender:profiles!messages_sender_id_fkey(nickname)
        `)
        .or(`and(sender_id.eq.${this.currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${this.currentUser.id})`)
        .order('sent_at', { ascending: true });

      if (error) throw error;

      await this.markMessagesAsRead(otherUserId);

      this.messages = messages.map(msg => ({
        message_id: msg.id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        message: msg.message,
        sent_at: msg.sent_at,
        read_at: msg.read_at,
        is_own_message: msg.sender_id === this.currentUser.id,
        sender_nickname: msg.sender?.nickname
      }));

      this.renderMessages();
      
    } catch (error) {
      this.showError('messagesHistory', 'Erro ao carregar mensagens');
    }
  }

  async markMessagesAsRead(otherUserId) {
    try {
      const { error } = await this.supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', otherUserId)
        .eq('receiver_id', this.currentUser.id)
        .is('read_at', null);
    } catch (error) {}
  }

  formatMessages(messages) {
    if (!messages) return [];
    return messages.map(msg => ({
      message_id: msg.message_id || msg.id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      message: msg.message,
      sent_at: msg.sent_at,
      read_at: msg.read_at,
      is_own_message: msg.is_own_message !== undefined ? msg.is_own_message : (msg.sender_id === this.currentUser.id),
      sender_nickname: msg.sender_nickname
    }));
  }

  renderMessages() {
    const container = document.getElementById('messagesHistory');
    if (!container) return;
    
    if (!this.messages || this.messages.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-comment-slash"></i>
          <h3>Nenhuma mensagem</h3>
          <p>Envie a primeira mensagem para iniciar a conversa!</p>
        </div>
      `;
      return;
    }

    const groupedMessages = this.groupMessagesByDate(this.messages);
    
    container.innerHTML = Object.keys(groupedMessages).map(date => `
      <div class="message-group">
        <div class="message-date">
          <span>${this.formatDate(date)}</span>
        </div>
        ${groupedMessages[date].map(msg => `
          <div class="message ${msg.is_own_message ? 'own' : 'other'}">
            <div class="message-content">${this.escapeHtml(msg.message)}</div>
            <div class="message-time">${this.formatTime(msg.sent_at)}</div>
            ${msg.is_own_message ? `
              <div class="message-status">
                <i class="fas ${this.getMessageStatusIcon(msg)}"></i>
                ${this.getMessageStatusText(msg)}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `).join('');

    this.scrollToBottom();
  }

  groupMessagesByDate(messages) {
    return messages.reduce((groups, message) => {
      const date = message.sent_at.split('T')[0];
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(message);
      return groups;
    }, {});
  }

  getMessageStatusIcon(message) {
    if (message.read_at) return 'fa-check-double status-read';
    return 'fa-check status-sent';
  }

  getMessageStatusText(message) {
    if (message.read_at) return 'Lida';
    return 'Enviada';
  }

  showChatArea() {
    const inputArea = document.getElementById('messageInputArea');
    const chatHeader = document.getElementById('chatHeader');
    const placeholder = document.querySelector('.chat-header-placeholder');
    const emptyChat = document.querySelector('.empty-chat');
    
    if (inputArea) inputArea.style.display = 'block';
    if (placeholder) placeholder.style.display = 'none';
    if (emptyChat) emptyChat.style.display = 'none';
    if (chatHeader) chatHeader.style.display = 'flex';
  }

  async updateChatHeader(otherUserId) {
    const chatHeader = document.getElementById('chatHeader');
    if (!chatHeader) return;
    
    try {
      const statusInfo = await this.getUserStatus(otherUserId);
      const conversation = this.conversations.find(c => c.other_user_id === otherUserId);
      
      chatHeader.innerHTML = `
        <div class="chat-header-user">
          <div class="chat-user-avatar">
            ${conversation?.other_user_avatar_url ?
              `<img src="${conversation.other_user_avatar_url}" alt="${conversation.other_user_nickname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
              ''
            }
            <div class="avatar-fallback" style="${conversation?.other_user_avatar_url ? 'display: none;' : ''}">
              ${this.getUserInitials(conversation?.other_user_nickname || 'Usuário')}
            </div>
            <div class="avatar-status ${statusInfo.status === 'online' ? 'online' : 'offline'}"></div>
          </div>
          <div class="chat-user-info">
            <h3>${this.escapeHtml(conversation?.other_user_nickname || 'Usuário')}</h3>
            <div class="chat-user-status">
              <span class="${statusInfo.class}">
                <span class="status-dot"></span>
                ${statusInfo.text}
                ${statusInfo.status === 'invisible' ? '<i class="fas fa-eye-slash" style="margin-left: 5px; font-size: 0.7rem;"></i>' : ''}
              </span>
            </div>
          </div>
        </div>
        <div class="chat-header-actions">
          <button class="chat-action-btn" id="fidelityProposeBtn" style="display: none;" title="Propor Vibe Exclusive">
            <i class="fas fa-gem"></i> Vibe Exclusive
          </button>
          <button class="chat-action-btn" id="viewProposalsBtn" style="display: none;" title="Propostas recebidas">
            <i class="fas fa-bell"></i>
            <span class="proposal-badge" id="proposalBadge" style="display: none;"></span>
          </button>
          <button class="chat-action-btn" onclick="MessagesSystem.showUserInfo('${otherUserId}')" title="Informações do usuário">
            <i class="fas fa-info-circle"></i>
          </button>
        </div>
      `;

      if (this.sistemaVibe && typeof this.sistemaVibe.onConversationSelected === 'function') {
        await this.sistemaVibe.onConversationSelected(otherUserId);
      }
    } catch (error) {
      const conversation = this.conversations.find(c => c.other_user_id === otherUserId);
      if (conversation) {
        const statusInfo = conversation.status_info || this.calculateUserStatus(null, null, false, otherUserId);
        chatHeader.innerHTML = `
          <div class="chat-header-user">
            <div class="chat-user-avatar">
              ${conversation.other_user_avatar_url ?
                `<img src="${conversation.other_user_avatar_url}" alt="${conversation.other_user_nickname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
                ''
              }
              <div class="avatar-fallback" style="${conversation.other_user_avatar_url ? 'display: none;' : ''}">
                ${this.getUserInitials(conversation.other_user_nickname)}
              </div>
              <div class="avatar-status ${statusInfo.status === 'online' ? 'online' : 'offline'}"></div>
            </div>
            <div class="chat-user-info">
              <h3>${this.escapeHtml(conversation.other_user_nickname)}</h3>
              <div class="chat-user-status">
                <span class="${statusInfo.class}">
                  <span class="status-dot"></span>
                  ${statusInfo.text}
                  ${statusInfo.status === 'invisible' ? '<i class="fas fa-eye-slash" style="margin-left: 5px; font-size: 0.7rem;"></i>' : ''}
                </span>
              </div>
            </div>
          </div>
          <div class="chat-header-actions">
            <button class="chat-action-btn" id="fidelityProposeBtn" style="display: none;" title="Propor Vibe Exclusive">
              <i class="fas fa-gem"></i> Vibe Exclusive
            </button>
            <button class="chat-action-btn" id="viewProposalsBtn" style="display: none;" title="Propostas recebidas">
              <i class="fas fa-bell"></i>
              <span class="proposal-badge" id="proposalBadge" style="display: none;"></span>
            </button>
            <button class="chat-action-btn" onclick="MessagesSystem.showUserInfo('${otherUserId}')" title="Informações do usuário">
              <i class="fas fa-info-circle"></i>
            </button>
          </div>
        `;
      }
    }
  }

  async getUserStatus(userId) {
    try {
      const { data: profile, error } = await this.supabase
        .from('profiles')
        .select('last_online_at, real_status, is_invisible')
        .eq('id', userId)
        .single();

      if (!error && profile) {
        return this.calculateUserStatus(
          profile.last_online_at,
          profile.real_status,
          profile.is_invisible,
          userId
        );
      }
    } catch (error) {}
    
    return { status: 'offline', text: 'Offline', class: 'status-offline' };
  }

  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value.trim();
    
    if (!message) {
      this.showNotification('Digite uma mensagem', 'warning');
      return;
    }
    
    if (!this.currentConversation) {
      this.showNotification('Selecione uma conversa primeiro', 'error');
      return;
    }

    if (message.length > 1000) {
      this.showNotification('Mensagem muito longa (máx. 1000 caracteres)', 'error');
      return;
    }

    try {
      this.setSendButtonState(true);
      this.showMessageStatus('Enviando...', 'info');

      // ⭐⭐ VERIFICAÇÃO PREMIUM CORRETA - Premium tem mensagens ilimitadas
      let isPremium = false;
      if (window.PremiumManager && typeof window.PremiumManager.checkPremiumStatus === 'function') {
        isPremium = await PremiumManager.checkPremiumStatus();
      } else if (this.currentUser.profile?.is_premium) {
        isPremium = this.currentUser.profile.is_premium;
      }
      
      // ⭐⭐ APENAS usuários FREE verificam limite
      if (!isPremium) {
        const canSend = await this.checkCanSendMessage();
        if (!canSend.can_send) {
          this.handleSendError(canSend.reason);
          return;
        }
      }

      const { data, error } = await this.supabase
        .rpc('send_message', {
          p_sender_id: this.currentUser.id,
          p_receiver_id: this.currentConversation,
          p_message: message
        });

      if (error) throw error;

      if (data === 'success') {
        messageInput.value = '';
        this.updateCharCounter();
        this.showMessageStatus('Mensagem enviada!', 'success');
        
        await this.loadConversationMessages(this.currentConversation);
        await this.loadConversations();
        this.updateMessageCounter();
        
      } else {
        this.handleSendError(data);
      }

    } catch (error) {
      this.showMessageStatus('Erro ao enviar mensagem', 'error');
      await this.sendMessageFallback(message);
    } finally {
      this.setSendButtonState(false);
      setTimeout(() => this.clearMessageStatus(), 3000);
    }
  }

    async sendMessageFallback(message) {
    try {
      const { data, error } = await this.supabase
        .from('messages')
        .insert({
          sender_id: this.currentUser.id,
          receiver_id: this.currentConversation,
          message: message,
          sent_at: new Date().toISOString()
        })
        .select();

      if (error) throw error;

      if (data) {
        this.showNotification('Mensagem enviada!', 'success');
        await this.loadConversationMessages(this.currentConversation);
        await this.loadConversations();
        this.updateMessageCounter();
      }
    } catch (fallbackError) {
      this.showNotification('Erro ao enviar mensagem', 'error');
    }
  }

  async resetDailyCounterIfNeeded() {
    try {
      const { data: limits, error } = await this.supabase
        .from('user_message_limits')
        .select('messages_sent_today, last_reset_date')
        .eq('user_id', this.currentUser.id)
        .single();

      if (error || !limits) {
        await this.supabase
          .from('user_message_limits')
          .upsert({
            user_id: this.currentUser.id,
            messages_sent_today: 0,
            last_reset_date: new Date().toISOString().split('T')[0]
          });
        return;
      }

      const today = new Date().toISOString().split('T')[0];
      const lastReset = new Date(limits.last_reset_date).toISOString().split('T')[0];

      if (lastReset !== today) {
        await this.supabase
          .from('user_message_limits')
          .update({
            messages_sent_today: 0,
            last_reset_date: today
          })
          .eq('user_id', this.currentUser.id);
      }

    } catch (error) {}
  }

  async checkCanSendMessage() {
    try {
      await this.resetDailyCounterIfNeeded();

      // ⭐⭐ VERIFICAÇÃO PREMIUM - Premium não tem limite
      let isPremium = false;
      if (window.PremiumManager && typeof window.PremiumManager.checkPremiumStatus === 'function') {
        isPremium = await PremiumManager.checkPremiumStatus();
      } else if (this.currentUser.profile?.is_premium) {
        isPremium = this.currentUser.profile.is_premium;
      }
      
      if (isPremium) {
        return { can_send: true, reason: null };
      }

      const { data: limits, error } = await this.supabase
        .from('user_message_limits')
        .select('messages_sent_today, last_reset_date')
        .eq('user_id', this.currentUser.id)
        .single();

      if (error) {
        return { can_send: true, reason: null };
      }

      const sentToday = limits.messages_sent_today || 0;
      
      if (sentToday >= this.messageLimit) {
        return { can_send: false, reason: 'limit_reached' };
      }

      return { can_send: true, reason: null };
      
    } catch (error) {
      return { can_send: true, reason: null };
    }
  }

  handleSendError(reason) {
    switch (reason) {
      case 'limit_reached':
        this.showNotification('Limite diário de 4 mensagens atingido! Volte amanhã.', 'error');
        break;
      case 'blocked':
        this.showNotification('Não é possível enviar mensagem para este usuário.', 'error');
        break;
      default:
        this.showNotification('Erro ao enviar mensagem.', 'error');
    }
  }

  async updateMessageCounter() {
    try {
      await this.resetDailyCounterIfNeeded();

      // ⭐⭐ VERIFICAÇÃO PREMIUM CORRETA - Premium mostra "Ilimitado"
      let isPremium = false;
      if (window.PremiumManager && typeof window.PremiumManager.checkPremiumStatus === 'function') {
        isPremium = await PremiumManager.checkPremiumStatus();
      } else if (this.currentUser.profile?.is_premium) {
        isPremium = this.currentUser.profile.is_premium;
      }
      
      const counter = document.getElementById('messageCounter');
      
      if (!counter) return;

      if (isPremium) {
        counter.innerHTML = `
          <span class="counter-text">Mensagens: </span>
          <span class="counter-number">Ilimitado</span>
        `;
        counter.classList.add('premium');
        return;
      }

      const { data: limits, error } = await this.supabase
        .from('user_message_limits')
        .select('messages_sent_today, last_reset_date')
        .eq('user_id', this.currentUser.id)
        .single();

      let sentToday = 0;
      
      if (!error && limits) {
        sentToday = limits.messages_sent_today || 0;
      }

      counter.innerHTML = `
        <span class="counter-text">Mensagens hoje: </span>
        <span class="counter-number">${sentToday}/${this.messageLimit}</span>
      `;
      counter.classList.remove('premium');

    } catch (error) {}
  }

  setupEventListeners() {
    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendMessage');
    const refreshBtn = document.getElementById('refreshMessages');
    const searchInput = document.getElementById('searchConversations');

    if (messageInput) {
      messageInput.addEventListener('input', () => {
        this.updateCharCounter();
        this.autoResizeTextarea(messageInput);
      });

      messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.sendMessage();
        }
      });
    }

    if (sendButton) {
      sendButton.addEventListener('click', () => this.sendMessage());
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.refreshMessages());
    }

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.filterConversations(e.target.value);
      });
    }
  }

  updateCharCounter() {
    const messageInput = document.getElementById('messageInput');
    const charCounter = document.getElementById('charCounter');
    if (!messageInput || !charCounter) return;
    
    const count = messageInput.value.length;
    charCounter.textContent = `${count}/1000`;
    
    if (count > 900) {
      charCounter.style.color = 'var(--warning)';
    } else if (count > 800) {
      charCounter.style.color = 'var(--burgundy)';
    } else {
      charCounter.style.color = 'var(--text-light)';
    }
  }

  autoResizeTextarea(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  setSendButtonState(disabled) {
    const sendButton = document.getElementById('sendMessage');
    if (sendButton) {
      sendButton.disabled = disabled;
      sendButton.innerHTML = disabled ?
        '<i class="fas fa-spinner fa-spin"></i>' :
        '<i class="fas fa-paper-plane"></i>';
    }
  }

  showMessageStatus(message, type) {
    const statusElement = document.getElementById('messageStatus');
    if (statusElement) {
      statusElement.textContent = message;
      statusElement.className = `message-status status-${type}`;
    }
  }

  clearMessageStatus() {
    const statusElement = document.getElementById('messageStatus');
    if (statusElement) {
      statusElement.textContent = '';
      statusElement.className = 'message-status';
    }
  }

  async showUserInfo(userId) {
    this.showNotification('Funcionalidade em desenvolvimento', 'info');
  }

  async refreshMessages() {
    if (this.isLoading) return;
    
    const refreshBtn = document.getElementById('refreshMessages');
    if (refreshBtn) {
      refreshBtn.classList.add('loading');
    }
    
    try {
      await this.loadConversations();
      
      if (this.currentConversation) {
        await this.loadConversationMessages(this.currentConversation);
      }
      
      this.updateMessageCounter();
      this.showNotification('Conversas atualizadas', 'success');
    } catch (error) {
      this.showNotification('Erro ao atualizar', 'error');
    } finally {
      if (refreshBtn) {
        setTimeout(() => {
          refreshBtn.classList.remove('loading');
        }, 500);
      }
    }
  }

  filterConversations(searchTerm) {
    const items = document.querySelectorAll('.conversation-item');
    const term = searchTerm.toLowerCase().trim();
    
    if (!term) {
      items.forEach(item => item.style.display = 'flex');
      return;
    }
    
    items.forEach(item => {
      const userName = item.querySelector('.conversation-name').textContent.toLowerCase();
      const lastMessage = item.querySelector('.conversation-last-message').textContent.toLowerCase();
      
      if (userName.includes(term) || lastMessage.includes(term)) {
        item.style.display = 'flex';
      } else {
        item.style.display = 'none';
      }
    });
  }

  scrollToBottom() {
    const container = document.getElementById('messagesHistory');
    if (container) {
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 100);
    }
  }

  startPeriodicChecks() {
    setInterval(async () => {
      if (!this.isLoading && this.currentConversation) {
        await this.loadConversationMessages(this.currentConversation);
      }
      await this.loadConversations();
      this.updateMessageCounter();
    }, 30000);
  }

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatTime(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    
    return date.toLocaleDateString('pt-BR');
  }

  formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

    showLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Carregando...</p>
        </div>
      `;
    }
  }

  showError(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
      container.innerHTML = `
        <div class="empty-state error-state">
          <i class="fas fa-exclamation-triangle"></i>
          <h3>Erro</h3>
          <p>${message}</p>
          <button class="btn btn-outline" onclick="MessagesSystem.retryLoad()">Tentar Novamente</button>
        </div>
      `;
    }
  }

  async retryLoad() {
    try {
      await this.loadConversations();
      if (this.currentConversation) {
        await this.loadConversationMessages(this.currentConversation);
      }
    } catch (error) {
      this.showNotification('Erro ao recarregar', 'error');
    }
  }

  showNotification(message, type = 'info') {
    if (typeof window.showNotification === 'function') {
      window.showNotification(message, type);
    } else {
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        border-radius: 8px;
        color: white;
        z-index: 1000;
        background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
      `;
      notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
          <span>${message}</span>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        notification.remove();
      }, 3000);
    }
  }
}

// ==================== INICIALIZAÇÃO GLOBAL ====================
document.addEventListener('DOMContentLoaded', function() {
  window.MessagesSystem = new MessagesSystem();
});

// ==================== FUNÇÕES GLOBAIS ====================
window.refreshMessages = function() {
  if (window.MessagesSystem) {
    window.MessagesSystem.refreshMessages();
  }
};

window.selectConversation = function(userId) {
  if (window.MessagesSystem) {
    window.MessagesSystem.selectConversation(userId);
  }
};

window.sendMessage = function() {
  if (window.MessagesSystem) {
    window.MessagesSystem.sendMessage();
  }
};

// Função de logout global
async function logout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (!error) {
      window.location.href = 'login.html';
    }
  } catch (error) {
    // Logout silencioso
  }
}

// Monitor de autenticação
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT') {
    window.location.href = 'login.html';
  }
});

// Exportar funções globais
window.logout = logout;
window.MessagesSystem = MessagesSystem;