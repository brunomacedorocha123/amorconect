// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VARIÁVEIS GLOBAIS ====================
let todasNotificacoes = [];
let filtroAtual = 'all';

// ==================== CARREGAR NOTIFICAÇÕES ====================
async function carregarNotificacoes() {
    const container = document.getElementById('notificationsList');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Carregando suas notificações...</p></div>';

    try {
        // Verificar se usuário está autenticado
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🔒</div>
                    <h3>Faça login para ver suas notificações</h3>
                    <p>Você precisa estar logado para acessar esta página.</p>
                </div>
            `;
            return;
        }

        // Buscar notificações do usuário
        const { data: notificacoes, error } = await supabase
            .from('notification_recipients')
            .select(`
                *,
                notifications (*)
            `)
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (error) {
            throw error;
        }

        todasNotificacoes = notificacoes || [];
        
        // Atualizar estatísticas
        atualizarEstatisticas();
        
        // Aplicar filtro atual
        aplicarFiltro();

    } catch (error) {
        console.error('Erro ao carregar notificações:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar notificações</h3>
                <p>Tente novamente mais tarde.</p>
                <button class="btn btn-primary" onclick="carregarNotificacoes()" style="margin-top: 1rem;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

// ==================== APLICAR FILTROS ====================
function filtrarNotificacoes(filtro) {
    // Atualizar botões ativos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    filtroAtual = filtro;
    aplicarFiltro();
}

function aplicarFiltro() {
    let notificacoesFiltradas = [...todasNotificacoes];
    
    switch (filtroAtual) {
        case 'unread':
            notificacoesFiltradas = notificacoesFiltradas.filter(n => !n.read_status);
            break;
        case 'bonus':
            notificacoesFiltradas = notificacoesFiltradas.filter(n => 
                n.notifications?.tipo === 'bonus'
            );
            break;
        case 'advertencia':
            notificacoesFiltradas = notificacoesFiltradas.filter(n => 
                n.notifications?.tipo === 'advertencia'
            );
            break;
        case 'aviso':
            notificacoesFiltradas = notificacoesFiltradas.filter(n => 
                n.notifications?.tipo === 'aviso'
            );
            break;
        // 'all' mostra todas
    }
    
    exibirNotificacoes(notificacoesFiltradas);
}

// ==================== EXIBIR NOTIFICAÇÕES ====================
function exibirNotificacoes(notificacoes) {
    const container = document.getElementById('notificationsList');
    
    if (!notificacoes || notificacoes.length === 0) {
        let mensagem = '';
        switch (filtroAtual) {
            case 'unread':
                mensagem = 'Nenhuma notificação não lida';
                break;
            case 'bonus':
                mensagem = 'Nenhum bônus disponível';
                break;
            case 'advertencia':
                mensagem = 'Nenhuma advertência';
                break;
            case 'aviso':
                mensagem = 'Nenhum aviso';
                break;
            default:
                mensagem = 'Nenhuma notificação encontrada';
        }
        
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">📭</div>
                <h3>${mensagem}</h3>
                <p>Quando você receber notificações, elas aparecerão aqui.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = notificacoes.map(notif => {
        const notification = notif.notifications;
        const isUnread = !notif.read_status;
        const isBonus = notification.tipo === 'bonus';
        const isWarning = notification.tipo === 'advertencia';
        
        let badgeClass = '';
        let badgeText = '';
        
        switch (notification.tipo) {
            case 'bonus':
                badgeClass = 'badge-bonus';
                badgeText = '🎁 Bônus';
                break;
            case 'advertencia':
                badgeClass = 'badge-advertencia';
                badgeText = '⚠️ Advertência';
                break;
            case 'aviso':
                badgeClass = 'badge-aviso';
                badgeText = '📢 Aviso';
                break;
        }
        
        return `
            <div class="notification-card ${isUnread ? 'unread' : ''} ${notification.tipo}">
                <div class="notification-header">
                    <div class="notification-title">${notification.title}</div>
                    <div style="display: flex; gap: 0.5rem; align-items: center;">
                        ${isUnread ? '<div class="notification-badge badge-unread">Nova</div>' : ''}
                        <div class="notification-badge ${badgeClass}">${badgeText}</div>
                    </div>
                </div>
                
                <div class="notification-meta">
                    <strong>Enviada:</strong> ${new Date(notif.created_at).toLocaleString('pt-BR')} |
                    <strong>Validade:</strong> ${new Date(notification.data_validade).toLocaleString('pt-BR')}
                    ${notif.read_status ? `| <strong>Lida:</strong> ${new Date(notif.read_at).toLocaleString('pt-BR')}` : ''}
                </div>
                
                <div class="notification-message">
                    ${notification.message}
                </div>
                
                ${isBonus ? renderizarBonusDetails(notification, notif) : ''}
                ${isWarning ? renderizarWarningDetails(notification, notif) : ''}
                
                <div class="notification-actions">
                    ${isUnread ? `
                        <button class="btn btn-primary" onclick="marcarComoLida('${notif.id}')">
                            ✅ Marcar como Lida
                        </button>
                    ` : ''}
                    
                    ${isBonus && !notif.bonus_redeemed ? `
                        <button class="btn btn-success" onclick="resgatarBonus('${notif.id}')">
                            🎁 Resgatar Bônus
                        </button>
                    ` : isBonus && notif.bonus_redeemed ? `
                        <button class="btn" style="background: var(--gray); color: white;" disabled>
                            ✅ Bônus Resgatado
                        </button>
                    ` : ''}
                    
                    ${isWarning && notification.requires_acknowledgment && !notif.warning_acknowledged ? `
                        <button class="btn btn-warning" onclick="confirmarAdvertencia('${notif.id}')">
                            👍 Entendi
                        </button>
                    ` : isWarning && notif.warning_acknowledged ? `
                        <button class="btn" style="background: var(--gray); color: white;" disabled>
                            ✅ Confirmada
                        </button>
                    ` : ''}
                    
                    <button class="btn" style="background: var(--danger); color: white;" onclick="excluirNotificacao('${notif.id}')">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// ==================== RENDERIZAR DETALHES ESPECÍFICOS ====================
function renderizarBonusDetails(notification, recipient) {
    let bonusHTML = '';
    
    if (notification.bonus_value) {
        bonusHTML += `<div class="bonus-value">🎁 R$ ${notification.bonus_value}</div>`;
    }
    
    if (notification.bonus_code) {
        bonusHTML += `
            <div style="text-align: center; margin: 0.5rem 0;">
                <strong>Código:</strong>
                <div class="bonus-code">${notification.bonus_code}</div>
            </div>
        `;
    }
    
    if (notification.bonus_type) {
        const tipoText = {
            'credits': 'Créditos',
            'premium_days': 'Dias Premium',
            'discount': 'Desconto',
            'feature_access': 'Acesso a Recurso'
        }[notification.bonus_type] || notification.bonus_type;
        
        bonusHTML += `<div style="text-align: center;"><strong>Tipo:</strong> ${tipoText}</div>`;
    }
    
    if (recipient.bonus_redeemed) {
        bonusHTML += `
            <div style="text-align: center; color: var(--success); font-weight: bold; margin-top: 0.5rem;">
                ✅ Resgatado em ${new Date(recipient.bonus_redeemed_at).toLocaleString('pt-BR')}
            </div>
        `;
    }
    
    return bonusHTML ? `
        <div class="bonus-details">
            ${bonusHTML}
        </div>
    ` : '';
}

function renderizarWarningDetails(notification, recipient) {
    let warningHTML = '';
    
    if (notification.warning_severity) {
        const severityClass = `severity-${notification.warning_severity}`;
        const severityText = {
            'low': 'Baixa',
            'medium': 'Média',
            'high': 'Alta',
            'critical': 'Crítica'
        }[notification.warning_severity] || notification.warning_severity;
        
        warningHTML += `<div class="${severityClass}">Gravidade: ${severityText}</div>`;
    }
    
    if (recipient.warning_acknowledged) {
        warningHTML += `
            <div style="color: var(--success); font-weight: bold; margin-top: 0.5rem;">
                ✅ Confirmada em ${new Date(recipient.warning_acknowledged_at).toLocaleString('pt-BR')}
            </div>
        `;
    }
    
    return warningHTML ? `
        <div class="warning-details">
            ${warningHTML}
        </div>
    ` : '';
}

// ==================== AÇÕES DAS NOTIFICAÇÕES ====================
async function marcarComoLida(recipientId) {
    try {
        const { error } = await supabase
            .from('notification_recipients')
            .update({
                read_status: true,
                read_at: new Date().toISOString()
            })
            .eq('id', recipientId);
        
        if (error) throw error;
        
        // Recarregar notificações
        await carregarNotificacoes();
        
    } catch (error) {
        alert('❌ Erro ao marcar como lida: ' + error.message);
    }
}

async function marcarTodasComoLidas() {
    if (!todasNotificacoes.length) return;
    
    try {
        const naoLidas = todasNotificacoes.filter(n => !n.read_status);
        
        if (naoLidas.length === 0) {
            alert('✅ Todas as notificações já estão lidas!');
            return;
        }
        
        const { error } = await supabase
            .from('notification_recipients')
            .update({
                read_status: true,
                read_at: new Date().toISOString()
            })
            .in('id', naoLidas.map(n => n.id));
        
        if (error) throw error;
        
        alert(`✅ ${naoLidas.length} notificação(ões) marcada(s) como lida(s)!`);
        await carregarNotificacoes();
        
    } catch (error) {
        alert('❌ Erro ao marcar notificações como lidas: ' + error.message);
    }
}

async function resgatarBonus(recipientId) {
    if (!confirm('Deseja resgatar este bônus?')) return;
    
    try {
        const { error } = await supabase
            .from('notification_recipients')
            .update({
                bonus_redeemed: true,
                bonus_redeemed_at: new Date().toISOString(),
                read_status: true, // Marcar como lida também
                read_at: new Date().toISOString()
            })
            .eq('id', recipientId);
        
        if (error) throw error;
        
        alert('🎁 Bônus resgatado com sucesso!');
        await carregarNotificacoes();
        
    } catch (error) {
        alert('❌ Erro ao resgatar bônus: ' + error.message);
    }
}

async function confirmarAdvertencia(recipientId) {
    if (!confirm('Você confirma que leu e entendeu esta advertência?')) return;
    
    try {
        const { error } = await supabase
            .from('notification_recipients')
            .update({
                warning_acknowledged: true,
                warning_acknowledged_at: new Date().toISOString(),
                read_status: true, // Marcar como lida também
                read_at: new Date().toISOString()
            })
            .eq('id', recipientId);
        
        if (error) throw error;
        
        alert('✅ Advertência confirmada!');
        await carregarNotificacoes();
        
    } catch (error) {
        alert('❌ Erro ao confirmar advertência: ' + error.message);
    }
}

async function excluirNotificacao(recipientId) {
    if (!confirm('Tem certeza que deseja excluir esta notificação?')) return;
    
    try {
        const { error } = await supabase
            .from('notification_recipients')
            .delete()
            .eq('id', recipientId);
        
        if (error) throw error;
        
        alert('🗑️ Notificação excluída!');
        await carregarNotificacoes();
        
    } catch (error) {
        alert('❌ Erro ao excluir notificação: ' + error.message);
    }
}

// ==================== ATUALIZAR ESTATÍSTICAS ====================
function atualizarEstatisticas() {
    const total = todasNotificacoes.length;
    const naoLidas = todasNotificacoes.filter(n => !n.read_status).length;
    const bonus = todasNotificacoes.filter(n => n.notifications?.tipo === 'bonus').length;
    
    document.getElementById('totalNotificacoes').textContent = total;
    document.getElementById('naoLidasCount').textContent = naoLidas;
    document.getElementById('bonusCount').textContent = bonus;
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    carregarNotificacoes();
    
    // Atualizar a cada 30 segundos (para novas notificações)
    setInterval(carregarNotificacoes, 30000);
});