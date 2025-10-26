// mensagens.js - Sistema completo de mensagens
class MessagesSystem {
    constructor() {
        this.supabase = supabase;
        this.currentUser = null;
        this.currentConversation = null;
        this.conversations = [];
        this.messages = [];
        this.messageLimit = 4;
        this.isLoading = false;
        
        this.initialize();
    }

    async initialize() {
        try {
            await this.checkAuth();
            await this.loadUserData();
            await this.loadConversations();
            this.setupEventListeners();
            this.updateMessageCounter();
            
            this.startPeriodicChecks();
            this.checkUrlParams();
            
            console.log('Sistema de mensagens inicializado');
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showNotification('Erro ao carregar mensagens', 'error');
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
            console.error('Erro de autenticação:', error);
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
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
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
            
            // Limpar URL
            window.history.replaceState({}, '', 'mensagens.html');
        } catch (error) {
            console.error('Erro ao selecionar conversa da URL:', error);
            this.showNotification('Erro ao carregar conversa', 'error');
        }
    }

    async createNewConversation(userId) {
        try {
            const { data: userProfile, error } = await this.supabase
                .from('profiles')
                .select('nickname, avatar_url, last_online_at')
                .eq('id', userId)
                .single();
                
            if (error) throw error;

            if (userProfile) {
                const newConversation = {
                    other_user_id: userId,
                    other_user_nickname: userProfile.nickname,
                    other_user_avatar_url: userProfile.avatar_url,
                    other_user_online: this.isUserOnline(userProfile.last_online_at),
                    last_message: 'Nenhuma mensagem',
                    last_message_at: new Date().toISOString(),
                    unread_count: 0
                };
                
                this.conversations.unshift(newConversation);
                this.renderConversations();
                await this.selectConversation(userId);
            }
        } catch (error) {
            console.error('Erro ao criar nova conversa:', error);
            this.showNotification('Usuário não encontrado', 'error');
        }
    }

    isUserOnline(lastOnlineAt) {
        if (!lastOnlineAt) return false;
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        return new Date(lastOnlineAt) > fifteenMinutesAgo;
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
                console.error('Erro ao carregar conversas:', error);
                this.showError('conversationsList', 'Erro ao carregar conversas');
                return;
            }

