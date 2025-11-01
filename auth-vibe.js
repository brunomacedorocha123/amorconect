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
            console.log('🔐 Iniciando AuthVibeSystem...');
            
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
            console.log('✅ AuthVibeSystem inicializado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro na inicialização do AuthVibeSystem:', error);
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
            
            // ⭐⭐ VERIFICAÇÃO CRÍTICA: Evitar loop
            const isVibePage = this.isVibeExclusivePage();
            
            // Verificar acordo ativo
            const { data: agreement, error: agreementError } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: user.id
                });

            if (agreementError) {
                console.error('Erro ao verificar acordo:', agreementError);
                this.activeAgreement = null;
            } else {
                this.activeAgreement = agreement?.has_active_agreement ? agreement : null;
            }

            console.log('🔍 Status Vibe:', {
                user: user.id,
                isVibePage: isVibePage,
                hasAgreement: !!this.activeAgreement,
                agreement: this.activeAgreement
            });

            // ⭐⭐ LÓGICA CORRIGIDA: Aplicar redirecionamento seguro
            await this.applySafeRedirectLogic(isVibePage);
            
        } catch (error) {
            console.error('Erro na verificação:', error);
        } finally {
            this.isChecking = false;
        }
    }

    // ⭐⭐ FUNÇÃO NOVA: Verificação segura de página Vibe
    isVibeExclusivePage() {
        return window.location.pathname.includes('vibe-exclusive') || 
               window.location.pathname.includes('vibe-exclusivo');
    }

    // ⭐⭐ FUNÇÃO CORRIGIDA: Lógica de redirecionamento sem loop
    async applySafeRedirectLogic(isVibePage) {
        if (!this.redirectEnabled) return;

        console.log('🔄 Aplicando lógica de redirecionamento:', {
            isVibePage,
            hasAgreement: !!this.activeAgreement,
            currentPath: window.location.pathname
        });

        // CASO 1: Usuário está na página Vibe mas NÃO tem acordo
        if (isVibePage && !this.activeAgreement) {
            console.log('🚫 Sem acordo - Redirecionando para mensagens');
            this.safeRedirectToMessages();
            return;
        }

        // CASO 2: Usuário tem acordo ativo mas NÃO está na página Vibe
        if (this.activeAgreement && !isVibePage) {
            const isAllowed = this.isAllowedPage();
            console.log('📄 Página atual permitida?', isAllowed);
            
            if (!isAllowed) {
                console.log('🔒 Redirecionando para Vibe Exclusive');
                this.safeRedirectToVibeExclusive();
                return;
            }
        }

        // CASO 3: Tudo normal - apenas atualizar UI
        console.log('✅ Status OK - Atualizando UI');
        this.updateUI();
    }

    // ⭐⭐ FUNÇÃO CORRIGIDA: Páginas permitidas durante Vibe Exclusive
    isAllowedPage() {
        const allowedPages = [
            'painel.html',
            'configuracoes.html', 
            'pricing.html',
            'bloqueados.html',
            'logout.html',
            'conta-excluida.html',
            'vibe-exclusive.html',
            'vibe-exclusivo.html'
        ];
        
        const currentPage = window.location.pathname.split('/').pop() || '';
        const isAllowed = allowedPages.includes(currentPage);
        
        console.log('📄 Verificação de página:', {
            currentPage,
            allowedPages,
            isAllowed
        });
        
        return isAllowed;
    }

    // ⭐⭐ FUNÇÃO NOVA: Redirecionamento seguro para Vibe
    safeRedirectToVibeExclusive() {
        if (this.isVibeExclusivePage()) {
            console.log('⚠️ Já está na página Vibe - Evitando loop');
            return;
        }
        
        console.log('🔄 Redirecionando para Vibe Exclusive...');
        setTimeout(() => {
            window.location.replace('vibe-exclusive.html');
        }, 100);
    }

    // ⭐⭐ FUNÇÃO NOVA: Redirecionamento seguro para Mensagens
    safeRedirectToMessages() {
        if (window.location.pathname.includes('mensagens.html')) {
            console.log('⚠️ Já está na página de mensagens - Evitando loop');
            return;
        }
        
        console.log('🔄 Redirecionando para Mensagens...');
        setTimeout(() => {
            window.location.replace('mensagens.html');
        }, 100);
    }

    handleNoAuth() {
        const publicPages = ['login.html', 'cadastro.html', 'index.html', ''];
        const currentPage = window.location.pathname.split('/').pop() || '';
        
        console.log('🔐 Verificação de autenticação:', {
            currentPage,
            isPublic: publicPages.includes(currentPage)
        });
        
        if (!publicPages.includes(currentPage)) {
            console.log('🚫 Não autenticado - Redirecionando para login');
            window.location.href = 'login.html';
        }
    }

    updateUI() {
        console.log('🎨 Atualizando UI com status:', {
            hasAgreement: !!this.activeAgreement,
            isAllowedPage: this.isAllowedPage()
        });

        if (this.activeAgreement && this.isAllowedPage()) {
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
        console.log('📍 Indicador Vibe adicionado');
    }

    removeVibeIndicator() {
        const existingIndicator = document.getElementById('vibeGlobalIndicator');
        if (existingIndicator) {
            existingIndicator.remove();
            console.log('📍 Indicador Vibe removido');
        }
    }

    startPeriodicCheck() {
        console.log('⏰ Iniciando verificações periódicas...');
        setInterval(async () => {
            await this.checkAuthAndVibe();
        }, 30000); // 30 segundos
    }

    startRealTimeListener() {
        if (!this.currentUser) {
            console.log('⏳ Aguardando usuário para iniciar listener...');
            return;
        }

        console.log('🔔 Iniciando listener em tempo real...');
        
        // Canal para atualizações de acordos
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
                    console.log('📢 Mudança detectada no acordo:', payload);
                    
                    const userId = this.currentUser?.id;
                    if (!userId) return;

                    const isRelevant = 
                        payload.new?.user_a === userId || 
                        payload.new?.user_b === userId ||
                        payload.old?.user_a === userId || 
                        payload.old?.user_b === userId;

                    if (isRelevant) {
                        console.log('🔄 Mudança relevante - Recarregando verificação...');
                        this.checkAuthAndVibe();
                    }
                }
            )
            .subscribe((status) => {
                console.log('📡 Status do listener:', status);
            });
    }

    // ⭐⭐ MÉTODOS DE CONTROLE
    disableRedirect() {
        this.redirectEnabled = false;
        console.log('🚫 Redirecionamentos desativados');
    }

    enableRedirect() {
        this.redirectEnabled = true;
        console.log('✅ Redirecionamentos ativados');
    }

    getStatus() {
        return {
            authenticated: !!this.currentUser,
            vibeActive: !!this.activeAgreement,
            currentUser: this.currentUser,
            activeAgreement: this.activeAgreement,
            redirectEnabled: this.redirectEnabled
        };
    }

    async forceCheck() {
        console.log('🔍 Forçando verificação...');
        await this.checkAuthAndVibe();
        return this.getStatus();
    }

    // ⭐⭐ INTEGRAÇÃO COM MESSAGESSYSTEM
    setupMessagesSystemIntegration() {
        if (!window.MessagesSystem) {
            console.log('⏳ MessagesSystem não disponível para integração');
            return;
        }

        console.log('🔗 Integrando com MessagesSystem...');
        
        // Bloquear seleção de outras conversas durante Vibe Exclusive
        const originalSelectConversation = window.MessagesSystem.selectConversation;
        
        window.MessagesSystem.selectConversation = async function(otherUserId) {
            if (window.AuthVibeSystem && window.AuthVibeSystem.activeAgreement) {
                const partnerId = window.AuthVibeSystem.activeAgreement.partner_id;
                
                if (otherUserId !== partnerId) {
                    console.log('🚫 Tentativa de selecionar outra conversa durante Vibe Exclusive');
                    window.AuthVibeSystem.safeRedirectToVibeExclusive();
                    return;
                }
            }
            
            return originalSelectConversation.call(this, otherUserId);
        };

        console.log('✅ Integração com MessagesSystem concluída');
    }
}

