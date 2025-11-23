// video-stickers.js - SISTEMA COMPLETO DE VIDEO STICKERS
class VideoStickersSystem {
    constructor() {
        this.supabase = supabase;
        this.currentUser = null;
        this.stickers = [];
        this.isLoading = false;
        this.initialize();
    }

    async initialize() {
        console.log('🎬 Inicializando sistema de video stickers...');
        await this.checkAuth();
        await this.loadStickers();
        this.setupStickersButton();
        this.setupStickersModal();
        this.updateStickerCounter();
    }

    async checkAuth() {
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (user) {
                this.currentUser = user;
                console.log('✅ Usuário autenticado para stickers:', user.id);
            }
        } catch (error) {
            console.error('❌ Erro na autenticação stickers:', error);
        }
    }

    async loadStickers() {
        try {
            this.isLoading = true;
            console.log('📦 Carregando stickers do Supabase...');
            
            const { data: stickers, error } = await this.supabase
                .from('stickers')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('❌ Erro ao carregar stickers:', error);
                throw error;
            }

            this.stickers = stickers || [];
            console.log('✅ Stickers carregados:', this.stickers.length);
            
            // Se não encontrou stickers na tabela, usar fallback
            if (this.stickers.length === 0) {
                this.stickers = this.getFallbackStickers();
                console.log('🔄 Usando stickers fallback:', this.stickers.length);
            }

        } catch (error) {
            console.error('❌ Erro crítico ao carregar stickers, usando fallback:', error);
            this.stickers = this.getFallbackStickers();
        } finally {
            this.isLoading = false;
            this.renderStickers();
        }
    }

    getFallbackStickers() {
        return [
            { id: '1', name: 'videoanel', display_name: 'Anel Brilhante' },
            { id: '2', name: 'videoboanoite', display_name: 'Boa Noite' },
            { id: '3', name: 'videobomdia', display_name: 'Bom Dia' },
            { id: '4', name: 'videobolo', display_name: 'Bolo de Festa' },
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

    setupStickersButton() {
        // Aguardar o DOM carregar completamente
        setTimeout(() => {
            const inputContainer = document.querySelector('.input-actions');
            if (!inputContainer) {
                console.log('❌ Container de ações não encontrado, tentando novamente...');
                setTimeout(() => this.setupStickersButton(), 1000);
                return;
            }

            // Verificar se já existe botão de stickers
            let stickersBtn = document.getElementById('stickersBtn');
            if (!stickersBtn) {
                stickersBtn = document.createElement('button');
                stickersBtn.id = 'stickersBtn';
                stickersBtn.className = 'stickers-btn';
                stickersBtn.innerHTML = '<i class="fas fa-film"></i>';
                stickersBtn.title = 'Video Stickers';
                stickersBtn.onclick = () => this.openStickersModal();
                
                // Inserir antes do contador de caracteres
                const charCounter = inputContainer.querySelector('.char-counter');
                if (charCounter) {
                    inputContainer.insertBefore(stickersBtn, charCounter);
                } else {
                    // Se não encontrar charCounter, inserir antes do botão enviar
                    const sendBtn = inputContainer.querySelector('.btn-send');
                    if (sendBtn) {
                        inputContainer.insertBefore(stickersBtn, sendBtn);
                    } else {
                        inputContainer.appendChild(stickersBtn);
                    }
                }
                
                console.log('✅ Botão de stickers adicionado com sucesso');
            }
        }, 2000);
    }

    setupStickersModal() {
        // O modal já está no HTML, só precisamos configurar os eventos
        const modal = document.getElementById('stickersModal');
        if (modal) {
            // Fechar modal ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeStickersModal();
                }
            });
            
            // Fechar com ESC
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && modal.style.display === 'flex') {
                    this.closeStickersModal();
                }
            });
        }
    }

    renderStickers() {
        const container = document.getElementById('stickersContainer');
        if (!container) {
            console.log('❌ Container de stickers não encontrado');
            return;
        }

        if (this.isLoading) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Carregando stickers...</p>
                </div>
            `;
            return;
        }

        if (this.stickers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-film"></i>
                    <h3>Nenhum sticker disponível</h3>
                    <p>Em breve novos video stickers!</p>
                </div>
            `;
            return;
        }

        console.log('🎨 Renderizando stickers:', this.stickers.length);
        
        container.innerHTML = this.stickers.map(sticker => `
            <div class="sticker-item" data-sticker-id="${sticker.id}" 
                 onclick="videoStickersSystem.selectSticker('${sticker.id}')">
                <div class="sticker-video">
                    <video width="80" height="80" loop muted playsinline preload="metadata">
                        <source src="${sticker.name}.mp4" type="video/mp4">
                        Seu navegador não suporta vídeos HTML5.
                    </video>
                    <div class="sticker-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="sticker-name">${sticker.display_name}</div>
            </div>
        `).join('');

        // Configurar hover para os videos
        this.setupVideoHover();
    }

    setupVideoHover() {
        const stickerItems = document.querySelectorAll('.sticker-item');
        
        stickerItems.forEach(item => {
            const video = item.querySelector('video');
            if (!video) return;
            
            item.addEventListener('mouseenter', () => {
                video.play().catch(e => {
                    console.log('❌ Erro ao reproduzir video:', e);
                });
            });
            
            item.addEventListener('mouseleave', () => {
                video.pause();
                video.currentTime = 0;
            });

            // Prevenir erro de autoplay
            video.addEventListener('loadeddata', () => {
                video.currentTime = 0;
            });
        });
    }

    openStickersModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'flex';
            this.updateStickerCounter();
            console.log('📱 Modal de stickers aberto');
        }
    }

    closeStickersModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'none';
            // Pausar todos os videos quando fechar o modal
            document.querySelectorAll('.sticker-video video').forEach(video => {
                video.pause();
                video.currentTime = 0;
            });
        }
    }

    async selectSticker(stickerId) {
        console.log('🎯 Selecionando sticker:', stickerId);
        
        const sticker = this.stickers.find(s => s.id === stickerId);
        if (!sticker) {
            this.showNotification('Sticker não encontrado', 'error');
            return;
        }

        // Verificar se pode enviar sticker
        const canSend = await this.checkCanSendSticker();
        if (!canSend.can_send) {
            this.handleSendError(canSend.reason);
            return;
        }

        // Enviar sticker
        await this.sendSticker(sticker);
    }

    async checkCanSendSticker() {
        try {
            // Usar a mesma lógica do sistema de mensagens
            if (!window.MessagesSystem) {
                console.log('⚠️ MessagesSystem não disponível, permitindo envio');
                return { can_send: true, reason: null };
            }

            // Verificar se é premium usando a mesma lógica das mensagens
            let isPremium = false;
            if (window.PremiumManager && typeof window.PremiumManager.checkPremiumStatus === 'function') {
                isPremium = await PremiumManager.checkPremiumStatus();
            } else if (window.MessagesSystem.currentUser?.profile?.is_premium) {
                isPremium = window.MessagesSystem.currentUser.profile.is_premium;
            }
            
            if (isPremium) {
                return { can_send: true, reason: null };
            }

            // Para usuários free, verificar limite
            const canSendMessage = await window.MessagesSystem.checkCanSendMessage();
            return canSendMessage;

        } catch (error) {
            console.error('❌ Erro ao verificar limite de stickers:', error);
            return { can_send: true, reason: null };
        }
    }

    async sendSticker(sticker) {
        if (!window.MessagesSystem || !window.MessagesSystem.currentConversation) {
            this.showNotification('Selecione uma conversa primeiro', 'error');
            return;
        }

        try {
            this.showNotification('Enviando sticker...', 'info');
            console.log('📤 Enviando sticker:', sticker.name);

            // Tentar enviar usando a função RPC primeiro (se existir)
            let success = false;
            
            if (this.supabase.rpc && this.supabase.rpc('send_message')) {
                try {
                    const { data, error } = await this.supabase
                        .rpc('send_message', {
                            p_sender_id: this.currentUser.id,
                            p_receiver_id: window.MessagesSystem.currentConversation,
                            p_message: `[STICKER:${sticker.name}]`,
                            p_is_sticker: true,
                            p_sticker_name: sticker.name
                        });

                    if (!error && data === 'success') {
                        success = true;
                    }
                } catch (rpcError) {
                    console.log('⚠️ RPC não disponível, usando fallback');
                }
            }

            // Se RPC falhou, usar insert direto
            if (!success) {
                const { data, error } = await this.supabase
                    .from('messages')
                    .insert({
                        sender_id: this.currentUser.id,
                        receiver_id: window.MessagesSystem.currentConversation,
                        message: `[STICKER:${sticker.name}]`,
                        is_sticker: true,
                        sticker_name: sticker.name,
                        sent_at: new Date().toISOString()
                    })
                    .select();

                if (error) throw error;
                success = true;
            }

            if (success) {
                this.showNotification(`Sticker "${sticker.display_name}" enviado! 🎬`, 'success');
                this.closeStickersModal();
                
                // Atualizar interface
                await this.updateAfterStickerSend();
                
            } else {
                throw new Error('Falha ao enviar sticker');
            }

        } catch (error) {
            console.error('❌ Erro ao enviar sticker:', error);
            this.showNotification('Erro ao enviar sticker', 'error');
        }
    }

    async updateAfterStickerSend() {
        try {
            // Atualizar mensagens da conversa atual
            if (window.MessagesSystem && window.MessagesSystem.loadConversationMessages) {
                await window.MessagesSystem.loadConversationMessages(window.MessagesSystem.currentConversation);
            }
            
            // Atualizar lista de conversas
            if (window.MessagesSystem && window.MessagesSystem.loadConversations) {
                await window.MessagesSystem.loadConversations();
            }
            
            // Atualizar contadores
            if (window.MessagesSystem && window.MessagesSystem.updateMessageCounter) {
                await window.MessagesSystem.updateMessageCounter();
            }
            
            this.updateStickerCounter();
            
        } catch (error) {
            console.error('❌ Erro ao atualizar interface:', error);
        }
    }

    async updateStickerCounter() {
        try {
            const counter = document.getElementById('stickerCounter');
            if (!counter) return;

            // Usar o mesmo contador das mensagens para consistência
            const messageCounter = document.getElementById('messageCounter');
            if (messageCounter) {
                const counterHTML = messageCounter.innerHTML;
                // Substituir "Mensagens" por "Stickers" mantendo o resto
                const stickerHTML = counterHTML.replace('Mensagens', 'Stickers');
                counter.innerHTML = stickerHTML;
                
                // Copiar a classe premium se existir
                if (messageCounter.classList.contains('premium')) {
                    counter.classList.add('premium');
                } else {
                    counter.classList.remove('premium');
                }
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar contador de stickers:', error);
        }
    }

    handleSendError(reason) {
        switch (reason) {
            case 'limit_reached':
                this.showNotification('Limite diário de 4 stickers atingido! Volte amanhã.', 'error');
                break;
            case 'blocked':
                this.showNotification('Não é possível enviar sticker para este usuário.', 'error');
                break;
            default:
                this.showNotification('Erro ao enviar sticker.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback simples
            console.log(`[${type.toUpperCase()}] ${message}`);
            alert(message);
        }
    }

    // Método para debug
    debugInfo() {
        console.log('🔍 DEBUG VideoStickersSystem:', {
            user: this.currentUser?.id,
            stickersCount: this.stickers.length,
            messagesSystem: !!window.MessagesSystem,
            currentConversation: window.MessagesSystem?.currentConversation
        });
    }
}

// Inicialização global
let videoStickersSystem;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado, iniciando sistema de stickers...');
    
    // Aguardar um pouco para garantir que outros sistemas estejam carregados
    setTimeout(() => {
        try {
            videoStickersSystem = new VideoStickersSystem();
            window.videoStickersSystem = videoStickersSystem;
            console.log('✅ Sistema de video stickers inicializado com sucesso');
        } catch (error) {
            console.error('❌ Erro crítico ao inicializar sistema de stickers:', error);
        }
    }, 3000);
});

// Funções globais para acesso via HTML
function openStickersModal() {
    if (window.videoStickersSystem) {
        window.videoStickersSystem.openStickersModal();
    } else {
        console.log('⚠️ Sistema de stickers não inicializado');
        // Tentar inicializar
        setTimeout(() => {
            if (window.videoStickersSystem) {
                window.videoStickersSystem.openStickersModal();
            }
        }, 1000);
    }
}

function closeStickersModal() {
    if (window.videoStickersSystem) {
        window.videoStickersSystem.closeStickersModal();
    }
}

// Debug helper
window.debugStickers = function() {
    if (window.videoStickersSystem) {
        window.videoStickersSystem.debugInfo();
    } else {
        console.log('❌ VideoStickersSystem não está disponível');
    }
};

// Exportar para uso global
window.VideoStickersSystem = VideoStickersSystem;