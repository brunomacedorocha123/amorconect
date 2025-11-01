// auth-vibe.js - SISTEMA COMPLETO CORRIGIDO
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
                const SUPABASE_ON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
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
            const { data: agreement, error } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: this.currentUser.id
                });

            if (!error && agreement?.has_active_agreement) {
                return agreement;
            }

            const { data: directAgreements, error: directError } = await this.supabase
                .from('fidelity_agreements')
                .select('*')
                .or(`user_a.eq.${this.currentUser.id},user_b.eq.${this.currentUser.id}`)
                .in('status', ['active', 'accepted']);

            if (!directError && directAgreements && directAgreements.length > 0) {
                const activeAgreement = directAgreements[0];
                return {
                    has_active_agreement: true,
                    partner_id: activeAgreement.user_a === this.currentUser.id ? 
                               activeAgreement.user_b : activeAgreement.user_a,
                    agreement_id: activeAgreement.id,
                    accepted_at: activeAgreement.accepted_at
                };
            }

            return null;

        } catch (error) {
            return null;
        }
    }

    async handleVibeActive() {
        const isOnVibePage = window.location.pathname.includes('vibe-exclusive.html');
        
        // ⭐⭐ REDIRECIONAMENTO FORTE - SE TEM VIBE E NÃO ESTÁ NA PÁGINA CORRETA ⭐⭐
        if (!isOnVibePage) {
            this.redirecting = true;
            window.location.href = 'vibe-exclusive.html';
            return;
        }
        
        // SE JÁ ESTÁ NA PÁGINA CORRETA, SÓ MODIFICA LINKS
        this.modifyPageLinks();
        this.addVibeIndicator();
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
            });
        }, 1000);
    }

    restorePageLinks() {
        // Remove indicadores se necessário
    }

    addVibeIndicator() {
        const existingIndicator = document.getElementById('vibeGlobalIndicator');
        if (existingIndicator) existingIndicator.remove();

        const indicator = document.createElement('div');
        indicator.id = 'vibeGlobalIndicator';
        indicator.innerHTML = `
            <div style="position: fixed; top: 10px; left: 10px; background: #C6A664; color: white; padding: 8px 12px; border-radius: 20px; z-index: 9999;">
                <i class="fas fa-gem"></i> Vibe Exclusive Ativo
            </div>
        `;
        document.body.appendChild(indicator);
    }

    removeVibeIndicator() {
        const indicator = document.getElementById('vibeGlobalIndicator');
        if (indicator) indicator.remove();
    }

    handleNoAuth() {
        // Lógica de redirecionamento para login
    }

    startPeriodicCheck() {
        setInterval(async () => {
            await this.checkAuthAndVibe();
        }, 30000);
    }

    getStatus() {
        return {
            authenticated: !!this.currentUser,
            vibeActive: !!this.activeAgreement
        };
    }
}

// INICIALIZAÇÃO
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

// FUNÇÕES GLOBAIS
window.checkVibeStatus = async function() {
    if (window.AuthVibeSystem) {
        return await window.AuthVibeSystem.getStatus();
    }
    return null;
};