// feels.js - Página de Histórico de Feels & Vibes
const FeelsHistory = {
    currentUser: null,
    isPremium: false,
    allFeelsReceived: [],
    allFeelsGiven: [],
    allVibes: [],
    currentPage: 1,
    itemsPerPage: 10,
    currentTab: 'received', // 'received', 'given', 'vibes'

    // INICIALIZAR PÁGINA
    async initialize() {
        try {
            // Configuração Supabase
            const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
            const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
            window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

            await this.checkAuthentication();
            await this.checkPremiumStatus();
            
            if (!this.isPremium) {
                this.showPremiumLock();
                return;
            }

            await this.loadAllData();
            
        } catch (error) {
            console.error('Erro ao inicializar página de feels:', error);
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
            // Primeiro tenta pelo PremiumManager
            if (window.PremiumManager) {
                this.isPremium = await PremiumManager.checkPremiumStatus();
            } 
            // Fallback: verificar direto no banco
            else {
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', this.currentUser.id)
                    .single();

                if (!error && profile) {
                    this.isPremium = profile.is_premium;
                } else {
                    this.isPremium = false;
                }
            }
        } catch (error) {
            this.isPremium = false;
        }
    },

    // CARREGAR TODOS OS DADOS
    async loadAllData() {
        const container = document.getElementById('feelsPageContainer');
        
        try {
            await Promise.all([
                this.loadFeelsReceived(),
                this.loadFeelsGiven(),
                this.loadVibes()
            ]);

            this.displayFeelsPage();

        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            this.showErrorState();
        }
    },

    // CARREGAR FEELS RECEBIDOS
    async loadFeelsReceived() {
        try {
            const { data: feels, error } = await supabase
                .from('user_feels')
                .select(`
                    id,
                    created_at,
                    giver:profiles!user_feels_giver_id_fkey(
                        id,
                        nickname,
                        avatar_url,
                        display_city,
                        is_premium,
                        last_online_at
                    )
                `)
                .eq('receiver_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.allFeelsReceived = feels || [];

        } catch (error) {
            console.error('Erro ao carregar feels recebidos:', error);
            this.allFeelsReceived = [];
        }
    },

    // CARREGAR FEELS ENVIADOS
    async loadFeelsGiven() {
        try {
            const { data: feels, error } = await supabase
                .from('user_feels')
                .select(`
                    id,
                    created_at,
                    receiver:profiles!user_feels_receiver_id_fkey(
                        id,
                        nickname,
                        avatar_url,
                        display_city,
                        is_premium,
                        last_online_at
                    )
                `)
                .eq('giver_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.allFeelsGiven = feels || [];

        } catch (error) {
            console.error('Erro ao carregar feels enviados:', error);
            this.allFeelsGiven = [];
        }
    },

    // CARREGAR VIBES
    async loadVibes() {
        try {
            const { data: vibes, error } = await supabase
                .from('user_vibes')
                .select(`
                    id,
                    created_at,
                    user1:profiles!user_vibes_user1_id_fkey(
                        id,
                        nickname,
                        avatar_url,
                        display_city,
                        is_premium,
                        last_online_at
                    ),
                    user2:profiles!user_vibes_user2_id_fkey(
                        id,
                        nickname,
                        avatar_url,
                        display_city,
                        is_premium,
                        last_online_at
                    )
                `)
                .or(`user1_id.eq.${this.currentUser.id},user2_id.eq.${this.currentUser.id}`)
                .order('created_at', { ascending: false });

            if (error) throw error;
            this.allVibes = vibes || [];

        } catch (error) {
            console.error('Erro ao carregar vibes:', error);
            this.allVibes = [];
        }
    },

    // EXIBIR PÁGINA COMPLETA
    displayFeelsPage() {
        const container = document.getElementById('feelsPageContainer');
        
        if (this.currentTab === 'received' && this.allFeelsReceived.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('received');
            return;
        }

        if (this.currentTab === 'given' && this.allFeelsGiven.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('given');
            return;
        }

        if (this.currentTab === 'vibes' && this.allVibes.length === 0) {
            container.innerHTML = this.getEmptyStateHTML('vibes');
            return;
        }

        const currentData = this.getCurrentTabData();
        const paginatedData = this.paginateData(currentData);
        const totalPages = Math.ceil(currentData.length / this.itemsPerPage);

        container.innerHTML = `
            ${this.getStatsHTML()}
            ${this.getTabsHTML()}
            ${this.getFeelsListHTML(paginatedData)}
            ${totalPages > 1 ? this.getPaginationHTML(totalPages) : ''}
        `;
    },

    // OBTER DADOS DA ABA ATUAL
    getCurrentTabData() {
        switch (this.currentTab) {
            case 'received':
                return this.allFeelsReceived;
            case 'given':
                return this.allFeelsGiven;
            case 'vibes':
                return this.allVibes;
            default:
                return [];
        }
    },

    // PAGINAR DADOS
    paginateData(data) {
        if (!data) return [];
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return data.slice(startIndex, endIndex);
    },

    // HTML PARA ESTATÍSTICAS
    getStatsHTML() {
        const feelsReceived = this.allFeelsReceived.length;
        const feelsGiven = this.allFeelsGiven.length;
        const vibesCount = this.allVibes.length;
        const conversionRate = feelsReceived > 0 ? Math.round((vibesCount / feelsReceived) * 100) : 0;

        return `
            <div class="feels-stats">
                <div class="stat-card">
                    <span class="stat-number">${feelsReceived}</span>
                    <span class="stat-label">Feels Recebidos</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${feelsGiven}</span>
                    <span class="stat-label">Feels Enviados</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${vibesCount}</span>
                    <span class="stat-label">Vibes Conquistadas</span>
                </div>
                <div class="stat-card">
                    <span class="stat-number">${conversionRate}%</span>
                    <span class="stat-label">Taxa de Conversão</span>
                </div>
            </div>
        `;
    },

    // HTML PARA ABAS
    getTabsHTML() {
        return `
            <section class="tabs-section">
                <div class="tabs-header">
                    <button class="tab-btn ${this.currentTab === 'received' ? 'active' : ''}" 
                            onclick="FeelsHistory.setTab('received')">
                        <i class="fas fa-heart"></i>
                        Quem te Curtiu (${this.allFeelsReceived.length})
                    </button>
                    <button class="tab-btn ${this.currentTab === 'given' ? 'active' : ''}" 
                            onclick="FeelsHistory.setTab('given')">
                        <i class="fas fa-paper-plane"></i>
                        Seus Feels (${this.allFeelsGiven.length})
                    </button>
                    <button class="tab-btn ${this.currentTab === 'vibes' ? 'active' : ''}" 
                            onclick="FeelsHistory.setTab('vibes')">
                        <i class="fas fa-bolt"></i>
                        Suas Vibes (${this.allVibes.length})
                    </button>
                </div>
            </section>
        `;
    },

    // HTML PARA LISTA DE FEELS
    getFeelsListHTML(data) {
        if (!data || data.length === 0) {
            return this.getEmptyTabHTML();
        }

        const itemsHTML = data.map(item => {
            if (this.currentTab === 'vibes') {
                return this.getVibeItemHTML(item);
            } else {
                return this.getFeelItemHTML(item);
            }
        }).join('');

        return `
            <section class="feels-list-section">
                <div class="feels-list">
                    ${itemsHTML}
                </div>
            </section>
        `;
    },

    // HTML PARA ITEM DE FEEL
    getFeelItemHTML(feel) {
        const isReceived = this.currentTab === 'received';
        const user = isReceived ? feel.giver : feel.receiver;
        const profile = user || {};
        const feelTime = this.formatFeelTime(feel.created_at);
        const initials = this.getUserInitials(profile.nickname);
        const isOnline = this.isUserOnline(profile.last_online_at);
        
        // Verificar se tem vibe com esta pessoa
        const hasVibe = this.allVibes.some(vibe => 
            (vibe.user1_id === profile.id && vibe.user2_id === this.currentUser.id) ||
            (vibe.user2_id === profile.id && vibe.user1_id === this.currentUser.id)
        );

        return `
            <div class="feel-item ${hasVibe ? 'vibe' : ''}">
                <div class="feel-avatar">
                    ${profile.avatar_url ? 
                        `<img src="${profile.avatar_url}" alt="${profile.nickname}" 
                              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="avatar-fallback" style="${profile.avatar_url ? 'display:none' : 'display:flex'}">
                        ${initials}
                    </div>
                </div>
                
                <div class="feel-info">
                    <div class="feel-name">
                        ${profile.nickname || 'Usuário'}
                        ${profile.is_premium ? ' <i class="fas fa-crown" style="color: var(--gold);"></i>' : ''}
                        ${isOnline ? ' <span style="color: var(--online); font-size: 0.7rem;">● Online</span>' : ''}
                    </div>
                    
                    <div class="feel-details">
                        <div class="feel-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${profile.display_city || 'Local não informado'}</span>
                        </div>
                        <div class="feel-detail">
                            <i class="fas fa-user"></i>
                            <span>${profile.is_premium ? 'Premium' : 'Free'}</span>
                        </div>
                        <div class="feel-time">
                            <i class="fas fa-clock"></i>
                            <span>${feelTime}</span>
                        </div>
                        ${hasVibe ? `
                            <div class="vibe-badge">
                                <i class="fas fa-bolt"></i>
                                Vibe Conectada!
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <div class="feel-actions">
                    <button class="btn-action view-profile" 
                            onclick="FeelsHistory.viewProfile('${profile.id}')">
                        <i class="fas fa-user"></i> Ver Perfil
                    </button>
                    ${hasVibe ? `
                        <button class="btn-action send-message" 
                                onclick="FeelsHistory.sendMessage('${profile.id}')">
                            <i class="fas fa-comment"></i> Mensagem
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    },

    // HTML PARA ITEM DE VIBE
    getVibeItemHTML(vibe) {
        // Encontrar o outro usuário da vibe (não o atual)
        const otherUser = vibe.user1_id === this.currentUser.id ? vibe.user2 : vibe.user1;
        const profile = otherUser || {};
        const vibeTime = this.formatFeelTime(vibe.created_at);
        const initials = this.getUserInitials(profile.nickname);
        const isOnline = this.isUserOnline(profile.last_online_at);

        return `
            <div class="feel-item vibe">
                <div class="feel-avatar">
                    ${profile.avatar_url ? 
                        `<img src="${profile.avatar_url}" alt="${profile.nickname}" 
                              onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="avatar-fallback" style="${profile.avatar_url ? 'display:none' : 'display:flex'}">
                        ${initials}
                    </div>
                </div>
                
                <div class="feel-info">
                    <div class="feel-name">
                        ${profile.nickname || 'Usuário'}
                        ${profile.is_premium ? ' <i class="fas fa-crown" style="color: var(--gold);"></i>' : ''}
                        ${isOnline ? ' <span style="color: var(--online); font-size: 0.7rem;">● Online</span>' : ''}
                    </div>
                    
                    <div class="feel-details">
                        <div class="feel-detail">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${profile.display_city || 'Local não informado'}</span>
                        </div>
                        <div class="feel-detail">
                            <i class="fas fa-user"></i>
                            <span>${profile.is_premium ? 'Premium' : 'Free'}</span>
                        </div>
                        <div class="feel-time">
                            <i class="fas fa-clock"></i>
                            <span>${vibeTime}</span>
                        </div>
                        <div class="vibe-badge">
                            <i class="fas fa-bolt"></i>
                            Vibe Conectada!
                        </div>
                    </div>
                </div>
                
                <div class="feel-actions">
                    <button class="btn-action view-profile" 
                            onclick="FeelsHistory.viewProfile('${profile.id}')">
                        <i class="fas fa-user"></i> Ver Perfil
                    </button>
                    <button class="btn-action send-message" 
                            onclick="FeelsHistory.sendMessage('${profile.id}')">
                        <i class="fas fa-comment"></i> Enviar Mensagem
                    </button>
                </div>
            </div>
        `;
    },

    // HTML PARA PAGINAÇÃO
    getPaginationHTML(totalPages) {
        if (totalPages <= 1) return '';

        return `
            <div class="pagination">
                <button class="btn-pagination" 
                        onclick="FeelsHistory.previousPage()" 
                        ${this.currentPage === 1 ? 'disabled' : ''}>
                    <i class="fas fa-chevron-left"></i> Anterior
                </button>
                
                <span class="pagination-info">
                    Página ${this.currentPage} de ${totalPages}
                </span>
                
                <button class="btn-pagination" 
                        onclick="FeelsHistory.nextPage()" 
                        ${this.currentPage === totalPages ? 'disabled' : ''}>
                    Próxima <i class="fas fa-chevron-right"></i>
                </button>
            </div>
        `;
    },

    // HTML PARA ESTADO VAZIO
    getEmptyStateHTML(tab) {
        const messages = {
            'received': {
                icon: 'fas fa-heart',
                title: 'Nenhum Feel recebido ainda',
                message: 'Quando alguém curtir seu perfil, aparecerá aqui!'
            },
            'given': {
                icon: 'fas fa-paper-plane',
                title: 'Você ainda não deu nenhum Feel',
                message: 'Explore os perfis e curta quem você se interessar!'
            },
            'vibes': {
                icon: 'fas fa-bolt',
                title: 'Nenhuma Vibe ainda',
                message: 'Quando houver um match mútuo, aparecerá aqui como Vibe!'
            }
        };

        const current = messages[tab] || messages.received;

        return `
            <div class="empty-state">
                <i class="${current.icon}"></i>
                <h3>${current.title}</h3>
                <p>${current.message}</p>
                <a href="home.html" class="btn-premium" style="margin-top: 2rem;">
                    <i class="fas fa-arrow-left"></i> Voltar para Home
                </a>
            </div>
        `;
    },

    // HTML PARA ABA VAZIA
    getEmptyTabHTML() {
        return `
            <div class="empty-state">
                <i class="fas fa-search"></i>
                <h3>Nada encontrado</h3>
                <p>Nenhum item corresponde aos critérios atuais.</p>
                <button class="btn-premium" onclick="FeelsHistory.setTab('received')" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Ver Todos os Feels
                </button>
            </div>
        `;
    },

    // BLOQUEIO PREMIUM
    showPremiumLock() {
        const container = document.getElementById('feelsPageContainer');
        container.innerHTML = `
            <div class="premium-lock">
                <i class="fas fa-crown"></i>
                <h2>Recurso Exclusivo Premium</h2>
                <p>Ver quem te curtiu e seu histórico de Feels é um recurso exclusivo para membros Premium.</p>
                <a href="pricing.html" class="btn-premium">
                    <i class="fas fa-crown"></i> Tornar-se Premium
                </a>
                <div style="margin-top: 1.5rem;">
                    <a href="home.html" class="btn-outline" style="text-decoration: none; padding: 0.7rem 1.5rem;">
                        <i class="fas fa-arrow-left"></i> Voltar para Home
                    </a>
                </div>
            </div>
        `;
    },

    // ESTADO DE ERRO
    showErrorState() {
        const container = document.getElementById('feelsPageContainer');
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar</h3>
                <p>Não foi possível carregar o histórico de Feels.</p>
                <button class="btn-premium" onclick="FeelsHistory.initialize()" style="margin-top: 1rem;">
                    <i class="fas fa-redo"></i> Tentar Novamente
                </button>
                <div style="margin-top: 1rem;">
                    <a href="home.html" class="btn-outline" style="text-decoration: none; padding: 0.7rem 1.5rem;">
                        <i class="fas fa-arrow-left"></i> Voltar para Home
                    </a>
                </div>
            </div>
        `;
    },

    // ========== FUNÇÕES UTILITÁRIAS ==========
    formatFeelTime(timestamp) {
        if (!timestamp) return 'Data desconhecida';
        
        const now = new Date();
        const feelDate = new Date(timestamp);
        const diffMs = now - feelDate;
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMins < 1) return 'Agora mesmo';
        if (diffMins < 60) return `Há ${diffMins} min`;
        if (diffHours < 24) return `Há ${diffHours} h`;
        if (diffDays === 1) return 'Ontem';
        if (diffDays < 7) return `Há ${diffDays} dias`;
        if (diffDays < 30) return `Há ${Math.floor(diffDays/7)} sem`;
        
        return feelDate.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
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
    setTab(tab) {
        this.currentTab = tab;
        this.currentPage = 1;
        this.displayFeelsPage();
    },

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.displayFeelsPage();
        }
    },

    nextPage() {
        const currentData = this.getCurrentTabData();
        const totalPages = Math.ceil(currentData.length / this.itemsPerPage);
        
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.displayFeelsPage();
        }
    },

    viewProfile(userId) {
        if (userId) {
            window.location.href = `perfil.html?id=${userId}`;
        }
    },

    sendMessage(userId) {
        if (userId) {
            window.location.href = `mensagens.html?user=${userId}`;
        }
    }
};

// ========== INICIALIZAÇÃO AUTOMÁTICA ==========
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar página
    FeelsHistory.initialize();
});

// ========== EXPORTAR PARA USO GLOBAL ==========
window.FeelsHistory = FeelsHistory;