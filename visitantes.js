// visitantes.js - Página de Histórico de Visitantes
const VisitorsHistory = {
    currentUser: null,
    isPremium: false,
    allVisits: [],
    currentPage: 1,
    itemsPerPage: 10,
    currentFilter: 'all',

    // INICIALIZAR PÁGINA
    async initialize() {
        try {
            await this.checkAuthentication();
            await this.checkPremiumStatus();
            
            if (!this.isPremium) {
                this.showPremiumLock();
                return;
            }

            await this.loadAllVisits();
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Erro ao inicializar página de visitantes:', error);
            this.showErrorState();
        }
    },

    // VERIFICAR AUTENTICAÇÃO
    async checkAuthentication() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            window.location.href = 'login.html';
            return;
        }
        this.currentUser = user;
    },

    // VERIFICAR STATUS PREMIUM
    async checkPremiumStatus() {
        try {
            if (window.PremiumManager) {
                this.isPremium = await PremiumManager.checkPremiumStatus();
            } else {
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

    // CARREGAR TODAS AS VISITAS
    async loadAllVisits() {
        const container = document.getElementById('visitorsPageContainer');
        
        try {
            // Buscar todas as visitas com dados completos
            const { data: visits, error } = await supabase
                .from('profile_visits')
                .select(`
                    id,
                    visitor_id,
                    visited_at,
                    profiles:visitor_id (
                        nickname,
                        avatar_url,
                        display_city,
                        is_premium,
                        last_online_at
                    )
                `)
                .eq('visited_id', this.currentUser.id)
                .order('visited_at', { ascending: false });

            if (error) throw error;

            this.allVisits = visits || [];
            this.displayVisitsPage();

        } catch (error) {
            console.error('Erro ao carregar visitas:', error);
            this.showErrorState();
        }
    },

    // EXIBIR PÁGINA COMPLETA
    displayVisitsPage() {
        const container = document.getElementById('visitorsPageContainer');
        
        if (this.allVisits.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            return;
        }

        const filteredVisits = this.filterVisits(this.allVisits);
        const paginatedVisits = this.paginateVisits(filteredVisits);
        const totalPages = Math.ceil(filteredVisits.length / this.itemsPerPage);

        container.innerHTML = `
            ${this.getStatsHTML()}
            ${this.getFiltersHTML()}
            ${this.getVisitorsListHTML(paginatedVisits)}
            ${this.getPaginationHTML(totalPages)}
        `;
    },

    // FILTRAR VISITAS
    filterVisits(visits) {
        switch (this.currentFilter) {
            case 'premium':
                return visits.filter(visit => visit.profiles.is_premium);
            case 'recent':
                const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return visits.filter(visit => new Date(visit.visited_at) > oneWeekAgo);
            case 'online':
                const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
                return visits.filter(visit => 
                    visit.profiles.last_online_at && 
                    new Date(visit.profiles.last_online_at) > fifteenMinutesAgo
                );
            default:
                return visits;
        }
    },

    // PAGINAR VISITAS
    paginateVisits(visits) {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return visits.slice(startIndex, endIndex);
    },

    // HTML PARA ESTATÍSTICAS
    getStatsHTML() {
        const totalVisits = this.allVisits.length;
        const premiumVisitors = this.allVisits.filter(v => v.profiles.is_premium).length;
        const recentVisits = this.allVisits.filter(v => {
            const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            return new Date(v.visited_at) > oneWeekAgo;
        }).length;

        return `
            <div class="visitors-stats">
                <div class="stat-card">
                    <span class="stat-number">${totalVisits}</span>
                    <span class="stat-label">Total de Visitas</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${premiumVisitors}</span>
                    <span class="stat-label">Visitantes Premium</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${recentVisits}</span>
                    <span class="stat-label">Últimos 7 Dias</span>
                </div>
            </div>
        `;
    },

    // HTML PARA FILTROS
    getFiltersHTML() {
        return `
            <section class="filters-section">
                <div class="filters-header">
                    <h3>Filtrar Visitantes</h3>
                </div>
                <div class="filter-buttons">
                    <button class="btn-filter ${this.currentFilter === 'all' ? 'active' : ''}" 
                            onclick="VisitorsHistory.setFilter('all')">
                        Todos (${this.allVisits.length})
                    </button>
                    <button class="btn-filter ${this.currentFilter === 'premium' ? 'active' : ''}" 
                            onclick="VisitorsHistory.setFilter('premium')">
                        <i class="fas fa-crown"></i> Premium
                    </button>
                    <button class="btn-filter ${this.currentFilter === 'recent' ? 'active' : ''}" 
                            onclick="VisitorsHistory.setFilter('recent')">
                        <i class="fas fa-clock"></i> Última Semana
                    </button>
                    <button class="btn-filter ${this.currentFilter === 'online' ? 'active' : ''}" 
                            onclick="VisitorsHistory.setFilter('online')">
                        <i class="fas fa-circle"></i> Online
                    </button>
                </div>
            </section>
        `;
    },

    // HTML PARA LISTA DE VISITANTES
    getVisitorsListHTML(visits) {
        if (visits.length === 0) {
            return `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <h3>Nenhum visitante encontrado</h3>
                    <p>Nenhum visitante corresponde aos filtros aplicados.</p>
                </div>
            `;
        }

        const visitorsHTML = visits.map(visit => {
            const profile = visit.profiles;
            const visitTime = this.formatVisitTime(visit.visited_at);
            const initials = this.getUserInitials(profile.nickname);
            const isOnline = this.isUserOnline(profile.last_online_at);

            return `
                <div class="visitor-item">
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
                        <div class="visitor-name">
                            ${profile.nickname || 'Usuário'}
                            ${profile.is_premium ? ' <i class="fas fa-crown" style="color: var(--gold);"></i>' : ''}
                            ${isOnline ? ' <span class="online-dot" style="color: var(--online); font-size: 0.7rem;">● Online</span>' : ''}
                        </div>
                        
                        <div class="visitor-details">
                            <div class="visitor-detail">
                                <i class="fas fa-map-marker-alt"></i>
                                <span>${profile.display_city || 'Local não informado'}</span>
                            </div>
                            <div class="visitor-detail">
                                <i class="fas fa-user"></i>
                                <span>${profile.is_premium ? 'Premium' : 'Free'}</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="visitor-time">
                        <i class="fas fa-clock"></i>
                        ${visitTime}
                    </div>
                    
                    <div class="visitor-actions">
                        <button class="btn-action view-profile" 
                                onclick="VisitorsHistory.viewProfile('${visit.visitor_id}')">
                            <i class="fas fa-user"></i> Ver Perfil
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        return `
            <section class="visitors-list-section">
                <div class="visitors-list">
                    ${visitorsHTML}
                </div>
            </section>
        `;
    },

    // HTML PARA PAGINAÇÃO
    getPaginationHTML(totalPages) {
        if (totalPages <= 1) return '';

        return `
            <div class="pagination">
                <button class="btn-pagination" 
                        onclick="VisitorsHistory.previousPage()" 
                        ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
                
                <span class="pagination-info">
                    Página ${this.currentPage} de ${totalPages}
                </span>
                
                <button class="btn-pagination" 
                        onclick="VisitorsHistory.nextPage()" 
                        ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Próxima <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    },

    // HTML PARA ESTADO VAZIO
    getEmptyStateHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-eye-slash"></i>
                <h3>Nenhuma visita ainda</h3>
                <p>Seu perfil ainda não foi visitado por outros usuários.</p>
                <p style="margin-top: 1rem; font-size: 0.9rem; color: var(--text-light);">
                    Quando alguém visitar, aparecerá aqui no seu histórico.
                </p>
                <a href="home.html" class="btn-premium" style="margin-top: 2rem;">
                    <i class="fas fa-arrow-left"></i> Voltar para Home
                </a>
            </div>
        `;
    },

    // BLOQUEIO PREMIUM
    showPremiumLock() {
        const container = document.getElementById('visitorsPageContainer');
        container.innerHTML = `
            <div class="premium-lock">
                <i class="fas fa-crown"></i>
                <h2>Recurso Exclusivo Premium</h2>
                <p>O histórico completo de visitantes é um recurso exclusivo para membros Premium. 
                   Torne-se Premium para ver quem visitou seu perfil!</p>
                <a href="pricing.html" class="btn-premium">
                    <i class="fas fa-crown"></i> Tornar-se Premium
                </a>
            </div>
        `;
    },

    // ESTADO DE ERRO
    showErrorState() {
        const container = document.getElementById('visitorsPageContainer');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar</h3>
                <p>Não foi possível carregar o histórico de visitantes.</p>
                <button class="btn-premium" onclick="VisitorsHistory.initialize()" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Tentar Novamente
                </button>
            </div>
        `;
    },

    // ========== FUNÇÕES UTILITÁRIAS ==========
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
        
        return visitDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },

    getUserInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
    },

    isUserOnline(lastOnlineAt) {
        if (!lastOnlineAt) return false;
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        return new Date(lastOnlineAt) > fifteenMinutesAgo;
    },

    // ========== FUNÇÕES DE INTERAÇÃO ==========
    setFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        this.displayVisitsPage();
    },

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayVisitsPage();
        }
    },

    nextPage() {
        const filteredVisits = this.filterVisits(this.allVisits);
        const totalPages = Math.ceil(filteredVisits.length / this.itemsPerPage);
        
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.displayVisitsPage();
        }
    },

    viewProfile(visitorId) {
        window.location.href = `perfil.html?id=${visitorId}`;
    },

    // CONFIGURAR EVENT LISTENERS
    setupEventListeners() {
        // Event listeners são configurados via onclick nos elementos
    }
};

// ========== INICIALIZAÇÃO AUTOMÁTICA ==========
document.addEventListener('DOMContentLoaded', function() {
    // Configuração Supabase
    const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
    window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Inicializar página
    VisitorsHistory.initialize();
});

// ========== EXPORTAR PARA USO GLOBAL ==========
window.VisitorsHistory = VisitorsHistory;