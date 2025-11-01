// auth-vibe.js - SISTEMA COMPLETO DE BLOQUEIO VIBE EXCLUSIVE
class AuthVibeSystem {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.activeAgreement = null;
        this.isChecking = false;
        this.isInitialized = false;
        this.redirecting = false;
        
        this.initialize();
    }

    async initialize() {
        if (this.isInitialized) return;
        
        try {
            if (!window.supabase) {
                const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
                const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
                this.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                window.supabase = this.supabase;
            } else {
                this.supabase = window.supabase;
            }

            await this.checkAuthAndVibe();
            this.startPeriodicCheck();
            
            this.isInitialized = true;
            
        } catch (error) {
            // Falha silenciosa
        }
    }

    async checkAuthAndVibe() {
        if (this.isChecking || this.redirecting) return;
        
        this.isChecking = true;
        
        try {
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();
            
            if (authError || !user) {
                this.handleNoAuth();
                return;
            }
            
            this.currentUser = user;
            
            const agreement = await this.getActiveAgreement();
            this.activeAgreement = agreement;

            if (this.activeAgreement) {
                await this.handleVibeActive();
            } else {
                this.handleVibeInactive();
            }
            
        } catch (error) {
            // Falha silenciosa
        } finally {
            this.isChecking = false;
        }
    }

    async getActiveAgreement() {
        try {
            // PRIMEIRO: Tenta pela RPC function
            const { data: agreement, error } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: this.currentUser.id
                });

            if (!error && agreement?.has_active_agreement) {
                return agreement;
            }

            // SEGUNDO: Busca DIRETA na tabela como fallback
            const { data: directAgreements, error: directError } = await this.supabase
                .from('fidelity_agreements')
                .select('*')
                .or(`user_a.eq.${this.currentUser.id},user_b.eq.${this.currentUser.id}`)
                .in('status', ['active', 'accepted']);

            if (!directError && directAgreements && directAgreements.length > 0) {
                const activeAgreement = directAgreements
                    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0];
                
                if (activeAgreement && (activeAgreement.status === 'active' || activeAgreement.status === 'accepted')) {
                    return {
                        has_active_agreement: true,
                        partner_id: activeAgreement.user_a === this.currentUser.id ? 
                                   activeAgreement.user_b : activeAgreement.user_a,
                        agreement_id: activeAgreement.id,
                        accepted_at: activeAgreement.accepted_at || activeAgreement.updated_at
                    };
                }
            }

            return null;

        } catch (error) {
            return null;
        }
    }

    async handleVibeActive() {
        const isOnVibePage = window.location.pathname.includes('vibe-exclusive.html');
        const isOnHomePage = this.isHomePage();
        
        // ⭐⭐ SE ESTÁ NA HOME E TEM VIBE, REDIRECIONA IMEDIATAMENTE ⭐⭐
        if (isOnHomePage) {
            this.redirecting = true;
            window.location.href = 'vibe-exclusive.html';
            return;
        }
        
        if (!isOnVibePage) {
            this.redirecting = true;
            
            // ⭐⭐ PÁGINAS BLOQUEADAS - REDIRECIONA ⭐⭐
            const blockedPages = ['mensagens.html', 'busca.html'];
            const currentPage = window.location.pathname.split('/').pop();
            
            if (blockedPages.includes(currentPage) || 
                window.location.pathname.includes('mensagens') ||
                window.location.pathname.includes('busca')) {
                
                window.location.href = 'vibe-exclusive.html';
                return;
            }
            
            this.modifyPageLinks();
        }
        
        this.addVibeIndicator();
    }

    isHomePage() {
        const currentPath = window.location.pathname;
        const currentPage = currentPath.split('/').pop();
        
        return currentPath.includes('home.html') || 
               currentPage === '' || 
               currentPage === 'index.html' ||
               currentPath === '/' ||
               currentPath.endsWith('/') ||
               currentPath.includes('home') ||
               (currentPage === 'home.html' && currentPath.includes('/home.html'));
    }

    handleVibeInactive() {
        this.removeVibeIndicator();
        this.restorePageLinks();
    }

    modifyPageLinks() {
        setTimeout(() => {
            const mensagensLinks = document.querySelectorAll('a[href="mensagens.html"]');
            mensagensLinks.forEach(link => {
                link.href = 'vibe-exclusive.html';
                if (!link.querySelector('.vibe-indicator')) {
                    const indicator = document.createElement('span');
                    indicator.className = 'vibe-indicator';
                    indicator.innerHTML = ' 💎';
                    indicator.style.cssText = `
                        color: #C6A664;
                        margin-left: 5px;
                        font-size: 0.8em;
                    `;
                    link.appendChild(indicator);
                }
            });

            document.addEventListener('click', (e) => {
                const link = e.target.closest('a');
                if (link && link.getAttribute('href') === 'mensagens.html') {
                    e.preventDefault();
                    window.location.href = 'vibe-exclusive.html';
                }
            });
        }, 1000);
    }

    restorePageLinks() {
        const vibeIndicators = document.querySelectorAll('.vibe-indicator');
        vibeIndicators.forEach(indicator => indicator.remove());
    }

    addVibeIndicator() {
        const existingIndicator = document.getElementById('vibeGlobalIndicator');
        if (existingIndicator) existingIndicator.remove();

        const indicator = document.createElement('div');
        indicator.id = 'vibeGlobalIndicator';
        indicator.innerHTML = `
            <div style="
                position: fixed;
                top: 10px;
                left: 10px;
                background: linear-gradient(135deg, #C6A664, #A65B5B);
                color: white;
                padding: 8px 12px;
                border-radius: 20px;
                font-size: 0.8rem;
                font-weight: 600;
                z-index: 9999;
                box-shadow: 0 4px 12px rgba(198, 166, 100, 0.4);
                border: 2px solid #C6A664;
                display: flex;
                align-items: center;
                gap: 6px;
            ">
                <i class="fas fa-gem"></i>
                Vibe Exclusive Ativo
            </div>
        `;

        document.body.appendChild(indicator);
    }

    removeVibeIndicator() {
        const existingIndicator = document.getElementById('vibeGlobalIndicator');
        if (existingIndicator) {
            existingIndicator.remove();
        }
    }

    handleNoAuth() {
        const publicPages = ['login.html', 'cadastro.html', 'index.html', ''];
        const currentPage = window.location.pathname.split('/').pop() || '';
        
        if (!publicPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }

    startPeriodicCheck() {
        setInterval(async () => {
            await this.checkAuthAndVibe();
        }, 30000);
    }

    getStatus() {
        return {
            authenticated: !!this.currentUser,
            vibeActive: !!this.activeAgreement,
            currentUser: this.currentUser,
            activeAgreement: this.activeAgreement
        };
    }

    async forceCheck() {
        await this.checkAuthAndVibe();
        return this.getStatus();
    }
}

function initializeAuthVibe() {
    if (!window.AuthVibeSystem) {
        window.AuthVibeSystem = new AuthVibeSystem();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthVibe);
} else {
    initializeAuthVibe();
}

setTimeout(initializeAuthVibe, 1000);

// ==================== FUNÇÕES GLOBAIS ====================
window.checkVibeStatus = async function() {
    if (window.AuthVibeSystem) {
        return await window.AuthVibeSystem.forceCheck();
    }
    return null;
};

window.goToVibeExclusive = function() {
    window.location.href = 'vibe-exclusive.html';
};

window.goToNormalMessages = function() {
    window.location.href = 'mensagens.html';
};

window.manageVibeHome = function() {
    window.location.href = 'vibe-exclusive.html';
};