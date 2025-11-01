// menu-vibe-redirect.js - VERSÃO QUE ESPERA SUPABASE
class MenuVibeRedirect {
    constructor() {
        this.checked = false;
        this.attempts = 0;
        this.maxAttempts = 10;
        this.init();
    }

    async init() {
        if (this.checked || this.attempts >= this.maxAttempts) return;
        this.attempts++;

        // Esperar Supabase carregar
        if (!window.supabase) {
            setTimeout(() => this.init(), 1000);
            return;
        }

        try {
            const { data: { user }, error: authError } = await window.supabase.auth.getUser();
            if (authError || !user) {
                this.checked = true;
                return;
            }

            const { data: agreement, error: agreementError } = await window.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            if (agreementError) {
                this.checked = true;
                return;
            }

            if (agreement?.has_active_agreement) {
                this.modifyMenuLinks();
            }
            
            this.checked = true;
            
        } catch (error) {
            this.checked = true;
        }
    }

    modifyMenuLinks() {
        const links = document.querySelectorAll('a[href="mensagens.html"]');
        links.forEach(link => {
            link.href = 'vibe-exclusive.html';
            
            // Adicionar indicador visual
            if (!link.querySelector('.vibe-indicator')) {
                const indicator = document.createElement('span');
                indicator.className = 'vibe-indicator';
                indicator.innerHTML = ' 💎';
                indicator.style.cssText = 'color: #C6A664; margin-left: 5px;';
                link.appendChild(indicator);
            }
        });
    }
}

// Inicialização que espera tudo carregar
function initializeMenuRedirect() {
    if (!window.menuVibeSystem) {
        window.menuVibeSystem = new MenuVibeRedirect();
    }
}

// Esperar DOM e depois Supabase
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
        setTimeout(initializeMenuRedirect, 2000);
    });
} else {
    setTimeout(initializeMenuRedirect, 2000);
}