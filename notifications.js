// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VARIÁVEIS GLOBAIS ====================
let notificacoes = [];
let filtroAtual = 'all';
let usuarioId = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', async function() {
    await verificarAutenticacao();
    await carregarNotificacoes();
    configurarEventListeners();
    configurarRealtime();
});

async function verificarAutenticacao() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    usuarioId = user.id;
}

function configurarEventListeners() {
    // Filtros
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            filtroAtual = this.dataset.filter;
            filtrarNotificacoes();
        });
    });
}

function configurarRealtime() {
    // Escutar novas notificações em tempo real
    supabase
        .channel('notifications-changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: 'user_notifications',
                filter: `user_id=eq.${usuarioId}`
            },
            async (payload) => {
                console.log('Nova notificação recebida:', payload);
                await carregarNotificacoes();
                atualizarBadgeNoTitulo();
            }
        )
        .subscribe();
}

// ==================== CARREGAR NOTIFICAÇÕES ====================
async function carregarNotificacoes() {
    mostrarLoading();
    
    try {
        // Usar a função SQL que criamos
        const { data, error } = await supabase.rpc('get_user_visible_notifications', {
            user_uuid: usuarioId
        });

        if (error) throw error;

        notificacoes = data || [];
        exibirNotificacoes();
        atualizarEstatisticas();
        atualizarBadgeNoTitulo();

    } catch (erro) {
        console.error('Erro ao carregar notificações:', erro);
        mostrarErro();
    }
}

