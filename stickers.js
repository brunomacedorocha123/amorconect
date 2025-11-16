// stickers.js - SISTEMA COMPLETO COM CORREÇÕES
class StickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.currentConversation = null;
        this.isInitialized = false;
        this.storageBaseUrl = 'https://rohsbrkbdlbewonibclf.supabase.co/storage/v1/object/public/stickers/';
        
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
        try {
            this.currentUser = currentUser;
            this.isInitialized = true;
            
            console.log('🎯 Sistema de Stickers inicializando...');
            
            this.setupStickersModal();
            this.setupStickerButton();
            
            console.log('✅ StickersSystem inicializado!');
            
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
        }
    }

    setupStickerButton() {
        const stickerBtn = document.getElementById('stickerBtn');
        if (!stickerBtn) {
            console.error('❌ Botão de stickers não encontrado!');
            return;
        }

        const newStickerBtn = stickerBtn.cloneNode(true);
        stickerBtn.parentNode.replaceChild(newStickerBtn, stickerBtn);

        newStickerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.openModal();
        });
    }

    setupStickersModal() {
        console.log('🔧 Configurando modal de stickers...');
        
        const modal = document.getElementById('stickersModal');
        if (!modal) {
            console.error('❌ Modal não encontrado!');
            return;
        }

        // Configurar eventos
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            };
        }

        const closeFooterBtn = modal.querySelector('.modal-footer .btn-outline');
        if (closeFooterBtn) {
            closeFooterBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            };
        }

        this.setupCategoryFilters();
        this.setupStickerClickEvents();

        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });
    }

    setupCategoryFilters() {
        const categoryBtns = document.querySelectorAll('.category-btn');
        
        categoryBtns.forEach(btn => {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                categoryBtns.forEach(b => b.classList.remove('active'));
                newBtn.classList.add('active');
                
                const category = newBtn.dataset.category;
                this.filterStickersByCategory(category);
            });
        });
    }

    filterStickersByCategory(category) {
        const allStickers = document.querySelectorAll('.sticker-item');
        
        allStickers.forEach(sticker => {
            const stickerCategory = sticker.dataset.category;
            
            if (category === 'all' || stickerCategory === category) {
                sticker.style.display = 'flex';
            } else {
                sticker.style.display = 'none';
            }
        });
    }

    setupStickerClickEvents() {
        const stickerItems = document.querySelectorAll('.sticker-item');
        
        stickerItems.forEach(item => {
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            newItem.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const stickerName = newItem.getAttribute('data-sticker');
                console.log(`🎯 Clicou no sticker: ${stickerName}`);
                this.sendSticker(stickerName);
            });
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
            // CORREÇÃO: Forçar visibilidade completa
            modal.style.display = 'flex';
            modal.style.visibility = 'visible';
            modal.style.opacity = '1';
            modal.style.background = 'rgba(0, 0, 0, 0.8)';
            
            const modalContent = modal.querySelector('.stickers-modal');
            if (modalContent) {
                modalContent.style.opacity = '1';
                modalContent.style.visibility = 'visible';
                modalContent.style.transform = 'scale(1)';
                modalContent.style.display = 'block';
            }
            
            document.body.style.overflow = 'hidden';
            this.playStickerVideos();
            
        } else {
            console.error('❌ Modal não encontrado!');
        }
    }

    closeModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            this.pauseStickerVideos();
        }
    }

    isModalOpen() {
        const modal = document.getElementById('stickersModal');
        return modal && modal.style.display === 'flex';
    }

    playStickerVideos() {
        const videos = document.querySelectorAll('#stickersModal video');
        
        videos.forEach((video) => {
            video.currentTime = 0;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            
            video.play().catch(error => {
                console.log('⚠️ Video não pôde autoplay:', error.message);
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

            // Verificar se pode enviar
            let isPremium = false;
            if (window.PremiumManager && typeof window.PremiumManager.checkPremiumStatus === 'function') {
                isPremium = await PremiumManager.checkPremiumStatus();
            }

            if (!isPremium) {
                const canSend = await window.MessagesSystem.checkCanSendMessage();
                if (!canSend.can_send) {
                    this.handleSendError(canSend.reason);
                    this.showSendingState(false);
                    return;
                }
            }

            // CORREÇÃO: Usar método direto para garantir que aparece no chat
            const success = await this.sendStickerDirect(stickerName, currentConversation);
            
            if (success) {
                this.showNotification('🎉 Sticker enviado!', 'success');
                this.closeModal();
                
                // CORREÇÃO: Forçar atualização visual imediata
                await this.forceRefreshConversation();
                
            } else {
                this.showNotification('❌ Erro ao enviar sticker', 'error');
            }

        } catch (error) {
            console.error('❌ Erro ao enviar sticker:', error);
            this.showNotification('❌ Erro ao enviar sticker', 'error');
        } finally {
            this.showSendingState(false);
        }
    }

    // CORREÇÃO: Método direto para enviar sticker
    async sendStickerDirect(stickerName, receiverId) {
        try {
            // Primeiro tentar o método RPC
            const { data: rpcData, error: rpcError } = await this.supabase
                .rpc('send_sticker_message', {
                    p_sender_id: this.currentUser.id,
                    p_receiver_id: receiverId,
                    p_sticker_name: stickerName
                });

            if (!rpcError && rpcData === 'success') {
                console.log('✅ Sticker enviado via RPC');
                return true;
            }

            // Fallback: inserir como mensagem normal
            console.log('🔄 Usando fallback para sticker...');
            const { data: messageData, error: messageError } = await this.supabase
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

            if (messageError) {
                console.error('❌ Erro no fallback:', messageError);
                return false;
            }

            if (messageData && messageData.length > 0) {
                console.log('✅ Sticker enviado via fallback');
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Erro crítico:', error);
            return false;
        }
    }

    // CORREÇÃO: Forçar atualização visual
    async forceRefreshConversation() {
        if (window.MessagesSystem) {
            console.log('🔄 Forçando atualização da conversa...');
            
            // Recarregar mensagens IMEDIATAMENTE
            if (window.MessagesSystem.currentConversation) {
                await window.MessagesSystem.loadConversationMessages(window.MessagesSystem.currentConversation);
            }
            
            // Recarregar lista de conversas
            if (window.MessagesSystem.loadConversations) {
                await window.MessagesSystem.loadConversations();
            }
            
            // Atualizar contador
            if (window.MessagesSystem.updateMessageCounter) {
                window.MessagesSystem.updateMessageCounter();
            }
            
            // CORREÇÃO: Scroll para baixo para mostrar a nova mensagem
            setTimeout(() => {
                if (window.MessagesSystem.scrollToBottom) {
                    window.MessagesSystem.scrollToBottom();
                }
            }, 500);
        }
    }

    handleSendError(reason) {
        const errorMessages = {
            'limit_reached': '🚫 Limite diário de mensagens atingido!',
            'blocked': '🚫 Não é possível enviar para este usuário.',
            'sticker_not_found': '❌ Sticker não encontrado.',
            'user_not_found': '❌ Usuário não encontrado.'
        };
        
        const message = errorMessages[reason] || `❌ Erro: ${reason}`;
        this.showNotification(message, 'error');
    }

    showSendingState(isSending) {
        const modal = document.getElementById('stickersModal');
        if (!modal) return;

        const stickerItems = modal.querySelectorAll('.sticker-item');
        const sendButtons = modal.querySelectorAll('button');

        if (isSending) {
            modal.classList.add('sending');
            stickerItems.forEach(item => {
                item.style.pointerEvents = 'none';
                item.style.opacity = '0.6';
            });
            sendButtons.forEach(btn => {
                btn.disabled = true;
            });
        } else {
            modal.classList.remove('sending');
            stickerItems.forEach(item => {
                item.style.pointerEvents = 'auto';
                item.style.opacity = '1';
            });
            sendButtons.forEach(btn => {
                btn.disabled = false;
            });
        }
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        
        // Fallback básico
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10001;
            background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
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
        }, 3000);
    }

    setCurrentConversation(conversationId) {
        this.currentConversation = conversationId;
    }

    destroy() {
        this.pauseStickerVideos();
        this.closeModal();
        this.isInitialized = false;
    }
}

// ==================== INICIALIZAÇÃO GLOBAL ====================
window.StickersSystem = new StickersSystem();

function initializeStickersSystem() {
    if (!window.MessagesSystem) {
        setTimeout(initializeStickersSystem, 1000);
        return;
    }

    if (!window.MessagesSystem.currentUser) {
        setTimeout(initializeStickersSystem, 1000);
        return;
    }

    console.log('🚀 Inicializando StickersSystem...');
    
    try {
        window.StickersSystem.initialize(window.MessagesSystem.currentUser);
        
        if (window.MessagesSystem.currentConversation) {
            window.StickersSystem.setCurrentConversation(window.MessagesSystem.currentConversation);
        }
        
    } catch (error) {
        console.error('❌ Erro na inicialização:', error);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeStickersSystem, 2000);
});

// Funções globais
window.openStickersModal = function() {
    if (window.StickersSystem && window.StickersSystem.isInitialized) {
        window.StickersSystem.openModal();
    }
};

window.closeStickersModal = function() {
    if (window.StickersSystem) {
        window.StickersSystem.closeModal();
    }
};

window.sendSticker = function(stickerName) {
    if (window.StickersSystem && window.StickersSystem.isInitialized) {
        window.StickersSystem.sendSticker(stickerName);
    }
};