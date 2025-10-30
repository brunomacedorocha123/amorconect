// status.js - Sistema global de status online/offline/invisível
class StatusSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.statusUpdateInterval = null;
        this.statusCache = new Map();
        this.cacheTimeout = 60000;
    }

    async initialize(currentUser) {
        this.currentUser = currentUser;
        await this.updateMyStatusSafe();
        this.startPeriodicUpdates();
        this.setupVisibilityHandler();
    }

    setupVisibilityHandler() {
        document.addEventListener('visibilitychange', async () => {
            if (!document.hidden && this.currentUser) {
                await this.updateMyStatusSafe();
            }
        });
    }

    startPeriodicUpdates() {
        if (this.statusUpdateInterval) {
            clearInterval(this.statusUpdateInterval);
        }
        
        this.statusUpdateInterval = setInterval(async () => {
            if (this.currentUser) {
                await this.updateMyStatusSafe();
            }
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

        const cachedResult = this.getCachedStatus(userIds);
        if (cachedResult) return cachedResult;

        try {
            const { data: profiles, error } = await this.supabase
                .from('profiles')
                .select('id, last_online_at, is_invisible')
                .in('id', userIds);

            if (error) return {};

            const statusMap = {};
            profiles.forEach(profile => {
                statusMap[profile.id] = this.calculateUserStatus(
                    profile.last_online_at, 
                    profile.is_invisible, 
                    profile.id
                );
            });

            this.setCachedStatus(userIds, statusMap);
            return statusMap;
        } catch (error) {
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

    async updateMyStatusSafe() {
        if (!this.currentUser) return;
        
        try {
            const { error } = await this.supabase.rpc('update_user_online_status', {
                user_uuid: this.currentUser.id
            });
            
            if (error) return false;
            return true;
        } catch (error) {
            return false;
        }
    }

    invalidateCache() {
        this.statusCache.clear();
    }

    destroy() {
        this.stopPeriodicUpdates();
        this.statusCache.clear();
        this.currentUser = null;
    }
}

window.StatusSystem = new StatusSystem();