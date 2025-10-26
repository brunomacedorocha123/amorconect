// home-feel.js - Sistema de Feel/Vibe integrado com Premium
const FeelManager = {
    currentUser: null,
    feelsReceived: [],
    feelsGiven: [],
    dailyFeelLimit: 10, // Limite diário para free users

    // INICIALIZAR SISTEMA FEEL
    async initialize() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) return;

            this.currentUser = user;
            await this.loadFeelsData();
            await this.renderFeelsSection();
            this.setupEventListeners();
            
        } catch (error) {
            console.error('Erro ao inicializar sistema Feel:', error);
        }
    },

    // CARREGAR DADOS DE FEELS
    async loadFeelsData() {
        await Promise.all([
            this.loadFeelsReceived(),
            this.loadFeelsGiven(),
            this.checkDailyFeelCount()
        ]);
    },

    // CARREGAR FEELS RECEBIDOS
    async loadFeelsReceived() {
        try {
            const { data, error } = await supabase
                .from('user_feels')
                .select(`
                    id,
                    created_at,
                    giver:profiles!user_feels_giver_id_fkey(
                        id,
                        nickname,
                        avatar_url,
                        is_premium,
                        display_city
                    )
                `)
                .eq('receiver_id', this.currentUser.id)
                .order('created_at', { ascending: false });

            if (!error) {
                this.feelsReceived = data || [];
            }
        } catch (error) {
            console.error('Erro ao carregar feels recebidos:', error);
        }
    },

    // CARREGAR FEELS DADOS
    async loadFeelsGiven() {
        try {
            const { data, error } = await supabase
                .from('user_feels')
                .select('receiver_id, created_at')
                .eq('giver_id', this.currentUser.id);

            if (!error) {
                this.feelsGiven = data || [];
            }
        } catch (error) {
            console.error('Erro ao carregar feels dados:', error);
        }
    },

    // VERIFICAR CONTAGEM DIÁRIA DE FEELS
    async checkDailyFeelCount() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const todayFeels = this.feelsGiven.filter(feel => 
                feel.created_at.startsWith(today)
            );
            
            this.todayFeelCount = todayFeels.length;
            this.canGiveMoreFeels = this.todayFeelCount < this.dailyFeelLimit;
            
        } catch (error) {
            console.error('Erro ao verificar feels diários:', error);
        }
    },

    // RENDERIZAR SEÇÃO DE FEELS NA HOME
    async renderFeelsSection() {
        const feelsContainer = document.getElementById('feelsContainer');
        if (!feelsContainer) return;

        const planInfo = await PremiumManager.getPlanInfo();
        
        if (planInfo.is_premium) {
            this.renderPremiumFeelsSection(feelsContainer);
        } else {
            this.renderFreeFeelsSection(feelsContainer);
        }
    },

    // RENDERIZAR SEÇÃO PREMIUM (LISTA COMPLETA)
    renderPremiumFeelsSection(container) {
        if (this.feelsReceived.length === 0) {
            container.innerHTML = this.getEmptyFeelsState();
            return;
        }

        const recentFeels = this.feelsReceived.slice(0, 8); // Mostrar últimos 8
        
        container.innerHTML = `
            <div class="feels-grid">
                ${recentFeels.map(feel => this.getFeelUserCard(feel)).join('')}
            </div>
            ${this.feelsReceived.length > 8 ? this.getViewAllButton() : ''}
        `;

        // Mostrar botão "Ver todos" se tiver mais de 8 feels
        const viewAllBtn = document.getElementById('viewAllFeelsBtn');
        if (viewAllBtn && this.feelsReceived.length > 8) {
            viewAllBtn.style.display = 'block';
        }
    },

    // RENDERIZAR SEÇÃO FREE (APENAS CONTADOR)
    renderFreeFeelsSection(container) {
        const feelCount = this.feelsReceived.length;
        
        container.innerHTML = `
            <div class="feels-free-state">
                <div class="feels-count">
                    ${feelCount} ❤️
                </div>
                <p class="feels-free-message">
                    ${feelCount === 0 
                        ? 'Ainda não recebeu nenhum Feel' 
                        : `${feelCount} pessoa${feelCount !== 1 ? 's' : ''} deram Feel em você!`
                    }
                </p>
                <div class="premium-upsell">
                    <p><strong>Quer ver quem são?</strong></p>
                    <button class="btn btn-primary" onclick="goToPricing()">
                        <i class="fas fa-crown"></i> Virar Premium
                    </button>
                </div>
            </div>
        `;
    },

    // CARD DE USUÁRIO QUE DEU FEEL
    getFeelUserCard(feel) {
        const user = feel.giver;
        const safeNickname = (user.nickname || 'Usuário').replace(/'/g, "\\'");
        const timeAgo = this.getTimeAgo(feel.created_at);
        
        return `
            <div class="feel-user-card" onclick="viewUserProfile('${user.id}')">
                <div class="feel-user-avatar">
                    ${user.avatar_url ? 
                        `<img src="${user.avatar_url}" alt="${safeNickname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="avatar-fallback" style="${user.avatar_url ? 'display:none' : 'display:flex'}">
                        ${getUserInitials(user.nickname)}
                    </div>
                </div>
                <div class="feel-user-name">${safeNickname}</div>
                <div class="feel-user-time">${timeAgo}</div>
                ${user.is_premium ? '<div class="premium-mini-badge">👑</div>' : ''}
            </div>
        `;
    },

    // ESTADO VAZIO
    getEmptyFeelsState() {
        return `
            <div class="feels-empty-state">
                <i class="fas fa-heart"></i>
                <h3>Nenhum Feel ainda</h3>
                <p>Seu perfil ainda não recebeu Feels. Continue interagindo!</p>
                <button class="btn btn-outline" onclick="goToBusca()">
                    <i class="fas fa-search"></i> Buscar Pessoas
                </button>
            </div>
        `;
    },

    // BOTÃO VER TODOS
    getViewAllButton() {
        return `
            <div class="view-all-container">
                <button class="btn-view-all" onclick="window.location.href='feels.html'">
                    Ver todos os Feels <i class="fas fa-arrow-right"></i>
                </button>
            </div>
        `;
    },

    // DAR FEEL EM UM USUÁRIO
    async sendFeel(receiverId) {
        try {
            // Verificar se é premium ou tem feels disponíveis
            const planInfo = await PremiumManager.getPlanInfo();
            
            if (!planInfo.is_premium) {
                if (!this.canGiveMoreFeels) {
                    this.showFeelLimitReached();
                    return false;
                }
                
                if (this.todayFeelCount >= this.dailyFeelLimit) {
                    this.showFeelLimitReached();
                    return false;
                }
            }

            // Verificar se já deu feel antes
            const existingFeel = this.feelsGiven.find(feel => feel.receiver_id === receiverId);
            if (existingFeel) {
                showNotification('Você já deu Feel neste perfil!');
                return false;
            }

            // Inserir feel no banco
            const { data, error } = await supabase
                .from('user_feels')
                .insert({
                    giver_id: this.currentUser.id,
                    receiver_id: receiverId,
                    created_at: new Date().toISOString()
                })
                .select()
                .single();

            if (error) {
                if (error.code === '23505') { // Unique violation
                    showNotification('Você já deu Feel neste perfil!');
                } else {
                    throw error;
                }
                return false;
            }

            // Atualizar dados locais
            this.feelsGiven.push({ receiver_id: receiverId, created_at: data.created_at });
            this.todayFeelCount++;
            this.canGiveMoreFeels = this.todayFeelCount < this.dailyFeelLimit;

            // Mostrar feedback
            showNotification('Feel enviado com sucesso! ❤️');
            
            // Verificar se criou vibe (match)
            await this.checkForVibe(receiverId);
            
            return true;

        } catch (error) {
            console.error('Erro ao enviar feel:', error);
            showNotification('Erro ao enviar Feel. Tente novamente.', 'error');
            return false;
        }
    },

    // REMOVER FEEL
    async removeFeel(receiverId) {
        try {
            const { error } = await supabase
                .from('user_feels')
                .delete()
                .eq('giver_id', this.currentUser.id)
                .eq('receiver_id', receiverId);

            if (error) throw error;

            // Atualizar dados locais
            this.feelsGiven = this.feelsGiven.filter(feel => feel.receiver_id !== receiverId);
            this.todayFeelCount = Math.max(0, this.todayFeelCount - 1);
            this.canGiveMoreFeels = this.todayFeelCount < this.dailyFeelLimit;

            showNotification('Feel removido');
            return true;

        } catch (error) {
            console.error('Erro ao remover feel:', error);
            showNotification('Erro ao remover Feel.', 'error');
            return false;
        }
    },

    // VERIFICAR SE CRIOU VIBE (MATCH)
    async checkForVibe(receiverId) {
        try {
            const { data: vibe, error } = await supabase
                .from('user_vibes')
                .select('*')
                .or(`user1_id.eq.${this.currentUser.id},user2_id.eq.${this.currentUser.id}`)
                .or(`user1_id.eq.${receiverId},user2_id.eq.${receiverId}`)
                .single();

            if (!error && vibe) {
                // VIBE CRIADA - MATCH!
                this.showVibeNotification(receiverId);
            }
        } catch (error) {
            // Silencioso - não é crítico
        }
    },

    // NOTIFICAÇÃO DE LIMITE DE FEELS
    showFeelLimitReached() {
        showNotification(
            `Limite diário de Feels atingido! (${this.dailyFeelLimit}/dia)\n\n` +
            '💎 Torne-se Premium para Feels ilimitados!', 
            'error'
        );
        
        // Opcional: redirecionar para pricing após 3 segundos
        setTimeout(() => {
            if (confirm('Deseja ver os planos Premium para Feels ilimitados?')) {
                goToPricing();
            }
        }, 2000);
    },

    // NOTIFICAÇÃO DE VIBE (MATCH)
    async showVibeNotification(receiverId) {
        // Buscar info do usuário
        const { data: user } = await supabase
            .from('profiles')
            .select('nickname, avatar_url')
            .eq('id', receiverId)
            .single();

        if (user) {
            showNotification(
                `🎉 VIBE CONECTADA!\n\nVocê e ${user.nickname} sentiram a mesma energia!`, 
                'success'
            );
        }
    },

    // CALCULAR TEMPO DECORRIDO
    getTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffMs = now - time;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Agora';
        if (diffMins < 60) return `${diffMins}min`;
        if (diffHours < 24) return `${diffHours}h`;
        if (diffDays < 7) return `${diffDays}d`;
        return time.toLocaleDateString('pt-BR');
    },

    // CONFIGURAR EVENT LISTENERS
    setupEventListeners() {
        // Listeners serão adicionados quando integrarmos com os cards
    },

    // ATUALIZAR CONTADOR DE FEELS DISPONÍVEIS (para free)
    updateFeelCounter() {
        const feelCounter = document.getElementById('feelCounter');
        if (feelCounter && !window.PremiumManager?.userPlanInfo?.is_premium) {
            const remaining = this.dailyFeelLimit - this.todayFeelCount;
            feelCounter.textContent = `${remaining} Feels restantes hoje`;
            feelCounter.style.display = remaining > 0 ? 'block' : 'none';
        }
    }
};

// INICIALIZAR QUANDO O DOM ESTIVER PRONTO
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        FeelManager.initialize();
    }, 1500);
});

// === FUNÇÕES GLOBAIS ===
window.sendFeel = (receiverId) => FeelManager.sendFeel(receiverId);
window.removeFeel = (receiverId) => FeelManager.removeFeel(receiverId);

// INTEGRAÇÃO COM PREMIUM CHECK - ATUALIZAR QUANDO STATUS MUDAR
window.PremiumManager?.updateUIWithPremiumStatus = async function() {
    await PremiumManager.updateUIWithPremiumStatus();
    await FeelManager.renderFeelsSection(); // Re-renderizar seções
};