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
        try {
            const { data: { user } } = await this.supabase.auth.getUser();
            if (!user) return;
            this.currentUser = user;
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
        }
    }

    async loadNotificationCount() {
        if (!this.currentUser) return;

        try {
            // Usar a mesma função SQL que criamos para as notificações
            const { data: notifications, error } = await this.supabase.rpc('get_user_visible_notifications', {
                user_uuid: this.currentUser.id
            });

            if (error) throw error;

            // Contar apenas notificações não lidas
            this.notificationCount = notifications.filter(n => !n.is_read).length;
            this.updateBellUI();

        } catch (error) {
            console.error('Erro ao carregar contador de notificações:', error);
        }
    }

    updateBellUI() {
        const countElement = document.getElementById('notificationCount');
        const bellLink = document.querySelector('.bell-link');

        if (countElement) {
            countElement.textContent = this.notificationCount;
            
            // Mostrar/ocultar badge baseado no count
            if (this.notificationCount > 0) {
                countElement.style.display = 'flex';
                bellLink.classList.add('has-notifications');
                
                // Atualizar título da página
                document.title = `(${this.notificationCount}) Amor Conect`;
            } else {
                countElement.style.display = 'none';
                bellLink.classList.remove('has-notifications');
                document.title = 'Amor Conect';
            }

            // Efeito especial para muitas notificações
            if (this.notificationCount > 9) {
                countElement.style.background = 'var(--danger)';
                countElement.textContent = '9+';
            } else {
                countElement.style.background = 'var(--burgundy)';
            }
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
                    event: 'INSERT',
                    schema: 'public',
                    table: 'user_notifications',
                    filter: `user_id=eq.${this.currentUser.id}`
                },
                () => {
                    this.loadNotificationCount(); // Recarregar contador
                    this.showNewNotificationAlert();
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'user_notifications',
                    filter: `user_id=eq.${this.currentUser.id}`
                },
                () => {
                    this.loadNotificationCount(); // Recarregar quando notificação for lida
                }
            )
            .subscribe();
    }

    showNewNotificationAlert() {
        // Efeito visual quando chega nova notificação
        const bell = document.querySelector('.bell-link');
        if (bell) {
            bell.style.animation = 'none';
            setTimeout(() => {
                bell.style.animation = 'shake 0.5s ease-in-out, pulse 2s infinite';
            }, 10);
        }

        // Opcional: Mostrar toast notification
        this.showToast('Nova notificação recebida!');
    }

    showToast(message) {
        // Criar toast notification temporária
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 120px;
            right: 20px;
            background: var(--gold);
            color: var(--dark-bg);
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: var(--shadow);
            z-index: 9999;
            font-weight: 600;
            animation: slideInRight 0.3s ease;
        `;
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Método para marcar todas como lidas (útil para chamar de outros lugares)
    async markAllAsRead() {
        if (!this.currentUser) return;

        try {
            const { error } = await this.supabase
                .from('user_notifications')
                .update({
                    is_read: true,
                    read_at: new Date().toISOString()
                })
                .eq('user_id', this.currentUser.id)
                .eq('is_read', false);

            if (error) throw error;

            await this.loadNotificationCount();
            
        } catch (error) {
            console.error('Erro ao marcar notificações como lidas:', error);
        }
    }
}

// Inicializar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    window.notificationBell = new NotificationBell();
});

// Função global para atualizar o sino manualmente (se necessário)
window.updateNotificationBell = async function() {
    if (window.notificationBell) {
        await window.notificationBell.loadNotificationCount();
    }
};