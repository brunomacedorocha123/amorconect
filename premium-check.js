// premium-check.js - Sistema de verificação Free vs Premium
const PremiumManager = {
    // VERIFICAR SE USUÁRIO É PREMIUM
    async checkPremiumStatus() {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                return false;
            }

            const { data, error } = await supabase
                .from('user_subscriptions')
                .select('status, expires_at')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .gte('expires_at', new Date().toISOString())
                .single();

            if (error) {
                return false;
            }

            return !error && data !== null;
        } catch (error) {
            return false;
        }
    },

    // VERIFICAR SE PODE VER GALERIA COMPLETA
    async canViewFullGallery() {
        return await this.checkPremiumStatus();
    },

    // VERIFICAR SE PODE USAR MODO INVISÍVEL
    async canUseInvisibleMode() {
        return await this.checkPremiumStatus();
    },

    // OBTER INFORMAÇÕES DO PLANO ATUAL
    async getPlanInfo() {
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                return this.getDefaultFreePlan();
            }
            
            const isPremium = await this.checkPremiumStatus();
            
            if (isPremium) {
                const { data } = await supabase
                    .from('user_subscriptions')
                    .select('expires_at, plan_name')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .single();

                const daysRemaining = data?.expires_at ? 
                    Math.ceil((new Date(data.expires_at) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

                return {
                    is_premium: true,
                    plan_name: data?.plan_name || 'Premium',
                    expires_at: data?.expires_at,
                    days_remaining: daysRemaining > 0 ? daysRemaining : 0
                };
            }
            
            return this.getDefaultFreePlan();
        } catch (error) {
            return this.getDefaultFreePlan();
        }
    },

    // PLANO FREE PADRÃO
    getDefaultFreePlan() {
        return {
            is_premium: false,
            plan_name: 'Free',
            expires_at: null,
            days_remaining: 0
        };
    },

    // ATUALIZAR UI COM STATUS PREMIUM
    async updateUIWithPremiumStatus() {
        try {
            const planInfo = await this.getPlanInfo();
            
            // Atualizar badge no header
            await this.updatePremiumBadge(planInfo);
            
            // Atualizar informações do plano
            await this.updatePlanInfo(planInfo);
            
            // Atualizar seções premium/free
            await this.updatePremiumSections(planInfo);
            
        } catch (error) {
            // Silencioso em produção
        }
    },

    // ATUALIZAR BADGE PREMIUM
    async updatePremiumBadge(planInfo) {
        const premiumBadge = document.getElementById('premiumBadge');
        if (premiumBadge) {
            if (planInfo.is_premium) {
                premiumBadge.innerHTML = `<i class="fas fa-crown"></i> Premium`;
                premiumBadge.className = 'premium-badge active';
            } else {
                premiumBadge.innerHTML = `<i class="fas fa-user"></i> Free`;
                premiumBadge.className = 'premium-badge free';
            }
        }
    },

    // ATUALIZAR INFORMAÇÕES DO PLANO
    async updatePlanInfo(planInfo) {
        const planInfoElement = document.getElementById('planInfo');
        if (planInfoElement) {
            if (planInfo.is_premium) {
                planInfoElement.innerHTML = `
                    <div class="plan-status premium">
                        <i class="fas fa-crown"></i>
                        <div>
                            <strong>Plano ${planInfo.plan_name}</strong>
                            <span>Expira em: ${planInfo.days_remaining} dias</span>
                        </div>
                    </div>
                `;
            } else {
                planInfoElement.innerHTML = `
                    <div class="plan-status free">
                        <i class="fas fa-user"></i>
                        <div>
                            <strong>Plano Free</strong>
                            <a href="pricing.html" class="upgrade-link">Fazer upgrade</a>
                        </div>
                    </div>
                `;
            }
        }
    },

    // ATUALIZAR SEÇÕES PREMIUM/FREE
    async updatePremiumSections(planInfo) {
        const freeElements = document.querySelectorAll('[data-free-only]');
        const premiumElements = document.querySelectorAll('[data-premium-only]');
        
        if (planInfo.is_premium) {
            freeElements.forEach(el => el.style.display = 'none');
            premiumElements.forEach(el => el.style.display = 'block');
            
            // Atualiza botão de upgrade para gerenciar assinatura
            const upgradeBtn = document.getElementById('upgradePlanBtn');
            if (upgradeBtn) {
                upgradeBtn.innerHTML = '<i class="fas fa-crown"></i> Gerenciar Assinatura';
                upgradeBtn.href = 'subscription.html';
            }
        } else {
            freeElements.forEach(el => el.style.display = 'block');
            premiumElements.forEach(el => el.style.display = 'none');
        }
    },

    // VERIFICAR E ATUALIZAR STATUS PERIODICAMENTE
    startPremiumStatusMonitor() {
        setInterval(async () => {
            await this.updateUIWithPremiumStatus();
        }, 30000);
    }
};

// Inicializar automaticamente quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(async () => {
        await PremiumManager.updateUIWithPremiumStatus();
        PremiumManager.startPremiumStatusMonitor();
    }, 1000);
});

// Exportar para uso global
window.PremiumManager = PremiumManager;