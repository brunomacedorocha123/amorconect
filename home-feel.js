// home-feel.js - Sistema de Feel/Vibe integrado com Premium
const FeelManager = {
    currentUser: null,
    feelsReceived: [],
    feelsGiven: [],
    dailyFeelLimit: 10,

    // INICIALIZAR SISTEMA FEEL
    async initialize() {
        try {
            const { data: { user }, error } = await supabase.auth.getUser();
            if (error || !user) return;

            this.currentUser = user;
            await this.loadFeelsData();
            await this.renderFeelsSection();
            
        } catch (error) {
            console.error('Erro ao inicializar sistema Feel:', error);
        }
    },

    // CARREGAR DADOS DE FEELS
    async loadFeelsData() {
        try {
            await Promise.all([
                this.loadFeelsReceived(),
                this.loadFeelsGiven()
            ]);
        } catch (error) {
            console.error('Erro ao carregar dados feels:', error);
        }
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
            this.feelsReceived = [];
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
            
            // Calcular feels de hoje
            this.calculateDailyFeels();
            
        } catch (error) {
            console.error('Erro ao carregar feels dados:', error);
            this.feelsGiven = [];
        }
    },

    // CALCULAR FEELS DIÁRIOS
    calculateDailyFeels() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const todayFeels = this.feelsGiven.filter(feel => 
                feel.created_at && feel.created_at.startsWith(today)
            );
            
            this.todayFeelCount = todayFeels.length;
            this.canGiveMoreFeels = this.todayFeelCount < this.dailyFeelLimit;
            
        } catch (error) {
            this.todayFeelCount = 0;
            this.canGiveMoreFeels = true;
        }
    },

    // RENDERIZAR SEÇÃO DE FEELS NA HOME
    async renderFeelsSection() {
        const feelsContainer = document.getElementById('feelsContainer');
        if (!feelsContainer) return;

        try {
            // Verificar se PremiumManager existe
            let isPremium = false;
            if (typeof PremiumManager !== 'undefined') {
                const planInfo = await PremiumManager.getPlanInfo();
                isPremium = planInfo.is_premium;
            } else {
                // Fallback: verificar diretamente no perfil
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', this.currentUser.id)
                    .single();
                isPremium = profile?.is_premium || false;
            }
            
            if (isPremium) {
                this.renderPremiumFeelsSection(feelsContainer);
            } else {
                this.renderFreeFeelsSection(feelsContainer);
            }
        } catch (error) {
            // Se houver erro, mostra versão free
            this.renderFreeFeelsSection(feelsContainer);
        }
    },

    // RENDERIZAR SEÇÃO PREMIUM (LISTA COMPLETA)
    renderPremiumFeelsSection(container) {
        if (!this.feelsReceived || this.feelsReceived.length === 0) {
            container.innerHTML = this.getEmptyFeelsState();
            return;
        }

        const recentFeels = this.feelsReceived.slice(0, 8);
        
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
        const feelCount = this.feelsReceived ? this.feelsReceived.length : 0;
        
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
        if (!feel || !feel.giver) return '';
        
        const user = feel.giver;
        const safeNickname = (user.nickname || 'Usuário').replace(/"/g, '&quot;');
        const timeAgo = this.getTimeAgo(feel.created_at);
        
        return `
            <div class="feel-user-card" onclick="viewUserProfile('${user.id}')">
                <div class="feel-user-avatar">
                    ${user.avatar_url ? 
                        `<img src="${user.avatar_url}" alt="${safeNickname}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
                        ''
                    }
                    <div class="avatar-fallback" style="${user.avatar_url ? 'display:none' : 'display:flex'}">
                        ${this.getUserInitials(user.nickname)}
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
            if (!receiverId || !this.currentUser) {
                this.showNotification('Erro: dados inválidos', 'error');
                return false;
            }

            // Verificar se é premium ou tem feels disponíveis
            let isPremium = false;
            if (typeof PremiumManager !== 'undefined') {
                const planInfo = await PremiumManager.getPlanInfo();
                isPremium = planInfo.is_premium;
            }

            if (!isPremium) {
                if (this.todayFeelCount >= this.dailyFeelLimit) {
                    this.showFeelLimitReached();
                    return false;
                }
            }

            // Verificar se já deu feel antes
            const existingFeel = this.feelsGiven.find(feel => feel.receiver_id === receiverId);
            if (existingFeel) {
                this.showNotification('Você já deu Feel neste perfil!');
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
                if (error.code === '23505') {
                    this.showNotification('Você já deu Feel neste perfil!');
                } else {
                    throw error;
                }
                return false;
            }

            // Atualizar dados locais
            this.feelsGiven.push({ receiver_id: receiverId, created_at: data.created_at });
            this.calculateDailyFeels();

            // Mostrar feedback
            this.showNotification('Feel enviado com sucesso! ❤️');
            
            // Verificar se criou vibe (match)
            setTimeout(() => this.checkForVibe(receiverId), 1000);
            
            return true;

        } catch (error) {
            console.error('Erro ao enviar feel:', error);
            this.showNotification('Erro ao enviar Feel. Tente novamente.', 'error');
            return false;
        }
    },

    // REMOVER FEEL
    async removeFeel(receiverId) {
        try {
            if (!receiverId || !this.currentUser) return false;

            const { error } = await supabase
                .from('user_feels')
                .delete()
                .eq('giver_id', this.currentUser.id)
                .eq('receiver_id', receiverId);

            if (error) throw error;

            // Atualizar dados locais
            this.feelsGiven = this.feelsGiven.filter(feel => feel.receiver_id !== receiverId);
            this.calculateDailyFeels();

            this.showNotification('Feel removido');
            return true;

        } catch (error) {
            console.error('Erro ao remover feel:', error);
            this.showNotification('Erro ao remover Feel.', 'error');
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
        this.showNotification(
            `Limite diário de Feels atingido! (${this.dailyFeelLimit}/dia)\n\n` +
            '💎 Torne-se Premium para Feils ilimitados!', 
            'error'
        );
    },

    // NOTIFICAÇÃO DE VIBE (MATCH)
    async showVibeNotification(receiverId) {
        try {
            const { data: user } = await supabase
                .from('profiles')
                .select('nickname')
                .eq('id', receiverId)
                .single();

            if (user) {
                this.showNotification(
                    `🎉 VIBE CONECTADA! Você e ${user.nickname} sentiram a mesma energia!`, 
                    'success'
                );
            }
        } catch (error) {
            // Se não conseguir pegar o nome, mostra mensagem genérica
            this.showNotification('🎉 VIBE CONECTADA! Vocês sentiram a mesma energia!', 'success');
        }
    },

    // SISTEMA DE NOTIFICAÇÃO (fallback)
    showNotification(message, type = 'success') {
        // Tenta usar o sistema do home.js primeiro
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback simples
            alert(message);
        }
    },

    // CALCULAR TEMPO DECORRIDO
    getTimeAgo(timestamp) {
        if (!timestamp) return 'Recentemente';
        
        try {
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
        } catch (error) {
            return 'Recentemente';
        }
    },

    // INICIAIS DO USUÁRIO
    getUserInitials(name) {
        if (!name) return 'U';
        return name.split(' ').map(word => word.charAt(0)).join('').toUpperCase().substring(0, 2);
    },

    // ATUALIZAR CONTADOR DE FEELS DISPONÍVEIS
    updateFeelCounter() {
        const feelCounter = document.getElementById('feelCounter');
        if (feelCounter) {
            let isPremium = false;
            
            // Verificar se é premium
            if (window.PremiumManager?.userPlanInfo?.is_premium) {
                isPremium = true;
            }
            
            if (!isPremium) {
                const remaining = this.dailyFeelLimit - (this.todayFeelCount || 0);
                feelCounter.textContent = `${remaining} Feels restantes hoje`;
                feelCounter.style.display = remaining > 0 ? 'block' : 'none';
            } else {
                feelCounter.style.display = 'none';
            }
        }
    }
};

// INICIALIZAR QUANDO O DOM ESTIVER PRONTO
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que tudo carregou
    setTimeout(() => {
        FeelManager.initialize();
    }, 1000);
});

// === FUNÇÕES GLOBAIS ===
window.sendFeel = (receiverId) => FeelManager.sendFeel(receiverId);
window.removeFeel = (receiverId) => FeelManager.removeFeel(receiverId);
window.FeelManager = FeelManager;

// RECARREGAR SEÇÃO QUANDO HOUVER MUDANÇA DE PREMIUM
if (window.PremiumManager) {
    const originalUpdateUI = window.PremiumManager.updateUIWithPremiumStatus;
    window.PremiumManager.updateUIWithPremiumStatus = async function() {
        await originalUpdateUI?.();
        await FeelManager.renderFeelsSection();
    };
}