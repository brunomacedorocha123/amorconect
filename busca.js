// busca.js - Sistema completo de busca - CORRIGIDO
const SearchManager = {
    currentUser: null,
    currentFilters: {},
    searchResults: [],
    isLoading: false,

    // Inicialização
    async initialize() {
        try {
            await this.checkAuthentication();
            this.setupEventListeners();
            await this.loadInitialData();
            await PremiumManager.updateUIWithPremiumStatus();
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showNotification('Erro ao carregar a busca', 'error');
        }
    },

    // Verificar autenticação
    async checkAuthentication() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            window.location.href = 'login.html';
            return;
        }
        this.currentUser = user;
    },

    // Configurar eventos
    setupEventListeners() {
        const searchForm = document.getElementById('searchForm');
        const clearFilters = document.getElementById('clearFilters');

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        if (clearFilters) {
            clearFilters.addEventListener('click', () => this.clearAllFilters());
        }

        // Busca automática ao alterar filtros
        const autoSearchInputs = document.querySelectorAll('#searchForm select, #searchForm input[type="text"]');
        autoSearchInputs.forEach(input => {
            input.addEventListener('change', () => {
                if (this.hasMinimumFilters()) {
                    this.performSearch();
                }
            });
        });

        // Checkboxes - busca imediata
        const checkboxes = document.querySelectorAll('#searchForm input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (this.hasMinimumFilters()) {
                    this.performSearch();
                }
            });
        });
    },

    // Carregar dados iniciais
    async loadInitialData() {
        await this.loadCurrentUserData();
        this.setDefaultFilters();
        
        // Busca inicial com alguns usuários
        await this.performInitialSearch();
    },

    // Carregar dados do usuário atual
    async loadCurrentUserData() {
        try {
            const { data: profile } = await supabase
                .from('profiles')
                .select('nickname, avatar_url')
                .eq('id', this.currentUser.id)
                .single();

            if (profile) {
                const userNickname = document.getElementById('userNickname');
                if (userNickname) userNickname.textContent = profile.nickname;

                const avatarImg = document.querySelector('.avatar-image');
                const avatarFallback = document.querySelector('.user-avatar-fallback');
                
                if (profile.avatar_url && avatarImg) {
                    avatarImg.src = profile.avatar_url;
                    avatarImg.style.display = 'block';
                    if (avatarFallback) avatarFallback.style.display = 'none';
                }
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    },

    // Busca inicial
    async performInitialSearch() {
        try {
            // Buscar alguns usuários aleatórios para mostrar
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select(`
                    *,
                    user_details (
                        gender,
                        sexual_orientation,
                        relationship_status,
                        looking_for,
                        interests
                    )
                `)
                .neq('id', this.currentUser.id)
                .limit(12);

            if (error) throw error;

            this.searchResults = profiles || [];
            this.displayResults(this.searchResults);
            this.updateResultsCount(this.searchResults.length);

        } catch (error) {
            console.error('Erro na busca inicial:', error);
            this.displayResults([]);
        }
    },

    // Definir filtros padrão
    setDefaultFilters() {
        this.currentFilters = {
            plan: '',
            age_range: '',
            gender: '',
            orientation: '',
            relationship_status: '',
            city: '',
            state: '',
            looking_for: '',
            interests: '',
            zodiac: '',
            online_only: false,
            with_photo: false
        };
    },

    // Verificar se tem filtros mínimos para busca
    hasMinimumFilters() {
        const filters = this.getCurrentFormFilters();
        return Object.keys(filters).some(key => {
            const value = filters[key];
            return value !== '' && value !== false && value !== null;
        });
    },

    // Manipular busca
    async handleSearch(event) {
        if (event) event.preventDefault();
        
        if (!this.hasMinimumFilters()) {
            this.showNotification('Selecione pelo menos um filtro para buscar', 'info');
            return;
        }

        await this.performSearch();
    },

    // Executar busca
    async performSearch() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.showLoadingState();

        try {
            const filters = this.getCurrentFormFilters();
            this.currentFilters = filters;

            const results = await this.executeSearchQuery(filters);
            this.searchResults = results;
            
            this.displayResults(results);
            this.updateResultsCount(results.length);
            
        } catch (error) {
            console.error('Erro na busca:', error);
            this.showNotification('Erro ao realizar busca: ' + error.message, 'error');
            this.displayResults([]);
        } finally {
            this.isLoading = false;
        }
    },

    // Obter filtros do formulário
    getCurrentFormFilters() {
        return {
            plan: document.getElementById('searchPlan')?.value || '',
            age_range: document.getElementById('searchAge')?.value || '',
            gender: document.getElementById('searchGender')?.value || '',
            orientation: document.getElementById('searchOrientation')?.value || '',
            relationship_status: document.getElementById('searchStatus')?.value || '',
            city: document.getElementById('searchCity')?.value || '',
            state: document.getElementById('searchState')?.value || '',
            looking_for: document.getElementById('searchLookingFor')?.value || '',
            interests: document.getElementById('searchInterests')?.value || '',
            zodiac: document.getElementById('searchZodiac')?.value || '',
            online_only: document.getElementById('searchOnline')?.checked || false,
            with_photo: document.getElementById('searchWithPhoto')?.checked || false
        };
    },

    // Executar query no Supabase - CORRIGIDO (sem invisibilidade)
    async executeSearchQuery(filters) {
        console.log('🔍 Executando busca com filtros:', filters);
        
        // QUERY BASE - SEM FILTRO DE INVISIBILIDADE
        let query = supabase
            .from('profiles')
            .select(`
                *,
                user_details (
                    gender,
                    sexual_orientation,
                    profession,
                    education,
                    zodiac,
                    relationship_status,
                    religion,
                    drinking,
                    smoking,
                    exercise,
                    looking_for,
                    description,
                    interests,
                    characteristics
                )
            `)
            .neq('id', this.currentUser.id); // REMOVIDO: .eq('is_invisible', false)

        // Aplicar filtros
        query = this.applyFilters(query, filters);

        const { data, error } = await query;

        if (error) {
            console.error('Erro na query:', error);
            throw error;
        }

        console.log('📊 Dados brutos encontrados:', data?.length || 0);
        
        // FILTRAGEM DE FAIXA ETÁRIA NO CLIENTE (usando birth_date)
        return this.applyClientSideFilters(data || [], filters);
    },

    // Aplicar filtros na query - CORRIGIDO
    applyFilters(query, filters) {
        // Filtro de plano
        if (filters.plan === 'premium') {
            query = query.eq('is_premium', true);
        } else if (filters.plan === 'free') {
            query = query.eq('is_premium', false);
        }

        // Filtro de cidade
        if (filters.city) {
            query = query.ilike('city', `%${filters.city}%`);
        }

        // Filtro de estado
        if (filters.state) {
            query = query.eq('state', filters.state);
        }

        // Filtro de foto
        if (filters.with_photo) {
            query = query.not('avatar_url', 'is', null);
        }

        // Filtro online (últimas 15 minutos)
        if (filters.online_only) {
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            query = query.gte('last_online_at', fifteenMinutesAgo);
        }

        return query;
    },

    // Aplicar filtros no client-side - CORRIGIDO (com faixa etária)
    applyClientSideFilters(profiles, filters) {
        return profiles.filter(profile => {
            const details = profile.user_details || {};

            // ✅ FILTRO DE FAIXA ETÁRIA (usando birth_date do perfil)
            if (filters.age_range && profile.birth_date) {
                const age = this.calculateAge(profile.birth_date);
                if (!this.isInAgeRange(age, filters.age_range)) {
                    return false;
                }
            }

            // Filtro de gênero
            if (filters.gender && details.gender) {
                if (filters.gender === 'homem' && !['masculino'].includes(details.gender)) {
                    return false;
                }
                if (filters.gender === 'mulher' && !['feminino'].includes(details.gender)) {
                    return false;
                }
            }

            // Filtro de orientação sexual
            if (filters.orientation && details.sexual_orientation) {
                if (filters.orientation !== details.sexual_orientation) {
                    return false;
                }
            }

            // Filtro de status de relacionamento
            if (filters.relationship_status && details.relationship_status) {
                if (filters.relationship_status !== details.relationship_status) {
                    return false;
                }
            }

            // Filtro de intenção
            if (filters.looking_for && details.looking_for) {
                if (filters.looking_for !== details.looking_for) {
                    return false;
                }
            }

            // Filtro de interesses
            if (filters.interests && details.interests) {
                if (!details.interests.includes(filters.interests)) {
                    return false;
                }
            }

            // Filtro de signo
            if (filters.zodiac && details.zodiac) {
                if (filters.zodiac !== details.zodiac) {
                    return false;
                }
            }

            return true;
        });
    },

    // Calcular idade a partir da data de nascimento
    calculateAge(birthDate) {
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        
        return age;
    },

    // Verificar se está na faixa etária
    isInAgeRange(age, ageRange) {
        switch (ageRange) {
            case '18-25': return age >= 18 && age <= 25;
            case '26-35': return age >= 26 && age <= 35;
            case '36-45': return age >= 36 && age <= 45;
            case '45+': return age >= 45;
            default: return true;
        }
    },

    // Mostrar estado de carregamento
    showLoadingState() {
        const resultsGrid = document.getElementById('resultsGrid');
        if (resultsGrid) {
            resultsGrid.innerHTML = `
                <div class="empty-state" id="loadingState">
                    <i class="fas fa-search fa-spin"></i>
                    <p>Buscando pessoas...</p>
                </div>
            `;
        }
    },

    // Exibir resultados
    displayResults(results) {
        const resultsGrid = document.getElementById('resultsGrid');
        if (!resultsGrid) return;

        if (results.length === 0) {
            resultsGrid.innerHTML = `
                <div class="empty-state" id="emptyState">
                    <i class="fas fa-users"></i>
                    <p>Nenhuma pessoa encontrada</p>
                    <small>Tente ajustar os filtros da busca</small>
                </div>
            `;
            return;
        }

        resultsGrid.innerHTML = results.map(profile => this.createProfileCard(profile)).join('');
    },

    // Criar card de perfil
    createProfileCard(profile) {
        const details = profile.user_details || {};
        const age = profile.birth_date ? this.calculateAge(profile.birth_date) : null;
        const isOnline = this.isUserOnline(profile.last_online_at);
        const hasPhoto = !!profile.avatar_url;

        return `
            <div class="profile-card ${isOnline ? 'online' : ''}" onclick="SearchManager.viewProfile('${profile.id}')">
                <div class="profile-header">
                    <div class="profile-avatar">
                        ${hasPhoto ? 
                            `<img src="${profile.avatar_url}" alt="${profile.nickname}">` :
                            `<span>${profile.nickname?.charAt(0)?.toUpperCase() || 'U'}</span>`
                        }
                    </div>
                    <div class="profile-info">
                        <div class="profile-name">
                            <h4>${profile.nickname || 'Usuário'}</h4>
                            <div class="profile-badge ${profile.is_premium ? 'premium' : 'free'}">
                                ${profile.is_premium ? 'Premium' : 'Free'}
                            </div>
                        </div>
                        <div class="profile-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${profile.display_city || 'Localização não informada'}</span>
                        </div>
                    </div>
                </div>

                <div class="profile-stats">
                    ${age ? `
                        <div class="stat">
                            <span class="stat-number">${age}</span>
                            <span class="stat-label">anos</span>
                        </div>
                    ` : ''}
                    
                    <div class="stat">
                        <span class="stat-number">${details.relationship_status ? this.formatRelationshipStatus(details.relationship_status) : 'N/I'}</span>
                        <span class="stat-label">status</span>
                    </div>
                </div>

                ${details.looking_for ? `
                    <div class="profile-tags">
                        <span class="tag">${this.formatLookingFor(details.looking_for)}</span>
                    </div>
                ` : ''}

                ${details.interests && details.interests.length > 0 ? `
                    <div class="profile-tags">
                        ${details.interests.slice(0, 3).map(interest => `
                            <span class="tag">${interest}</span>
                        `).join('')}
                        ${details.interests.length > 3 ? `<span class="tag">+${details.interests.length - 3}</span>` : ''}
                    </div>
                ` : ''}

                <div class="profile-actions">
                    <button class="btn btn-secondary btn-profile" onclick="event.stopPropagation(); SearchManager.sendMessage('${profile.id}')">
                        <i class="fas fa-paper-plane"></i> Mensagem
                    </button>
                    <button class="btn btn-primary btn-profile" onclick="event.stopPropagation(); SearchManager.viewProfile('${profile.id}')">
                        <i class="fas fa-eye"></i> Ver Perfil
                    </button>
                </div>
            </div>
        `;
    },

    // Verificar se usuário está online
    isUserOnline(lastOnlineAt) {
        if (!lastOnlineAt) return false;
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        return new Date(lastOnlineAt) > fifteenMinutesAgo;
    },

    // Funções de formatação
    formatRelationshipStatus(status) {
        const statusMap = {
            'solteiro': 'Solteiro', 'solteira': 'Solteira',
            'divorciado': 'Divorciado', 'divorciada': 'Divorciada',
            'casado': 'Casado', 'casada': 'Casada',
            'viúvo': 'Viúvo', 'viúva': 'Viúva',
            'noivo': 'Noivo', 'noiva': 'Noiva'
        };
        return statusMap[status] || status;
    },

    formatLookingFor(lookingFor) {
        const lookingForMap = {
            'amizade': 'Amizade',
            'namoro': 'Namoro',
            'relacionamento_serio': 'Relacionamento Sério',
            'conversa': 'Apenas Conversa'
        };
        return lookingForMap[lookingFor] || lookingFor;
    },

    // Atualizar contador de resultados
    updateResultsCount(count) {
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = count;
        }
    },

    // Limpar todos os filtros
    clearAllFilters() {
        const form = document.getElementById('searchForm');
        if (form) {
            form.reset();
            this.setDefaultFilters();
            this.displayResults([]);
            this.updateResultsCount(0);
            this.showNotification('Filtros limpos', 'info');
        }
    },

    // Visualizar perfil
    viewProfile(userId) {
        window.location.href = `perfil.html?id=${userId}`;
    },

    // Enviar mensagem
    sendMessage(userId) {
        window.location.href = `mensagens.html?user=${userId}`;
    },

    // Sistema de notificações
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
                <button class="notification-close">×</button>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'error' ? '#f56565' : type === 'success' ? '#48bb78' : '#4299e1'};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            z-index: 10000;
            max-width: 350px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Fechar notificação
        notification.querySelector('.notification-close').onclick = () => notification.remove();

        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 5000);
    }
};

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    SearchManager.initialize();
});

// Monitorar estado de autenticação
supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});

// Exportar para uso global
window.SearchManager = SearchManager;