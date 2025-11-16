// stickers.js - SISTEMA 100% CORRIGIDO
class StickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.currentConversation = null;
        this.lastSentSticker = null;
        this.stickers = [
            { name: 'videocoracao', display_name: 'Coração', category: 'amor' },
            { name: 'videobomdia', display_name: 'Bom Dia', category: 'cumprimentos' },
            { name: 'videobolo', display_name: 'Bolo', category: 'comida' },
            { name: 'videocachorinho', display_name: 'Cachorrinho', category: 'animais' }
        ];
    }

    initialize(user) {
        this.currentUser = user;
        console.log('✅ StickersSystem inicializado');
        this.setupStickerButton();
    }

    setupStickerButton() {
        const stickerBtn = document.getElementById('stickerBtn');
        if (stickerBtn) {
            stickerBtn.onclick = () => this.openModal();
        }
    }

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

    closeModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'none';
            this.pauseAllVideos();
        }
    }

    hasConversation() {
        if (window.MessagesSystem && window.MessagesSystem.currentConversation) {
            this.currentConversation = window.MessagesSystem.currentConversation;
            return true;
        }
        return false;
    }

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

    async sendSticker(stickerName) {
        if (!this.currentUser || !this.currentConversation) {
            this.showNotification('Erro: selecione uma conversa', 'error');
            return;
        }

        try {
            console.log(`🎯 Enviando sticker: ${stickerName}`);
            this.lastSentSticker = stickerName;

            // Verificar se pode enviar (limite diário)
            const canSend = await this.checkCanSendMessage();
            if (!canSend) {
                this.showNotification('🚫 Limite diário de 4 mensagens atingido! Volte amanhã.', 'error');
                return;
            }

            // Enviar via RPC
            const { data, error } = await this.supabase
                .rpc('send_sticker_message', {
                    p_sender_id: this.currentUser.id,
                    p_receiver_id: this.currentConversation,
                    p_sticker_name: stickerName
                });

            if (error) throw error;

            if (data === 'success') {
                this.showNotification('🎉 Sticker enviado!', 'success');
                this.closeModal();
                await this.refreshConversation();
                this.showStickerInChat(stickerName);
            } else {
                this.showNotification(`Erro: ${data}`, 'error');
            }

        } catch (error) {
            console.error('❌ Erro ao enviar sticker:', error);
            // Fallback
            await this.sendStickerFallback(stickerName);
        }
    }

    async sendStickerFallback(stickerName) {
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .insert({
                    sender_id: this.currentUser.id,
                    receiver_id: this.currentConversation,
                    message: '[STICKER]',
                    sent_at: new Date().toISOString(),
                    is_sticker: true,
                    sticker_name: stickerName
                });

            if (error) throw error;

            this.showNotification('🎉 Sticker enviado!', 'success');
            this.closeModal();
            await this.refreshConversation();
            this.showStickerInChat(stickerName);

        } catch (fallbackError) {
            this.showNotification('❌ Erro crítico ao enviar sticker', 'error');
        }
    }

    async checkCanSendMessage() {
        // Verificar se é premium
        if (window.PremiumManager && await PremiumManager.checkPremiumStatus()) {
            return true;
        }

        // Verificar limite para free
        try {
            const { data: limits, error } = await this.supabase
                .from('user_message_limits')
                .select('messages_sent_today')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) return true; // Em caso de erro, permitir

            return (limits?.messages_sent_today || 0) < 4;

        } catch (error) {
            return true; // Em caso de erro, permitir
        }
    }

    // 🎯 NOVA FUNÇÃO: MOSTRAR STICKER NO CHAT
    showStickerInChat(stickerName) {
        const container = document.getElementById('messagesHistory');
        if (!container) return;

        // Remover estado vazio se existir
        const emptyChat = container.querySelector('.empty-state, .empty-chat');
        if (emptyChat) {
            emptyChat.style.display = 'none';
        }

        // Criar elemento do sticker
        const stickerHTML = `
            <div class="message own sticker-message">
                <div class="message-sticker">
                    <video width="120" height="120" loop muted playsinline autoplay>
                        <source src="https://rohsbrkbdlbewonibclf.supabase.co/storage/v1/object/public/stickers/${stickerName}.mp4" type="video/mp4">
                    </video>
                    <div class="sticker-caption">${this.getStickerDisplayName(stickerName)}</div>
                </div>
                <div class="message-time">Agora</div>
                <div class="message-status">
                    <i class="fas fa-check status-sent"></i>
                    Enviada
                </div>
            </div>
        `;

        // Adicionar ao chat
        container.innerHTML += stickerHTML;
        this.scrollToBottom();
    }

    getStickerDisplayName(stickerName) {
        const sticker = this.stickers.find(s => s.name === stickerName);
        return sticker ? sticker.display_name : stickerName;
    }

    scrollToBottom() {
        const container = document.getElementById('messagesHistory');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    async refreshConversation() {
        if (window.MessagesSystem && this.currentConversation) {
            await window.MessagesSystem.loadConversationMessages(this.currentConversation);
            await window.MessagesSystem.loadConversations();
            window.MessagesSystem.updateMessageCounter();
        }
    }

    playAllVideos() {
        setTimeout(() => {
            const videos = document.querySelectorAll('#stickersModal video');
            videos.forEach(video => {
                video.play().catch(e => console.log('Video autoplay bloqueado'));
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

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// INICIALIZAÇÃO GLOBAL
window.stickersSystem = new StickersSystem();

// Inicializar quando o sistema estiver pronto
function initializeStickersSystem() {
    if (window.MessagesSystem && window.MessagesSystem.currentUser) {
        window.stickersSystem.initialize(window.MessagesSystem.currentUser);
    } else {
        setTimeout(initializeStickersSystem, 1000);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeStickersSystem, 2000);
});

// FUNÇÕES GLOBAIS PARA HTML
window.openStickersModal = () => window.stickersSystem.openModal();
window.closeStickersModal = () => window.stickersSystem.closeModal();
window.sendSticker = (stickerName) => window.stickersSystem.sendSticker(stickerName);