// stickers.js - SISTEMA COMPLETO E FUNCIONAL
class StickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.currentConversation = null;
        
        // Lista de stickers disponíveis
        this.stickers = [
            { name: 'videoanel', display_name: 'Anel', category: 'amor' },
            { name: 'videoboanoite', display_name: 'Boa Noite', category: 'cumprimentos' },
            { name: 'videobolo', display_name: 'Bolo', category: 'comida' },
            { name: 'videobomdia', display_name: 'Bom Dia', category: 'cumprimentos' },
            { name: 'videocachorinho', display_name: 'Cachorrinho', category: 'animais' },
            { name: 'videocoracao', display_name: 'Coração', category: 'amor' }
        ];
        
        this.init();
    }

    init() {
        console.log('🎯 StickersSystem iniciado');
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Botão de abrir modal de stickers
        const stickerBtn = document.getElementById('stickerBtn');
        if (stickerBtn) {
            stickerBtn.addEventListener('click', () => this.openModal());
        }

        // Fechar modal ao clicar fora
        document.addEventListener('click', (event) => {
            const modal = document.getElementById('stickersModal');
            if (event.target === modal) {
                this.closeModal();
            }
        });

        // Fechar modal com ESC
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    initialize(user) {
        this.currentUser = user;
        console.log('✅ StickersSystem inicializado com usuário');
    }

    // Abrir modal de stickers
    openModal() {
        if (!this.hasConversation()) {
            this.showNotification('Selecione uma conversa primeiro', 'error');
            return;
        }

        const modal = document.getElementById('stickersModal');
        if (modal) {
            this.renderStickers();
            modal.style.display = 'flex';
            this.playAllVideos();
        }
    }

    // Fechar modal
    closeModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'none';
            this.pauseAllVideos();
        }
    }

    // Verificar se tem conversa selecionada
    hasConversation() {
        if (window.MessagesSystem && window.MessagesSystem.currentConversation) {
            this.currentConversation = window.MessagesSystem.currentConversation;
            return true;
        }
        return false;
    }

    // Renderizar stickers no modal
    renderStickers() {
        const grid = document.getElementById('stickersGrid');
        if (!grid) return;

        grid.innerHTML = this.stickers.map(sticker => `
            <div class="sticker-item" data-category="${sticker.category}" onclick="stickersSystem.sendSticker('${sticker.name}')">
                <div class="sticker-video-container">
                    <video width="80" height="80" loop muted playsinline autoplay>
                        <source src="https://rohsbrkbdlbewonibclf.supabase.co/storage/v1/object/public/stickers/${sticker.name}.mp4" type="video/mp4">
                    </video>
                    <div class="sticker-overlay">
                        <i class="fas fa-paper-plane"></i>
                    </div>
                </div>
                <span class="sticker-name">${sticker.display_name}</span>
            </div>
        `).join('');
    }

    // Filtrar stickers por categoria
    filterStickers(category) {
        const buttons = document.querySelectorAll('.category-btn');
        buttons.forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');

        const items = document.querySelectorAll('.sticker-item');
        items.forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = 'flex';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // 🎯 FUNÇÃO PRINCIPAL: ENVIAR STICKER
    async sendSticker(stickerName) {
        if (!this.currentUser || !this.currentConversation) {
            this.showNotification('Erro: selecione uma conversa', 'error');
            return;
        }

        try {
            console.log(`🎯 Enviando sticker: ${stickerName}`);

            // 1. Verificar se pode enviar (limite diário)
            const canSend = await this.checkCanSendMessage();
            if (!canSend) {
                this.showNotification('🚫 Limite diário de 4 mensagens atingido! Volte amanhã.', 'error');
                return;
            }

            // 2. 🎯 MOSTRAR STICKER NO CHAT (IMEDIATAMENTE)
            this.showStickerInChat(stickerName);

            // 3. Enviar para o banco de dados
            const success = await this.sendStickerToDatabase(stickerName);
            
            if (success) {
                this.showNotification('🎉 Sticker enviado!', 'success');
                this.closeModal();
                this.updateMessageCounter();
                
                // Atualizar conversas
                if (window.MessagesSystem) {
                    await window.MessagesSystem.loadConversations();
                }
            } else {
                this.showNotification('❌ Erro ao enviar sticker', 'error');
            }

        } catch (error) {
            console.error('❌ Erro ao enviar sticker:', error);
            this.showNotification('❌ Erro ao enviar sticker', 'error');
        }
    }

    // 🎯 FUNÇÃO MAIS IMPORTANTE: MOSTRAR STICKER NO CHAT
    showStickerInChat(stickerName) {
        const messagesContainer = document.getElementById('messagesHistory');
        if (!messagesContainer) {
            console.error('❌ Container de mensagens não encontrado');
            return;
        }

        console.log('🎯 Mostrando sticker no chat:', stickerName);

        // Remover mensagem de "nenhuma mensagem" se existir
        const emptyState = messagesContainer.querySelector('.empty-state, .empty-chat');
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Encontrar o display name do sticker
        const sticker = this.stickers.find(s => s.name === stickerName);
        const displayName = sticker ? sticker.display_name : stickerName;

        // Criar HTML do sticker
        const stickerHTML = `
            <div class="message own sticker-message">
                <div class="message-content">
                    <div class="sticker-in-chat">
                        <video width="120" height="120" loop muted playsinline autoplay>
                            <source src="https://rohsbrkbdlbewonibclf.supabase.co/storage/v1/object/public/stickers/${stickerName}.mp4" type="video/mp4">
                        </video>
                        <div class="sticker-label">${displayName}</div>
                    </div>
                </div>
                <div class="message-time">Agora</div>
                <div class="message-status">
                    <i class="fas fa-check status-sent"></i>
                    Enviado
                </div>
            </div>
        `;

        // Adicionar ao chat
        messagesContainer.insertAdjacentHTML('beforeend', stickerHTML);
        
        // Rolagem automática para baixo
        this.scrollToBottom();
    }

    // Enviar sticker para o banco de dados
    async sendStickerToDatabase(stickerName) {
        try {
            // Tentar RPC primeiro
            const { data, error } = await this.supabase
                .rpc('send_sticker_message', {
                    p_sender_id: this.currentUser.id,
                    p_receiver_id: this.currentConversation,
                    p_sticker_name: stickerName
                });

            if (!error && data === 'success') {
                return true;
            }

            // Fallback: inserção direta
            const { error: insertError } = await this.supabase
                .from('messages')
                .insert({
                    sender_id: this.currentUser.id,
                    receiver_id: this.currentConversation,
                    message: `[STICKER:${stickerName}]`,
                    sent_at: new Date().toISOString(),
                    is_sticker: true,
                    sticker_name: stickerName
                });

            return !insertError;

        } catch (error) {
            console.error('Erro no envio para banco:', error);
            return false;
        }
    }

    // Verificar se pode enviar mensagem
    async checkCanSendMessage() {
        try {
            // Se for premium, pode enviar ilimitado
            if (await this.isPremiumUser()) {
                return true;
            }

            // Verificar limite para usuários free (4 mensagens)
            const { data: limits, error } = await this.supabase
                .from('user_message_limits')
                .select('messages_sent_today')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) {
                console.log('Erro ao verificar limites, permitindo envio');
                return true;
            }

            const sentToday = limits?.messages_sent_today || 0;
            return sentToday < 4;

        } catch (error) {
            console.error('Erro ao verificar se pode enviar:', error);
            return true;
        }
    }

    // Verificar se usuário é premium
    async isPremiumUser() {
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('is_premium')
                .eq('id', this.currentUser.id)
                .single();

            return !error && profile?.is_premium === true;
        } catch (error) {
            return false;
        }
    }

    // Atualizar contador de mensagens
    updateMessageCounter() {
        if (window.MessagesSystem && typeof window.MessagesSystem.updateMessageCounter === 'function') {
            window.MessagesSystem.updateMessageCounter();
        }
    }

    // Rolagem para o final do chat
    scrollToBottom() {
        const container = document.getElementById('messagesHistory');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    // Controlar reprodução dos vídeos
    playAllVideos() {
        setTimeout(() => {
            const videos = document.querySelectorAll('#stickersModal video');
            videos.forEach(video => {
                video.play().catch(e => {
                    console.log('Autoplay bloqueado pelo navegador');
                });
            });
        }, 100);
    }

    pauseAllVideos() {
        const videos = document.querySelectorAll('#stickersModal video');
        videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
    }

    // Sistema de notificações
    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback básico
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 8px;
                color: white;
                z-index: 10000;
                background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 4000);
        }
    }
}

// Inicialização global
window.stickersSystem = new StickersSystem();

// Inicializar quando o sistema de mensagens estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Inicializando sistema de stickers...');
    
    // Aguardar o sistema de mensagens carregar
    const checkMessagesSystem = setInterval(() => {
        if (window.MessagesSystem && window.MessagesSystem.currentUser) {
            clearInterval(checkMessagesSystem);
            window.stickersSystem.initialize(window.MessagesSystem.currentUser);
            console.log('✅ StickersSystem conectado ao MessagesSystem');
        }
    }, 500);
    
    // Timeout de segurança
    setTimeout(() => {
        clearInterval(checkMessagesSystem);
    }, 10000);
});