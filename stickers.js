// stickers.js - SISTEMA 100% FUNCIONAL E COMPLETO
class StickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.currentConversation = null;
        this.isInitialized = false;
        this.storageBaseUrl = 'https://rohsbrkbdlbewonibclf.supabase.co/storage/v1/object/public/stickers/';
        
        // Lista completa de stickers
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
    }

    async initialize(currentUser) {
        this.currentUser = currentUser;
        this.isInitialized = true;
        
        console.log('🎯 Inicializando Sistema de Stickers...');
        console.log('👤 Usuário:', this.currentUser.id);
        
        // Configurar TODOS os eventos
        this.setupEventListeners();
        this.setupStickerModal();
        
        console.log('✅ Sistema de Stickers INICIALIZADO com sucesso!');
    }

    setupStickerModal() {
        console.log('🔧 Configurando modal de stickers...');
        
        // Remover modal existente se houver
        const existingModal = document.getElementById('stickersModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Criar modal COMPLETO
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
                        <button class="category-btn active" data-category="all">
                            <i class="fas fa-star"></i>
                            <span>Todos</span>
                        </button>
                        <button class="category-btn" data-category="amor">
                            <i class="fas fa-heart"></i>
                            <span>Amor</span>
                        </button>
                        <button class="category-btn" data-category="cumprimentos">
                            <i class="fas fa-hand"></i>
                            <span>Saudações</span>
                        </button>
                        <button class="category-btn" data-category="comida">
                            <i class="fas fa-utensils"></i>
                            <span>Comida</span>
                        </button>
                        <button class="category-btn" data-category="animais">
                            <i class="fas fa-paw"></i>
                            <span>Animais</span>
                        </button>
                        <button class="category-btn" data-category="elogios">
                            <i class="fas fa-crown"></i>
                            <span>Elogios</span>
                        </button>
                        <button class="category-btn" data-category="presentes">
                            <i class="fas fa-gift"></i>
                            <span>Presentes</span>
                        </button>
                        <button class="category-btn" data-category="celebração">
                            <i class="fas fa-champagne-glasses"></i>
                            <span>Celebração</span>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <div class="stickers-grid" id="stickersGrid">
                            ${this.generateStickersHTML()}
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
        
        // Configurar eventos do modal
        this.setupCategoryFilters();
        this.setupStickerClickEvents();
        
        console.log('✅ Modal de stickers criado e configurado!');
    }

    generateStickersHTML() {
        console.log('🎨 Gerando HTML dos stickers...');
        
        return this.stickers.map(sticker => {
            const videoUrl = `${this.storageBaseUrl}${sticker.name}.mp4`;
            console.log(`📹 Sticker: ${sticker.name} -> ${videoUrl}`);
            
            return `
                <div class="sticker-item" data-sticker="${sticker.name}" data-category="${sticker.category}">
                    <div class="sticker-video-container">
                        <video width="80" height="80" loop muted playsinline preload="metadata">
                            <source src="${videoUrl}" type="video/mp4">
                            Seu navegador não suporta vídeo.
                        </video>
                        <div class="sticker-overlay">
                            <i class="fas fa-paper-plane"></i>
                        </div>
                    </div>
                    <span class="sticker-name">${sticker.display_name}</span>
                </div>
            `;
        }).join('');
    }

    setupCategoryFilters() {
        const categoryBtns = document.querySelectorAll('.category-btn');
        console.log(`🔧 Configurando ${categoryBtns.length} categorias...`);
        
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Remover active de todos
                categoryBtns.forEach(b => b.classList.remove('active'));
                // Adicionar active no clicado
                btn.classList.add('active');
                
                const category = btn.dataset.category;
                console.log(`🎯 Categoria selecionada: ${category}`);
                this.filterStickersByCategory(category);
            });
        });
    }

    filterStickersByCategory(category) {
        const allStickers = document.querySelectorAll('.sticker-item');
        console.log(`🔍 Filtrando ${allStickers.length} stickers por categoria: ${category}`);
        
        let visibleCount = 0;
        allStickers.forEach(sticker => {
            const stickerCategory = sticker.dataset.category;
            
            if (category === 'all' || stickerCategory === category) {
                sticker.style.display = 'flex';
                visibleCount++;
            } else {
                sticker.style.display = 'none';
            }
        });
        
        console.log(`👀 ${visibleCount} stickers visíveis`);
    }

    setupStickerClickEvents() {
        const stickerItems = document.querySelectorAll('.sticker-item');
        console.log(`🔧 Configurando eventos para ${stickerItems.length} stickers...`);
        
        stickerItems.forEach(item => {
            item.addEventListener('click', () => {
                const stickerName = item.getAttribute('data-sticker');
                console.log(`🎯 Clicou no sticker: ${stickerName}`);
                this.sendSticker(stickerName);
            });
        });
    }

    setupEventListeners() {
        // Botão de stickers na área de mensagem
        const stickerBtn = document.getElementById('stickerBtn');
        if (stickerBtn) {
            console.log('🔧 Configurando botão de stickers...');
            stickerBtn.addEventListener('click', () => this.openModal());
        } else {
            console.log('❌ Botão de stickers não encontrado!');
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
        console.log('🎯 Abrindo modal de stickers...');
        
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
            console.log('✅ Modal encontrado, exibindo...');
            modal.style.display = 'flex';
            this.playStickerVideos();
        } else {
            console.log('❌ Modal não encontrado!');
        }
    }

    closeModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'none';
            this.pauseStickerVideos();
        }
    }

    isModalOpen() {
        const modal = document.getElementById('stickersModal');
        return modal && modal.style.display === 'flex';
    }

    playStickerVideos() {
        const videos = document.querySelectorAll('#stickersModal video');
        console.log(`🎬 Tentando reproduzir ${videos.length} vídeos...`);
        
        let successCount = 0;
        let errorCount = 0;
        
        videos.forEach((video, index) => {
            video.play().then(() => {
                successCount++;
                console.log(`✅ Video ${index + 1} reproduzindo: ${video.src}`);
            }).catch(error => {
                errorCount++;
                console.log(`❌ Erro no video ${index + 1}:`, error.message, video.src);
                // Mostrar placeholder de erro
                this.showVideoError(video.parentElement);
            });
        });
        
        console.log(`📊 Resultado: ${successCount} sucessos, ${errorCount} erros`);
        
        if (errorCount > 0) {
            this.showNotification(`Alguns stickers não carregaram. Verifique o console.`, 'warning');
        }
    }

    showVideoError(container) {
        container.innerHTML = `
            <div class="video-error-placeholder">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Erro ao carregar</span>
            </div>
        `;
    }

    pauseStickerVideos() {
        const videos = document.querySelectorAll('#stickersModal video');
        videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
    }

    async sendSticker(stickerName) {
        console.log(`🚀 ENVIANDO STICKER: ${stickerName}`);
        
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
            this.showSendingState(true);

            // Verificar se pode enviar (limite diário)
            let isPremium = false;
            if (window.PremiumManager && typeof window.PremiumManager.checkPremiumStatus === 'function') {
                isPremium = await PremiumManager.checkPremiumStatus();
            }

            if (!isPremium) {
                const canSend = await window.MessagesSystem.checkCanSendMessage();
                if (!canSend.can_send) {
                    window.MessagesSystem.handleSendError(canSend.reason);
                    this.showSendingState(false);
                    return;
                }
            }

            // Enviar sticker via RPC
            const { data, error } = await this.supabase
                .rpc('send_sticker_message', {
                    p_sender_id: this.currentUser.id,
                    p_receiver_id: currentConversation,
                    p_sticker_name: stickerName
                });

            if (error) throw error;

            if (data === 'success') {
                this.showNotification('🎉 Sticker enviado com sucesso!', 'success');
                this.closeModal();
                
                // Atualizar interface
                await this.refreshConversation();
                
            } else {
                this.handleSendError(data);
            }

        } catch (error) {
            console.error('❌ Erro ao enviar sticker:', error);
            this.showNotification('❌ Erro ao enviar sticker', 'error');
            
            // Fallback: tentar enviar como mensagem normal
            try {
                await this.sendStickerFallback(stickerName, currentConversation);
            } catch (fallbackError) {
                console.error('❌ Erro no fallback:', fallbackError);
                this.showNotification('❌ Falha ao enviar sticker', 'error');
            }
        } finally {
            this.showSendingState(false);
        }
    }

    async sendStickerFallback(stickerName, receiverId) {
        console.log(`🔄 Usando fallback para sticker: ${stickerName}`);
        
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
            this.showNotification('🎉 Sticker enviado! (fallback)', 'success');
            this.closeModal();
            await this.refreshConversation();
            return true;
        }
        return false;
    }

    async refreshConversation() {
        if (window.MessagesSystem) {
            console.log('🔄 Atualizando conversa...');
            
            if (window.MessagesSystem.currentConversation) {
                await window.MessagesSystem.loadConversationMessages(window.MessagesSystem.currentConversation);
            }
            await window.MessagesSystem.loadConversations();
            window.MessagesSystem.updateMessageCounter();
        }
    }

    handleSendError(reason) {
        console.log(`❌ Erro no envio: ${reason}`);
        
        switch (reason) {
            case 'limit_reached':
                this.showNotification('🚫 Limite diário de 4 mensagens atingido! Volte amanhã.', 'error');
                break;
            case 'blocked':
                this.showNotification('🚫 Não é possível enviar sticker para este usuário.', 'error');
                break;
            case 'sticker_not_found':
                this.showNotification('❌ Sticker não encontrado no sistema.', 'error');
                break;
            default:
                this.showNotification(`❌ Erro: ${reason}`, 'error');
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
        console.log(`🎯 Conversa definida: ${conversationId}`);
    }
}

// ==================== INICIALIZAÇÃO GLOBAL ====================
window.StickersSystem = new StickersSystem();

// Inicializar quando o sistema de mensagens estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔰 DOM Carregado - Iniciando stickers...');
    
    const initStickersSystem = () => {
        if (window.MessagesSystem && window.MessagesSystem.currentUser) {
            console.log('👤 Usuário carregado, inicializando stickers...');
            window.StickersSystem.initialize(window.MessagesSystem.currentUser);
            
            if (window.MessagesSystem.currentConversation) {
                window.StickersSystem.setCurrentConversation(window.MessagesSystem.currentConversation);
            }
            
        } else {
            console.log('⏳ Aguardando MessagesSystem...');
            setTimeout(initStickersSystem, 500);
        }
    };
    
    setTimeout(initStickersSystem, 1000);
});

// Funções globais
window.openStickersModal = function() {
    if (window.StickersSystem) {
        window.StickersSystem.openModal();
    } else {
        console.log('❌ StickersSystem não disponível');
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