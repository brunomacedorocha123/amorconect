// menu-vibe-redirect.js - Sistema de redirecionamento seguro do menu
class MenuVibeRedirect {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.hasActiveAgreement = false;
        this.isInitialized = false;
        
        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            // Configurar Supabase
            if (!window.supabase) {
                const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
                const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
                this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            } else {
                this.supabase = window.supabase;
            }

            // Verificar autenticação e acordo
            await this.checkAuthAndAgreement();
            
            // Aplicar mudanças no menu se necessário
            this.applyMenuChanges();
            
            this.isInitialized = true;
            
        } catch (error) {
            // Falha silenciosa - não quebra outras funcionalidades
        }
    }

    async checkAuthAndAgreement() {
        try {
            // Verificar se usuário está logado
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();
            if (authError || !user) {
                this.currentUser = null;
                this.hasActiveAgreement = false;
                return;
            }

            this.currentUser = user;

            // Verificar se tem acordo Vibe Exclusive ATIVO
            const { data: agreement, error: agreementError } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            if (!agreementError && agreement?.has_active_agreement) {
                this.hasActiveAgreement = true;
            } else {
                this.hasActiveAgreement = false;
            }

        } catch (error) {
            this.hasActiveAgreement = false;
        }
    }

    applyMenuChanges() {
        // SÓ modifica se usuário tem acordo ATIVO
        if (!this.hasActiveAgreement) return;

        // Encontrar TODOS os links que apontam para mensagens.html
        const mensagensLinks = this.findMensagensLinks();
        
        // Modificar CADA link para apontar para vibe-exclusive.html
        mensagensLinks.forEach(link => {
            this.updateLinkToVibeExclusive(link);
        });

        // Adicionar indicador visual se necessário
        this.addVibeIndicator();
    }

    findMensagensLinks() {
        const allLinks = document.querySelectorAll('a');
        const mensagensLinks = [];
        
        allLinks.forEach(link => {
            const href = link.getAttribute('href');
            
            // CONDIÇÃO CLARA: Só modifica links para mensagens.html
            if (href && (
                href.includes('mensagens.html') || 
                href.includes('messages.html') ||
                href === 'mensagens.html' ||
                href === 'messages.html'
            )) {
                mensagensLinks.push(link);
            }
        });
        
        return mensagensLinks;
    }

    updateLinkToVibeExclusive(link) {
        // CONDIÇÃO CLARA: Mantém outros atributos, só muda o href
        const originalHref = link.getAttribute('href');
        
        // Só modifica se não for já vibe-exclusive
        if (!originalHref.includes('vibe-exclusive')) {
            link.setAttribute('href', 'vibe-exclusive.html');
            
            // Opcional: Adicionar classe para estilização
            link.classList.add('vibe-exclusive-link');
        }
    }

    addVibeIndicator() {
        // CONDIÇÃO CLARA: Só adiciona indicador se tiver acordo
        const existingIndicator = document.querySelector('.menu-vibe-indicator');
        if (existingIndicator) return;

        // Encontrar o item de mensagens no menu
        const mensagensMenuItem = this.findMensagensMenuItem();
        if (mensagensMenuItem) {
            const indicator = document.createElement('span');
            indicator.className = 'menu-vibe-indicator';
            indicator.innerHTML = '💎';
            indicator.title = 'Vibe Exclusive Ativo';
            indicator.style.cssText = `
                margin-left: 8px;
                font-size: 0.8em;
                animation: pulse 2s infinite;
            `;
            
            mensagensMenuItem.appendChild(indicator);
        }
    }

    findMensagensMenuItem() {
        // Encontrar o item do menu que contém link para mensagens
        const links = document.querySelectorAll('a');
        for (let link of links) {
            const href = link.getAttribute('href');
            if (href && href.includes('mensagens.html')) {
                return link.parentElement;
            }
        }
        return null;
    }

    // Método para verificar status atual
    getStatus() {
        return {
            hasActiveAgreement: this.hasActiveAgreement,
            currentUser: this.currentUser ? true : false
        };
    }
}

// ==================== INICIALIZAÇÃO SEGURA ====================

// Inicializar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMenuVibeRedirect);
} else {
    initializeMenuVibeRedirect();
}

function initializeMenuVibeRedirect() {
    // Só inicializar se não existir ainda
    if (!window.menuVibeRedirect) {
        window.menuVibeRedirect = new MenuVibeRedirect();
    }
}

// Inicialização com delay de segurança
setTimeout(initializeMenuVibeRedirect, 1000);

// ==================== FUNÇÕES GLOBAIS ====================

// Para verificar status via console (opcional)
window.getMenuVibeStatus = function() {
    if (window.menuVibeRedirect) {
        return window.menuVibeRedirect.getStatus();
    }
    return { hasActiveAgreement: false, currentUser: false };
};

// Para forçar atualização (útil quando acordo muda)
window.updateMenuVibeLinks = function() {
    if (window.menuVibeRedirect) {
        window.menuVibeRedirect.initialize();
    }
};