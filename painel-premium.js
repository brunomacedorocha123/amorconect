// ==================== SISTEMA PREMIUM COMPLETO ====================
console.log('⭐ painel-premium.js carregando...');

// ==================== GESTOR PREMIUM ====================
const PremiumManager = {
    async checkPremiumStatus() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return false;
            
            console.log('🔍 Verificando status premium para:', user.id);
            
            // Primeiro verificar na tabela de assinaturas
            const { data: subscription, error: subError } = await supabase
                .from('user_subscriptions')
                .select(`
                    id, 
                    status, 
                    expires_at,
                    plan:subscription_plans(name, period_days)
                `)
                .eq('user_id', user.id)
                .eq('status', 'active')
                .gt('expires_at', new Date().toISOString())
                .single();

            if (!subError && subscription) {
                console.log('🎉 Assinatura ativa encontrada:', subscription);
                await this.syncProfileWithSubscription(user.id, subscription);
                return true;
            }

            console.log('ℹ️ Nenhuma assinatura ativa encontrada');
            
            // Verificar se o perfil está correto
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('is_premium, premium_expires_at, is_invisible')
                .eq('id', user.id)
                .single();
            
            if (profileError) {
                console.error('Erro ao verificar perfil:', profileError);
                return false;
            }

            console.log('📊 Status no perfil:', profile);
            
            // Se o perfil diz que é premium mas não tem assinatura, corrigir
            if (profile.is_premium) {
                console.warn('⚠️ Perfil marcado como premium sem assinatura ativa! Corrigindo...');
                await this.fixPremiumStatus(user.id, false);
                return false;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ Erro na verificação premium:', error);
            return false;
        }
    },

    async syncProfileWithSubscription(userId, subscription) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    is_premium: true,
                    premium_expires_at: subscription.expires_at,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error('❌ Erro ao sincronizar perfil:', error);
            } else {
                console.log('✅ Perfil sincronizado com assinatura');
            }
        } catch (error) {
            console.error('Erro na sincronização:', error);
        }
    },

    async fixPremiumStatus(userId, shouldBePremium) {
        try {
            const { error } = await supabase
                .from('profiles')
                .update({ 
                    is_premium: shouldBePremium,
                    premium_expires_at: shouldBePremium ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', userId);

            if (error) {
                console.error('❌ Erro ao corrigir status:', error);
            } else {
                console.log('✅ Status premium corrigido para:', shouldBePremium);
            }
        } catch (error) {
            console.error('Erro na correção:', error);
        }
    },

    async getPremiumBenefits() {
        return {
            messages: 'Mensagens ilimitadas',
            history: 'Histórico permanente',
            invisible: 'Modo invisível',
            visitors: 'Ver quem te visitou',
            gallery: 'Galeria premium',
            priority: 'Perfil destacado'
        };
    }
};

// ==================== ATUALIZAÇÃO DE STATUS DO PLANO ====================
async function updatePlanStatus() {
    try {
        const isPremium = await PremiumManager.checkPremiumStatus();
        const planCard = document.getElementById('planStatusCard');
        const planBadge = document.getElementById('planBadge');
        const planDescription = document.getElementById('planDescription');
        const planActions = document.getElementById('planActions');

        if (isPremium) {
            console.log('🎉 Atualizando interface para PREMIUM');
            planCard.classList.add('premium');
            planBadge.textContent = 'PREMIUM';
            planBadge.className = 'plan-badge premium';
            planDescription.textContent = 'Plano Premium com todos os benefícios ativos!';
            planActions.innerHTML = `
                <button class="btn btn-primary" onclick="window.location.href='mensagens.html'">
                    🚀 Ir para Mensagens
                </button>
            `;
            
            const planFeatures = document.querySelector('.plan-features');
            if (planFeatures) {
                planFeatures.innerHTML = `
                    <div class="feature-item">
                        <span class="feature-icon">💬</span>
                        <span class="feature-text">Mensagens ilimitadas</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🕒</span>
                        <span class="feature-text">Histórico permanente</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">👻</span>
                        <span class="feature-text">Modo invisível</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">👀</span>
                        <span class="feature-text">Ver visitantes</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon">🖼️</span>
                        <span class="feature-text">Galeria premium</span>
                    </div>
                `;
            }
        } else {
            console.log('ℹ️ Mantendo interface GRATUITA');
            planCard.classList.remove('premium');
            planBadge.textContent = 'GRATUITO';
            planBadge.className = 'plan-badge gratuito';
            planDescription.textContent = 'Plano gratuito com funcionalidades básicas';
            planActions.innerHTML = `
                <a href="princing.html" class="btn btn-primary">⭐ Fazer Upgrade</a>
            `;
            
            const planFeatures = document.querySelector('.plan-features');
            if (planFeatures) {
                planFeatures.innerHTML = `
                    <div class="feature-item">
                        <span class="feature-icon"><i class="fas fa-comment"></i></span>
                        <span class="feature-text">5 mensagens por dia</span>
                    </div>
                    <div class="feature-item">
                        <span class="feature-icon"><i class="fas fa-history"></i></span>
                        <span class="feature-text">Histórico de 2 dias</span>
                    </div>
                `;
            }
        }

        console.log(`✅ Status do plano: ${isPremium ? 'PREMIUM' : 'GRATUITO'}`);
        
        // Atualizar galeria quando o status mudar
        if (window.galeriaSystem) {
            await window.galeriaSystem.toggleGallerySection();
        }
        
    } catch (error) {
        console.error('❌ Erro ao atualizar status do plano:', error);
    }
}

// ==================== ATUALIZAR STATUS PREMIUM NA INTERFACE ====================
async function updatePremiumStatus() {
    try {
        const isPremium = await PremiumManager.checkPremiumStatus();
        
        if (isPremium) {
            console.log('✅ Usuário é Premium - adicionando badges');
            
            // Badge no header
            const userInfo = document.querySelector('.user-info');
            if (userInfo && !userInfo.querySelector('.premium-badge')) {
                const badge = document.createElement('span');
                badge.className = 'premium-badge';
                badge.textContent = '⭐ PREMIUM';
                badge.style.cssText = `
                    background: var(--secondary);
                    color: var(--primary);
                    padding: 2px 8px;
                    border-radius: 10px;
                    font-size: 0.7rem;
                    margin-left: 8px;
                    font-weight: bold;
                `;
                userInfo.appendChild(badge);
            }

            // Badge no mobile
            const mobileUserInfo = document.querySelector('.mobile-user-info');
            if (mobileUserInfo && !mobileUserInfo.querySelector('.premium-badge')) {
                const mobileBadge = document.createElement('span');
                mobileBadge.className = 'premium-badge';
                mobileBadge.textContent = '⭐ PREMIUM';
                mobileBadge.style.cssText = `
                    background: var(--secondary);
                    color: var(--primary);
                    padding: 4px 12px;
                    border-radius: 10px;
                    font-size: 0.8rem;
                    margin-top: 8px;
                    font-weight: bold;
                    display: block;
                `;
                mobileUserInfo.appendChild(mobileBadge);
            }
        } else {
            console.log('ℹ️ Usuário é Gratuito - removendo badges');
            
            // Remover badges se existirem
            const badges = document.querySelectorAll('.premium-badge');
            badges.forEach(badge => badge.remove());
        }
    } catch (error) {
        console.error('❌ Erro ao verificar status premium:', error);
    }
}

// ==================== SISTEMA DE MODO INVISÍVEL ====================
async function loadInvisibleModeStatus() {
    try {
        console.log('👻 Carregando status do modo invisível...');
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('is_invisible, is_premium')
            .eq('id', currentUser.id)
            .single();
            
        if (error) {
            console.error('❌ Erro ao carregar modo invisível:', error);
            return;
        }
        
        const toggle = document.getElementById('invisibleModeToggle');
        const statusText = document.getElementById('invisibleStatus');
        const freeMessage = document.getElementById('invisibleFreeMessage');
        
        // Verificar se é premium
        const isPremium = await PremiumManager.checkPremiumStatus();
        
        if (!isPremium) {
            // Usuário free - mostrar mensagem e desabilitar toggle
            console.log('ℹ️ Usuário free - modo invisível não disponível');
            if (toggle) {
                toggle.disabled = true;
                toggle.checked = false;
            }
            if (statusText) statusText.textContent = 'Apenas Premium';
            if (freeMessage) freeMessage.style.display = 'flex';
            return;
        }
        
        // Usuário premium - configurar toggle
        const isInvisible = profile.is_invisible || false;
        console.log(`✅ Status do modo invisível: ${isInvisible ? 'ATIVO' : 'INATIVO'}`);
        
        if (toggle) {
            toggle.checked = isInvisible;
            toggle.disabled = false;
            
            // Event listener para toggle
            toggle.onchange = function() {
                toggleInvisibleMode(this.checked);
            };
        }
        
        if (statusText) {
            statusText.textContent = isInvisible ? 'Ativado' : 'Desativado';
            statusText.className = isInvisible ? 'toggle-status active' : 'toggle-status inactive';
        }
        
        if (freeMessage) {
            freeMessage.style.display = 'none';
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar modo invisível:', error);
    }
}

async function toggleInvisibleMode(isInvisible) {
    try {
        console.log(`👻 Alternando modo invisível para: ${isInvisible}`);
        
        const isPremium = await PremiumManager.checkPremiumStatus();
        if (!isPremium) {
            showNotification('❌ Apenas usuários Premium podem usar o modo invisível!', 'error');
            document.getElementById('invisibleModeToggle').checked = false;
            return;
        }
        
        // Update direto no banco
        const { error } = await supabase
            .from('profiles')
            .update({ 
                is_invisible: isInvisible,
                updated_at: new Date().toISOString()
            })
            .eq('id', currentUser.id);
            
        if (error) {
            console.error('❌ Erro ao atualizar modo invisível:', error);
            throw error;
        }
        
        // Atualizar interface
        const statusText = document.getElementById('invisibleStatus');
        if (statusText) {
            statusText.textContent = isInvisible ? 'Ativado' : 'Desativado';
            statusText.className = isInvisible ? 'toggle-status active' : 'toggle-status inactive';
        }
        
        console.log(`✅ Modo invisível ${isInvisible ? 'ativado' : 'desativado'}`);
        showNotification(`👻 Modo invisível ${isInvisible ? 'ativado' : 'desativado'}!`, 'success');
        
    } catch (error) {
        console.error('❌ Erro ao alterar modo invisível:', error);
        showNotification('❌ Erro ao alterar modo invisível', 'error');
        
        // Reverter toggle em caso de erro
        const toggle = document.getElementById('invisibleModeToggle');
        if (toggle) {
            toggle.checked = !isInvisible;
            console.log('🔄 Toggle revertido devido ao erro');
        }
    }
}

// ==================== SISTEMA DE BENEFÍCIOS PREMIUM ====================
async function showPremiumBenefits() {
    try {
        const benefits = await PremiumManager.getPremiumBenefits();
        const benefitsHTML = `
            <div class="premium-benefits-modal">
                <div class="benefits-header">
                    <h3>⭐ Benefícios Premium</h3>
                    <p>Descubra tudo que você ganha sendo Premium</p>
                </div>
                <div class="benefits-grid">
                    ${Object.entries(benefits).map(([key, benefit]) => `
                        <div class="benefit-item">
                            <div class="benefit-icon">🎯</div>
                            <div class="benefit-text">${benefit}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="benefits-actions">
                    <a href="princing.html" class="btn btn-premium">Quero ser Premium</a>
                    <button class="btn btn-secondary" onclick="closeBenefitsModal()">Fechar</button>
                </div>
            </div>
        `;
        
        // Criar modal de benefícios
        const modal = document.createElement('div');
        modal.className = 'premium-benefits-overlay';
        modal.innerHTML = benefitsHTML;
        document.body.appendChild(modal);
        
        // Estilos para o modal
        const styles = `
            .premium-benefits-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
                padding: 20px;
            }
            .premium-benefits-modal {
                background: var(--white);
                border-radius: var(--radius);
                padding: 2rem;
                max-width: 500px;
                width: 100%;
                border: 3px solid var(--secondary);
                box-shadow: var(--shadow);
            }
            .benefits-header {
                text-align: center;
                margin-bottom: 2rem;
            }
            .benefits-header h3 {
                color: var(--primary);
                margin-bottom: 0.5rem;
            }
            .benefits-grid {
                display: grid;
                gap: 1rem;
                margin-bottom: 2rem;
            }
            .benefit-item {
                display: flex;
                align-items: center;
                gap: 1rem;
                padding: 1rem;
                background: var(--background);
                border-radius: var(--radius);
                border: 2px solid var(--secondary);
            }
            .benefit-icon {
                font-size: 1.5rem;
            }
            .benefit-text {
                font-weight: 500;
                color: var(--text);
            }
            .benefits-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
            }
        `;
        
        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
        
    } catch (error) {
        console.error('❌ Erro ao mostrar benefícios:', error);
    }
}

function closeBenefitsModal() {
    const modal = document.querySelector('.premium-benefits-overlay');
    if (modal) {
        modal.remove();
    }
}

// ==================== VERIFICAÇÃO PERIÓDICA DE STATUS ====================
function startPremiumStatusChecker() {
    // Verificar status a cada 5 minutos
    setInterval(async () => {
        console.log('🔄 Verificando status premium...');
        await updatePremiumStatus();
        await updatePlanStatus();
    }, 300000);
    
    // Verificar quando a página fica visível
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            console.log('🔄 Página visível - verificando status premium');
            setTimeout(async () => {
                await updatePremiumStatus();
                await updatePlanStatus();
            }, 1000);
        }
    });
}

// ==================== INICIALIZAÇÃO DO MÓDULO PREMIUM ====================
document.addEventListener('DOMContentLoaded', function() {
    // Iniciar verificador de status
    startPremiumStatusChecker();
    
    // Configurar evento para mostrar benefícios
    const premiumBadges = document.querySelectorAll('.premium-badge, .plan-badge.premium');
    premiumBadges.forEach(badge => {
        badge.addEventListener('click', showPremiumBenefits);
    });
});

// ==================== EXPORTAÇÕES GLOBAIS ====================
window.PremiumManager = PremiumManager;
window.updatePlanStatus = updatePlanStatus;
window.updatePremiumStatus = updatePremiumStatus;
window.loadInvisibleModeStatus = loadInvisibleModeStatus;
window.toggleInvisibleMode = toggleInvisibleMode;
window.showPremiumBenefits = showPremiumBenefits;
window.closeBenefitsModal = closeBenefitsModal;

console.log('✅ painel-premium.js carregado e pronto!');