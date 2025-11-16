// stickers.js - COM FALLBACK PARA TESTE
class StickersSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.currentConversation = null;
        
        // Stickers com URLs alternativas para teste
        this.stickers = [
            { 
                name: 'videocoracao', 
                display_name: 'Coração', 
                category: 'amor',
                // URL alternativa para teste
                test_url: 'https://assets.codepen.io/12005/windmill.jpg'
            },
            { 
                name: 'videobomdia', 
                display_name: 'Bom Dia', 
                category: 'cumprimentos',
                test_url: 'https://assets.codepen.io/12005/dog.jpg'
            }
        ];
        
        this.init();
    }

    init() {
        console.log('🎯 StickersSystem iniciado - MODO TESTE');
        this.setupEventListeners();
    }

    setupEventListeners() {
        const stickerBtn = document.getElementById('stickerBtn');
        if (stickerBtn) {
            stickerBtn.addEventListener('click', () => this.openModal());
        }
    }

    initialize(user) {
        this.currentUser = user;
        console.log('✅ StickersSystem com usuário:', user?.email);
    }

    openModal() {
        if (!this.hasConversation()) {
            this.showNotification('Selecione uma conversa primeiro', 'error');
            return;
        }

        const modal = document.getElementById('stickersModal');
        if (modal) {
            this.renderStickers();
            modal.style.display = 'flex';
        }
    }

    closeModal() {
        const modal = document.getElementById('stickersModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    hasConversation() {
        if (window.MessagesSystem && window.MessagesSystem.currentConversation) {
            this.currentConversation = window.MessagesSystem.currentConversation;
            return true;
        }
        return false;
    }

    renderStickers() {
        const grid = document.getElementById('stickersGrid');
        if (!grid) return;

        grid.innerHTML = this.stickers.map(sticker => `
            <div class="sticker-item" onclick="stickersSystem.sendSticker('${sticker.name}')">
                <div class="sticker-video-container" style="background: #333; display: flex; align-items: center; justify-content: center; color: white;">
                    <!-- Substituindo vídeo por imagem de teste -->
                    <div style="text-align: center;">
                        <i class="fas fa-heart" style="font-size: 2rem; margin-bottom: 5px;"></i>
                        <div style="font-size: 0.7rem;">${sticker.display_name}</div>
                    </div>
                </div>
                <span class="sticker-name">${sticker.display_name}</span>
            </div>
        `).join('');
    }

    async sendSticker(stickerName) {
        if (!this.currentUser || !this.currentConversation) {
            this.showNotification('Erro: selecione uma conversa', 'error');
            return;
        }

        try {
            console.log(`🎯 Enviando sticker: ${stickerName}`);
            
            // 🎯 MOSTRAR STICKER NO CHAT (IMEDIATAMENTE)
            this.showStickerInChat(stickerName);
            
            this.showNotification('✅ Sticker enviado! (MODO TESTE)', 'success');
            this.closeModal();
            
            // Atualizar contador
            if (window.MessagesSystem && window.MessagesSystem.updateMessageCounter) {
                window.MessagesSystem.updateMessageCounter();
            }

        } catch (error) {
            console.error('❌ Erro ao enviar sticker:', error);
            this.showNotification('❌ Erro ao enviar sticker', 'error');
        }
    }

    // 🎯 FUNÇÃO PRINCIPAL: MOSTRAR STICKER NO CHAT
    showStickerInChat(stickerName) {
        const messagesContainer = document.getElementById('messagesHistory');
        if (!messagesContainer) {
            console.error('❌ Container de mensagens não encontrado');
            return;
        }

        console.log('🎯 Mostrando sticker no chat:', stickerName);

        // Remover mensagem de "nenhuma mensagem" se existir
        const emptyState = messagesContainer.querySelector('.empty-state, .empty-chat');
        if (emptyState) {
            emptyState.style.display = 'none';
        }

        // Encontrar o sticker
        const sticker = this.stickers.find(s => s.name === stickerName);
        const displayName = sticker ? sticker.display_name : stickerName;

        // Criar HTML do sticker (usando emoji como fallback)
        const stickerHTML = `
            <div class="message own sticker-message">
                <div class="message-content">
                    <div class="sticker-in-chat" style="background: rgba(198, 166, 100, 0.1); padding: 15px; border-radius: 12px; border: 2px dashed var(--gold);">
                        <div style="font-size: 3rem; margin-bottom: 8px;">
                            ${stickerName === 'videocoracao' ? '💖' : '👋'}
                        </div>
                        <div class="sticker-label">${displayName} (Sticker)</div>
                    </div>
                </div>
                <div class="message-time">Agora</div>
                <div class="message-status">
                    <i class="fas fa-check status-sent"></i>
                    Enviado
                </div>
            </div>
        `;

        // Adicionar ao chat
        messagesContainer.insertAdjacentHTML('beforeend', stickerHTML);
        
        // Rolagem automática para baixo
        this.scrollToBottom();
    }

    scrollToBottom() {
        const container = document.getElementById('messagesHistory');
        if (container) {
            setTimeout(() => {
                container.scrollTop = container.scrollHeight;
            }, 100);
        }
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Inicialização global
window.stickersSystem = new StickersSystem();

// Inicializar quando o sistema de mensagens estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎯 Inicializando sistema de stickers...');
    
    const checkMessagesSystem = setInterval(() => {
        if (window.MessagesSystem && window.MessagesSystem.currentUser) {
            clearInterval(checkMessagesSystem);
            window.stickersSystem.initialize(window.MessagesSystem.currentUser);
            console.log('✅ StickersSystem conectado ao MessagesSystem');
        }
    }, 500);
});