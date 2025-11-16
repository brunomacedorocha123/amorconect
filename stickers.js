// stickers.js - Sistema completo de stickers
class StickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.currentConversation = null;
        this.stickers = [];
        this.storageBaseUrl = 'https://rohsbrkbdlbewonibclf.supabase.co/storage/v1/object/public/stickers/';
        this.isInitialized = false;
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
    }

    async initialize(currentUser) {
        this.currentUser = currentUser;
        this.isInitialized = true;
        
        await this.loadStickers();
        this.setupStickersModal();
        this.setupEventListeners();
        
        console.log('✅ Sistema de Stickers inicializado');
    }

    async loadStickers() {
        try {
            const { data: stickers, error } = await this.supabase
                .from('stickers')
                .select('*')
                .order('display_name');
            
            if (error) throw error;
            
            this.stickers = stickers || [];
            console.log(`📦 ${this.stickers.length} stickers carregados`);
            return this.stickers;
            
        } catch (error) {
            console.error('❌ Erro ao carregar stickers:', error);
            return [];
        }
    }

    getStickerUrl(stickerName) {
        return `${this.storageBaseUrl}${stickerName}.mp4`;
    }

    setupStickersModal() {
        if (!document.getElementById('stickersModal')) {
            this.createStickersModal();
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
        const stickerBtn = document.getElementById('stickerBtn');
        if (stickerBtn) {
            stickerBtn.addEventListener('click', () => this.openModal());
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });

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

        if (!this.currentConversation) {
            this.showNotification('Selecione uma conversa primeiro', 'error');
            return;
        }

        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'flex';
            this.playStickerVideos();
            
            setTimeout(() => {
                modal.querySelector('.modal-content').style.transform = 'scale(1)';
                modal.querySelector('.modal-content').style.opacity = '1';
            }, 10);
        }
    }

    closeModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.querySelector('.modal-content').style.transform = 'scale(0.9)';
            modal.querySelector('.modal-content').style.opacity = '0';
            
            setTimeout(() => {
                modal.style.display = 'none';
                this.pauseStickerVideos();
            }, 300);
        }
    }

    playStickerVideos() {
        const videos = document.querySelectorAll('#stickersModal video');
        videos.forEach(video => {
            video.play().catch(() => {
                // Autoplay bloqueado - normal
            });
        });
    }

    pauseStickerVideos() {
        const videos = document.querySelectorAll('#stickersModal video');
        videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
    }

    isModalOpen() {
        const modal = document.getElementById('stickersModal');
        return modal && modal.style.display === 'flex';
    }

    async sendSticker(stickerName) {
        if (!this.currentUser || !this.currentConversation) {
            this.showNotification('Selecione uma conversa primeiro', 'error');
            return;
        }

        try {
            this.showSendingState(true);

            const { data, error } = await this.supabase
                .rpc('send_sticker_message', {
                    p_sender_id: this.currentUser.id,
                    p_receiver_id: this.currentConversation,
                    p_sticker_name: stickerName
                });

            if (error) throw error;

            if (data === 'success') {
                this.showNotification('Sticker enviado! 💫', 'success');
                this.closeModal();
                await this.refreshConversation();
            } else {
                this.handleSendError(data);
            }

        } catch (error) {
            console.error('❌ Erro ao enviar sticker:', error);
            this.showNotification('Erro ao enviar sticker', 'error');
        } finally {
            this.showSendingState(false);
        }
    }

    handleSendError(reason) {
        switch (reason) {
            case 'limit_reached':
                this.showNotification('Limite diário de 4 mensagens atingido! 🚫\\nVolte amanhã ou assine o Premium.', 'error');
                break;
            case 'blocked':
                this.showNotification('Não é possível enviar sticker para este usuário', 'error');
                break;
            case 'sticker_not_found':
                this.showNotification('Sticker não encontrado', 'error');
                break;
            default:
                this.showNotification('Erro ao enviar sticker: ' + reason, 'error');
        }
    }

    showSendingState(isSending) {
        const modal = document.getElementById('stickersModal');
        if (!modal) return;

        const stickerItems = modal.querySelectorAll('.sticker-item');
        
        if (isSending) {
            modal.classList.add('sending');
            stickerItems.forEach(item => {
                item.style.pointerEvents = 'none';
                item.style.opacity = '0.6';
            });
        } else {
            modal.classList.remove('sending');
            stickerItems.forEach(item => {
                item.style.pointerEvents = 'auto';
                item.style.opacity = '1';
            });
        }
    }

    async refreshConversation() {
        if (window.MessagesSystem) {
            if (window.MessagesSystem.currentConversation) {
                await window.MessagesSystem.loadConversationMessages(window.MessagesSystem.currentConversation);
            }
            await window.MessagesSystem.loadConversations();
            window.MessagesSystem.updateMessageCounter();
        }
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

    // Processar mensagens de sticker no chat
    processStickerMessage(message) {
        if (message.is_sticker && message.sticker_name) {
            return {
                ...message,
                sticker_html: `
                    <div class="message-sticker">
                        <video width="120" height="120" loop muted playsinline autoplay>
                            <source src="${this.getStickerUrl(message.sticker_name)}" type="video/mp4">
                        </video>
                        <div class="sticker-caption">${this.getStickerDisplayName(message.sticker_name)}</div>
                    </div>
                `
            };
        }
        return message;
    }

    getStickerDisplayName(stickerName) {
        const sticker = this.stickers.find(s => s.name === stickerName);
        return sticker ? sticker.display_name : stickerName;
    }
}

// ==================== INICIALIZAÇÃO GLOBAL ====================
window.StickersSystem = new StickersSystem();

// Inicializar quando o sistema de mensagens estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    const initStickers = () => {
        if (window.MessagesSystem && window.MessagesSystem.currentUser) {
            window.StickersSystem.initialize(window.MessagesSystem.currentUser);
            
            // Sincronizar conversa selecionada
            if (window.MessagesSystem.currentConversation) {
                window.StickersSystem.setCurrentConversation(window.MessagesSystem.currentConversation);
            }
            
            // Monitorar mudanças de conversa
            const originalSelectConversation = window.MessagesSystem.selectConversation;
            window.MessagesSystem.selectConversation = async function(...args) {
                const result = await originalSelectConversation.apply(this, args);
                window.StickersSystem.setCurrentConversation(this.currentConversation);
                return result;
            };
            
        } else {
            setTimeout(initStickers, 500);
        }
    };
    
    setTimeout(initStickers, 1000);
});

// Funções globais para HTML
window.openStickersModal = function() {
    if (window.StickersSystem) window.StickersSystem.openModal();
};

window.closeStickersModal = function() {
    if (window.StickersSystem) window.StickersSystem.closeModal();
};

window.sendSticker = function(stickerName) {
    if (window.StickersSystem) window.StickersSystem.sendSticker(stickerName);
};