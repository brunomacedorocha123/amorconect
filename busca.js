// busca.js - Sistema completo de busca
const SearchManager = {
    currentUser: null,
    currentFilters: {},
    searchResults: [],
    isLoading: false,

    async initialize() {
        try {
            await this.checkAuthentication();
            this.setupEventListeners();
            await this.loadInitialData();
            await PremiumManager.updateUIWithPremiumStatus();
        } catch (error) {
            this.showNotification('Erro ao carregar a busca', 'error');
        }
    },

    async checkAuthentication() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            window.location.href = 'login.html';
            return;
        }
        this.currentUser = user;
    },

    setupEventListeners() {
        const searchForm = document.getElementById('searchForm');
        const clearFilters = document.getElementById('clearFilters');

        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        if (clearFilters) {
            clearFilters.addEventListener('click', () => this.clearAllFilters());
        }

        const autoSearchInputs = document.querySelectorAll('#searchForm select, #searchForm input[type="text"]');
        autoSearchInputs.forEach(input => {
            input.addEventListener('change', () => {
                if (this.hasMinimumFilters()) {
                    this.performSearch();
                }
            });
        });

        const checkboxes = document.querySelectorAll('#searchForm input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                if (this.hasMinimumFilters()) {
                    this.performSearch();
                }
            });
        });
    },

    async loadInitialData() {
        await this.loadCurrentUserData();
        this.setDefaultFilters();
        await this.performInitialSearch();
    },

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

    async performInitialSearch() {
        try {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .neq('id', this.currentUser.id)
                .limit(12);

            if (error) throw error;

            const profilesWithDetails = await this.enrichProfilesWithDetails(profiles || []);
            this.searchResults = profilesWithDetails;
            this.displayResults(this.searchResults);
            this.updateResultsCount(this.searchResults.length);

        } catch (error) {
            this.displayResults([]);
        }
    },

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

    hasMinimumFilters() {
        const filters = this.getCurrentFormFilters();
        return Object.keys(filters).some(key => {
            const value = filters[key];
            return value !== '' && value !== false && value !== null;
        });
    },

    async handleSearch(event) {
        if (event) event.preventDefault();
        
        if (!this.hasMinimumFilters()) {
            this.showNotification('Selecione pelo menos um filtro para buscar', 'info');
            return;
        }

        await this.performSearch();
    },

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
            this.showNotification('Erro ao realizar busca', 'error');
            this.displayResults([]);
        } finally {
            this.isLoading = false;
        }
    },

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

    async executeSearchQuery(filters) {
        let query = supabase
            .from('profiles')
            .select('*')
            .neq('id', this.currentUser.id);

        query = this.applyFilters(query, filters);

        const { data, error } = await query;

        if (error) throw error;

        const profilesWithDetails = await this.enrichProfilesWithDetails(data || []);
        return this.applyClientSideFilters(profilesWithDetails, filters);
    },

    async enrichProfilesWithDetails(profiles) {
        if (!profiles.length) return [];

        const userIds = profiles.map(p => p.id);
        
        const { data: userDetails, error } = await supabase
            .from('user_details')
            .select('*')
            .in('user_id', userIds);

        if (error) return profiles.map(profile => ({ ...profile, user_details: {} }));

        const detailsMap = {};
        userDetails.forEach(detail => {
            detailsMap[detail.user_id] = detail;
        });

        return profiles.map(profile => ({
            ...profile,
            user_details: detailsMap[profile.id] || {}
        }));
    },

    applyFilters(query, filters) {
        if (filters.plan === 'premium') {
            query = query.eq('is_premium', true);
        } else if (filters.plan === 'free') {
            query = query.eq('is_premium', false);
        }

        if (filters.city) {
            query = query.ilike('city', `%${filters.city}%`);
        }

        if (filters.state) {
            query = query.eq('state', filters.state);
        }

        if (filters.with_photo) {
            query = query.not('avatar_url', 'is', null);
        }

        if (filters.online_only) {
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
            query = query.gte('last_online_at', fifteenMinutesAgo);
        }

        return query;
    },

    applyClientSideFilters(profiles, filters) {
        return profiles.filter(profile => {
            const details = profile.user_details || {};

            if (filters.age_range && profile.birth_date) {
                const age = this.calculateAge(profile.birth_date);
                if (!this.isInAgeRange(age, filters.age_range)) {
                    return false;
                }
            }

            if (filters.gender && details.gender) {
                if (filters.gender === 'homem' && !['masculino'].includes(details.gender)) {
                    return false;
                }
                if (filters.gender === 'mulher' && !['feminino'].includes(details.gender)) {
                    return false;
                }
            }

            if (filters.orientation && details.sexual_orientation) {
                if (filters.orientation !== details.sexual_orientation) {
                    return false;
                }
            }

            if (filters.relationship_status && details.relationship_status) {
                if (filters.relationship_status !== details.relationship_status) {
                    return false;
                }
            }

            if (filters.looking_for && details.looking_for) {
                if (filters.looking_for !== details.looking_for) {
                    return false;
                }
            }

            if (filters.interests && details.interests) {
                if (!details.interests.includes(filters.interests)) {
                    return false;
                }
            }

            if (filters.zodiac && details.zodiac) {
                if (filters.zodiac !== details.zodiac) {
                    return false;
                }
            }

            return true;
        });
    },

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

    isInAgeRange(age, ageRange) {
        switch (ageRange) {
            case '18-25': return age >= 18 && age <= 25;
            case '26-35': return age >= 26 && age <= 35;
            case '36-45': return age >= 36 && age <= 45;
            case '45+': return age >= 45;
            default: return true;
        }
    },

    showLoadingState() {
        const resultsGrid = document.getElementById('resultsGrid');
        if (resultsGrid) {
            resultsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search fa-spin"></i>
                    <p>Buscando pessoas...</p>
                </div>
            `;
        }
    },

    displayResults(results) {
        const resultsGrid = document.getElementById('resultsGrid');
        if (!resultsGrid) return;

        if (results.length === 0) {
            resultsGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-users"></i>
                    <p>Nenhuma pessoa encontrada</p>
                    <small>Tente ajustar os filtros da busca</small>
                </div>
            `;
            return;
        }

        resultsGrid.innerHTML = results.map(profile => this.createProfileCard(profile)).join('');
    },

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

    isUserOnline(lastOnlineAt) {
        if (!lastOnlineAt) return false;
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        return new Date(lastOnlineAt) > fifteenMinutesAgo;
    },

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

    updateResultsCount(count) {
        const resultsCount = document.getElementById('resultsCount');
        if (resultsCount) {
            resultsCount.textContent = count;
        }
    },

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

    viewProfile(userId) {
        window.location.href = `perfil.html?id=${userId}`;
    },

    sendMessage(userId) {
        window.location.href = `mensagens.html?user=${userId}`;
    },

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-message">${message}</span>
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

        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 5000);
    }
};