// ⭐⭐ INICIALIZAÇÃO SEGURA
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM carregado - Iniciando AuthVibeSystem...');
    
    setTimeout(() => {
        if (!window.AuthVibeSystem) {
            window.AuthVibeSystem = new AuthVibeSystem();
            
            // Configurar integração após inicialização
            setTimeout(() => {
                if (window.AuthVibeSystem) {
                    window.AuthVibeSystem.setupMessagesSystemIntegration();
                }
            }, 2000);
        }
    }, 500);
});

// ⭐⭐ FUNÇÕES GLOBAIS PARA CONTROLE
window.checkVibeStatus = async function() {
    if (window.AuthVibeSystem) {
        const status = await window.AuthVibeSystem.forceCheck();
        console.log('📊 Status atual:', status);
        return status;
    }
    console.warn('⚠️ AuthVibeSystem não disponível');
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
    if (window.AuthVibeSystem) {
        window.AuthVibeSystem.safeRedirectToVibeExclusive();
    } else {
        window.location.href = 'vibe-exclusive.html';
    }
};

window.goToNormalMessages = function() {
    if (window.AuthVibeSystem) {
        window.AuthVibeSystem.safeRedirectToMessages();
    } else {
        window.location.href = 'mensagens.html';
    }
};

// ⭐⭐ PROTEÇÃO CONTRA SAÍDA ACIDENTAL
window.addEventListener('beforeunload', function(e) {
    if (window.AuthVibeSystem && 
        window.AuthVibeSystem.activeAgreement && 
        window.AuthVibeSystem.isVibeExclusivePage()) {
        
        // Não mostrar alerta para navegação interna
        if (e.target.activeElement && 
            (e.target.activeElement.href || e.target.activeElement.onclick)) {
            return;
        }
        
        e.preventDefault();
        e.returnValue = '💎 Você está em uma conexão Vibe Exclusive. Tem certeza que deseja sair?';
        return e.returnValue;
    }
});

console.log('🎯 AuthVibeSystem carregado e pronto!');