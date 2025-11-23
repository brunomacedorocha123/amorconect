// video-stickers.js - SISTEMA COMPLETO DE VIDEO STICKERS
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
            // Pausar todos os vídeos
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

            // ⭐⭐ RENDERIZAÇÃO CORRIGIDA - Vídeos funcionais
            container.innerHTML = this.stickers.map(sticker => `
                <div class="sticker-item" onclick="videoStickersSystem.selectSticker('${sticker.name}', '${sticker.display_name}')">
                    <div class="sticker-video">
                        <video 
                            width="80" 
                            height="80" 
                            loop 
                            muted 
                            playsinline 
                            preload="auto"
                            poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='10' fill='%23666'%3E${sticker.display_name}%3C/text%3E%3C/svg%3E"
                        >
                            <source src="assets/stickers/${sticker.name}.mp4" type="video/mp4">
                            Seu navegador não suporta vídeos HTML5.
                        </video>
                        <div class="sticker-overlay">
                            <i class="fas fa-play"></i>
                        </div>
                    </div>
                    <div class="sticker-name">${sticker.display_name}</div>
                </div>
            `).join('');

            // Configurar hover dos vídeos
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
            
            // Pré-carregar o vídeo
            video.load();
            
            item.addEventListener('mouseenter', () => {
                video.currentTime = 0;
                video.play().catch(e => {
                    console.log('Erro ao reproduzir vídeo:', e);
                    // Fallback: mostrar que é um vídeo
                    this.showVideoError(item);
                });
            });
            
            item.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
                this.hideVideoError(item);
            });

            // Configurar eventos do vídeo
            video.addEventListener('loadeddata', () => {
                console.log('✅ Vídeo carregado:', video.src);
            });
            
            video.addEventListener('error', (e) => {
                console.log('❌ Erro no vídeo:', video.src, e);
                this.showVideoError(item);
            });
        });
    }

    showVideoError(item) {
        const videoContainer = item.querySelector('.sticker-video');
        const video = item.querySelector('video');
        
        if (videoContainer && video) {
            video.style.display = 'none';
            const errorMsg = document.createElement('div');
            errorMsg.className = 'video-error';
            errorMsg.innerHTML = `
                <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #667eea, #764ba2); 
                            border-radius: 12px; display: flex; flex-direction: column; align-items: center; 
                            justify-content: center; color: white; font-size: 0.7rem; text-align: center; padding: 5px;">
                    <i class="fas fa-film" style="font-size: 1.2rem; margin-bottom: 5px;"></i>
                    <span>Vídeo</span>
                </div>
            `;
            videoContainer.appendChild(errorMsg);
        }
    }

    hideVideoError(item) {
        const videoContainer = item.querySelector('.sticker-video');
        const video = item.querySelector('video');
        const errorMsg = videoContainer.querySelector('.video-error');
        
        if (video) video.style.display = 'block';
        if (errorMsg) errorMsg.remove();
    }

    async selectSticker(stickerName, displayName) {
        try {
            // Verificar se usuário pode enviar sticker
            if (!await this.canSendSticker()) {
                return;
            }

            // Verificar se há conversa selecionada
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
        // Verificar se é premium
        let isPremium = false;
        if (window.MessagesSystem && window.MessagesSystem.currentUser?.profile?.is_premium) {
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
            // Fallback simples
            const notification = document.createElement('div');
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 8px;
                color: white;
                z-index: 10000;
                background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            `;
            notification.textContent = message;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
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
                    <video 
                        width="120" 
                        height="120" 
                        loop 
                        muted 
                        playsinline 
                        autoplay
                        poster="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect width='120' height='120' fill='%23f8f9fa'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial' font-size='12' fill='%23666'%3E${displayName}%3C/text%3E%3C/svg%3E"
                    >
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