function exibirNotificacoes() {
    const container = document.getElementById('notificationsList');
    const emptyState = document.getElementById('emptyState');
    const errorState = document.getElementById('errorState');

    // Esconder estados
    emptyState.style.display = 'none';
    errorState.style.display = 'none';

    if (notificacoes.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    const notificacoesFiltradas = filtrarNotificacoesArray(notificacoes, filtroAtual);
    
    if (notificacoesFiltradas.length === 0) {
        container.innerHTML = '';
        emptyState.style.display = 'block';
        emptyState.innerHTML = `
            <div class="empty-icon">🔍</div>
            <h3>Nenhuma notificação encontrada</h3>
            <p>Tente mudar o filtro ou verifique se há novas notificações.</p>
        `;
        return;
    }

    container.innerHTML = notificacoesFiltradas.map(notificacao => `
        <div class="notification-card ${!notificacao.is_read ? 'unread' : ''} ${notificacao.priority === 'urgent' ? 'urgent' : ''}">
            <div class="notification-header">
                <div class="notification-title">${escaparHTML(notificacao.title)}</div>
                <div class="notification-meta">
                    ${!notificacao.is_read ? '<span class="notification-badge badge-status-unread">Não lida</span>' : ''}
                    <span class="notification-badge badge-priority-${notificacao.priority}">
                        ${obterIconePrioridade(notificacao.priority)} ${notificacao.priority}
                    </span>
                    <span class="notification-badge badge-category-${notificacao.category}">
                        ${obterIconeCategoria(notificacao.category)}
                    </span>
                </div>
            </div>
            
            <div class="notification-message">
                ${escaparHTML(notificacao.message)}
            </div>
            
            <div class="notification-footer">
                <div class="notification-date">
                    ${formatarData(notificacao.created_at)}
                    ${notificacao.is_read ? `• Lida em ${formatarData(notificacao.read_at)}` : ''}
                </div>
                
                <div class="expiry-info ${notificacao.days_until_expiry <= 3 ? 'expiry-warning' : ''}">
                    ⏰ ${formatarExpiracao(notificacao.days_until_expiry)}
                </div>
            </div>
            
            <div class="notification-actions">
                ${!notificacao.is_read ? `
                    <button class="action-btn read" onclick="marcarComoLida('${notificacao.notification_id}')">
                        ✅ Marcar como lida
                    </button>
                ` : `
                    <button class="action-btn read" onclick="marcarComoNaoLida('${notificacao.notification_id}')">
                        📍 Marcar como não lida
                    </button>
                `}
                
                <button class="action-btn delete" onclick="excluirNotificacao('${notificacao.notification_id}')">
                    🗑️ Excluir
                </button>
            </div>
        </div>
    `).join('');
}

function filtrarNotificacoesArray(notificacoesArray, filtro) {
    switch (filtro) {
        case 'unread':
            return notificacoesArray.filter(n => !n.is_read);
        case 'bonus':
            return notificacoesArray.filter(n => n.category === 'bonus');
        case 'warning':
            return notificacoesArray.filter(n => n.category === 'warning');
        case 'system':
            return notificacoesArray.filter(n => n.category === 'system');
        default:
            return notificacoesArray;
    }
}

function filtrarNotificacoes() {
    exibirNotificacoes();
}

// ==================== AÇÕES DAS NOTIFICAÇÕES ====================
async function marcarComoLida(notificationId) {
    try {
        const { error } = await supabase
            .from('user_notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('id', notificationId)
            .eq('user_id', usuarioId);

        if (error) throw error;

        await carregarNotificacoes();
        
    } catch (erro) {
        console.error('Erro ao marcar como lida:', erro);
        alert('Erro ao marcar notificação como lida');
    }
}

async function marcarComoNaoLida(notificationId) {
    try {
        const { error } = await supabase
            .from('user_notifications')
            .update({
                is_read: false,
                read_at: null
            })
            .eq('id', notificationId)
            .eq('user_id', usuarioId);

        if (error) throw error;

        await carregarNotificacoes();
        
    } catch (erro) {
        console.error('Erro ao marcar como não lida:', erro);
        alert('Erro ao marcar notificação como não lida');
    }
}

async function marcarTodasComoLidas() {
    const naoLidas = notificacoes.filter(n => !n.is_read);
    
    if (naoLidas.length === 0) {
        alert('Todas as notificações já estão lidas!');
        return;
    }

    if (!confirm(`Deseja marcar todas as ${naoLidas.length} notificações não lidas como lidas?`)) {
        return;
    }

    try {
        const { error } = await supabase
            .from('user_notifications')
            .update({
                is_read: true,
                read_at: new Date().toISOString()
            })
            .eq('user_id', usuarioId)
            .eq('is_read', false);

        if (error) throw error;

        await carregarNotificacoes();
        alert(`✅ ${naoLidas.length} notificações marcadas como lidas!`);
        
    } catch (erro) {
        console.error('Erro ao marcar todas como lidas:', erro);
        alert('Erro ao marcar notificações como lidas');
    }
}

async function excluirNotificacao(notificationId) {
    if (!confirm('Tem certeza que deseja excluir esta notificação?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('user_deleted_notifications')
            .insert({
                user_id: usuarioId,
                notification_id: notificationId
            });

        if (error) throw error;

        await carregarNotificacoes();
        
    } catch (erro) {
        console.error('Erro ao excluir notificação:', erro);
        alert('Erro ao excluir notificação');
    }
}

// ==================== ATUALIZAÇÃO DE ESTATÍSTICAS ====================
function atualizarEstatisticas() {
    const total = notificacoes.length;
    const naoLidas = notificacoes.filter(n => !n.is_read).length;
    const urgentes = notificacoes.filter(n => n.priority === 'urgent' && !n.is_read).length;

    document.getElementById('totalNotifications').textContent = total;
    document.getElementById('unreadNotifications').textContent = naoLidas;
    document.getElementById('urgentNotifications').textContent = urgentes;

    // Atualizar botão "Marcar todas como lidas"
    const markAllBtn = document.getElementById('markAllReadBtn');
    markAllBtn.disabled = naoLidas === 0;
}

function atualizarBadgeNoTitulo() {
    const naoLidas = notificacoes.filter(n => !n.is_read).length;
    if (naoLidas > 0) {
        document.title = `(${naoLidas}) Notificações - Amor Conect`;
    } else {
        document.title = 'Notificações - Amor Conect';
    }
}

// ==================== FUNÇÕES UTILITÁRIAS ====================
function obterIconePrioridade(prioridade) {
    const icones = {
        'urgent': '🔴',
        'high': '🟡', 
        'normal': '🟢',
        'low': '🔵'
    };
    return icones[prioridade] || '⚪';
}

function obterIconeCategoria(categoria) {
    const icones = {
        'bonus': '🎁',
        'warning': '⚠️',
        'system': '🔧',
        'promo': '🏷️',
        'update': '🔄',
        'info': 'ℹ️'
    };
    return icones[categoria] || '📨';
}

function formatarData(dataString) {
    const data = new Date(dataString);
    const agora = new Date();
    const diffMs = agora - data;
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) {
        return 'Hoje';
    } else if (diffDias === 1) {
        return 'Ontem';
    } else if (diffDias < 7) {
        return `Há ${diffDias} dias`;
    } else {
        return data.toLocaleDateString('pt-BR');
    }
}

function formatarExpiracao(dias) {
    if (dias === null) return 'Nunca expira';
    if (dias < 0) return 'Expirada';
    if (dias === 0) return 'Expira hoje';
    if (dias === 1) return 'Expira amanhã';
    if (dias <= 3) return `Expira em ${dias} dias!`;
    return `Expira em ${dias} dias`;
}

function escaparHTML(texto) {
    const div = document.createElement('div');
    div.textContent = texto;
    return div.innerHTML;
}

// ==================== ESTADOS DA UI ====================
function mostrarLoading() {
    document.getElementById('notificationsList').innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Carregando suas notificações...</p>
        </div>
    `;
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('errorState').style.display = 'none';
}

function mostrarErro() {
    document.getElementById('notificationsList').innerHTML = '';
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('errorState').style.display = 'block';
}

// ==================== NAVEGAÇÃO ====================
function voltarParaHome() {
    window.location.href = 'home.html'; // Ajuste conforme sua página principal
}