// menu-vibe-redirect.js - Sistema de redirecionamento do menu
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
            if (!window.supabase) {
                const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
                const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
                this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            } else {
                this.supabase = window.supabase;
            }

            await this.checkAuth();
            if (!this.currentUser) return;

            await this.checkActiveAgreement();
            
            if (this.hasActiveAgreement) {
                this.modifyMenuLinks();
                this.addVibeIndicator();
            }
            
            this.isInitialized = true;
            
        } catch (error) {
        }
    }

    async checkAuth() {
        try {
            const { data: { user }, error } = await this.supabase.auth.getUser();
            if (error || !user) {
                this.currentUser = null;
                return;
            }
            this.currentUser = user;
        } catch (error) {
            this.currentUser = null;
        }
    }

    async checkActiveAgreement() {
        try {
            const { data: agreement, error } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: this.currentUser.id
                });

            this.hasActiveAgreement = !error && agreement?.has_active_agreement;

        } catch (error) {
            this.hasActiveAgreement = false;
        }
    }

    modifyMenuLinks() {
        const allLinks = document.querySelectorAll('a[href*="mensagens"], a[href*="messages"]');
        
        allLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && (href.includes('mensagens.html') || href.includes('messages.html'))) {
                link.setAttribute('href', 'vibe-exclusive.html');
                link.classList.add('vibe-exclusive-link');
            }
        });
    }

    addVibeIndicator() {
        const existingIndicator = document.querySelector('.menu-vibe-indicator');
        if (existingIndicator) return;

        const mensagensLinks = document.querySelectorAll('a[href*="mensagens"], a[href*="messages"]');
        if (mensagensLinks.length > 0) {
            const firstLink = mensagensLinks[0];
            const menuItem = firstLink.closest('li');
            
            if (menuItem) {
                const indicator = document.createElement('span');
                indicator.className = 'menu-vibe-indicator';
                indicator.innerHTML = '💎';
                indicator.title = 'Vibe Exclusive Ativo';
                indicator.style.cssText = `
                    margin-left: 8px;
                    font-size: 0.8em;
                    display: inline-block;
                `;
                
                menuItem.appendChild(indicator);
            }
        }
    }
}

// Inicialização
function initializeMenuVibeRedirect() {
    if (!window.menuVibeRedirect) {
        window.menuVibeRedirect = new MenuVibeRedirect();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeMenuVibeRedirect);
} else {
    initializeMenuVibeRedirect();
}

setTimeout(initializeMenuVibeRedirect, 1500);