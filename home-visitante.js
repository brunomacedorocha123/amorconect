// home-visitante.js - Sistema de Visitantes na Home
const VisitorsSystem = {
    currentUser: null,
    isPremium: false,
    recentVisits: [],

    // INICIALIZAR SISTEMA
    async initialize() {
        try {
            await this.checkAuthentication();
            await this.checkPremiumStatus();
            await this.loadVisitors();
            this.setupEventListeners();
        } catch (error) {
            console.error('Erro ao inicializar sistema de visitantes:', error);
            this.showErrorState();
        }
    },

    // VERIFICAR AUTENTICAÇÃO
    async checkAuthentication() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            throw new Error('Usuário não autenticado');
        }
        this.currentUser = user;
    },

    // VERIFICAR STATUS PREMIUM
    async checkPremiumStatus() {
        try {
            if (window.PremiumManager) {
                this.isPremium = await PremiumManager.checkPremiumStatus();
            } else {
                // Fallback: verificar diretamente no banco
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', this.currentUser.id)
                    .single();
                this.isPremium = profile?.is_premium || false;
            }
        } catch (error) {
            this.isPremium = false;
        }
    },

    // CARREGAR VISITANTES
    async loadVisitors() {
        const container = document.getElementById('visitorsContainer');
        if (!container) return;

        // Mostrar loading
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Carregando visitas...</p>
            </div>
        `;

        try {
            if (this.isPremium) {
                await this.loadPremiumVisitors();
            } else {
                await this.loadFreeVisitors();
            }
        } catch (error) {
            this.showErrorState();
        }
    },

    // CARREGAR VISITANTES FREE (APENAS CONTADOR)
    async loadFreeVisitors() {
        const container = document.getElementById('visitorsContainer');
        
        try {
            // Buscar contagem total de visitas
            const { data: visits, error } = await supabase
                .from('profile_visits')
                .select('id')
                .eq('visited_id', this.currentUser.id);

            if (error) throw error;

            const visitCount = visits?.length || 0;

            // Mostrar estado free
            container.innerHTML = this.getFreeStateHTML(visitCount);

        } catch (error) {
            console.error('Erro ao carregar visitantes free:', error);
            this.showEmptyState();
        }
    },

    // CARREGAR VISITANTES PREMIUM (CARDS COMPLETOS)
    async loadPremiumVisitors() {
        const container = document.getElementById('visitorsContainer');
        
        try {
            // Buscar visitas recentes com dados dos visitantes
            const { data: visits, error } = await supabase
                .from('profile_visits')
                .select(`
                    visitor_id,
                    visited_at,
                    profiles:visitor_id (
                        nickname,
                        avatar_url,
                        display_city,
                        is_premium
                    )
                `)
                .eq('visited_id', this.currentUser.id)
                .order('visited_at', { ascending: false })
                .limit(6);

            if (error) throw error;

            this.recentVisits = visits || [];

            // Mostrar estado premium
            container.innerHTML = this.getPremiumStateHTML();

            // Mostrar/ocultar botão "Ver todos"
            this.toggleViewAllButton();

        } catch (error) {
            console.error('Erro ao carregar visitantes premium:', error);
            this.showEmptyState();
        }
    },

    // HTML PARA ESTADO FREE
    getFreeStateHTML(visitCount) {
        if (visitCount === 0) {
            return `
                <div class="visitors-empty-state">
                    <i class="fas fa-eye-slash"></i>
                    <h4>Nenhuma visita ainda</h4>
                    <p>Seu perfil ainda não foi visitado por outros usuários.</p>
                </div>
            `;
        }

        return `
            <div class="visitors-free-state">
                <div class="visitors-count">${visitCount}</div>
                <div class="visitors-count-label">
                    ${visitCount === 1 ? 'pessoa te visitou' : 'pessoas te visitaram'}
                </div>
                
                <div class="visitors-premium-cta">
                    <h4><i class="fas fa-crown"></i> Torne-se Premium</h4>
                    <p>Descubra quem visitou seu perfil e veja o histórico completo de visitas!</p>
                    <a href="pricing.html" class="btn-premium-small">
                        <i class="fas fa-crown"></i> Ver Planos
                    </a>
                </div>
            </div>
        `;
    },

    // HTML PARA ESTADO PREMIUM
    getPremiumStateHTML() {
        if (this.recentVisits.length === 0) {
            return `
                <div class="visitors-empty-state">
                    <i class="fas fa-eye-slash"></i>
                    <h4>Nenhuma visita ainda</h4>
                    <p>Seu perfil ainda não foi visitado por outros usuários.</p>
                    <p style="margin-top: 1rem; font-size: 0.8rem; color: var(--text-light);">
                        Quando alguém visitar, aparecerá aqui.
                    </p>
                </div>
            `;
        }

        const visitorsHTML = this.recentVisits.map(visit => {
            const profile = visit.profiles;
            const visitTime = this.formatVisitTime(visit.visited_at);
            const initials = this.getUserInitials(profile.nickname);
            
            return `
                <div class="visitor-card" onclick="VisitorsSystem.viewVisitorProfile('${visit.visitor_id}')">
                    <div class="visitor-header">
                        <div class="visitor-avatar">
                            ${profile.avatar_url ? 
                                `<img src="${profile.avatar_url}" alt="${profile.nickname}" 
                                      onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                                ''
                            }
                            <div class="avatar-fallback" style="${profile.avatar_url ? 'display:none' : 'display:flex'}">
                                ${initials}
                            </div>
                        </div>
                        <div class="visitor-info">
                            <div class="visitor-name">${profile.nickname || 'Usuário'}</div>
                            <div class="visitor-location">
                                <i class="fas fa-map-marker-alt"></i>
                                ${profile.display_city || 'Local não informado'}
                            </div>
                        </div>
                    </div>
                    <div class="visitor-details">
                        <div class="visitor-time">
                            <i class="fas fa-clock"></i>
                            ${visitTime}
                        </div>
                        ${profile.is_premium ? 
                            '<div class="visitor-premium-badge">Premium</div>' : 
                            '<div class="visitor-premium-badge free">Free</div>'
                        }
                    </div>
                </div>
            `;
        }).join('');

        return `
            <div class="visitors-premium-state">
                <div class="visitors-stats">
                    <div class="visitors-total">
                        Total: <strong>${this.recentVisits.length} visita(s)</strong>
                    </div>
                </div>
                <div class="visitors-grid">
                    ${visitorsHTML}
                </div>
            </div>
        `;
    },

    // FORMATAR TEMPO DA VISITA
    formatVisitTime(visitedAt) {
        const now = new Date();
        const visitDate = new Date(visitedAt);
        const diffMs = now - visitDate;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `Há ${diffMins} min`;
        if (diffHours < 24) return `Há ${diffHours} h`;
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return `Há ${diffDays} dias`;
        
        return visitDate.toLocaleDateString('pt-BR');
    },

    // INICIAIS DO USUÁRIO
    getUserInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
    },

    // MOSTRAR/OCULTAR BOTÃO "VER TODOS"
    toggleViewAllButton() {
        const viewAllBtn = document.getElementById('viewAllVisitorsBtn');
        if (viewAllBtn) {
            if (this.isPremium && this.recentVisits.length > 0) {
                viewAllBtn.style.display = 'flex';
            } else {
                viewAllBtn.style.display = 'none';
            }
        }
    },

    // VER PERFIL DO VISITANTE
    viewVisitorProfile(visitorId) {
        if (this.isPremium && visitorId) {
            window.location.href = `perfil.html?id=${visitorId}`;
        }
    },

    // IR PARA PÁGINA DE HISTÓRICO COMPLETO
    goToVisitorsHistory() {
        if (this.isPremium) {
            window.location.href = 'visitantes.html';
        } else {
            window.location.href = 'pricing.html';
        }
    },

    // CONFIGURAR EVENT LISTENERS
    setupEventListeners() {
        const viewAllBtn = document.getElementById('viewAllVisitorsBtn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => this.goToVisitorsHistory());
        }
    },

    // ESTADO DE ERRO
    showErrorState() {
        const container = document.getElementById('visitorsContainer');
        if (container) {
            container.innerHTML = `
                <div class="visitors-empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h4>Erro ao carregar</h4>
                    <p>Não foi possível carregar as visitas no momento.</p>
                    <button class="btn-premium-small" onclick="VisitorsSystem.loadVisitors()" style="margin-top: 1rem;">
                        <i class="fas fa-redo"></i> Tentar Novamente
                    </button>
                </div>
            `;
        }
    },

    // ESTADO VAZIO
    showEmptyState() {
        const container = document.getElementById('visitorsContainer');
        if (container) {
            container.innerHTML = `
                <div class="visitors-empty-state">
                    <i class="fas fa-eye-slash"></i>
                    <h4>Nenhuma visita</h4>
                    <p>Nenhum usuário visitou seu perfil ainda.</p>
                </div>
            `;
        }
    },

    // ATUALIZAR VISITANTES (PARA CHAMAR EXTERNAMENTE)
    async refreshVisitors() {
        await this.checkPremiumStatus();
        await this.loadVisitors();
    }
};

// ========== INTEGRAÇÃO COM O PERFIL.JS ==========
// Função para registrar visita quando alguém visualiza um perfil
async function registerProfileVisit(visitedUserId) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || user.id === visitedUserId) return;

        // Registrar visita usando a função do Supabase
        const { data, error } = await supabase.rpc('register_profile_visit', {
            p_visitor_id: user.id,
            p_visited_id: visitedUserId
        });

        if (error) {
            console.error('Erro ao registrar visita:', error);
        }

    } catch (error) {
        console.error('Erro no registro de visita:', error);
    }
}

// ========== INICIALIZAÇÃO AUTOMÁTICA ==========
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para não conflitar com outros scripts
    setTimeout(() => {
        VisitorsSystem.initialize();
    }, 1000);
});

// ========== EXPORTAR PARA USO GLOBAL ==========
window.VisitorsSystem = VisitorsSystem;
window.registerProfileVisit = registerProfileVisit;