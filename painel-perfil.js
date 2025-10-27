// Configuração do Supabase
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentFilter = 'all';

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    initializeNotifications();
});

// Sistema principal de notificações
async function initializeNotifications() {
    const authenticated = await checkAuthentication();
    if (authenticated) {
        setupNotificationEventListeners();
        await loadNotifications();
        updateNotificationStats();
        
        // Atualizar contador no header também
        await updateHeaderNotificationCount();
    }
}

// Verificar autenticação
async function checkAuthentication() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
            window.location.href = 'login.html';
            return false;
        }
        currentUser = user;
        return true;
    } catch (error) {
        window.location.href = 'login.html';
        return false;
    }
}

// Configurar eventos das notificações
function setupNotificationEventListeners() {
    // Filtros
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remover classe active de todos
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // Adicionar classe active no clicado
            this.classList.add('active');
            
            currentFilter = this.getAttribute('data-filter');
            loadNotifications();
        });
    });

    // Limpar todas as notificações
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', clearAllNotifications);
    }

    // Atualizar contador a cada 30 segundos
    setInterval(updateHeaderNotificationCount, 30000);
}

// Carregar notificações do usuário
async function loadNotifications() {
    try {
        if (!currentUser) return;

        const notificationsList = document.getElementById('notificationsList');
        if (!notificationsList) return;

        // Mostrar loading
        notificationsList.innerHTML = `
            <div class="notification-loading">
                <i class="fas fa-spinner"></i>
                <p>Carregando notificações...</p>
            </div>
        `;

        // Buscar notificações do usuário
        const { data: notifications, error } = await supabase
            .from('notification_recipients')
            .select(`
                id,
                read_status,
                created_at,
                notifications (
                    id,
                    title,
                    message,
                    type,
                    created_at,
                    sender_id,
                    profiles!notifications_sender_id_fkey(nickname)
                )
            `)
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });

        if (error) {
            throw new Error('Erro ao carregar notificações: ' + error.message);
        }

        // Filtrar notificações baseado no filtro atual
        let filteredNotifications = notifications || [];
        if (currentFilter === 'unread') {
            filteredNotifications = filteredNotifications.filter(n => !n.read_status);
        } else if (currentFilter === 'read') {
            filteredNotifications = filteredNotifications.filter(n => n.read_status);
        }

        // Renderizar notificações
        renderNotifications(filteredNotifications, notificationsList);

        // Atualizar estatísticas
        updateNotificationStats(filteredNotifications, notifications || []);

    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
        const notificationsList = document.getElementById('notificationsList');
        if (notificationsList) {
            notificationsList.innerHTML = `
                <div class="empty-notifications">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar</h3>
                    <p>Não foi possível carregar as notificações. Tente novamente.</p>
                </div>
            `;
        }
    }
}

