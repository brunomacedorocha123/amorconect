// status.js - Sistema global de status online/offline/invisível
class StatusSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.statusUpdateInterval = null;
        this.statusCache = new Map();
        this.cacheTimeout = 60000; // 1 minuto de cache
    }

    async initialize(currentUser) {
        this.currentUser = currentUser;
        
        // Atualizar status imediatamente
        await this.updateMyStatus();
        
        // Iniciar atualizações periódicas
        this.startPeriodicUpdates();
        
        // Atualizar quando a página ganha foco
        this.setupVisibilityHandler();
    }

    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden) {
                await this.updateMyStatus();
            }
        });
    }

    startPeriodicUpdates() {
        // Atualizar status a cada 30 segundos
        this.statusUpdateInterval = setInterval(async () => {
            await this.updateMyStatus();
        }, 30000);
    }

    stopPeriodicUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }
    }

    calculateUserStatus(lastOnlineAt, isInvisible = false, userId = null) {
        if (!lastOnlineAt) {
            return { status: 'offline', text: 'Offline', class: 'status-offline' };
        }
        
        // Usuário invisível aparece como offline para outros
        if (isInvisible && userId !== this.currentUser?.id) {
            return { status: 'invisible', text: 'Offline', class: 'status-offline' };
        }

        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        const isOnline = new Date(lastOnlineAt) > fifteenMinutesAgo;

        if (isOnline) {
            return { status: 'online', text: 'Online', class: 'status-online' };
        } else {
            return { status: 'offline', text: 'Offline', class: 'status-offline' };
        }
    }

    async getMultipleUsersStatus(userIds) {
        if (!userIds || userIds.length === 0) return {};

        // Verificar cache primeiro
        const cachedResult = this.getCachedStatus(userIds);
        if (cachedResult) return cachedResult;

        try {
            const { data: profiles, error } = await this.supabase
                .from('profiles')
                .select('id, last_online_at, is_invisible')
                .in('id', userIds);

            if (error) {
                console.error('Erro ao buscar status:', error);
                return {};
            }

            const statusMap = {};
            profiles.forEach(profile => {
                statusMap[profile.id] = this.calculateUserStatus(
                    profile.last_online_at, 
                    profile.is_invisible, 
                    profile.id
                );
            });

            // Armazenar em cache
            this.setCachedStatus(userIds, statusMap);

            return statusMap;
        } catch (error) {
            console.error('Erro no getMultipleUsersStatus:', error);
            return {};
        }
    }

    getCachedStatus(userIds) {
        const cacheKey = userIds.sort().join('_');
        const cached = this.statusCache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
            return cached.data;
        }
        
        return null;
    }

    setCachedStatus(userIds, statusMap) {
        const cacheKey = userIds.sort().join('_');
        this.statusCache.set(cacheKey, {
            data: statusMap,
            timestamp: Date.now()
        });

        // Limpar cache antigo periodicamente
        this.cleanOldCache();
    }

    cleanOldCache() {
        const now = Date.now();
        for (let [key, value] of this.statusCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.statusCache.delete(key);
            }
        }
    }

    async updateMyStatus() {
        if (!this.currentUser) return;
        
        try {
            const { error } = await this.supabase
                .from('profiles')
                .update({ 
                    last_online_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.currentUser.id);

            if (error) {
                console.error('Erro ao atualizar status:', error);
            }
        } catch (error) {
            console.error('Erro no updateMyStatus:', error);
        }
    }

    // Método para forçar atualização do cache
    invalidateCache() {
        this.statusCache.clear();
    }

    // Método para destruir a instância (limpeza)
    destroy() {
        this.stopPeriodicUpdates();
        this.statusCache.clear();
        this.currentUser = null;
    }
}

// Instância global
window.StatusSystem = new StatusSystem();