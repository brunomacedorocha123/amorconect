// auth-vibe.js - Sistema de Autenticação e Redirecionamento Vibe Exclusive
class AuthVibeSystem {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.activeAgreement = null;
        this.isChecking = false;
        this.initialized = false;
        
        this.initialize();
    }

    async initialize() {
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
            this.initialized = true;
            
        } catch (error) {
            // Inicialização silenciosa
        }
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
            
            const isVibePage = window.location.pathname.includes('vibe-exclusive') || 
                              window.location.pathname.includes('vibe-exclusivo');
            
            const { data: agreement, error: agreementError } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            this.activeAgreement = agreementError ? null : (agreement && agreement.has_active_agreement ? agreement : null);

            // LÓGICA PRINCIPAL CORRIGIDA
            if (this.activeAgreement && !isVibePage) {
                this.redirectToVibeExclusive();
                return;
            }

            if (!this.activeAgreement && isVibePage) {
                this.redirectToMessages();
                return;
            }
            
        } catch (error) {
            // Silencioso
        } finally {
            this.isChecking = false;
        }
    }

    redirectToVibeExclusive() {
        if (window.location.href.includes('vibe-exclusive') || 
            window.location.href.includes('vibe-exclusivo')) return;
        
        setTimeout(() => {
            window.location.replace('vibe-exclusive.html');
        }, 100);
    }

    redirectToMessages() {
        if (window.location.href.includes('mensagens')) return;
        
        setTimeout(() => {
            window.location.replace('mensagens.html');
        }, 100);
    }

    handleNoAuth() {
        const publicPages = ['login.html', 'cadastro.html', 'index.html', ''];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (!publicPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }
}

// Inicialização automática e FORÇADA
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.AuthVibeSystem = new AuthVibeSystem();
        
        // Verificação extra para páginas de mensagens
        if (window.location.pathname.includes('mensagens')) {
            setTimeout(() => {
                if (window.AuthVibeSystem) {
                    window.AuthVibeSystem.checkAuthAndVibe();
                }
            }, 500);
        }
    }, 100);
});