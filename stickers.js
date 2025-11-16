// stickers.js - SISTEMA NOVO E SIMPLES
class StickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.currentConversation = null;
    }

    // Inicializar
    initialize(user) {
        this.currentUser = user;
        console.log('🎯 StickersSystem NOVO inicializado!');
        this.setupEventListeners();
    }

    // Configurar botões
    setupEventListeners() {
        // Botão de abrir modal
        const stickerBtn = document.getElementById('stickerBtn');
        if (stickerBtn) {
            stickerBtn.onclick = () => this.openStickerModal();
        }

        // Botão de fechar modal
        const closeBtn = document.querySelector('#stickersModal .modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => this.closeStickerModal();
        }
    }

    // Abrir modal de stickers
    async openStickerModal() {
        if (!this.checkConversation()) return;

        const modal = document.getElementById('stickersModal');
        if (!modal) return;

        // Carregar stickers
        await this.loadStickers();
        
        // Mostrar modal
        modal.style.display = 'flex';
        this.playAllVideos();
    }

    // Fechar modal
    closeStickerModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'none';
            this.pauseAllVideos();
        }
    }

    // Verificar se tem conversa selecionada
    checkConversation() {
        if (!window.MessagesSystem || !window.MessagesSystem.currentConversation) {
            this.showNotification('❌ Selecione uma conversa primeiro!', 'error');
            return false;
        }
        this.currentConversation = window.MessagesSystem.currentConversation;
        return true;
    }

    // Carregar stickers do banco
    async loadStickers() {
        try {
            const { data: stickers, error } = await this.supabase
                .from('stickers')
                .select('*')
                .order('category');

            if (error) throw error;

            this.renderStickers(stickers || []);
        } catch (error) {
            console.error('Erro ao carregar stickers:', error);
            // Fallback com stickers fixos
            this.renderStickers(this.getFallbackStickers());
        }
    }

    // Stickers de fallback
    getFallbackStickers() {
        return [
            { name: 'videoanel', display_name: 'Anel', category: 'amor' },
            { name: 'videoboanoite', display_name: 'Boa Noite', category: 'cumprimentos' },
            { name: 'videobolo', display_name: 'Bolo', category: 'comida' },
            { name: 'videobomdia', display_name: 'Bom Dia', category: 'cumprimentos' },
            { name: 'videocachorinho', display_name: 'Cachorrinho', category: 'animais' },
            { name: 'videocoracao', display_name: 'Coração', category: 'amor' }
        ];
    }

    // Renderizar stickers no modal
    renderStickers(stickers) {
        const grid = document.getElementById('stickersGrid');
        if (!grid) return;

        grid.innerHTML = stickers.map(sticker => `
            <div class="sticker-item" onclick="stickersSystem.sendSticker('${sticker.name}')">
                <div class="sticker-video-container">
                    <video loop muted playsinline autoplay>
                        <source src="https://rohsbrkbdlbewonibclf.supabase.co/storage/v1/object/public/stickers/${sticker.name}.mp4" type="video/mp4">
                    </video>
                    <div class="sticker-overlay">
                        <i class="fas fa-paper-plane"></i>
                    </div>
                </div>
                <span class="sticker-name">${sticker.display_name}</span>
            </div>
        `).join('');
    }

    // ENVIAR STICKER - FUNÇÃO PRINCIPAL
    async sendSticker(stickerName) {
        console.log(`🔄 Enviando sticker: ${stickerName}`);
        
        try {
            // 1. Verificar se pode enviar
            if (!await this.canSendMessage()) {
                this.showNotification('🚫 Limite de mensagens atingido!', 'error');
                return;
            }

            // 2. Enviar sticker
            const success = await this.sendStickerToDatabase(stickerName);
            
            if (success) {
                // 3. MOSTRAR NO CHAT (IMPORTANTE!)
                this.showStickerInChat(stickerName);
                
                // 4. Feedback e limpeza
                this.showNotification('✅ Sticker enviado!', 'success');
                this.closeStickerModal();
                
                // 5. Atualizar contador
                this.updateMessageCounter();
            }

        } catch (error) {
            console.error('Erro ao enviar sticker:', error);
            this.showNotification('❌ Erro ao enviar sticker', 'error');
        }
    }

    // Verificar se pode enviar mensagem
    async canSendMessage() {
        // Se for premium, pode enviar ilimitado
        if (await this.isPremiumUser()) return true;

        // Verificar limite free (4 mensagens)
        try {
            const { data: limits, error } = await this.supabase
                .from('user_message_limits')
                .select('messages_sent_today')
                .eq('user_id', this.currentUser.id)
                .single();

            if (error) return true; // Em caso de erro, permitir
            
            return (limits?.messages_sent_today || 0) < 4;
        } catch (error) {
            return true;
        }
    }

    // Verificar se usuário é premium
    async isPremiumUser() {
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('is_premium')
                .eq('id', this.currentUser.id)
                .single();

            return !error && profile?.is_premium;
        } catch (error) {
            return false;
        }
    }

    // Enviar sticker para o banco
    async sendStickerToDatabase(stickerName) {
        try {
            // Tentar RPC primeiro
            const { data, error } = await this.supabase
                .rpc('send_sticker_message', {
                    p_sender_id: this.currentUser.id,
                    p_receiver_id: this.currentConversation,
                    p_sticker_name: stickerName
                });

            if (!error && data === 'success') return true;

            // Fallback: inserção direta
            const { error: insertError } = await this.supabase
                .from('messages')
                .insert({
                    sender_id: this.currentUser.id,
                    receiver_id: this.currentConversation,
                    message: `[STICKER:${stickerName}]`,
                    sent_at: new Date().toISOString(),
                    is_sticker: true,
                    sticker_name: stickerName
                });

            return !insertError;

        } catch (error) {
            return false;
        }
    }

    // 🎯 FUNÇÃO MAIS IMPORTANTE: MOSTRAR STICKER NO CHAT
    showStickerInChat(stickerName) {
        const messagesContainer = document.getElementById('messagesHistory');
        if (!messagesContainer) return;

        // Remover mensagem de "nenhuma mensagem" se existir
        const emptyState = messagesContainer.querySelector('.empty-state, .empty-chat');
        if (emptyState) emptyState.style.display = 'none';

        // Criar HTML do sticker
        const stickerHTML = `
            <div class="message own sticker-message">
                <div class="message-content">
                    <div class="sticker-in-chat">
                        <video width="120" height="120" loop muted playsinline autoplay>
                            <source src="https://rohsbrkbdlbewonibclf.supabase.co/storage/v1/object/public/stickers/${stickerName}.mp4" type="video/mp4">
                        </video>
                        <div class="sticker-label">Sticker</div>
                    </div>
                </div>
                <div class="message-time">Agora</div>
                <div class="message-status">
                    <i class="fas fa-check"></i>
                    Enviado
                </div>
            </div>
        `;

        // Adicionar ao chat
        messagesContainer.innerHTML += stickerHTML;
        
        // Rolagem automática
        this.scrollToBottom();
    }

    // Rolagem para baixo
    scrollToBottom() {
        const container = document.getElementById('messagesHistory');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    // Atualizar contador de mensagens
    updateMessageCounter() {
        if (window.MessagesSystem && window.MessagesSystem.updateMessageCounter) {
            window.MessagesSystem.updateMessageCounter();
        }
    }

    // Controlar vídeos
    playAllVideos() {
        setTimeout(() => {
            document.querySelectorAll('#stickersModal video').forEach(video => {
                video.play().catch(e => console.log('Autoplay bloqueado'));
            });
        }, 100);
    }

    pauseAllVideos() {
        document.querySelectorAll('#stickersModal video').forEach(video => {
            video.pause();
            video.currentTime = 0;
        });
    }

    // Notificação
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// INICIALIZAÇÃO GLOBAL
window.stickersSystem = new StickersSystem();

// Inicializar quando usuário estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.MessagesSystem && window.MessagesSystem.currentUser) {
            window.stickersSystem.initialize(window.MessagesSystem.currentUser);
        }
    }, 2000);
});