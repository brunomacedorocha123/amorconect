// video-stickers.js - SISTEMA INTEGRADO DE VIDEO STICKERS
class VideoStickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.stickers = [];
        this.stickersSentToday = 0;
        this.maxStickersFree = 4;
        
        this.initialize();
    }

    async initialize() {
        try {
            // Aguardar MessagesSystem estar pronto
            await this.waitForMessagesSystem();
            
            const { data: { user } } = await this.supabase.auth.getUser();
            if (user) {
                this.currentUser = user;
                await this.loadUserStickersData();
                this.setupEventListeners();
                console.log('✅ Video Stickers System inicializado e integrado');
            }
        } catch (error) {
            console.error('Erro ao inicializar Video Stickers:', error);
        }
    }

    async waitForMessagesSystem() {
        return new Promise((resolve) => {
            const check = () => {
                if (window.MessagesSystem && window.MessagesSystem.currentUser) {
                    resolve();
                } else {
                    setTimeout(check, 100);
                }
            };
            check();
        });
    }

    async loadUserStickersData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await this.supabase
                .from('message_counters')
                .select('stickers_sent')
                .eq('user_id', this.currentUser.id)
                .eq('date', today)
                .single();

            if (data) {
                this.stickersSentToday = data.stickers_sent || 0;
            }
            this.updateStickerCounter();
            
        } catch (error) {
            console.error('Erro ao carregar dados de stickers:', error);
        }
    }

    setupEventListeners() {
        const stickersBtn = document.getElementById('stickersBtn');
        if (stickersBtn) {
            stickersBtn.addEventListener('click', () => this.openStickersModal());
        }

        document.addEventListener('click', (e) => {
            const modal = document.getElementById('stickersModal');
            if (modal && e.target === modal) {
                this.closeStickersModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeStickersModal();
            }
        });
    }

    async openStickersModal() {
        // ⭐⭐ USAR O MESSAGESSYSTEM PARA VERIFICAR CONVERSA
        if (!window.MessagesSystem || !window.MessagesSystem.currentConversation) {
            this.showNotification('Selecione uma conversa primeiro', 'error');
            return;
        }

        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'flex';
            await this.loadStickers();
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
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Carregando stickers...</p>
                </div>
            `;

            const { data: stickers, error } = await this.supabase
                .from('stickers')
                .select('*')
                .eq('is_active', true)
                .order('display_name');

            if (error) throw error;

            this.stickers = stickers || [];

            if (this.stickers.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-film"></i>
                        <h3>Nenhum sticker disponível</h3>
                        <p>Em breve teremos novidades!</p>
                    </div>
                `;
                return;
            }

            container.innerHTML = this.stickers.map(sticker => `
                <div class="sticker-item" onclick="videoStickersSystem.selectSticker('${sticker.name}', '${sticker.display_name}')">
                    <div class="sticker-video">
                        <video width="80" height="80" loop muted playsinline preload="metadata">
                            <source src="assets/stickers/${sticker.name}.mp4" type="video/mp4">
                            Seu navegador não suporta vídeos.
                        </video>
                        <div class="sticker-overlay">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    <div class="sticker-name">${sticker.display_name}</div>
                </div>
            `).join('');

            this.setupVideoHover();

        } catch (error) {
            console.error('Erro ao carregar stickers:', error);
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar</h3>
                    <p>Tente novamente mais tarde.</p>
                </div>
            `;
        }
    }

    setupVideoHover() {
        document.querySelectorAll('.sticker-item').forEach(item => {
            const video = item.querySelector('video');
            
            item.addEventListener('mouseenter', () => {
                video.play().catch(e => console.log('Erro ao reproduzir vídeo:', e));
            });
            
            item.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });

            video.load();
        });
    }

    async selectSticker(stickerName, displayName) {
        try {
            // ⭐⭐ VERIFICAR SE PODE ENVIAR (USANDO MESSAGESSYSTEM)
            if (!await this.canSendSticker()) {
                return;
            }

            // ⭐⭐ VERIFICAR CONVERSA ATIVA NO MESSAGESSYSTEM
            if (!window.MessagesSystem || !window.MessagesSystem.currentConversation) {
                this.showNotification('Selecione uma conversa primeiro', 'error');
                return;
            }

            // CRIAR MENSAGEM DE STICKER
            const stickerMessage = {
                type: 'sticker',
                sticker_name: stickerName,
                sticker_display_name: displayName,
                content: `Enviou um sticker: ${displayName}`,
                timestamp: new Date().toISOString()
            };

            // ⭐⭐ ENVIAR VIA MESSAGESSYSTEM
            await this.sendStickerViaMessagesSystem(stickerMessage);

            // Atualizar contador
            await this.incrementStickerCounter();

            this.closeStickersModal();
            this.showNotification(`Sticker "${displayName}" enviado!`, 'success');

        } catch (error) {
            console.error('Erro ao enviar sticker:', error);
            this.showNotification('Erro ao enviar sticker', 'error');
        }
    }

    async sendStickerViaMessagesSystem(stickerMessage) {
        // ⭐⭐ INTEGRAÇÃO DIRETA COM MESSAGESSYSTEM
        const messageInput = document.getElementById('messageInput');
        if (messageInput && window.MessagesSystem.sendMessage) {
            // Formatar mensagem especial para stickers
            const formattedMessage = `[STICKER]${JSON.stringify(stickerMessage)}[/STICKER]`;
            messageInput.value = formattedMessage;
            
            // Usar o sistema de envio do MessagesSystem
            await window.MessagesSystem.sendMessage();
        } else {
            throw new Error('Sistema de mensagens não disponível');
        }
    }

    async canSendSticker() {
        // ⭐⭐ USAR MESMA LÓGICA DO MESSAGESSYSTEM PARA VERIFICAR PREMIUM
        let isPremium = false;
        if (window.MessagesSystem.currentUser?.profile?.is_premium) {
            isPremium = window.MessagesSystem.currentUser.profile.is_premium;
        }
        
        if (isPremium) {
            return true;
        }

        // Verificar limite free
        if (this.stickersSentToday >= this.maxStickersFree) {
            this.showNotification(`Limite de stickers atingido! Free: ${this.maxStickersFree}/dia | Premium: Ilimitado`, 'error');
            return false;
        }

        return true;
    }

    async incrementStickerCounter() {
        try {
            const today = new Date().toISOString().split('T')[0];
            this.stickersSentToday++;

            const { error } = await this.supabase
                .from('message_counters')
                .upsert({
                    user_id: this.currentUser.id,
                    date: today,
                    stickers_sent: this.stickersSentToday,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;

            this.updateStickerCounter();

        } catch (error) {
            console.error('Erro ao atualizar contador de stickers:', error);
        }
    }

    updateStickerCounter() {
        const counter = document.getElementById('stickerCounter');
        if (!counter) return;

        const counterNumber = counter.querySelector('.counter-number');
        if (counterNumber) {
            counterNumber.textContent = `${this.stickersSentToday}/${this.maxStickersFree}`;
            
            if (this.stickersSentToday >= this.maxStickersFree) {
                counter.classList.add('premium');
            } else {
                counter.classList.remove('premium');
            }
        }
    }

    showNotification(message, type = 'info') {
        if (window.MessagesSystem && window.MessagesSystem.showNotification) {
            window.MessagesSystem.showNotification(message, type);
        } else if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // ⭐⭐ MÉTODO PARA RENDERIZAR STICKER NO CHAT
    static renderStickerMessage(messageData, isOwnMessage = false) {
        if (!messageData.sticker_name) return '';

        const sticker = messageData.sticker_name;
        const displayName = messageData.sticker_display_name || 'Sticker';

        return `
            <div class="message ${isOwnMessage ? 'own' : 'other'} sticker-message">
                <div class="message-sticker">
                    <video width="120" height="120" loop muted playsinline autoplay>
                        <source src="assets/stickers/${sticker}.mp4" type="video/mp4">
                    </video>
                    <div class="sticker-caption">${displayName}</div>
                </div>
                <div class="message-time">${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                ${isOwnMessage ? `
                    <div class="message-status">
                        <i class="fas fa-check status-sent"></i>
                        Enviada
                    </div>
                ` : ''}
            </div>
        `;
    }
}

// Inicializar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.videoStickersSystem = new VideoStickersSystem();
});

// Manter compatibilidade com funções globais existentes
window.openStickersModal = () => window.videoStickersSystem?.openStickersModal();
window.closeStickersModal = () => window.videoStickersSystem?.closeStickersModal();