// Renderizar notificações na lista
function renderNotifications(notifications, container) {
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="empty-notifications">
                <i class="fas fa-bell-slash"></i>
                <h3>Nenhuma notificação</h3>
                <p>Quando você receber notificações, elas aparecerão aqui.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = notifications.map(notification => {
        const notifData = notification.notifications;
        const isUnread = !notification.read_status;
        const timeAgo = getTimeAgo(new Date(notification.created_at));
        const icon = getNotificationIcon(notifData.type);
        const senderName = notifData.profiles?.nickname || 'Sistema';

        return `
            <div class="notification-item ${isUnread ? 'unread' : 'read'}" data-notification-id="${notification.id}">
                ${isUnread ? '<div class="notification-badge"></div>' : ''}
                <div class="notification-icon notification-type-${notifData.type}">
                    <i class="${icon}"></i>
                </div>
                <div class="notification-content">
                    <div class="notification-title">
                        ${notifData.title}
                        ${notifData.type === 'message' ? `<span style="color: var(--beige); font-weight: normal; font-size: 0.9em;">• De: ${senderName}</span>` : ''}
                    </div>
                    <div class="notification-message">${notifData.message}</div>
                    <div class="notification-time">
                        <i class="far fa-clock"></i> ${timeAgo}
                    </div>
                    <div class="notification-actions">
                        ${isUnread ? `
                            <button class="btn-mark-read" onclick="markAsRead('${notification.id}')">
                                <i class="fas fa-check"></i> Marcar como lida
                            </button>
                        ` : ''}
                        <button class="btn-delete-notification" onclick="deleteNotification('${notification.id}')">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Adicionar evento de clique para marcar como lida ao clicar na notificação
    container.querySelectorAll('.notification-item.unread').forEach(item => {
        item.addEventListener('click', function(e) {
            if (!e.target.closest('.notification-actions')) {
                const notificationId = this.getAttribute('data-notification-id');
                markAsRead(notificationId);
            }
        });
    });
}

// Marcar notificação como lida
async function markAsRead(notificationId) {
    try {
        const { error } = await supabase
            .from('notification_recipients')
            .update({ 
                read_status: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('user_id', currentUser.id);

        if (error) throw error;

        // Recarregar notificações
        await loadNotifications();
        
        // Atualizar contador no header
        await updateHeaderNotificationCount();

        showNotification('Notificação marcada como lida', 'success');

    } catch (error) {
        console.error('Erro ao marcar notificação como lida:', error);
        showNotification('Erro ao marcar notificação como lida', 'error');
    }
}

// Excluir notificação
async function deleteNotification(notificationId) {
    try {
        if (!confirm('Tem certeza que deseja excluir esta notificação?')) {
            return;
        }

        const { error } = await supabase
            .from('notification_recipients')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', currentUser.id);

        if (error) throw error;

        // Recarregar notificações
        await loadNotifications();
        
        // Atualizar contador no header
        await updateHeaderNotificationCount();

        showNotification('Notificação excluída', 'success');

    } catch (error) {
        console.error('Erro ao excluir notificação:', error);
        showNotification('Erro ao excluir notificação', 'error');
    }
}

// Limpar todas as notificações
async function clearAllNotifications() {
    try {
        if (!confirm('Tem certeza que deseja limpar TODAS as notificações? Esta ação não pode ser desfeita.')) {
            return;
        }

        const { error } = await supabase
            .from('notification_recipients')
            .delete()
            .eq('user_id', currentUser.id);

        if (error) throw error;

        // Recarregar notificações
        await loadNotifications();
        
        // Atualizar contador no header
        await updateHeaderNotificationCount();

        showNotification('Todas as notificações foram limpas', 'success');

    } catch (error) {
        console.error('Erro ao limpar notificações:', error);
        showNotification('Erro ao limpar notificações', 'error');
    }
}

// Atualizar estatísticas das notificações
function updateNotificationStats(filteredNotifications = [], allNotifications = []) {
    const statsElement = document.querySelector('.notifications-stats');
    if (!statsElement) return;

    const totalNotifications = allNotifications.length;
    const unreadCount = allNotifications.filter(n => !n.read_status).length;
    const filteredCount = filteredNotifications.length;

    let statsText = '';
    
    if (currentFilter === 'all') {
        statsText = `${filteredCount} notificação${filteredCount !== 1 ? 's' : ''} • <span class="unread-count">${unreadCount} não lida${unreadCount !== 1 ? 's' : ''}</span>`;
    } else if (currentFilter === 'unread') {
        statsText = `${filteredCount} notificação${filteredCount !== 1 ? 's' : ''} não lida${filteredCount !== 1 ? 's' : ''}`;
    } else if (currentFilter === 'read') {
        statsText = `${filteredCount} notificação${filteredCount !== 1 ? 's' : ''} lida${filteredCount !== 1 ? 's' : ''}`;
    }

    statsElement.innerHTML = statsText;

    // Atualizar estado do botão limpar todas
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
        clearAllBtn.disabled = totalNotifications === 0;
    }
}

// Atualizar contador no header
async function updateHeaderNotificationCount() {
    try {
        if (!currentUser) return;

        const { data: notifications, error } = await supabase
            .from('notification_recipients')
            .select('id')
            .eq('user_id', currentUser.id)
            .eq('read_status', false);

        if (!error) {
            const count = notifications ? notifications.length : 0;
            const notificationCount = document.getElementById('notificationCount');
            
            if (notificationCount) {
                notificationCount.textContent = count;
                notificationCount.style.display = count > 0 ? 'flex' : 'none';
            }
        }
    } catch (error) {
        console.error('Erro ao atualizar contador:', error);
    }
}

// Funções auxiliares
function getNotificationIcon(type) {
    const icons = {
        'message': 'fas fa-envelope',
        'match': 'fas fa-heart',
        'system': 'fas fa-info-circle',
        'premium': 'fas fa-crown',
        'warning': 'fas fa-exclamation-triangle',
        'success': 'fas fa-check-circle'
    };
    return icons[type] || 'fas fa-bell';
}

function getTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return 'Agora mesmo';
    } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `Há ${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `Há ${hours} hora${hours !== 1 ? 's' : ''}`;
    } else if (diffInSeconds < 2592000) {
        const days = Math.floor(diffInSeconds / 86400);
        return `Há ${days} dia${days !== 1 ? 's' : ''}`;
    } else {
        return date.toLocaleDateString('pt-BR');
    }
}

// Sistema de notificações toast
function showNotification(message, type = 'info') {
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
        if (notification.parentElement) {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }
    }, 5000);
}

// Adicionar animação de saída
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Exportar para uso global
window.notificationManager = {
    loadNotifications,
    markAsRead,
    deleteNotification,
    clearAllNotifications,
    updateHeaderNotificationCount
};