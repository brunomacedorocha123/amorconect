// stickers.js - SISTEMA DE STICKERS 100% CORRIGIDO E FUNCIONAL
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
        
        console.log('🎯 StickersSystem construído com', this.stickers.length, 'stickers');
    }

    async initialize(currentUser) {
        try {
            this.currentUser = currentUser;
            this.isInitialized = true;
            
            console.log('🎯 Sistema de Stickers inicializando...');
            console.log('👤 Usuário:', this.currentUser?.id);
            
            // Configurar eventos no modal EXISTENTE do HTML
            this.setupStickersModal();
            
            // Configurar botão de stickers - MÉTODO SIMPLES E DIRETO
            this.setupStickerButtonSimple();
            
            console.log('✅ StickersSystem inicializado com sucesso!');
            
        } catch (error) {
            console.error('❌ Erro na inicialização do StickersSystem:', error);
        }
    }

    // MÉTODO SIMPLES E DIRETO PARA O BOTÃO
    setupStickerButtonSimple() {
        const stickerBtn = document.getElementById('stickerBtn');
        if (!stickerBtn) {
            console.error('❌ Botão de stickers não encontrado!');
            return;
        }

        console.log('🔧 Configurando botão de stickers...');

        // REMOVER todos os event listeners existentes clonando
        const newStickerBtn = stickerBtn.cloneNode(true);
        stickerBtn.parentNode.replaceChild(newStickerBtn, stickerBtn);

        // ADICIONAR event listener DIRETO
        newStickerBtn.addEventListener('click', (e) => {
            console.log('🎯 Botão de stickers clicado!');
            e.preventDefault();
            e.stopPropagation();
            this.openModal();
        });

        console.log('✅ Botão de stickers configurado com sucesso!');
    }

    setupStickersModal() {
        console.log('🔧 Configurando modal de stickers do HTML...');
        
        const modal = document.getElementById('stickersModal');
        if (!modal) {
            console.error('❌ Modal de stickers não encontrado no HTML!');
            return;
        }

        console.log('✅ Modal encontrado, configurando eventos...');

        // 1. Configurar botão de fechar
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            };
        }

        // 2. Configurar botão fechar do footer
        const closeFooterBtn = modal.querySelector('.modal-footer .btn-outline');
        if (closeFooterBtn) {
            closeFooterBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.closeModal();
            };
        }

        // 3. Configurar categorias
        this.setupCategoryFilters();

        // 4. Configurar clique nos stickers
        this.setupStickerClickEvents();

        // 5. Configurar fechar ao clicar fora
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // 6. Configurar tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });

        console.log('✅ Modal completamente configurado!');
    }

    setupCategoryFilters() {
        const categoryBtns = document.querySelectorAll('.category-btn');
        console.log(`🔧 Configurando ${categoryBtns.length} categorias...`);
        
        categoryBtns.forEach(btn => {
            // Remover event listeners antigos
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Adicionar novo event listener
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Remover active de todos
                categoryBtns.forEach(b => b.classList.remove('active'));
                // Adicionar active no clicado
                newBtn.classList.add('active');
                
                const category = newBtn.dataset.category;
                console.log(`🎯 Categoria selecionada: ${category}`);
                this.filterStickersByCategory(category);
            });
        });
    }

    filterStickersByCategory(category) {
        const allStickers = document.querySelectorAll('.sticker-item');
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
        
        console.log(`👀 ${visibleCount} stickers visíveis na categoria ${category}`);
    }

    setupStickerClickEvents() {
        const stickerItems = document.querySelectorAll('.sticker-item');
        console.log(`🔧 Configurando eventos para ${stickerItems.length} stickers...`);
        
        stickerItems.forEach(item => {
            // Remover event listeners antigos clonando o elemento
            const newItem = item.cloneNode(true);
            item.parentNode.replaceChild(newItem, item);
            
            // Adicionar novo event listener
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

        // Verificar se há uma conversa selecionada
        if (!this.hasActiveConversation()) {
            this.showNotification('Selecione uma conversa primeiro', 'error');
            return;
        }

        const modal = document.getElementById('stickersModal');
        if (modal) {
            console.log('✅ Modal encontrado, exibindo...');
            
            // FORÇAR VISIBILIDADE - CORREÇÃO CRÍTICA
            modal.style.display = 'flex';
            modal.style.opacity = '1';
            modal.style.visibility = 'visible';
            modal.style.zIndex = '10000';
            
            document.body.style.overflow = 'hidden';
            this.playStickerVideos();
            
            console.log('✅ Modal aberto com sucesso!');
        } else {
            console.error('❌ Modal não encontrado ao tentar abrir!');
        }
    }

    closeModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            this.pauseStickerVideos();
            
            console.log('✅ Modal fechado!');
        }
    }

    isModalOpen() {
        const modal = document.getElementById('stickersModal');
        return modal && modal.style.display === 'flex';
    }

    hasActiveConversation() {
        // Verificar se há uma conversa ativa no MessagesSystem
        if (window.MessagesSystem && window.MessagesSystem.currentConversation) {
            this.currentConversation = window.MessagesSystem.currentConversation;
            return true;
        }
        
        // Verificar se há uma conversa selecionada na UI
        const chatHeader = document.querySelector('.chat-header-content');
        if (chatHeader && chatHeader.style.display !== 'none') {
            // Tentar extrair o ID da conversa da UI
            const conversationId = this.extractConversationIdFromUI();
            if (conversationId) {
                this.currentConversation = conversationId;
                return true;
            }
        }
        
        return false;
    }

    extractConversationIdFromUI() {
        // Tentar encontrar o ID da conversa nos elementos da UI
        const activeConversation = document.querySelector('.conversation-item.active');
        if (activeConversation) {
            return activeConversation.dataset.userId || activeConversation.dataset.conversationId;
        }
        return null;
    }

    playStickerVideos() {
        const videos = document.querySelectorAll('#stickersModal video');
        console.log(`🎬 Iniciando ${videos.length} vídeos de stickers...`);
        
        videos.forEach((video, index) => {
            // Reset do video
            video.currentTime = 0;
            video.loop = true;
            video.muted = true;
            video.playsInline = true;
            
            // Tentar reproduzir
            const playPromise = video.play();
            
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    console.log(`✅ Vídeo ${index + 1} reproduzindo`);
                }).catch(error => {
                    console.log(`⚠️ Vídeo ${index + 1} não pôde autoplay:`, error.message);
                });
            }
        });
    }

    pauseStickerVideos() {
        const videos = document.querySelectorAll('#stickersModal video');
        videos.forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
        console.log('⏸️ Todos os vídeos pausados');
    }

    async sendSticker(stickerName) {
        console.log(`🚀 ENVIANDO STICKER: ${stickerName}`);
        
        if (!this.currentUser) {
            this.showNotification('Erro: usuário não autenticado', 'error');
            return;
        }

        if (!this.currentConversation) {
            this.showNotification('Selecione uma conversa primeiro', 'error');
            return;
        }

        try {
            this.showSendingState(true);

            // Verificar se pode enviar (limite diário)
            const canSend = await this.checkCanSendMessage();
            if (!canSend) {
                this.showNotification('🚫 Limite diário de mensagens atingido!', 'error');
                this.showSendingState(false);
                return;
            }

            console.log(`📤 Enviando sticker para ${this.currentConversation}...`);

            // 🎯 MÉTODO PRINCIPAL: Enviar via função RPC
            const { data, error } = await this.supabase
                .rpc('send_sticker_message', {
                    p_sender_id: this.currentUser.id,
                    p_receiver_id: this.currentConversation,
                    p_sticker_name: stickerName
                });

            if (error) {
                console.error('❌ Erro RPC:', error);
                throw new Error(error.message);
            }

            console.log('📦 Resposta do servidor:', data);

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
            
            // 🎯 FALLBACK: Tentar inserção direta
            try {
                await this.sendStickerFallback(stickerName);
            } catch (fallbackError) {
                console.error('❌ Erro crítico no fallback:', fallbackError);
                this.showNotification('❌ Erro ao enviar sticker', 'error');
            }
        } finally {
            this.showSendingState(false);
        }
    }

    async sendStickerFallback(stickerName) {
        console.log('🔄 Tentando fallback direto...');
        
        const { data, error } = await this.supabase
            .from('messages')
            .insert({
                sender_id: this.currentUser.id,
                receiver_id: this.currentConversation,
                message: '[STICKER]',
                sent_at: new Date().toISOString(),
                is_sticker: true,
                sticker_name: stickerName
            })
            .select();

        if (error) {
            console.error('❌ Erro no fallback:', error);
            throw error;
        }

        if (data && data.length > 0) {
            this.showNotification('🎉 Sticker enviado!', 'success');
            this.closeModal();
            await this.refreshConversation();
        }
    }

    async checkCanSendMessage() {
        // Verificar se é premium (pode enviar ilimitado)
        if (window.PremiumManager && await PremiumManager.checkPremiumStatus()) {
            return true;
        }

        // Verificar limite diário para não-premium
        try {
            const { data, error } = await this.supabase
                .rpc('check_message_limit', {
                    p_user_id: this.currentUser.id
                });

            if (error) throw error;

            return data.can_send;

        } catch (error) {
            console.error('❌ Erro ao verificar limite:', error);
            return true; // Permitir em caso de erro
        }
    }

    async refreshConversation() {
        if (window.MessagesSystem) {
            console.log('🔄 Atualizando conversa após envio...');
            
            try {
                // Recarregar mensagens da conversa atual
                if (window.MessagesSystem.loadConversationMessages) {
                    await window.MessagesSystem.loadConversationMessages(this.currentConversation);
                }
                
                // Recarregar lista de conversas
                if (window.MessagesSystem.loadConversations) {
                    await window.MessagesSystem.loadConversations();
                }
                
                // Atualizar contador
                if (window.MessagesSystem.updateMessageCounter) {
                    window.MessagesSystem.updateMessageCounter();
                }
                
                console.log('✅ Conversa atualizada!');
                
            } catch (error) {
                console.error('❌ Erro ao atualizar conversa:', error);
            }
        }
    }

    handleSendError(reason) {
        console.log(`❌ Erro no envio: ${reason}`);
        
        const errorMessages = {
            'limit_reached': '🚫 Limite diário de mensagens atingido!',
            'blocked': '🚫 Não é possível enviar mensagem para este usuário.',
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
        // Usar a função global de notificação se existir
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
            return;
        }
        
        // Fallback básico
        console.log(`${type.toUpperCase()}: ${message}`);
        alert(message); // Fallback simples
    }

    // Para integração com o sistema principal
    setCurrentConversation(conversationId) {
        this.currentConversation = conversationId;
        console.log(`🎯 Conversa definida para stickers: ${conversationId}`);
    }

    // Destruir instância (limpeza)
    destroy() {
        this.pauseStickerVideos();
        this.closeModal();
        this.isInitialized = false;
        console.log('🧹 StickersSystem destruído');
    }
}

