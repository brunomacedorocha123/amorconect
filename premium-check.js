// premium-check.js - Sistema de verificação Free vs Premium
const PremiumManager = {
    // VERIFICAR SE USUÁRIO É PREMIUM
    async checkPremiumStatus() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;
            
            const { data, error } = await supabase
                .from('user_subscriptions')
                .select('status, expires_at')
                .eq('user_id', user.id)
                .eq('status', 'active')
                .gte('expires_at', new Date().toISOString())
                .single();

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
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            
            const isPremium = await this.checkPremiumStatus();
            
            if (isPremium) {
                const { data } = await supabase
                    .from('user_subscriptions')
                    .select('expires_at')
                    .eq('user_id', user.id)
                    .eq('status', 'active')
                    .single();

                const daysRemaining = data?.expires_at ? 
                    Math.ceil((new Date(data.expires_at) - new Date()) / (1000 * 60 * 60 * 24)) : 0;

                return {
                    is_premium: true,
                    plan_name: 'Premium',
                    expires_at: data?.expires_at,
                    days_remaining: daysRemaining
                };
            }
            
            return {
                is_premium: false,
                plan_name: 'Free',
                expires_at: null,
                days_remaining: 0
            };
        } catch (error) {
            return {
                is_premium: false,
                plan_name: 'Free', 
                expires_at: null,
                days_remaining: 0
            };
        }
    },

    // ATUALIZAR UI COM STATUS PREMIUM
    async updateUIWithPremiumStatus() {
        try {
            const planInfo = await this.getPlanInfo();
            
            // Atualizar badge no header
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

            // Atualizar informações do plano
            const planInfoElement = document.getElementById('planInfo');
            if (planInfoElement) {
                if (planInfo.is_premium) {
                    planInfoElement.innerHTML = `
                        <div class="plan-status premium">
                            <i class="fas fa-crown"></i>
                            <div>
                                <strong>Plano Premium</strong>
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

        } catch (error) {
            // Silencioso
        }
    }
};

// Inicializar automaticamente
document.addEventListener('DOMContentLoaded', function() {
    PremiumManager.updateUIWithPremiumStatus();
});