            this.conversations = conversations || [];
            this.renderConversations();
            
        } catch (error) {
            console.error('Erro ao carregar conversas:', error);
            this.showError('conversationsList', 'Erro ao carregar conversas');
        } finally {
            this.isLoading = false;
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

        container.innerHTML = this.conversations.map(conv => `
            <div class="conversation-item ${this.currentConversation === conv.other_user_id ? 'active' : ''}" 
                 data-user-id="${conv.other_user_id}" 
                 onclick="MessagesSystem.selectConversation('${conv.other_user_id}')">
                <div class="conversation-avatar">
                    ${conv.other_user_avatar_url ? 
                        `<img src="${conv.other_user_avatar_url}" alt="${conv.other_user_nickname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` :
                        ''
                    }
                    <div class="avatar-fallback" style="${conv.other_user_avatar_url ? 'display: none;' : ''}">
                        ${this.getUserInitials(conv.other_user_nickname)}
                    </div>
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
                        <span class="${conv.other_user_online ? 'status-online' : 'status-offline'}">
                            <span class="status-dot"></span>
                            ${conv.other_user_online ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    async selectConversation(otherUserId) {
        try {
            // Atualizar UI
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
            this.updateChatHeader(otherUserId);
            
        } catch (error) {
            console.error('Erro ao selecionar conversa:', error);
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
                console.error('Erro ao carregar mensagens:', error);
                this.showError('messagesHistory', 'Erro ao carregar mensagens');
                return;
            }

            this.messages = messages || [];
            this.renderMessages();
            
        } catch (error) {
            console.error('Erro ao carregar mensagens:', error);
            this.showError('messagesHistory', 'Erro ao carregar mensagens');
        } finally {
            this.isLoading = false;
        }
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
        if (message.delivered_at) return 'fa-check-double status-delivered';
        return 'fa-check status-sent';
    }

    getMessageStatusText(message) {
        if (message.read_at) return 'Lida';
        if (message.delivered_at) return 'Entregue';
        return 'Enviada';
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

            const { data, error } = await this.supabase
                .rpc('send_message', {
                    p_sender_id: this.currentUser.id,
                    p_receiver_id: this.currentConversation,
                    p_message: message
                });

            if (error) {
                console.error('Erro RPC send_message:', error);
                throw error;
            }

            if (data === 'success') {
                messageInput.value = '';
                this.updateCharCounter();
                this.showMessageStatus('Mensagem enviada!', 'success');
                
                // Recarregar mensagens e conversas
                await this.loadConversationMessages(this.currentConversation);
                await this.loadConversations();
                this.updateMessageCounter();
                
            } else {
                this.handleSendError(data);
                throw new Error(data);
            }

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            this.showMessageStatus('Erro ao enviar mensagem', 'error');
        } finally {
            this.setSendButtonState(false);
            setTimeout(() => this.clearMessageStatus(), 3000);
        }
    }

    handleSendError(reason) {
        switch (reason) {
            case 'limit_reached':
                this.showNotification('Limite diário de mensagens atingido! Volte amanhã.', 'error');
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
            const isPremium = this.currentUser.profile?.is_premium;
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
                .select('messages_sent_today')
                .eq('user_id', this.currentUser.id)
                .single();

            const sentToday = limits?.messages_sent_today || 0;

            counter.innerHTML = `
                <span class="counter-text">Mensagens hoje: </span>
                <span class="counter-number">${sentToday}/${this.messageLimit}</span>
            `;
            counter.classList.remove('premium');

        } catch (error) {
            console.error('Erro ao atualizar contador:', error);
        }
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

    showChatArea() {
        const inputArea = document.getElementById('messageInputArea');
        const chatHeader = document.getElementById('chatHeader');
        
        if (inputArea) inputArea.style.display = 'block';
        
        const placeholder = document.querySelector('.chat-header-placeholder');
        if (placeholder) placeholder.style.display = 'none';
    }

    async updateChatHeader(otherUserId) {
        const chatHeader = document.getElementById('chatHeader');
        if (!chatHeader) return;
        
        const conversation = this.conversations.find(c => c.other_user_id === otherUserId);
        
        if (!conversation) return;

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
                </div>
                <div class="chat-user-info">
                    <h3>${this.escapeHtml(conversation.other_user_nickname)}</h3>
                    <div class="chat-user-status">
                        <span class="${conversation.other_user_online ? 'status-online' : 'status-offline'}">
                            <span class="status-dot"></span>
                            ${conversation.other_user_online ? 'Online' : 'Offline'}
                        </span>
                    </div>
                </div>
            </div>
            <div class="chat-header-actions">
                <button class="chat-action-btn" onclick="MessagesSystem.showUserInfo('${otherUserId}')" title="Informações do usuário">
                    <i class="fas fa-info-circle"></i>
                </button>
            </div>
        `;
    }

    async showUserInfo(userId) {
        // Implementar modal de informações do usuário
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
            
            this.showNotification('Conversas atualizadas', 'success');
        } catch (error) {
            console.error('Erro ao atualizar:', error);
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
        // Atualizar a cada 30 segundos
        setInterval(async () => {
            if (this.currentConversation) {
                await this.loadConversationMessages(this.currentConversation);
            }
            await this.loadConversations();
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
            console.error('Erro no retry:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Usar sistema de notificação existente ou fallback
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback simples
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-content">
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

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.MessagesSystem = new MessagesSystem();
});

// Funções globais para uso no HTML
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

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('Erro no logout:', error);
    }
}

// Monitorar estado de autenticação
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});

window.logout = logout;