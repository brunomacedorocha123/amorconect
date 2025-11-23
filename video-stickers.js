// video-stickers.js - SISTEMA COMPLETO
class VideoStickersSystem {
    constructor() {
        this.supabase = supabase;
        this.currentUser = null;
        this.stickers = [];
        this.initialize();
    }

    async initialize() {
        await this.checkAuth();
        this.setupStickersButton();
        this.setupStickersModal();
    }

    async checkAuth() {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (user) this.currentUser = user;
    }

    setupStickersButton() {
        // Configurar evento no botão existente
        const stickersBtn = document.getElementById('stickersBtn');
        if (stickersBtn) {
            stickersBtn.onclick = () => this.openStickersModal();
        }
    }

    setupStickersModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeStickersModal();
            });
        }

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeStickersModal();
        });
    }

    async openStickersModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'flex';
            await this.loadStickers();
            this.updateStickerCounter();
        }
    }

    closeStickersModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'none';
            document.querySelectorAll('.sticker-video video').forEach(video => {
                video.pause();
                video.currentTime = 0;
            });
        }
    }

    async loadStickers() {
        const container = document.getElementById('stickersContainer');
        if (!container) return;

        try {
            const { data: stickers } = await this.supabase
                .from('stickers')
                .select('*')
                .eq('is_active', true)
                .order('created_at');

            this.stickers = stickers || this.getFallbackStickers();
            this.renderStickers();

        } catch (error) {
            this.stickers = this.getFallbackStickers();
            this.renderStickers();
        }
    }

    getFallbackStickers() {
        return [
            { id: '1', name: 'videoanel', display_name: 'Anel Brilhante' },
            { id: '2', name: 'videoboanoite', display_name: 'Boa Noite' },
            { id: '3', name: 'videobomdia', display_name: 'Bom Dia' },
            { id: '4', name: 'videobolo', display_name: 'Bolo' },
            { id: '5', name: 'videocachoeeinho', display_name: 'Carinho' },
            { id: '6', name: 'videocafe', display_name: 'Café' },
            { id: '7', name: 'videocarta1', display_name: 'Carta' },
            { id: '8', name: 'videocoracao', display_name: 'Coração' },
            { id: '9', name: 'videocoroa', display_name: 'Coroa' },
            { id: '10', name: 'videodrink', display_name: 'Drink' },
            { id: '11', name: 'videogatinha', display_name: 'Gatinha' },
            { id: '12', name: 'videoostra1', display_name: 'Ostra' },
            { id: '13', name: 'videoperfume', display_name: 'Perfume' },
            { id: '14', name: 'videosorvete', display_name: 'Sorvete' },
            { id: '15', name: 'videotacas', display_name: 'Taças' }
        ];
    }

    renderStickers() {
        const container = document.getElementById('stickersContainer');
        if (!container) return;

        if (this.stickers.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum sticker</div>';
            return;
        }

        container.innerHTML = this.stickers.map(sticker => `
            <div class="sticker-item" onclick="videoStickersSystem.selectSticker('${sticker.id}')">
                <div class="sticker-video">
                    <video width="80" height="80" loop muted playsinline>
                        <source src="${sticker.name}.mp4" type="video/mp4">
                    </video>
                </div>
                <div class="sticker-name">${sticker.display_name}</div>
            </div>
        `).join('');

        this.setupVideoHover();
    }

    setupVideoHover() {
        document.querySelectorAll('.sticker-item').forEach(item => {
            const video = item.querySelector('video');
            item.addEventListener('mouseenter', () => video.play());
            item.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });
        });
    }

    async selectSticker(stickerId) {
        const sticker = this.stickers.find(s => s.id === stickerId);
        if (!sticker) return;

        const canSend = await this.checkCanSendSticker();
        if (!canSend.can_send) {
            this.handleSendError(canSend.reason);
            return;
        }

        await this.sendSticker(sticker);
    }

    async checkCanSendSticker() {
        if (!window.MessagesSystem) return { can_send: true, reason: null };
        return await window.MessagesSystem.checkCanSendMessage();
    }

    async sendSticker(sticker) {
        if (!window.MessagesSystem || !window.MessagesSystem.currentConversation) {
            this.showNotification('Selecione uma conversa', 'error');
            return;
        }

        try {
            await this.supabase
                .from('messages')
                .insert({
                    sender_id: this.currentUser.id,
                    receiver_id: window.MessagesSystem.currentConversation,
                    message: `[STICKER:${sticker.name}]`,
                    is_sticker: true,
                    sticker_name: sticker.name,
                    sent_at: new Date().toISOString()
                });

            this.showNotification('Sticker enviado! 🎬', 'success');
            this.closeStickersModal();
            
            if (window.MessagesSystem.loadConversationMessages) {
                await window.MessagesSystem.loadConversationMessages(window.MessagesSystem.currentConversation);
            }
            this.updateStickerCounter();

        } catch (error) {
            this.showNotification('Erro ao enviar', 'error');
        }
    }

    updateStickerCounter() {
        const counter = document.getElementById('stickerCounter');
        const messageCounter = document.getElementById('messageCounter');
        if (counter && messageCounter) {
            counter.innerHTML = messageCounter.innerHTML.replace('Mensagens', 'Stickers');
        }
    }

    handleSendError(reason) {
        if (reason === 'limit_reached') {
            this.showNotification('Limite diário atingido!', 'error');
        }
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        }
    }
}

// Inicialização automática
let videoStickersSystem;
document.addEventListener('DOMContentLoaded', () => {
    videoStickersSystem = new VideoStickersSystem();
    window.videoStickersSystem = videoStickersSystem;
});