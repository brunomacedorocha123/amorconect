// mensagens-temporeal.js - SISTEMA INTELIGENTE SEM PISCAR
class RealTimeMessages {
    constructor(messagesSystem) {
        this.messagesSystem = messagesSystem;
        this.supabase = messagesSystem.supabase;
        this.currentUser = messagesSystem.currentUser;
        
        // Sistema de debounce e controle
        this.updateQueue = new Map(); // Filas por conversa
        this.isUpdating = false;
        this.lastUpdateTime = 0;
        this.updateDelay = 2000; // 2 segundos entre updates
        this.batchDelay = 500; // 500ms para agrupar updates
        
        // Cache para evitar updates desnecessários
        this.lastMessageCounts = new Map();
        this.lastConversationData = new Map();
        
        this.initialize();
    }

    initialize() {
        this.setupRealTimeListeners();
        this.startIntelligentPolling();
        this.setupManualRefresh();
        this.setupConnectionMonitor();
    }

    // 🎯 LISTENERS INTELIGENTES - Só capturam, não atualizam diretamente
    setupRealTimeListeners() {
        // Listener para novas mensagens
        this.supabase
            .channel('smart_messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${this.currentUser.id}`
                },
                (payload) => {
                    console.log('📨 Nova mensagem detectada:', payload.new);
                    this.queueUpdate('new_message', payload.new);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${this.currentUser.id}`
                },
                (payload) => {
                    console.log('✏️ Mensagem atualizada:', payload.new);
                    this.queueUpdate('message_update', payload.new);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'profiles',
                    filter: `id=neq.${this.currentUser.id}`
                },
                (payload) => {
                    console.log('🟢 Status atualizado:', payload.new);
                    this.queueUpdate('status_update', payload.new);
                }
            )
            .subscribe();
    }

    // 🎯 SISTEMA DE FILA INTELIGENTE
    queueUpdate(type, data) {
        const conversationId = this.getConversationIdFromData(type, data);
        if (!conversationId) return;

        // Criar/atualizar fila para esta conversa
        if (!this.updateQueue.has(conversationId)) {
            this.updateQueue.set(conversationId, {
                types: new Set(),
                data: [],
                lastUpdate: Date.now()
            });
        }

        const queue = this.updateQueue.get(conversationId);
        queue.types.add(type);
        queue.data.push(data);
        queue.lastUpdate = Date.now();

        console.log(`📦 Update enfileirado para conversa ${conversationId}:`, Array.from(queue.types));

        // Agendar processamento com debounce
        this.scheduleProcessing();
    }

    getConversationIdFromData(type, data) {
        switch (type) {
            case 'new_message':
            case 'message_update':
                return data.sender_id === this.currentUser.id ? data.receiver_id : data.sender_id;
            case 'status_update':
                return data.id; // ID do usuário cujo status mudou
            default:
                return null;
        }
    }

    // 🎯 AGENDAMENTO INTELIGENTE
    scheduleProcessing() {
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastUpdateTime;

        // Se já passou tempo suficiente, processar imediatamente
        if (timeSinceLastUpdate > this.updateDelay && !this.isUpdating) {
            this.processQueue();
            return;
        }

        // Caso contrário, agendar com debounce
        if (this.processTimeout) clearTimeout(this.processTimeout);
        
        this.processTimeout = setTimeout(() => {
            this.processQueue();
        }, this.batchDelay);
    }

    // 🎯 PROCESSAMENTO EM LOTE INTELIGENTE
    async processQueue() {
        if (this.isUpdating || this.updateQueue.size === 0) return;

        this.isUpdating = true;
        console.log('🔄 Processando fila de updates...');

        try {
            const queues = Array.from(this.updateQueue.entries());
            this.updateQueue.clear();

            for (const [conversationId, queue] of queues) {
                await this.processConversationUpdate(conversationId, queue);
            }

            this.lastUpdateTime = Date.now();
            console.log('✅ Fila processada com sucesso');

        } catch (error) {
            console.error('❌ Erro ao processar fila:', error);
        } finally {
            this.isUpdating = false;
            
            // Verificar se chegaram mais updates durante o processamento
            if (this.updateQueue.size > 0) {
                setTimeout(() => this.processQueue(), this.batchDelay);
            }
        }
    }

    // 🎯 ATUALIZAÇÃO GRANULAR POR CONVERSA
    async processConversationUpdate(conversationId, queue) {
        const types = Array.from(queue.types);
        const isCurrentConversation = this.messagesSystem.currentConversation === conversationId;

        console.log(`🎯 Atualizando conversa ${conversationId} (tipos: ${types.join(', ')})`);

        // 🎯 ATUALIZAR LISTA DE CONVERSAS (se necessário)
        if (types.includes('new_message') || types.includes('message_update')) {
            await this.updateConversationItem(conversationId);
        }

        // 🎯 ATUALIZAR MENSAGENS (apenas se for conversa atual)
        if (isCurrentConversation && (types.includes('new_message') || types.includes('message_update'))) {
            await this.updateMessagesSmart(conversationId);
        }

        // 🎯 ATUALIZAR STATUS (se houver mudança de status)
        if (types.includes('status_update')) {
            await this.updateUserStatus(conversationId);
        }

        // 🎯 NOTIFICAÇÃO (apenas se não for conversa atual)
        if (types.includes('new_message') && !isCurrentConversation) {
            this.showSmartNotification(queue.data[0]);
        }

        // 🎯 ATUALIZAR CONTADOR
        await this.messagesSystem.updateMessageCounter();
    }

    // 🎯 ATUALIZAÇÃO ESPECÍFICA DA CONVERSA (SEM RECARREGAR TUDO)
    async updateConversationItem(conversationId) {
        try {
            // Buscar dados atualizados apenas desta conversa
            const { data: conversation, error } = await this.supabase
                .rpc('get_conversation_data', {
                    p_user_id: this.currentUser.id,
                    p_other_user_id: conversationId
                });

            if (error || !conversation) return;

            // Atualizar item específico na lista
            const conversationElement = document.querySelector(`[data-user-id="${conversationId}"]`);
            if (conversationElement) {
                this.updateConversationElement(conversationElement, conversation);
            } else {
                // Se não existe na lista, recarregar lista completa (raro)
                await this.messagesSystem.loadConversations();
            }

        } catch (error) {
            console.error('Erro ao atualizar item da conversa:', error);
        }
    }

    // 🎯 ATUALIZAR ELEMENTO DA CONVERSA (SEM RE-RENDER)
    updateConversationElement(element, conversation) {
        // Atualizar apenas os elementos que mudaram
        const lastMessageEl = element.querySelector('.conversation-last-message');
        const timeEl = element.querySelector('.conversation-time');
        const unreadEl = element.querySelector('.conversation-unread');

        if (lastMessageEl) {
            lastMessageEl.textContent = this.messagesSystem.escapeHtml(
                conversation.last_message || 'Nenhuma mensagem'
            );
        }

        if (timeEl) {
            timeEl.textContent = this.messagesSystem.formatTime(conversation.last_message_at);
        }

        if (unreadEl && conversation.unread_count > 0) {
            unreadEl.textContent = conversation.unread_count;
            unreadEl.style.display = 'inline-block';
        } else if (unreadEl) {
            unreadEl.style.display = 'none';
        }
    }

    // 🎯 ATUALIZAÇÃO INTELIGENTE DE MENSAGENS
    async updateMessagesSmart(conversationId) {
        try {
            // Buscar apenas mensagens novas (últimos 30 segundos)
            const timeThreshold = new Date(Date.now() - 30000).toISOString();
            
            const { data: newMessages, error } = await this.supabase
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
                .or(`and(sender_id.eq.${this.currentUser.id},receiver_id.eq.${conversationId}),and(sender_id.eq.${conversationId},receiver_id.eq.${this.currentUser.id})`)
                .gte('sent_at', timeThreshold)
                .order('sent_at', { ascending: true });

            if (error || !newMessages || newMessages.length === 0) return;

            // Adicionar novas mensagens sem recarregar tudo
            this.appendNewMessages(newMessages);

        } catch (error) {
            console.error('Erro ao atualizar mensagens:', error);
            // Fallback: recarregar apenas esta conversa
            await this.messagesSystem.loadConversationMessages(conversationId);
        }
    }

    // 🎯 ADICIONAR NOVAS MENSAGENS (SEM PISCAR)
    appendNewMessages(newMessages) {
        const container = document.getElementById('messagesHistory');
        if (!container) return;

        const existingIds = new Set();
        container.querySelectorAll('.message').forEach(msg => {
            const id = msg.dataset.messageId;
            if (id) existingIds.add(id);
        });

        let addedCount = 0;
        newMessages.forEach(msg => {
            if (!existingIds.has(msg.id.toString())) {
                this.appendMessageElement(container, msg);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            console.log(`✅ ${addedCount} nova(s) mensagem(ns) adicionada(s)`);
            this.messagesSystem.scrollToBottom();
        }
    }

    // 🎯 CRIAR E ADICIONAR ELEMENTO DE MENSAGEM
    appendMessageElement(container, msg) {
        const isOwnMessage = msg.sender_id === this.currentUser.id;
        
        // Verificar se precisa criar grupo de data
        const messageDate = msg.sent_at.split('T')[0];
        const lastGroup = container.lastElementChild;
        
        let targetGroup = lastGroup;
        if (!lastGroup || !lastGroup.classList.contains('message-group')) {
            targetGroup = this.createMessageGroup(container, messageDate);
        }

        // Criar elemento da mensagem
        const messageElement = document.createElement('div');
        messageElement.className = `message ${isOwnMessage ? 'own' : 'other'}`;
        messageElement.dataset.messageId = msg.id;
        
        messageElement.innerHTML = `
            <div class="message-content">${this.messagesSystem.escapeHtml(msg.message)}</div>
            <div class="message-time">${this.messagesSystem.formatTime(msg.sent_at)}</div>
            ${isOwnMessage ? `
                <div class="message-status">
                    <i class="fas ${this.getMessageStatusIcon(msg)}"></i>
                    ${this.getMessageStatusText(msg)}
                </div>
            ` : ''}
        `;

        targetGroup.appendChild(messageElement);
    }

    createMessageGroup(container, date) {
        const groupElement = document.createElement('div');
        groupElement.className = 'message-group';
        
        groupElement.innerHTML = `
            <div class="message-date">
                <span>${this.messagesSystem.formatDate(date)}</span>
            </div>
        `;
        
        container.appendChild(groupElement);
        return groupElement;
    }

    getMessageStatusIcon(message) {
        if (message.read_at) return 'fa-check-double status-read';
        return 'fa-check status-sent';
    }

    getMessageStatusText(message) {
        if (message.read_at) return 'Lida';
        return 'Enviada';
    }

    // 🎯 ATUALIZAR STATUS DO USUÁRIO
    async updateUserStatus(userId) {
        try {
            const statusInfo = await this.messagesSystem.getUserStatus(userId);
            
            // Atualizar status na lista de conversas
            const conversationElement = document.querySelector(`[data-user-id="${userId}"]`);
            if (conversationElement) {
                this.updateStatusElement(conversationElement, statusInfo);
            }

            // Atualizar status no header do chat (se for conversa atual)
            if (this.messagesSystem.currentConversation === userId) {
                this.updateChatHeaderStatus(statusInfo);
            }

        } catch (error) {
            console.error('Erro ao atualizar status:', error);
        }
    }

    updateStatusElement(element, statusInfo) {
        const statusEl = element.querySelector('.conversation-status');
        const statusDot = element.querySelector('.avatar-status');
        
        if (statusEl) {
            statusEl.innerHTML = `
                <span class="${statusInfo.class}">
                    <span class="status-dot"></span>
                    ${statusInfo.text}
                    ${statusInfo.status === 'invisible' ? '<i class="fas fa-eye-slash" style="margin-left: 5px; font-size: 0.7rem;"></i>' : ''}
                </span>
            `;
        }

        if (statusDot) {
            statusDot.className = `avatar-status ${statusInfo.status === 'online' ? 'online' : 'offline'}`;
        }
    }

    updateChatHeaderStatus(statusInfo) {
        const chatHeader = document.getElementById('chatHeader');
        if (!chatHeader) return;

        const statusEl = chatHeader.querySelector('.chat-user-status');
        const statusDot = chatHeader.querySelector('.avatar-status');
        
        if (statusEl) {
            statusEl.innerHTML = `
                <span class="${statusInfo.class}">
                    <span class="status-dot"></span>
                    ${statusInfo.text}
                    ${statusInfo.status === 'invisible' ? '<i class="fas fa-eye-slash" style="margin-left: 5px; font-size: 0.7rem;"></i>' : ''}
                </span>
            `;
        }

        if (statusDot) {
            statusDot.className = `avatar-status ${statusInfo.status === 'online' ? 'online' : 'offline'}`;
        }
    }

    // 🎯 NOTIFICAÇÃO INTELIGENTE
    showSmartNotification(message) {
        // Só mostrar notificação se a página não está em foco
        if (!document.hidden) {
            // Pequena vibração no item da conversa
            this.highlightConversationItem(message.sender_id);
            return;
        }

        // Notificação do navegador se página em segundo plano
        this.showBrowserNotification(message);
    }

    highlightConversationItem(userId) {
        const element = document.querySelector(`[data-user-id="${userId}"]`);
        if (element) {
            element.style.transform = 'scale(1.02)';
            element.style.transition = 'transform 0.3s ease';
            
            setTimeout(() => {
                element.style.transform = 'scale(1)';
            }, 300);
        }
    }

    // 🎯 POLLING INTELIGENTE (apenas como fallback)
    startIntelligentPolling() {
        this.pollingInterval = setInterval(async () => {
            // Só fazer polling se não houver updates recentes
            const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
            if (timeSinceLastUpdate > 60000) { // 1 minuto
                await this.checkForSilentUpdates();
            }
        }, 30000); // Verificar a cada 30 segundos
    }

    async checkForSilentUpdates() {
        try {
            // Verificar se há mensagens muito recentes que possam ter sido perdidas
            const { data: recentMessages, error } = await this.supabase
                .from('messages')
                .select('id, sender_id, sent_at')
                .eq('receiver_id', this.currentUser.id)
                .gte('sent_at', new Date(Date.now() - 120000).toISOString()) // Últimos 2 minutos
                .order('sent_at', { ascending: false })
                .limit(5);

            if (error || !recentMessages || recentMessages.length === 0) return;

            // Processar mensagens perdidas
            recentMessages.forEach(msg => {
                this.queueUpdate('new_message', msg);
            });

        } catch (error) {
            console.error('Erro no polling silencioso:', error);
        }
    }

    // 🎯 ATUALIZAÇÃO MANUAL (preserva a inteligência)
    setupManualRefresh() {
        const refreshBtn = document.getElementById('refreshMessages');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.handleManualRefresh();
            });
        }
    }

    async handleManualRefresh() {
        const refreshBtn = document.getElementById('refreshMessages');
        
        try {
            if (refreshBtn) {
                refreshBtn.classList.add('loading');
            }

            // Limpar fila e forçar atualização completa
            this.updateQueue.clear();
            await this.messagesSystem.loadConversations();
            
            if (this.messagesSystem.currentConversation) {
                await this.messagesSystem.loadConversationMessages(this.messagesSystem.currentConversation);
            }

            this.showUpdateStatus('Conversas atualizadas!', 'success');
            
        } catch (error) {
            console.error('Erro na atualização manual:', error);
            this.showUpdateStatus('Erro ao atualizar', 'error');
        } finally {
            if (refreshBtn) {
                setTimeout(() => {
                    refreshBtn.classList.remove('loading');
                }, 1000);
            }
        }
    }

    // 🎯 MONITOR DE CONEXÃO
    setupConnectionMonitor() {
        window.addEventListener('online', () => {
            this.showUpdateStatus('Conexão restaurada', 'success');
        });

        window.addEventListener('offline', () => {
            this.showUpdateStatus('Sem conexão', 'error');
        });
    }

    // 🎯 UTILITÁRIOS
    showUpdateStatus(message, type) {
        if (this.messagesSystem.showMessageStatus) {
            this.messagesSystem.showMessageStatus(message, type);
            setTimeout(() => {
                if (this.messagesSystem.clearMessageStatus) {
                    this.messagesSystem.clearMessageStatus();
                }
            }, 2000);
        }
    }

    showBrowserNotification(message) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification('Nova mensagem', {
                body: `Você tem uma nova mensagem`,
                icon: '/favicon.ico'
            });
        }
    }

    // 🎯 LIMPEZA
    destroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        if (this.processTimeout) {
            clearTimeout(this.processTimeout);
        }
        this.updateQueue.clear();
        this.supabase.removeAllChannels();
    }
}

// 🎯 INICIALIZAÇÃO AUTOMÁTICA
function initializeRealTimeSystem() {
    if (window.MessagesSystem && window.MessagesSystem.currentUser) {
        console.log('🚀 Inicializando sistema de tempo real inteligente...');
        window.RealTimeMessages = new RealTimeMessages(window.MessagesSystem);
    } else {
        setTimeout(initializeRealTimeSystem, 1000);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeRealTimeSystem, 2000);
});

// 🎯 ESTILOS PARA ANIMAÇÕES SUAVES
const style = document.createElement('style');
style.textContent = `
    .conversation-item {
        transition: transform 0.3s ease, background-color 0.3s ease;
    }
    
    .message {
        animation: messageSlideIn 0.3s ease;
    }
    
    @keyframes messageSlideIn {
        from {
            opacity: 0;
            transform: translateY(10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .loading {
        opacity: 0.7;
        pointer-events: none;
    }
`;

document.head.appendChild(style);

// Exportar para uso global
window.RealTimeMessages = RealTimeMessages;