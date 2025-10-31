// auth-vibe.js - Sistema de Autenticação e Redirecionamento Vibe Exclusive
class AuthVibeSystem {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.activeAgreement = null;
        this.isChecking = false;
        this.redirectEnabled = true;
        
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
            this.startPeriodicCheck();
            this.startRealTimeListener();
            
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
            
            const isVibePage = window.location.pathname.includes('vibe-exclusivo');
            
            const { data: agreement, error: agreementError } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            this.activeAgreement = agreementError ? null : (agreement.has_active_agreement ? agreement : null);

            await this.applyRedirectLogic(isVibePage);
            
        } catch (error) {
            // Verificação silenciosa
        } finally {
            this.isChecking = false;
        }
    }

    async applyRedirectLogic(isVibePage) {
        if (!this.redirectEnabled) return;

        // Se está na página do Vibe mas não tem acordo → vai para mensagens
        if (isVibePage && !this.activeAgreement) {
            this.redirectToMessages();
            return;
        }

        // Se tem acordo ativo e NÃO está na página do Vibe
        if (this.activeAgreement && !isVibePage) {
            const isAllowedPage = this.isAllowedPage();
            
            // ⭐⭐ CORREÇÃO CRÍTICA: Se NÃO é página permitida → redireciona para Vibe
            if (!isAllowedPage) {
                this.redirectToVibeExclusive();
                return;
            }
        }

        this.updateUI();
    }

    isAllowedPage() {
        // ⭐⭐ CORREÇÃO: REMOVIDO 'mensagens.html' - durante Vibe Exclusive não pode acessar mensagens normais
        const allowedPages = [
            'painel.html',
            'configuracoes.html',
            'pricing.html',
            'bloqueados.html',
            'logout.html',
            'conta-excluida.html'
        ];
        
        const currentPage = window.location.pathname.split('/').pop();
        return allowedPages.includes(currentPage);
    }

    redirectToVibeExclusive() {
        if (window.location.href.includes('vibe-exclusivo')) return;
        
        console.log('🔄 Redirecionando para Vibe Exclusive...');
        setTimeout(() => {
            window.location.href = 'vibe-exclusivo.html';
        }, 100);
    }

    redirectToMessages() {
        if (window.location.href.includes('mensagens')) return;
        
        setTimeout(() => {
            window.location.href = 'mensagens.html';
        }, 100);
    }

    handleNoAuth() {
        const publicPages = ['login.html', 'cadastro.html', 'index.html', ''];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (!publicPages.includes(currentPage)) {
            window.location.href = 'login.html';
        }
    }

    updateUI() {
        if (this.activeAgreement && this.isAllowedPage()) {
            this.addVibeIndicator();
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

    startPeriodicCheck() {
        setInterval(async () => {
            await this.checkAuthAndVibe();
        }, 30000);
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
                    if (payload.new.user_a === this.currentUser.id || 
                        payload.new.user_b === this.currentUser.id) {
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
    }
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        window.AuthVibeSystem = new AuthVibeSystem();
    }, 500);
});

// Funções globais para controle manual
window.checkVibeStatus = async function() {
    if (window.AuthVibeSystem) {
        await window.AuthVibeSystem.forceCheck();
        return window.AuthVibeSystem.getStatus();
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
    window.location.href = 'vibe-exclusivo.html';
};

window.goToNormalMessages = function() {
    window.location.href = 'mensagens.html';
};

// Proteção contra saída acidental do Vibe Exclusive
window.addEventListener('beforeunload', function(e) {
    if (window.AuthVibeSystem && 
        window.AuthVibeSystem.activeAgreement && 
        window.location.href.includes('vibe-exclusivo')) {
        
        if (e.target.activeElement && 
            (e.target.activeElement.href || e.target.activeElement.onclick)) {
            return;
        }
        
        e.preventDefault();
        e.returnValue = 'Você está em uma conexão Vibe Exclusive. Tem certeza que deseja sair?';
        return e.returnValue;
    }
});

// Integração com MessagesSystem - Bloqueia seleção de outras conversas
if (window.MessagesSystem) {
    const originalSelectConversation = window.MessagesSystem.selectConversation;
    
    window.MessagesSystem.selectConversation = async function(otherUserId) {
        if (window.AuthVibeSystem && window.AuthVibeSystem.activeAgreement) {
            const partnerId = window.AuthVibeSystem.activeAgreement.partner_id;
            
            if (otherUserId !== partnerId) {
                window.AuthVibeSystem.redirectToVibeExclusive();
                return;
            }
        }
        
        return originalSelectConversation.call(this, otherUserId);
    };
}