// ==================== INICIALIZAÇÃO GLOBAL ====================
console.log('🔰 Carregando StickersSystem...');
window.StickersSystem = new StickersSystem();

// Inicializar quando o sistema estiver pronto
function initializeStickersSystem() {
    // Verificar se MessagesSystem está disponível
    if (!window.MessagesSystem) {
        console.log('⏳ Aguardando MessagesSystem...');
        setTimeout(initializeStickersSystem, 1000);
        return;
    }

    // Verificar se usuário está carregado
    if (!window.MessagesSystem.currentUser) {
        console.log('⏳ Aguardando usuário...');
        setTimeout(initializeStickersSystem, 1000);
        return;
    }

    console.log('🚀 Inicializando StickersSystem...');
    
    try {
        window.StickersSystem.initialize(window.MessagesSystem.currentUser);
        
        // Atualizar conversa se já existir
        if (window.MessagesSystem.currentConversation) {
            window.StickersSystem.setCurrentConversation(window.MessagesSystem.currentConversation);
        }
        
        console.log('🎉 StickersSystem carregado com sucesso!');
        
    } catch (error) {
        console.error('❌ Erro na inicialização do StickersSystem:', error);
    }
}

// Iniciar quando DOM carregar
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔰 DOM Carregado - Iniciando sistema de stickers...');
    
    // Dar tempo para o MessagesSystem inicializar
    setTimeout(initializeStickersSystem, 2000);
});

// Observar mudanças no MessagesSystem
let initializationAttempts = 0;
const maxInitializationAttempts = 10;

const checkMessagesSystemReady = setInterval(() => {
    if (window.MessagesSystem && window.MessagesSystem.currentUser) {
        clearInterval(checkMessagesSystemReady);
        initializeStickersSystem();
    } else {
        initializationAttempts++;
        if (initializationAttempts >= maxInitializationAttempts) {
            clearInterval(checkMessagesSystemReady);
            console.error('❌ Timeout: MessagesSystem não carregou após várias tentativas');
        }
    }
}, 1000);

// ==================== FUNÇÕES GLOBAIS PARA HTML ====================
window.openStickersModal = function() {
    if (window.StickersSystem && window.StickersSystem.isInitialized) {
        window.StickersSystem.openModal();
    } else {
        console.error('❌ StickersSystem não inicializado');
        alert('Sistema de stickers não está pronto. Recarregue a página.');
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
    } else {
        console.error('❌ StickersSystem não inicializado');
    }
};

console.log('✅ stickers.js carregado!');