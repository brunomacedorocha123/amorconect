// menu-vibe-redirect.js - Sistema completo de redirecionamento
class MenuVibeRedirect {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.hasActiveAgreement = false;
        this.isInitialized = false;
        this.retryCount = 0;
        this.maxRetries = 5;
        
        this.init();
    }

    async init() {
        if (this.isInitialized || this.retryCount >= this.maxRetries) return;
        this.retryCount++;

        try {
            // Aguardar Supabase carregar
            if (!window.supabase) {
                setTimeout(() => this.init(), 1000);
                return;
            }

            this.supabase = window.supabase;

            // Verificar autenticação
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();
            if (authError || !user) {
                this.isInitialized = true;
                return;
            }

            this.currentUser = user;

            // Verificar acordo ativo
            const { data: agreement, error: agreementError } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            if (agreementError) {
                this.isInitialized = true;
                return;
            }

            this.hasActiveAgreement = agreement?.has_active_agreement || false;

            // Aplicar mudanças se tiver acordo
            if (this.hasActiveAgreement) {
                this.applyMenuChanges();
            }
            
            this.isInitialized = true;
            
        } catch (error) {
            this.isInitialized = true;
        }
    }

    applyMenuChanges() {
        this.modifyMenuLinks();
        this.addVisualIndicators();
    }

    modifyMenuLinks() {
        // Modificar links principais do menu
        const menuLinks = document.querySelectorAll('a[href="mensagens.html"]');
        menuLinks.forEach(link => {
            link.href = 'vibe-exclusive.html';
        });

        // Modificar links do footer
        const footerLinks = document.querySelectorAll('footer a[href="mensagens.html"]');
        footerLinks.forEach(link => {
            link.href = 'vibe-exclusive.html';
        });

        // Modificar qualquer link com mensagens no texto (backup)
        const allLinks = document.querySelectorAll('a');
        allLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes('mensagens.html')) {
                link.href = 'vibe-exclusive.html';
            }
        });
    }

    addVisualIndicators() {
        // Adicionar indicador nos links modificados
        const modifiedLinks = document.querySelectorAll('a[href="vibe-exclusive.html"]');
        modifiedLinks.forEach(link => {
            if (!link.querySelector('.vibe-exclusive-badge')) {
                const badge = document.createElement('span');
                badge.className = 'vibe-exclusive-badge';
                badge.innerHTML = ' 💎';
                badge.title = 'Vibe Exclusive Ativo';
                badge.style.cssText = `
                    color: #C6A664;
                    font-size: 0.8em;
                    margin-left: 5px;
                    display: inline-block;
                    animation: pulse 2s infinite;
                `;
                link.appendChild(badge);
            }
        });

        // Adicionar estilo de pulso se não existir
        if (!document.querySelector('#vibe-pulse-style')) {
            const style = document.createElement('style');
            style.id = 'vibe-pulse-style';
            style.textContent = `
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.5; }
                    100% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // Método para verificar status
    getStatus() {
        return {
            initialized: this.isInitialized,
            user: this.currentUser ? true : false,
            hasAgreement: this.hasActiveAgreement,
            retryCount: this.retryCount
        };
    }
}

// ==================== INICIALIZAÇÃO ====================

function initializeMenuVibeSystem() {
    if (!window.menuVibeSystem) {
        window.menuVibeSystem = new MenuVibeRedirect();
    }
}

// Inicialização quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initializeMenuVibeSystem, 1500);
    });
} else {
    setTimeout(initializeMenuVibeSystem, 1500);
}

// Inicializações de backup
setTimeout(initializeMenuVibeSystem, 3000);
setTimeout(initializeMenuVibeSystem, 5000);

// ==================== FUNÇÕES GLOBAIS ====================

// Para testar via console
window.checkMenuVibeStatus = function() {
    if (window.menuVibeSystem) {
        return window.menuVibeSystem.getStatus();
    }
    return { error: 'Sistema não inicializado' };
};

// Forçar atualização
window.forceMenuVibeUpdate = function() {
    if (window.menuVibeSystem) {
        window.menuVibeSystem.init();
    }
};

// Verificar links manualmente
window.checkMenuLinks = function() {
    const mensagensLinks = document.querySelectorAll('a[href="mensagens.html"]');
    const exclusiveLinks = document.querySelectorAll('a[href="vibe-exclusive.html"]');
    
    return {
        mensagensLinks: mensagensLinks.length,
        exclusiveLinks: exclusiveLinks.length,
        allMensagensLinks: Array.from(mensagensLinks).map(link => link.outerHTML)
    };
};