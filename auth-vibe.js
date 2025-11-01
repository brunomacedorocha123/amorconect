// auth-vibe.js - VERSÃO FUNCIONAL
class AuthVibeSystem {
    constructor() {
        this.supabase = null;
        this.currentUser = null;
        this.activeAgreement = null;
        this.isChecking = false;
        this.redirectEnabled = true;
        this.isInitialized = false;
        
        this.lastRedirectTime = 0;
        this.redirectCooldown = 2000;
        
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
            
            const agreement = await this.getActiveAgreement();
            this.activeAgreement = agreement;

            const isVibePage = this.isVibeExclusivePage();
            const isMessagesPage = this.isMessagesPage();

            await this.applyRedirectLogic(isVibePage, isMessagesPage);
            
        } catch (error) {
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

            const { data: directAgreement, error: directError } = await this.supabase
                .from('fidelity_agreements')
                .select('*')
                .or(`user_a.eq.${this.currentUser.id},user_b.eq.${this.currentUser.id}`)
                .eq('status', 'active')
                .single();

            if (!directError && directAgreement) {
                return {
                    has_active_agreement: true,
                    partner_id: directAgreement.user_a === this.currentUser.id ? 
                               directAgreement.user_b : directAgreement.user_a,
                    agreement_id: directAgreement.id,
                    accepted_at: directAgreement.accepted_at
                };
            }

            return null;

        } catch (error) {
            return null;
        }
    }

    isVibeExclusivePage() {
        const path = window.location.pathname.toLowerCase();
        return path.includes('vibe-exclusive') || path.includes('vibe-exclusivo');
    }

    isMessagesPage() {
        const path = window.location.pathname.toLowerCase();
        return path.includes('mensagens') || path.includes('messages');
    }

    async applyRedirectLogic(isVibePage, isMessagesPage) {
        if (!this.redirectEnabled) return;

        const now = Date.now();
        if (now - this.lastRedirectTime < this.redirectCooldown) return;

        if (this.activeAgreement) {
            if (isMessagesPage) {
                this.lastRedirectTime = now;
                window.location.href = 'vibe-exclusive.html';
                return;
            }
        } else {
            if (isVibePage) {
                this.lastRedirectTime = now;
                window.location.href = 'mensagens.html';
                return;
            }
        }

        this.updateUI();
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
        }, 10000);
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