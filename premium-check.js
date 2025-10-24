// premium-check.js - Sistema de verificação Free vs Premium
const PremiumManager = {
    // VERIFICAR SE USUÁRIO É PREMIUM (usando nossa função SQL)
    async checkPremiumStatus() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;
            
            // Usando a função SQL que você criou
            const { data, error } = await supabase
                .rpc('get_user_premium_status', { user_id: user.id });

            if (error || !data || data.length === 0) {
                return false;
            }
            
            return data[0].is_premium;
        } catch (error) {
            console.error('Erro ao verificar status premium:', error);
            return false;
        }
    },

    // VERIFICAR SE PODE ENVIAR MENSAGEM (Free: 5/dia, Premium: ilimitado)
    async canSendMessage() {
        try {
            const isPremium = await this.checkPremiumStatus();
            if (isPremium) return { canSend: true, reason: 'Premium: mensagens ilimitadas' };
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { canSend: false, reason: 'Usuário não autenticado' };
            
            const today = new Date().toISOString().split('T')[0];
            const { data: messagesToday, error } = await supabase
                .from('messages')
                .select('id')
                .eq('from_user_id', user.id)
                .gte('created_at', today + 'T00:00:00')
                .lte('created_at', today + 'T23:59:59');
            
            if (error) return { canSend: false, reason: 'Erro ao verificar mensagens' };
            
            const remaining = 5 - (messagesToday?.length || 0);
            return { 
                canSend: remaining > 0, 
                reason: remaining > 0 ? `Free: ${remaining}/5 mensagens hoje` : 'Limite free atingido (5/dia)'
            };
        } catch (error) {
            return { canSend: false, reason: 'Erro no sistema' };
        }
    },

    // VERIFICAR SE PODE ADICIONAR FOTO (Free: 1 foto, Premium: ilimitado)
    async canAddPhoto() {
        try {
            const isPremium = await this.checkPremiumStatus();
            if (isPremium) return { canAdd: true, reason: 'Premium: fotos ilimitadas' };
            
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { canAdd: false, reason: 'Usuário não autenticado' };
            
            const { data: photos, error } = await supabase
                .from('user_photos')
                .select('id')
                .eq('user_id', user.id);
            
            if (error) return { canAdd: false, reason: 'Erro ao verificar fotos' };
            
            const remaining = 1 - (photos?.length || 0);
            return { 
                canAdd: remaining > 0, 
                reason: remaining > 0 ? `Free: ${remaining}/1 foto` : 'Limite free atingido (1 foto)'
            };
        } catch (error) {
            return { canAdd: false, reason: 'Erro no sistema' };
        }
    },

    // VERIFICAR SE PODE VER GALERIA COMPLETA
    async canViewFullGallery() {
        const isPremium = await this.checkPremiumStatus();
        return { 
            canView: isPremium, 
            reason: isPremium ? 'Premium: galeria completa liberada' : '🔒 Galeria completa é exclusiva Premium'
        };
    },

    // VERIFICAR SE PODE USAR MODO INVISÍVEL
    async canUseInvisibleMode() {
        const isPremium = await this.checkPremiumStatus();
        return { 
            canUse: isPremium, 
            reason: isPremium ? 'Premium: modo invisível liberado' : '🔒 Modo invisível é exclusivo Premium'
        };
    },

    // REDIRECIONAR PARA UPGRADE SE NÃO FOR PREMIUM
    async redirectToUpgradeIfNeeded(featureName) {
        const isPremium = await this.checkPremiumStatus();
        if (!isPremium) {
            if (confirm(`⭐ ${featureName} - Recurso Premium\n\nDeseja fazer upgrade para desbloquear todos os recursos?`)) {
                window.location.href = 'pricing.html';
            }
            return false;
        }
        return true;
    },

    // OBTER INFORMAÇÕES DO PLANO ATUAL
    async getPlanInfo() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;
            
            const { data, error } = await supabase
                .rpc('get_user_premium_status', { user_id: user.id });

            if (error || !data || data.length === 0) {
                return {
                    is_premium: false,
                    plan_name: 'Free',
                    display_name: 'Plano Free',
                    expires_at: null,
                    days_remaining: 0
                };
            }
            
            const planData = data[0];
            return {
                is_premium: planData.is_premium,
                plan_name: planData.plan_name || 'Premium',
                display_name: planData.plan_name ? `Plano ${planData.plan_name}` : 'Plano Premium',
                expires_at: planData.expires_at,
                days_remaining: planData.days_remaining || 0,
                status: planData.subscription_status
            };
        } catch (error) {
            return {
                is_premium: false,
                plan_name: 'Free',
                display_name: 'Plano Free',
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
                    premiumBadge.innerHTML = `<i class="fas fa-crown"></i> ${planInfo.display_name}`;
                    premiumBadge.className = 'premium-badge active';
                } else {
                    premiumBadge.innerHTML = `<i class="fas fa-user"></i> Free`;
                    premiumBadge.className = 'premium-badge free';
                }
            }

            // Atualizar elementos premium-only
            const premiumElements = document.querySelectorAll('[data-premium-only]');
            premiumElements.forEach(el => {
                if (planInfo.is_premium) {
                    el.style.display = 'block';
                    el.classList.remove('premium-locked');
                } else {
                    el.style.display = 'none';
                    el.classList.add('premium-locked');
                }
            });

            // Atualizar elementos free-only
            const freeElements = document.querySelectorAll('[data-free-only]');
            freeElements.forEach(el => {
                el.style.display = planInfo.is_premium ? 'none' : 'block';
            });

            // Atualizar informações do plano
            const planInfoElement = document.getElementById('planInfo');
            if (planInfoElement) {
                if (planInfo.is_premium) {
                    planInfoElement.innerHTML = `
                        <div class="plan-status premium">
                            <i class="fas fa-crown"></i>
                            <strong>${planInfo.display_name}</strong>
                            <span>Expira em: ${planInfo.days_remaining} dias</span>
                        </div>
                    `;
                } else {
                    planInfoElement.innerHTML = `
                        <div class="plan-status free">
                            <i class="fas fa-user"></i>
                            <strong>Plano Free</strong>
                            <a href="pricing.html" class="upgrade-link">👉 Fazer upgrade para Premium</a>
                        </div>
                    `;
                }
            }

        } catch (error) {
            console.error('Erro ao atualizar UI premium:', error);
        }
    }
};

// Inicializar automaticamente se o script for carregado
document.addEventListener('DOMContentLoaded', function() {
    PremiumManager.updateUIWithPremiumStatus();
});