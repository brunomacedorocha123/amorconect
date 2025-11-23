// video-stickers.js - VERSÃO FUNCIONAL
class VideoStickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.stickersSentToday = 0;
        this.maxStickersFree = 4;
        
        this.initialize();
    }

    async initialize() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (user) {
                this.currentUser = user;
                await this.loadUserStickersData();
                this.setupEventListeners();
            }
        } catch (error) {
            console.error('Erro:', error);
        }
    }

    async loadUserStickersData() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await this.supabase
                .from('user_message_limits')
                .select('stickers_sent_today')
                .eq('user_id', this.currentUser.id)
                .eq('data_date', today)
                .single();

            if (data) {
                this.stickersSentToday = data.stickers_sent_today || 0;
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
            // Carregar stickers do banco
            const { data: stickers, error } = await this.supabase
                .from('stickers')
                .select('*')
                .eq('is_active', true)
                .order('display_name');

            if (error) throw error;

            const stickersList = stickers || [];

            if (stickersList.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-film"></i>
                        <h3>Nenhum sticker disponível</h3>
                        <p>Em breve teremos novidades!</p>
                    </div>
                `;
                return;
            }

            // ⭐⭐ RENDERIZAÇÃO CORRETA - VÍDEOS FUNCIONAIS
            container.innerHTML = stickersList.map(sticker => `
                <div class="sticker-item" onclick="videoStickersSystem.selectSticker('${sticker.name}', '${sticker.display_name}')">
                    <div class="sticker-video">
                        <video 
                            width="80" 
                            height="80" 
                            loop 
                            muted 
                            playsinline
                            preload="auto"
                            style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; display: block;"
                        >
                            <source src="${sticker.name}.mp4" type="video/mp4">
                        </video>
                        <div class="sticker-overlay">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    <div class="sticker-name">${sticker.display_name}</div>
                </div>
            `).join('');

            // Configurar interações
            this.setupVideoInteractions();

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

    setupVideoInteractions() {
        document.querySelectorAll('.sticker-item').forEach(item => {
            const video = item.querySelector('video');
            const overlay = item.querySelector('.sticker-overlay');
            
            if (!video) return;

            // Quando vídeo carrega, esconde overlay
            video.addEventListener('loadeddata', () => {
                if (overlay) overlay.style.display = 'none';
            });

            // Hover - Play
            item.addEventListener('mouseenter', () => {
                if (video.readyState >= 2) {
                    video.currentTime = 0;
                    video.play().catch(e => {
                        // Se não conseguir play, mostra overlay
                        if (overlay) overlay.style.display = 'flex';
                    });
                }
            });

            // Mouse leave - Pause
            item.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
                // Mostra overlay novamente
                if (overlay) overlay.style.display = 'flex';
            });

            // Carregar vídeo
            video.load();
        });
    }

    async selectSticker(stickerName, displayName) {
        try {
            if (!await this.canSendSticker()) {
                return;
            }

            if (!window.MessagesSystem || !window.MessagesSystem.currentConversation) {
                this.showNotification('Selecione uma conversa primeiro', 'error');
                return;
            }

            // Criar mensagem de sticker
            const stickerMessage = {
                type: 'sticker',
                sticker_name: stickerName,
                sticker_display_name: displayName,
                content: `Enviou um sticker: ${displayName}`,
                timestamp: new Date().toISOString()
            };

            // Enviar via sistema de mensagens
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
        const messageInput = document.getElementById('messageInput');
        if (messageInput && window.MessagesSystem && window.MessagesSystem.sendMessage) {
            const formattedMessage = `[STICKER]${JSON.stringify(stickerMessage)}[/STICKER]`;
            messageInput.value = formattedMessage;
            await window.MessagesSystem.sendMessage();
        } else {
            throw new Error('Sistema de mensagens não disponível');
        }
    }

    async canSendSticker() {
        let isPremium = false;
        if (window.MessagesSystem && window.MessagesSystem.currentUser?.profile?.is_premium) {
            isPremium = window.MessagesSystem.currentUser.profile.is_premium;
        }
        
        if (isPremium) return true;

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
                .from('user_message_limits')
                .upsert({
                    user_id: this.currentUser.id,
                    data_date: today,
                    stickers_sent_today: this.stickersSentToday,
                    updated_at: new Date().toISOString()
                }, {
                    onConflict: 'user_id, data_date'
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
            alert(message);
        }
    }

    // Render no chat
    static renderStickerMessage(messageData, isOwnMessage = false) {
        if (!messageData.sticker_name) return '';

        const sticker = messageData.sticker_name;
        const displayName = messageData.sticker_display_name;

        return `
            <div class="message ${isOwnMessage ? 'own' : 'other'} sticker-message">
                <div class="message-sticker">
                    <video 
                        width="120" 
                        height="120" 
                        loop 
                        muted 
                        playsinline 
                        autoplay
                        style="width: 120px; height: 120px; object-fit: cover; border-radius: 16px; display: block;"
                    >
                        <source src="${sticker}.mp4" type="video/mp4">
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

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    window.videoStickersSystem = new VideoStickersSystem();
});

window.openStickersModal = () => window.videoStickersSystem?.openStickersModal();
window.closeStickersModal = () => window.videoStickersSystem?.closeStickersModal();