// notifications-bell.js - Gerenciador do Sino de Notificações

class NotificationBell {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.notificationCount = 0;
        this.init();
    }

    async init() {
        await this.checkAuthentication();
        await this.loadNotificationCount();
        this.setupRealtimeUpdates();
    }

    async checkAuthentication() {
        const { data: { user } } = await this.supabase.auth.getUser();
        if (!user) return;
        this.currentUser = user;
    }

    async loadNotificationCount() {
        if (!this.currentUser) {
            this.updateBellUI();
            return;
        }

        try {
            // Tentar usar a função SQL primeiro
            const { data: notifications, error } = await this.supabase.rpc('get_user_visible_notifications', {
                user_uuid: this.currentUser.id
            });

            if (error) {
                // Se a função não existir, usar consulta direta
                await this.loadNotificationCountDirect();
                return;
            }

            // Contar apenas notificações não lidas
            this.notificationCount = notifications ? notifications.filter(n => !n.is_read).length : 0;
            this.updateBellUI();

        } catch (error) {
            await this.loadNotificationCountDirect();
        }
    }

    async loadNotificationCountDirect() {
        try {
            // Consulta direta de fallback
            const { data: notifications, error } = await this.supabase
                .from('user_notifications')
                .select('id, is_read')
                .eq('user_id', this.currentUser.id)
                .eq('is_read', false)
                .gt('expires_at', new Date().toISOString());

            if (error) {
                this.notificationCount = 0;
            } else {
                this.notificationCount = notifications ? notifications.length : 0;
            }
            
            this.updateBellUI();

        } catch (error) {
            this.notificationCount = 0;
            this.updateBellUI();
        }
    }

    updateBellUI() {
        const countElement = document.getElementById('notificationCount');
        const bellLink = document.querySelector('.bell-link');

        if (!countElement || !bellLink) return;

        countElement.textContent = this.notificationCount;
        
        // Mostrar/ocultar badge baseado no count
        if (this.notificationCount > 0) {
            countElement.style.display = 'flex';
            bellLink.classList.add('has-notifications');
            
            // Atualizar título da página
            if (document.title && !document.title.startsWith('(')) {
                document.title = `(${this.notificationCount}) ${document.title}`;
            }
        } else {
            countElement.style.display = 'none';
            bellLink.classList.remove('has-notifications');
            
            // Remover número do título se existir
            if (document.title && document.title.startsWith('(')) {
                document.title = document.title.replace(/^\(\d+\)\s*/, '');
            }
        }

        // Efeito especial para muitas notificações
        if (this.notificationCount > 9) {
            countElement.style.background = '#dc2626';
            countElement.textContent = '9+';
        } else {
            countElement.style.background = 'var(--burgundy)';
            countElement.textContent = this.notificationCount.toString();
        }
    }

    setupRealtimeUpdates() {
        if (!this.currentUser) return;

        // Escutar novas notificações em tempo real
        this.supabase
            .channel('notifications-bell')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'user_notifications',
                    filter: `user_id=eq.${this.currentUser.id}`
                },
                () => {
                    this.loadNotificationCount();
                }
            )
            .subscribe();
    }
}

// Inicialização silenciosa
document.addEventListener('DOMContentLoaded', function() {
    if (typeof supabase !== 'undefined') {
        window.notificationBell = new NotificationBell();
    }
});

// Função global para atualização manual
window.updateNotificationBell = async function() {
    if (window.notificationBell) {
        await window.notificationBell.loadNotificationCount();
    }
};