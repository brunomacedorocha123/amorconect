// status.js - Sistema global de status online/offline/invisível
class StatusSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
    }

    async initialize(currentUser) {
        this.currentUser = currentUser;
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

            return statusMap;
        } catch (error) {
            return {};
        }
    }

    async updateMyStatus() {
        if (!this.currentUser) return;
        
        try {
            await this.supabase
                .from('profiles')
                .update({ last_online_at: new Date().toISOString() })
                .eq('id', this.currentUser.id);
        } catch (error) {
            // Silencioso
        }
    }
}

// Instância global
window.StatusSystem = new StatusSystem();