document.addEventListener('DOMContentLoaded', function() {
    SearchManager.initialize();
});

supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT') {
        window.location.href = 'login.html';
    }
});

window.SearchManager = SearchManager;

// Menu Mobile para Busca
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    
  });

  // Menu Mobile para Busca - CÓDIGO COMPLETO E FUNCIONAL
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('nav');
    const menuClose = document.querySelector('.menu-close');
    const body = document.body;

    // Função para abrir o menu
    function openMenu() {
        nav.classList.add('active');
        menuToggle.classList.add('active');
        body.style.overflow = 'hidden'; // Previne scroll do body
    }

    // Função para fechar o menu
    function closeMenu() {
        nav.classList.remove('active');
        menuToggle.classList.remove('active');
        body.style.overflow = ''; // Restaura scroll do body
    }

    // Evento de clique no botão hamburguer
    if (menuToggle) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            openMenu();
        });
    }

    // Evento de clique no botão fechar (X)
    if (menuClose) {
        menuClose.addEventListener('click', function(e) {
            e.stopPropagation();
            closeMenu();
        });
    }

    // Fechar menu ao clicar em um link
    const navLinks = document.querySelectorAll('nav a');
    navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Fechar menu ao clicar fora dele
    document.addEventListener('click', function(e) {
        if (nav.classList.contains('active') && 
            !nav.contains(e.target) && 
            e.target !== menuToggle) {
            closeMenu();
        }
    });

    // Fechar menu com tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && nav.classList.contains('active')) {
            closeMenu();
        }
    });

    // Prevenir que clique dentro do menu feche ele
    nav.addEventListener('click', function(e) {
        e.stopPropagation();
    });
});

// Garantir que o menu funcione mesmo após carregamento dinâmico
window.addEventListener('load', function() {
    // Re-inicializa os event listeners se necessário
    const menuToggle = document.querySelector('.menu-toggle');
    const menuClose = document.querySelector('.menu-close');
    
    if (menuToggle && !menuToggle.hasAttribute('data-listener-added')) {
        menuToggle.setAttribute('data-listener-added', 'true');
    }
    
    if (menuClose && !menuClose.hasAttribute('data-listener-added')) {
        menuClose.setAttribute('data-listener-added', 'true');
    }
});