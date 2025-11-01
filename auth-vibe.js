// auth-vibe.js - Sistema de Autenticação e Redirecionamento Vibe Exclusive
class AuthVibeSystem {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.activeAgreement = null;
        this.isChecking = false;
        this.redirectEnabled = true;
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
                window.supabase = this.supabase;
            } else {
                this.supabase = window.supabase;
            }

            await this.checkAuthAndVibe();
            this.startPeriodicCheck();
            this.startRealTimeListener();
            
            this.isInitialized = true;
            
        } catch (error) {}
    }

    async checkAuthAndVibe() {
        if (this.isChecking) return;
        
        this.isChecking = true;
        
        try {
            const { data: { user }, error: authError } = await this.supabase.auth.getUser();
            
            if (authError || !user) {
                this.handleNoAuth();
                return;
            }
            
            this.currentUser = user;
            
            const isVibePage = this.isVibeExclusivePage();
            
            const { data: agreement, error: agreementError } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            if (agreementError) {
                this.activeAgreement = null;
            } else {
                this.activeAgreement = agreement?.has_active_agreement ? agreement : null;
            }

            // ⭐⭐ CORREÇÃO: SEMPRE aplicar lógica de redirecionamento
            await this.applySafeRedirectLogic(isVibePage);
            
        } catch (error) {
        } finally {
            this.isChecking = false;
        }
    }

    isVibeExclusivePage() {
        const path = window.location.pathname.toLowerCase();
        return path.includes('vibe-exclusive') || path.includes('vibe-exclusivo');
    }

    async applySafeRedirectLogic(isVibePage) {
        if (!this.redirectEnabled) return;

        const currentPage = window.location.pathname.split('/').pop() || '';

        // ⭐⭐ CORREÇÃO CRÍTICA: Lógica simplificada e direta
        if (this.activeAgreement) {
            // TEM acordo ativo
            if (!isVibePage && currentPage === 'mensagens.html') {
                // ⚠️ Está em mensagens.html com acordo ativo → REDIRECIONAR
                this.safeRedirectToVibeExclusive();
                return;
            }
        } else {
            // NÃO TEM acordo ativo
            if (isVibePage) {
                // ⚠️ Está em vibe-exclusive sem acordo → REDIRECIONAR
                this.safeRedirectToMessages();
                return;
            }
        }

        this.updateUI();
    }

    safeRedirectToVibeExclusive() {
        if (this.isVibeExclusivePage()) return;
        
        // ⭐⭐ CORREÇÃO: Redirecionamento IMEDIATO e FORÇADO
        window.location.href = 'vibe-exclusive.html';
    }

    safeRedirectToMessages() {
        if (window.location.pathname.includes('mensagens.html')) return;
        
        window.location.href = 'mensagens.html';
    }

    handleNoAuth() {
        const publicPages = ['login.html', 'cadastro.html', 'index.html', ''];
        const currentPage = window.location.pathname.split('/').pop() || '';
        
        if (!publicPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }

    updateUI() {
        if (this.activeAgreement) {
            this.addVibeIndicator();
        } else {
            this.removeVibeIndicator();
        }
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

    startPeriodicCheck() {
        setInterval(async () => {
            await this.checkAuthAndVibe();
        }, 10000); // Verifica a cada 10 segundos
    }

    startRealTimeListener() {
        if (!this.currentUser) return;

        this.supabase
            .channel('global_vibe_updates')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'fidelity_agreements'
                },
                (payload) => {
                    const userId = this.currentUser?.id;
                    if (!userId) return;

                    const isRelevant = 
                        payload.new?.user_a === userId || 
                        payload.new?.user_b === userId ||
                        payload.old?.user_a === userId || 
                        payload.old?.user_b === userId;

                    if (isRelevant) {
                        this.checkAuthAndVibe();
                    }
                }
            )
            .subscribe();
    }

    disableRedirect() {
        this.redirectEnabled = false;
    }

    enableRedirect() {
        this.redirectEnabled = true;
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

// ⭐⭐ CORREÇÃO: Inicialização IMEDIATA e FORÇADA
function initializeAuthVibe() {
    if (!window.AuthVibeSystem) {
        window.AuthVibeSystem = new AuthVibeSystem();
    }
}

// Inicializar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuthVibe);
} else {
    initializeAuthVibe();
}

// Inicializar também com um timeout de segurança
setTimeout(initializeAuthVibe, 1000);

// Funções globais
window.checkVibeStatus = async function() {
    if (window.AuthVibeSystem) {
        return await window.AuthVibeSystem.forceCheck();
    }
    return null;
};

window.disableVibeRedirect = function() {
    if (window.AuthVibeSystem) {
        window.AuthVibeSystem.disableRedirect();
    }
};

window.enableVibeRedirect = function() {
    if (window.AuthVibeSystem) {
        window.AuthVibeSystem.enableRedirect();
    }
};

window.goToVibeExclusive = function() {
    window.location.href = 'vibe-exclusive.html';
};

window.goToNormalMessages = function() {
    window.location.href = 'mensagens.html';
};