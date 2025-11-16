// stickers.js - Sistema completo de stickers
class StickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.currentConversation = null;
        this.stickers = [
            { name: 'videoanel', display_name: 'Anel', category: 'amor' },
            { name: 'videoboanoite', display_name: 'Boa Noite', category: 'cumprimentos' },
            { name: 'videobolo', display_name: 'Bolo', category: 'comida' },
            { name: 'videobomdia', display_name: 'Bom Dia', category: 'cumprimentos' },
            { name: 'videocachorinho', display_name: 'Cachorrinho', category: 'animais' },
            { name: 'videocafe', display_name: 'Café', category: 'comida' },
            { name: 'videocarta', display_name: 'Carta', category: 'amor' },
            { name: 'videocoracao', display_name: 'Coração', category: 'amor' },
            { name: 'videocoroa', display_name: 'Coroa', category: 'elogios' },
            { name: 'videodrink', display_name: 'Drink', category: 'comida' },
            { name: 'videogatinha', display_name: 'Gatinha', category: 'animais' },
            { name: 'videoostra1', display_name: 'Ostra', category: 'comida' },
            { name: 'videoperfume1', display_name: 'Perfume', category: 'presentes' },
            { name: 'videorosa1', display_name: 'Rosa', category: 'amor' },
            { name: 'videosorvete1', display_name: 'Sorvete', category: 'comida' },
            { name: 'videotacas1', display_name: 'Taças', category: 'celebração' },
            { name: 'videourso', display_name: 'Urso', category: 'animais' }
        ];
        
        this.categories = [
            { id: 'all', name: 'Todos', icon: 'fas fa-star' },
            { id: 'amor', name: 'Amor', icon: 'fas fa-heart' },
            { id: 'cumprimentos', name: 'Saudações', icon: 'fas fa-hand' },
            { id: 'comida', name: 'Comida', icon: 'fas fa-utensils' },
            { id: 'animais', name: 'Animais', icon: 'fas fa-paw' },
            { id: 'elogios', name: 'Elogios', icon: 'fas fa-crown' },
            { id: 'presentes', name: 'Presentes', icon: 'fas fa-gift' },
            { id: 'celebração', name: 'Celebração', icon: 'fas fa-champagne-glasses' }
        ];
        
        this.currentCategory = 'all';
        this.storageBaseUrl = 'https://rohsbrkbdlbewonibclf.supabase.co/storage/v1/object/public/stickers/';
        this.isInitialized = false;
    }

    async initialize(currentUser) {
        this.currentUser = currentUser;
        this.isInitialized = true;
        
        this.setupStickersModal();
        this.setupEventListeners();
        
        console.log('✅ Sistema de Stickers inicializado');
    }

    getStickerUrl(stickerName) {
        return `${this.storageBaseUrl}${stickerName}.mp4`;
    }

    setupStickersModal() {
        // Criar modal de stickers se não existir
        if (!document.getElementById('stickersModal')) {
            this.createStickersModal();
        } else {
            // Se já existe, apenas configurar os eventos
            this.setupCategoryFilters();
            this.setupStickerClickEvents();
        }
    }

    createStickersModal() {
        const modalHTML = `
            <div id="stickersModal" class="modal">
                <div class="modal-content stickers-modal">
                    <div class="modal-header">
                        <h3><i class="fas fa-smile"></i> Stickers</h3>
                        <button class="modal-close" onclick="StickersSystem.closeModal()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <!-- Categorias -->
                    <div class="stickers-categories" id="stickersCategories">
                        ${this.categories.map(cat => `
                            <button class="category-btn ${cat.id === 'all' ? 'active' : ''}" 
                                    data-category="${cat.id}">
                                <i class="${cat.icon}"></i>
                                <span>${cat.name}</span>
                            </button>
                        `).join('')}
                    </div>
                    
                    <div class="modal-body">
                        <div class="stickers-grid" id="stickersGrid">
                            ${this.renderStickersGrid()}
                        </div>
                    </div>
                    
                    <div class="modal-footer">
                        <div class="sticker-info">
                            <i class="fas fa-info-circle"></i>
                            <span>Stickers contam como mensagem no seu limite diário</span>
                        </div>
                        <button class="btn btn-outline" onclick="StickersSystem.closeModal()">Fechar</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        this.setupCategoryFilters();
        this.setupStickerClickEvents();
    }

    renderStickersGrid() {
        const filteredStickers = this.currentCategory === 'all' 
            ? this.stickers 
            : this.stickers.filter(sticker => sticker.category === this.currentCategory);
        
        if (filteredStickers.length === 0) {
            return `
                <div class="stickers-empty">
                    <i class="fas fa-smile-beam"></i>
                    <h3>Nenhum sticker encontrado</h3>
                    <p>Tente outra categoria</p>
                </div>
            `;
        }

        return filteredStickers.map(sticker => `
            <div class="sticker-item" data-sticker="${sticker.name}">
                <div class="sticker-video-container">
                    <video width="80" height="80" loop muted playsinline preload="metadata">
                        <source src="${this.getStickerUrl(sticker.name)}" type="video/mp4">
                    </video>
                    <div class="sticker-overlay">
                        <i class="fas fa-paper-plane"></i>
                    </div>
                </div>
                <span class="sticker-name">${sticker.display_name}</span>
            </div>
        `).join('');
    }

    setupCategoryFilters() {
        const categoryBtns = document.querySelectorAll('.category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.currentCategory = btn.dataset.category;
                this.updateStickersGrid();
            });
        });
    }

    updateStickersGrid() {
        const grid = document.getElementById('stickersGrid');
        if (grid) {
            grid.innerHTML = this.renderStickersGrid();
            this.setupStickerClickEvents();
            this.playStickerVideos();
        }
    }

    setupStickerClickEvents() {
        const stickerItems = document.querySelectorAll('.sticker-item');
        stickerItems.forEach(item => {
            item.addEventListener('click', () => {
                const stickerName = item.getAttribute('data-sticker');
                this.sendSticker(stickerName);
            });
        });
    }

    setupEventListeners() {
        // Botão de stickers na área de mensagem
        const stickerBtn = document.getElementById('stickerBtn');
        if (stickerBtn) {
            stickerBtn.addEventListener('click', () => this.openModal());
        }

        // Fechar modal com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });

        // Fechar modal clicando fora
        document.addEventListener('click', (e) => {
            const modal = document.getElementById('stickersModal');
            if (modal && e.target === modal) {
                this.closeModal();
            }
        });
    }

    openModal() {
        if (!this.isInitialized) {
            this.showNotification('Sistema de stickers não inicializado', 'error');
            return;
        }

        if (!window.MessagesSystem || !window.MessagesSystem.currentConversation) {
            this.showNotification('Selecione uma conversa primeiro', 'error');
            return;
        }

        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'flex';
            this.playStickerVideos();
            
            // Animar entrada
            setTimeout(() => {
                const modalContent = modal.querySelector('.modal-content');
                if (modalContent) {
                    modalContent.style.transform = 'scale(1)';
                    modalContent.style.opacity = '1';
                }
            }, 10);
        }
    }

    closeModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            // Animar saída
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.transform = 'scale(0.9)';
                modalContent.style.opacity = '0';
            }
            
            setTimeout(() => {
                modal.style.display = 'none';
                
                // Pausar todos os vídeos
                const videos = modal.querySelectorAll('video');
                videos.forEach(video => {
                    video.pause();
                    video.currentTime = 0;
                });
            }, 300);
        }
    }

    isModalOpen() {
        const modal = document.getElementById('stickersModal');
        return modal && modal.style.display === 'flex';
    }

    playStickerVideos() {
        const videos = document.querySelectorAll('#stickersModal video');
        videos.forEach(video => {
            video.play().catch(e => {
                // Autoplay pode ser bloqueado, normal
                console.log('Autoplay bloqueado para:', video.src);
            });
        });
    }

    async sendSticker(stickerName) {
        if (!this.currentUser || !window.MessagesSystem) {
            this.showNotification('Erro: usuário não autenticado', 'error');
            return;
        }

        const currentConversation = window.MessagesSystem.currentConversation;
        if (!currentConversation) {
            this.showNotification('Selecione uma conversa primeiro', 'error');
            return;
        }

        try {
            // Verificar limite de mensagens para usuários free
            let isPremium = false;
            if (window.PremiumManager && typeof window.PremiumManager.checkPremiumStatus === 'function') {
                isPremium = await PremiumManager.checkPremiumStatus();
            } else if (window.MessagesSystem.currentUser?.profile?.is_premium) {
                isPremium = window.MessagesSystem.currentUser.profile.is_premium;
            }

            if (!isPremium) {
                const canSend = await this.checkCanSendSticker();
                if (!canSend.canSend) {
                    this.handleSendError(canSend.reason);
                    return;
                }
            }

            this.showSendingState(true);

            // Enviar sticker via RPC
            const { data, error } = await this.supabase
                .rpc('send_sticker_message', {
                    p_sender_id: this.currentUser.id,
                    p_receiver_id: currentConversation,
                    p_sticker_name: stickerName
                });

            if (error) throw error;

            if (data === 'success') {
                this.showNotification('Sticker enviado! 💫', 'success');
                this.closeModal();
                
                // Atualizar interface
                await this.refreshConversation();
                
            } else {
                throw new Error(data);
            }

        } catch (error) {
            console.error('Erro ao enviar sticker:', error);
            
            // Fallback: enviar como mensagem normal
            const fallbackSuccess = await this.sendStickerFallback(stickerName, currentConversation);
            if (!fallbackSuccess) {
                this.showNotification('Erro ao enviar sticker', 'error');
            }
        } finally {
            this.showSendingState(false);
        }
    }

    async checkCanSendSticker() {
        try {
            // Usar a mesma lógica de verificação do sistema de mensagens
            if (window.MessagesSystem && typeof window.MessagesSystem.checkCanSendMessage === 'function') {
                return await window.MessagesSystem.checkCanSendMessage();
            }

            // Fallback: verificação básica
            const { data: limits, error } = await this.supabase
                .from('user_message_limits')
                .select('messages_sent_today')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) return { canSend: true, reason: null };

            const sentToday = limits?.messages_sent_today || 0;
            const messageLimit = window.MessagesSystem?.messageLimit || 4;

            if (sentToday >= messageLimit) {
                return { canSend: false, reason: 'limit_reached' };
            }

            return { canSend: true, reason: null };

        } catch (error) {
            return { canSend: true, reason: null };
        }
    }

    async sendStickerFallback(stickerName, receiverId) {
        try {
            const { data, error } = await this.supabase
                .from('messages')
                .insert({
                    sender_id: this.currentUser.id,
                    receiver_id: receiverId,
                    message: `[STICKER:${stickerName}]`,
                    sent_at: new Date().toISOString(),
                    is_sticker: true,
                    sticker_name: stickerName
                })
                .select();

            if (error) throw error;

            if (data) {
                this.showNotification('Sticker enviado! 💫', 'success');
                this.closeModal();
                await this.refreshConversation();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Erro no fallback do sticker:', error);
            return false;
        }
    }

    async refreshConversation() {
        if (window.MessagesSystem) {
            // Recarregar mensagens da conversa atual
            if (window.MessagesSystem.currentConversation) {
                await window.MessagesSystem.loadConversationMessages(window.MessagesSystem.currentConversation);
            }
            
            // Recarregar lista de conversas
            await window.MessagesSystem.loadConversations();
            
            // Atualizar contador
            window.MessagesSystem.updateMessageCounter();
        }
    }

    handleSendError(reason) {
        switch (reason) {
            case 'limit_reached':
                this.showNotification('Limite diário de 4 mensagens atingido! 🚫\nVolte amanhã ou assine o Premium.', 'error');
                break;
            case 'blocked':
                this.showNotification('Não é possível enviar sticker para este usuário.', 'error');
                break;
            case 'sticker_not_found':
                this.showNotification('Sticker não encontrado.', 'error');
                break;
            default:
                this.showNotification('Erro ao enviar sticker. Tente novamente.', 'error');
        }
    }

    showSendingState(isSending) {
        const modal = document.getElementById('stickersModal');
        if (!modal) return;

        const sendButtons = modal.querySelectorAll('.sticker-item');

        if (isSending) {
            modal.classList.add('sending');
            sendButtons.forEach(btn => {
                btn.style.pointerEvents = 'none';
                btn.style.opacity = '0.6';
            });
        } else {
            modal.classList.remove('sending');
            sendButtons.forEach(btn => {
                btn.style.pointerEvents = 'auto';
                btn.style.opacity = '1';
            });
        }
    }

    renderStickerMessage(stickerName) {
        const sticker = this.stickers.find(s => s.name === stickerName);
        if (!sticker) return '';

        return `
            <div class="message-sticker">
                <video width="120" height="120" loop muted playsinline autoplay>
                    <source src="${this.getStickerUrl(stickerName)}" type="video/mp4">
                    Seu navegador não suporta vídeos.
                </video>
                <div class="sticker-caption">${sticker.display_name}</div>
            </div>
        `;
    }

    // Método para ser chamado pelo sistema de mensagens ao renderizar
    processStickerMessage(message) {
        if (message.is_sticker || message.message?.startsWith('[STICKER:')) {
            const stickerMatch = message.message?.match(/\[STICKER:(.*?)\]/);
            const stickerName = message.sticker_name || (stickerMatch ? stickerMatch[1] : null);
            
            if (stickerName) {
                return {
                    ...message,
                    is_sticker: true,
                    sticker_name: stickerName,
                    sticker_html: this.renderStickerMessage(stickerName)
                };
            }
        }
        return message;
    }

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
                z-index: 1000;
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

    // Para integração com o sistema principal
    setCurrentConversation(conversationId) {
        this.currentConversation = conversationId;
    }
}

// ==================== INICIALIZAÇÃO GLOBAL ====================

// Criar instância global
window.StickersSystem = new StickersSystem();

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar o sistema de mensagens inicializar
    const initStickersSystem = () => {
        if (window.MessagesSystem && window.MessagesSystem.currentUser) {
            window.StickersSystem.initialize(window.MessagesSystem.currentUser);
            
            // Sincronizar conversa selecionada
            if (window.MessagesSystem.currentConversation) {
                window.StickersSystem.setCurrentConversation(window.MessagesSystem.currentConversation);
            }
            
        } else {
            setTimeout(initStickersSystem, 500);
        }
    };

    setTimeout(initStickersSystem, 1000);
});

// Funções globais para acesso via HTML
window.openStickersModal = function() {
    if (window.StickersSystem) {
        window.StickersSystem.openModal();
    }
};

window.closeStickersModal = function() {
    if (window.StickersSystem) {
        window.StickersSystem.closeModal();
    }
};

window.sendSticker = function(stickerName) {
    if (window.StickersSystem) {
        window.StickersSystem.sendSticker(stickerName);
    }
};