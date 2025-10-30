// status.js - Sistema global de status online/offline/invisível ATUALIZADO
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
        await this.updateMyStatusSafe(true);
        this.startPeriodicUpdates();
        this.setupVisibilityHandler();
    }

    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && this.currentUser) {
                await this.updateMyStatusSafe(true);
                await this.invalidateCache();
            }
        });
    }

    startPeriodicUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
        }
        
        this.statusUpdateInterval = setInterval(async () => {
            if (this.currentUser) {
                await this.updateMyStatusSafe(true);
            }
        }, 30000); // A cada 30 segundos
    }

    stopPeriodicUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
            this.statusUpdateInterval = null;
        }
    }

    // ✅ FUNÇÃO ATUALIZADA COM SISTEMA DE STATUS DUPLO
    calculateUserStatus(lastOnlineAt, realStatus, isInvisible = false, userId = null) {
        // 1. Verificação básica
        if (!lastOnlineAt) {
            return { status: 'offline', text: 'Offline', class: 'status-offline' };
        }
        
        // 2. ✅ REGRA PRINCIPAL: USUÁRIO INVISÍVEL
        // Se está invisível E não é o usuário atual → SEMPRE mostra "Offline"
        if (isInvisible && userId !== this.currentUser?.id) {
            return { status: 'invisible', text: 'Offline', class: 'status-offline' };
        }

        // 3. ✅ SE STATUS REAL É ONLINE → mostra online (imediatamente)
        if (realStatus === 'online') {
            return { status: 'online', text: 'Online', class: 'status-online' };
        }

        // 4. ✅ SE STATUS REAL É OFFLINE → aplica grace period de 2 minutos
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        const isWithinGracePeriod = new Date(lastOnlineAt) > twoMinutesAgo;

        if (isWithinGracePeriod) {
            return { status: 'online', text: 'Online', class: 'status-online' };
        } else {
            return { status: 'offline', text: 'Offline', class: 'status-offline' };
        }
    }

    // ✅ FUNÇÃO ATUALIZADA PARA BUSCAR REAL_STATUS
    async getMultipleUsersStatus(userIds) {
        if (!userIds || userIds.length === 0) return {};

        const cachedResult = this.getCachedStatus(userIds);
        if (cachedResult) return cachedResult;

        try {
            const { data: profiles, error } = await this.supabase
                .from('profiles')
                .select('id, last_online_at, real_status, is_invisible')
                .in('id', userIds);

            if (error) {
                console.error('Erro ao buscar status:', error);
                return {};
            }

            const statusMap = {};
            profiles.forEach(profile => {
                statusMap[profile.id] = this.calculateUserStatus(
                    profile.last_online_at, 
                    profile.real_status, // ✅ AGORA USA REAL_STATUS
                    profile.is_invisible, 
                    profile.id
                );
            });

            this.setCachedStatus(userIds, statusMap);
            return statusMap;
        } catch (error) {
            console.error('Erro no getMultipleUsersStatus:', error);
            return {};
        }
    }

    // ✅ FUNÇÃO PARA BUSCAR STATUS DE UM ÚNICO USUÁRIO
    async getUserStatus(userId) {
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('last_online_at, real_status, is_invisible')
                .eq('id', userId)
                .single();

            if (error || !profile) {
                return { status: 'offline', text: 'Offline', class: 'status-offline' };
            }

            return this.calculateUserStatus(
                profile.last_online_at,
                profile.real_status,
                profile.is_invisible,
                userId
            );
        } catch (error) {
            return { status: 'offline', text: 'Offline', class: 'status-offline' };
        }
    }

    // ✅ SISTEMA DE CACHE (para performance)
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

    // ✅ FUNÇÃO ATUALIZADA PARA ATUALIZAR PRÓPRIO STATUS
    async updateMyStatusSafe(isOnline = true) {
        if (!this.currentUser) return false;
        
        try {
            const { data: success, error } = await this.supabase.rpc('update_user_online_status', {
                user_uuid: this.currentUser.id,
                is_online: isOnline
            });
            
            if (error) {
                console.error('Erro ao atualizar status:', error);
                return false;
            }
            
            // Invalida cache quando próprio status muda
            if (success) {
                this.invalidateCache();
            }
            
            return success;
        } catch (error) {
            console.error('Erro no updateMyStatusSafe:', error);
            return false;
        }
    }

    // ✅ INVALIDAR CACHE (quando status mudam)
    invalidateCache() {
        this.statusCache.clear();
    }

    // ✅ ATUALIZAR STATUS PARA OFFLINE (quando usuário sai)
    async setOffline() {
        if (this.currentUser) {
            await this.updateMyStatusSafe(false);
        }
    }

    // ✅ ATUALIZAR STATUS PARA ONLINE (quando usuário volta)
    async setOnline() {
        if (this.currentUser) {
            await this.updateMyStatusSafe(true);
        }
    }

    // ✅ VERIFICAR SE USUÁRIO ESTÁ ONLINE (com grace period)
    isUserOnline(lastOnlineAt, realStatus, isInvisible = false, userId = null) {
        if (!lastOnlineAt) return false;
        
        // Usuário invisível aparece como offline para outros
        if (isInvisible && userId !== this.currentUser?.id) {
            return false;
        }

        // Status real tem prioridade
        if (realStatus === 'online') {
            return true;
        }

        // Grace period de 2 minutos
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
        return new Date(lastOnlineAt) > twoMinutesAgo;
    }

    // ✅ DESTRUIR INSTÂNCIA (limpeza)
    destroy() {
        this.stopPeriodicUpdates();
        this.statusCache.clear();
        this.currentUser = null;
    }

    // ✅ REINICIALIZAR (para mudança de usuário)
    async reinitialize(currentUser) {
        this.destroy();
        await this.initialize(currentUser);
    }
}

// ✅ INICIALIZAR SISTEMA GLOBAL
window.StatusSystem = new StatusSystem();

// ✅ EVENT LISTENERS GLOBAIS para gerenciar status
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que o supabase esteja carregado
    setTimeout(() => {
        if (window.supabase && window.StatusSystem) {
            // Verificar se há usuário autenticado
            window.supabase.auth.getUser().then(({ data: { user } }) => {
                if (user && window.StatusSystem.currentUser === null) {
                    window.StatusSystem.initialize(user);
                }
            });
        }
    }, 1000);
});

// ✅ LIDAR COM RECARREGAMENTO DE PÁGINA
window.addEventListener('beforeunload', function() {
    if (window.StatusSystem && window.StatusSystem.currentUser) {
        // Usar sendBeacon para garantir que o status offline seja enviado
        const data = new Blob([JSON.stringify({
            user_uuid: window.StatusSystem.currentUser.id,
            is_online: false
        })], { type: 'application/json' });
        
        navigator.sendBeacon(`${SUPABASE_URL}/rest/v1/rpc/update_user_online_status`, data);
    }
});

// ✅ LIDAR COM MUDANÇAS DE AUTENTICAÇÃO
if (window.supabase) {
    window.supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session?.user && window.StatusSystem) {
            window.StatusSystem.reinitialize(session.user);
        } else if (event === 'SIGNED_OUT' && window.StatusSystem) {
            window.StatusSystem.destroy();
        }
    });
}