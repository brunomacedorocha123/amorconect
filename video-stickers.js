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
            
            // Tentar carregar da tabela stickers
            const { data: stickers, error } = await this.supabase
                .from('stickers')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: true });

            if (error) {
                console.log('ℹ️ Tabela stickers não encontrada, usando fallback');
                this.stickers = this.getFallbackStickers();
            } else {
                this.stickers = stickers || this.getFallbackStickers();
            }

            console.log('✅ Stickers carregados:', this.stickers.length);
            this.renderStickers();

        } catch (error) {
            console.error('❌ Erro ao carregar stickers:', error);
            this.stickers = this.getFallbackStickers();
            this.renderStickers();
        } finally {
            this.isLoading = false;
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
        // Aguardar o DOM carregar
        setTimeout(() => {
            const inputContainer = document.querySelector('.input-actions');
            if (!inputContainer) {
                console.log('❌ Container de ações não encontrado');
                return;
            }

            // Verificar se já existe botão
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
                    inputContainer.appendChild(stickersBtn);
                }
                
                console.log('✅ Botão de stickers adicionado');
            }
        }, 1000);
    }

    setupStickersModal() {
        // Configurar eventos do modal
        const modal = document.getElementById('stickersModal');
        if (modal) {
            // Fechar modal ao clicar fora
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
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
                    </video>
                    <div class="sticker-overlay">
                        <i class="fas fa-play"></i>
                    </div>
                </div>
                <div class="sticker-name">${sticker.display_name}</div>
            </div>
        `).join('');

        this.setupVideoHover();
    }

    setupVideoHover() {
        const stickerItems = document.querySelectorAll('.sticker-item');
        
        stickerItems.forEach(item => {
            const video = item.querySelector('video');
            if (!video) return;
            
            item.addEventListener('mouseenter', () => {
                video.play().catch(e => console.log('❌ Erro ao reproduzir video'));
            });
            
            item.addEventListener('mouseleave', () => {
                video.pause();
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
            // Pausar todos os videos
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
            // Usar mesma lógica do sistema de mensagens
            if (!window.MessagesSystem) {
                return { can_send: true, reason: null };
            }

            return await window.MessagesSystem.checkCanSendMessage();

        } catch (error) {
            console.error('❌ Erro ao verificar limite:', error);
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

            // Enviar como mensagem
            const { data, error } = await this.supabase
                .from('messages')
                .insert({
                    sender_id: this.currentUser.id,
                    receiver_id: window.MessagesSystem.currentConversation,
                    message: `[STICKER:${sticker.name}]`,
                    is_sticker: true,
                    sticker_name: sticker.name,
                    sent_at: new Date().toISOString()
                });

            if (error) throw error;

            this.showNotification(`Sticker "${sticker.display_name}" enviado! 🎬`, 'success');
            this.closeStickersModal();
            
            // Atualizar interface
            await this.updateAfterStickerSend();

        } catch (error) {
            console.error('❌ Erro ao enviar sticker:', error);
            this.showNotification('Erro ao enviar sticker', 'error');
        }
    }

    async updateAfterStickerSend() {
        try {
            // Atualizar mensagens da conversa
            if (window.MessagesSystem?.loadConversationMessages) {
                await window.MessagesSystem.loadConversationMessages(window.MessagesSystem.currentConversation);
            }
            
            // Atualizar lista de conversas
            if (window.MessagesSystem?.loadConversations) {
                await window.MessagesSystem.loadConversations();
            }
            
            // Atualizar contadores
            if (window.MessagesSystem?.updateMessageCounter) {
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

            // Usar mesmo contador das mensagens
            const messageCounter = document.getElementById('messageCounter');
            if (messageCounter) {
                counter.innerHTML = messageCounter.innerHTML.replace('Mensagens', 'Stickers');
                
                if (messageCounter.classList.contains('premium')) {
                    counter.classList.add('premium');
                } else {
                    counter.classList.remove('premium');
                }
            }

        } catch (error) {
            console.error('❌ Erro ao atualizar contador:', error);
        }
    }

    handleSendError(reason) {
        switch (reason) {
            case 'limit_reached':
                this.showNotification('Limite diário de 4 stickers atingido! Volte amanhã.', 'error');
                break;
            default:
                this.showNotification('Erro ao enviar sticker.', 'error');
        }
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            console.log(`[${type.toUpperCase()}] ${message}`);
        }
    }
}

// Inicialização global
let videoStickersSystem;

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Iniciando sistema de video stickers...');
    
    setTimeout(() => {
        try {
            videoStickersSystem = new VideoStickersSystem();
            window.videoStickersSystem = videoStickersSystem;
            console.log('✅ Sistema de video stickers inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar sistema de stickers:', error);
        }
    }, 2000);
});

// Funções globais para o HTML
window.openStickersModal = function() {
    if (window.videoStickersSystem) {
        window.videoStickersSystem.openStickersModal();
    }
};

window.closeStickersModal = function() {
    if (window.videoStickersSystem) {
        window.videoStickersSystem.closeStickersModal();
    }
};

// Fechar com ESC
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        window.closeStickersModal();
    }
});