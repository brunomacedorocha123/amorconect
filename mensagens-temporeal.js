// mensagens-temporeal.js - Sistema de atualização em tempo real
class RealTimeMessages {
    constructor(messagesSystem) {
        this.messagesSystem = messagesSystem;
        this.supabase = messagesSystem.supabase;
        this.currentUser = messagesSystem.currentUser;
        this.isPolling = false;
        this.pollingInterval = null;
        this.lastUpdate = Date.now();
        this.manualRefresh = false;
        
        this.initialize();
    }

    initialize() {
        this.setupRealTimeListeners();
        this.startPolling();
        this.setupManualRefresh();
    }

    // Configuração de listeners em tempo real (WebSockets)
    setupRealTimeListeners() {
        // Listener para novas mensagens recebidas
        this.supabase
            .channel('messages')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'messages',
                    filter: `receiver_id=eq.${this.currentUser.id}`
                },
                (payload) => {
                    console.log('Nova mensagem recebida:', payload);
                    this.handleNewMessage(payload.new);
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
                    console.log('Mensagem atualizada:', payload);
                    this.handleMessageUpdate(payload.new);
                }
            )
            .subscribe();
    }

    // Sistema de polling como fallback
    startPolling() {
        this.isPolling = true;
        this.pollingInterval = setInterval(() => {
            this.checkForUpdates();
        }, 10000); // Verificar a cada 10 segundos
    }

    stopPolling() {
        this.isPolling = false;
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
    }

    // Verificar atualizações manualmente e automaticamente
    async checkForUpdates() {
        if (this.manualRefresh) {
            this.manualRefresh = false;
            return; // Evitar duplicação se já está atualizando manualmente
        }

        try {
            const now = Date.now();
            const timeSinceLastUpdate = now - this.lastUpdate;

            // Só verificar se passou pelo menos 5 segundos da última atualização
            if (timeSinceLastUpdate < 5000) {
                return;
            }

            await this.performUpdateCheck();
            
        } catch (error) {
            console.error('Erro na verificação de atualizações:', error);
        }
    }

    async performUpdateCheck() {
        // Verificar se há novas mensagens desde a última atualização
        const hasNewMessages = await this.checkNewMessages();
        
        if (hasNewMessages) {
            console.log('Novas mensagens detectadas, atualizando...');
            await this.refreshAllData();
        }

        this.lastUpdate = Date.now();
    }

    async checkNewMessages() {
        try {
            // Buscar a mensagem mais recente
            const { data: latestMessage, error } = await this.supabase
                .from('messages')
                .select('sent_at')
                .or(`sender_id.eq.${this.currentUser.id},receiver_id.eq.${this.currentUser.id}`)
                .order('sent_at', { ascending: false })
                .limit(1)
                .single();

            if (error) return false;

            // Verificar se é mais recente que nossa última atualização
            const messageTime = new Date(latestMessage.sent_at).getTime();
            return messageTime > this.lastUpdate;

        } catch (error) {
            console.error('Erro ao verificar novas mensagens:', error);
            return false;
        }
    }

    // Handler para nova mensagem recebida via WebSocket
    async handleNewMessage(message) {
        console.log('Processando nova mensagem:', message);
        
        // Se a mensagem é da conversa atual, atualizar o chat
        if (this.messagesSystem.currentConversation === message.sender_id) {
            await this.messagesSystem.loadConversationMessages(message.sender_id);
            this.showNewMessageNotification(message, false);
        } else {
            // Se não é da conversa atual, mostrar notificação
            this.showNewMessageNotification(message, true);
            
            // Atualizar a lista de conversas
            await this.messagesSystem.loadConversations();
        }

        // Reproduzir som de notificação (opcional)
        this.playNotificationSound();
    }

    // Handler para atualização de mensagem (lida/entregue)
    async handleMessageUpdate(message) {
        console.log('Mensagem atualizada:', message);
        
        // Se a mensagem atualizada está na conversa atual, atualizar status
        if (this.messagesSystem.currentConversation === message.sender_id || 
            this.messagesSystem.currentConversation === message.receiver_id) {
            await this.messagesSystem.loadConversationMessages(this.messagesSystem.currentConversation);
        }
    }

    // Configurar botão de atualização manual
    setupManualRefresh() {
        const refreshBtn = document.getElementById('refreshMessages');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.manualRefresh = true;
                this.handleManualRefresh();
            });
        }

        // Atalho de teclado F5 para atualizar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F5') {
                e.preventDefault();
                this.manualRefresh = true;
                this.handleManualRefresh();
            }
        });
    }

    async handleManualRefresh() {
        const refreshBtn = document.getElementById('refreshMessages');
        
        try {
            // Feedback visual
            if (refreshBtn) {
                refreshBtn.classList.add('loading');
                refreshBtn.title = 'Atualizando...';
            }

            // Atualizar dados
            await this.refreshAllData();
            
            // Mostrar confirmação
            this.showUpdateStatus('Conversas atualizadas!', 'success');
            
        } catch (error) {
            console.error('Erro na atualização manual:', error);
            this.showUpdateStatus('Erro ao atualizar', 'error');
        } finally {
            // Restaurar botão
            if (refreshBtn) {
                setTimeout(() => {
                    refreshBtn.classList.remove('loading');
                    refreshBtn.title = 'Atualizar conversas';
                }, 1000);
            }
        }
    }

    async refreshAllData() {
        // Atualizar lista de conversas
        await this.messagesSystem.loadConversations();
        
        // Atualizar mensagens da conversa atual se houver
        if (this.messagesSystem.currentConversation) {
            await this.messagesSystem.loadConversationMessages(this.messagesSystem.currentConversation);
        }
        
        // Atualizar contador de mensagens
        await this.messagesSystem.updateMessageCounter();
        
        this.lastUpdate = Date.now();
    }

    // Mostrar notificação de nova mensagem
    async showNewMessageNotification(message, showPopup = true) {
        if (!showPopup) {
            // Apenas atualizar a interface silenciosamente
            return;
        }

        try {
            // Buscar informações do remetente
            const { data: sender } = await this.supabase
                .from('profiles')
                .select('nickname, avatar_url')
                .eq('id', message.sender_id)
                .single();

            if (!sender) return;

            // Criar notificação toast
            this.createMessageToast(sender.nickname, message.message, sender.avatar_url, message.sender_id);
            
        } catch (error) {
            console.error('Erro ao criar notificação:', error);
        }
    }

    createMessageToast(senderName, message, avatarUrl, senderId) {
        // Verificar se a página está em foco
        if (document.hidden) {
            // Se a página não está visível, mostrar notificação do navegador
            this.showBrowserNotification(senderName, message);
            return;
        }

        // Criar toast notification
        const toast = document.createElement('div');
        toast.className = 'message-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <div class="toast-avatar">
                    ${avatarUrl ? 
                        `<img src="${avatarUrl}" alt="${senderName}">` :
                        `<div class="avatar-fallback">${senderName.charAt(0).toUpperCase()}</div>`
                    }
                </div>
                <div class="toast-info">
                    <div class="toast-sender">${this.messagesSystem.escapeHtml(senderName)}</div>
                    <div class="toast-message">${this.messagesSystem.escapeHtml(this.truncateMessage(message, 60))}</div>
                </div>
                <button class="toast-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        // Estilos do toast
        toast.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: var(--white);
            border: 1px solid var(--gold);
            border-radius: var(--border-radius);
            padding: 1rem;
            box-shadow: var(--shadow-hover);
            z-index: 10000;
            max-width: 300px;
            cursor: pointer;
            animation: slideInRight 0.3s ease;
            transition: var(--transition);
        `;

        // Adicionar hover effect
        toast.addEventListener('mouseenter', () => {
            toast.style.transform = 'translateX(-5px)';
        });

        toast.addEventListener('mouseleave', () => {
            toast.style.transform = 'translateX(0)';
        });

        // Clique para abrir a conversa
        toast.addEventListener('click', () => {
            this.messagesSystem.selectConversation(senderId);
            toast.remove();
        });

        document.body.appendChild(toast);

        // Auto-remover após 5 segundos
        setTimeout(() => {
            if (toast.parentElement) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => toast.remove(), 300);
            }
        }, 5000);
    }

    // Notificação do navegador quando a página não está visível
    showBrowserNotification(senderName, message) {
        if (!('Notification' in window)) return;

        if (Notification.permission === 'granted') {
            new Notification(`Nova mensagem de ${senderName}`, {
                body: this.truncateMessage(message, 100),
                icon: '/favicon.ico',
                tag: 'new-message'
            });
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    new Notification(`Nova mensagem de ${senderName}`, {
                        body: this.truncateMessage(message, 100),
                        icon: '/favicon.ico'
                    });
                }
            });
        }
    }

    // Mostrar status de atualização
    showUpdateStatus(message, type) {
        // Usar o sistema de status do messagesSystem
        this.messagesSystem.showMessageStatus(message, type);
        
        // Auto-limpar após 2 segundos
        setTimeout(() => {
            this.messagesSystem.clearMessageStatus();
        }, 2000);
    }

    // Reproduzir som de notificação
    playNotificationSound() {
        // Criar elemento de áudio simples (pode ser personalizado)
        const audio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQcAAAAAAA==');
        audio.volume = 0.3;
        
        // Tentar reproduzir, mas ignorar erros (não crítico)
        audio.play().catch(() => {
            // Silenciosamente ignorar erros de reprodução de áudio
        });
    }

    // Utilitários
    truncateMessage(message, maxLength) {
        if (message.length <= maxLength) return message;
        return message.substring(0, maxLength) + '...';
    }

    // Verificar se há conexão com a internet
    setupConnectionMonitor() {
        window.addEventListener('online', () => {
            this.showUpdateStatus('Conexão restaurada', 'success');
            this.startPolling();
        });

        window.addEventListener('offline', () => {
            this.showUpdateStatus('Sem conexão', 'error');
            this.stopPolling();
        });
    }

    // Limpar recursos quando não forem mais necessários
    destroy() {
        this.stopPolling();
        
        // Desconectar listeners do Supabase
        this.supabase.removeAllChannels();
    }
}

// Inicializar sistema de tempo real quando o MessagesSystem estiver pronto
function initializeRealTimeSystem() {
    if (window.MessagesSystem && window.MessagesSystem.currentUser) {
        window.RealTimeMessages = new RealTimeMessages(window.MessagesSystem);
    } else {
        // Tentar novamente em 1 segundo se MessagesSystem não estiver pronto
        setTimeout(initializeRealTimeSystem, 1000);
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeRealTimeSystem, 2000);
});

// Adicionar estilos CSS para as animações
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
    
    .message-toast {
        animation: slideInRight 0.3s ease;
    }
    
    .message-toast .toast-content {
        display: flex;
        align-items: flex-start;
        gap: 0.8rem;
    }
    
    .message-toast .toast-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--burgundy), var(--gold));
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--text-white);
        font-weight: bold;
        font-size: 0.9rem;
        border: 2px solid var(--gold);
        overflow: hidden;
        flex-shrink: 0;
    }
    
    .message-toast .toast-avatar img {
        width: 100%;
        height: 100%;
        object-fit: cover;
    }
    
    .message-toast .toast-info {
        flex: 1;
        min-width: 0;
    }
    
    .message-toast .toast-sender {
        font-weight: 600;
        color: var(--text-primary);
        margin-bottom: 0.2rem;
        font-size: 0.9rem;
    }
    
    .message-toast .toast-message {
        color: var(--text-light);
        font-size: 0.8rem;
        line-height: 1.3;
    }
    
    .message-toast .toast-close {
        background: none;
        border: none;
        color: var(--text-light);
        cursor: pointer;
        padding: 0.2rem;
        border-radius: 50%;
        transition: var(--transition);
        flex-shrink: 0;
    }
    
    .message-toast .toast-close:hover {
        background: rgba(0, 0, 0, 0.1);
        color: var(--burgundy);
    }
`;

document.head.appendChild(style);

// Exportar para uso global
window.RealTimeMessages = RealTimeMessages;