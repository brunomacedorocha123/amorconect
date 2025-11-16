// stickers.js - SISTEMA 100% FUNCIONAL
class StickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.currentConversation = null;
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
            <div class="sticker-item" onclick="stickersSystem.sendSticker('${sticker.name}')">
                <div class="sticker-video-container">
                    <video width="80" height="80" loop muted playsinline>
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

    async sendSticker(stickerName) {
        if (!this.currentUser || !this.currentConversation) {
            this.showNotification('Erro: selecione uma conversa', 'error');
            return;
        }

        try {
            console.log(`🎯 Enviando sticker: ${stickerName}`);

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
                this.refreshConversation();
            } else {
                this.showNotification(`Erro: ${data}`, 'error');
            }

        } catch (error) {
            console.error('❌ Erro ao enviar sticker:', error);
            this.showNotification('Erro ao enviar sticker', 'error');
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

    async refreshConversation() {
        if (window.MessagesSystem && this.currentConversation) {
            await window.MessagesSystem.loadConversationMessages(this.currentConversation);
            await window.MessagesSystem.loadConversations();
            window.MessagesSystem.updateMessageCounter();
        }
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

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.MessagesSystem && window.MessagesSystem.currentUser) {
            window.stickersSystem.initialize(window.MessagesSystem.currentUser);
        }
    }, 2000);
});

// FUNÇÕES GLOBAIS PARA HTML
window.openStickersModal = () => window.stickersSystem.openModal();
window.closeStickersModal = () => window.stickersSystem.closeModal();
window.sendSticker = (stickerName) => window.stickersSystem.sendSticker(stickerName);