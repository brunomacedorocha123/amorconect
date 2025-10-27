// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VARIÁVEIS GLOBAIS ====================
let selectedUsers = [];

// ==================== VERIFICAÇÃO DE AUTENTICAÇÃO ====================
function verificarAutenticacao() {
    if (sessionStorage.getItem('adminAuthenticated') !== 'true') {
        window.location.href = 'login-admin.html';
        return false;
    }
    return true;
}

function logoutAdmin() {
    sessionStorage.removeItem('adminAuthenticated');
    window.location.href = 'login-admin.html';
}

function voltarParaAdmin() {
    window.location.href = 'admin.html';
}

// ==================== FUNÇÕES DE FORMULÁRIO ====================
function toggleFields() {
    const tipo = document.getElementById('tipoNotificacao').value;
    
    document.getElementById('bonusFields').style.display = 'none';
    document.getElementById('advertenciaFields').style.display = 'none';
    document.getElementById('avisoFields').style.display = 'none';
    
    if (tipo === 'bonus') {
        document.getElementById('bonusFields').style.display = 'block';
    } else if (tipo === 'advertencia') {
        document.getElementById('advertenciaFields').style.display = 'block';
    } else if (tipo === 'aviso') {
        document.getElementById('avisoFields').style.display = 'block';
    }
}

function toggleUserSearch() {
    const destinatarios = document.getElementById('destinatarios').value;
    const container = document.getElementById('userSearchContainer');
    
    if (destinatarios === 'specific') {
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
        selectedUsers = [];
        updateSelectedUsersDisplay();
    }
}

// ==================== BUSCA DE USUÁRIOS ====================
async function searchUsers(query) {
    const resultsContainer = document.getElementById('userResults');
    
    if (query.length < 2) {
        resultsContainer.style.display = 'none';
        return;
    }
    
    try {
        const { data: users, error } = await supabase
            .from('profiles')
            .select('id, nickname, email, is_premium')
            .or(`nickname.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(10);
        
        if (error) return;
        
        if (users && users.length > 0) {
            resultsContainer.innerHTML = users.map(user => `
                <div class="user-result" onclick="selectUser('${user.id}', '${user.nickname || user.email}')">
                    <strong>${user.nickname || 'Sem nome'}</strong> 
                    <br>
                    <small>${user.email} ${user.is_premium ? '⭐' : '🆓'}</small>
                </div>
            `).join('');
            resultsContainer.style.display = 'block';
        } else {
            resultsContainer.innerHTML = '<div class="user-result">Nenhum usuário encontrado</div>';
            resultsContainer.style.display = 'block';
        }
    } catch (error) {
        resultsContainer.innerHTML = '<div class="user-result">Erro na busca</div>';
        resultsContainer.style.display = 'block';
    }
}

function selectUser(userId, userName) {
    if (!selectedUsers.find(u => u.id === userId)) {
        selectedUsers.push({ id: userId, name: userName });
        updateSelectedUsersDisplay();
    }
    
    document.getElementById('userSearch').value = '';
    document.getElementById('userResults').style.display = 'none';
}

function removeUser(userId) {
    selectedUsers = selectedUsers.filter(u => u.id !== userId);
    updateSelectedUsersDisplay();
}

function updateSelectedUsersDisplay() {
    const container = document.getElementById('selectedUsers');
    container.innerHTML = selectedUsers.map(user => `
        <div class="selected-user">
            ${user.name}
            <button type="button" class="remove-user" onclick="removeUser('${user.id}')">×</button>
        </div>
    `).join('');
}

// ==================== PREVIEW DA NOTIFICAÇÃO ====================
function previewNotification() {
    const titulo = document.getElementById('titulo').value;
    const mensagem = document.getElementById('mensagem').value;
    
    if (!titulo || !mensagem) {
        alert('Preencha título e mensagem para visualizar');
        return;
    }
    
    document.getElementById('previewTitle').textContent = titulo;
    document.getElementById('previewMessage').textContent = mensagem;
    document.getElementById('previewSection').style.display = 'block';
}

function limparFormulario() {
    if (confirm('Tem certeza que deseja limpar o formulário?')) {
        document.getElementById('notificationForm').reset();
        selectedUsers = [];
        updateSelectedUsersDisplay();
        document.getElementById('previewSection').style.display = 'none';
        toggleFields();
        toggleUserSearch();
    }
}

// ==================== ENVIO DE NOTIFICAÇÃO ====================
document.getElementById('notificationForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    if (!verificarAutenticacao()) return;
    
    const formData = {
        tipo: document.getElementById('tipoNotificacao').value,
        titulo: document.getElementById('titulo').value,
        mensagem: document.getElementById('mensagem').value,
        destinatarios: document.getElementById('destinatarios').value,
        dataValidade: document.getElementById('dataValidade').value,
        userIds: selectedUsers.map(u => u.id)
    };
    
    if (!formData.tipo || !formData.titulo || !formData.mensagem || !formData.destinatarios || !formData.dataValidade) {
        alert('Preencha todos os campos obrigatórios');
        return;
    }
    
    if (formData.destinatarios === 'specific' && formData.userIds.length === 0) {
        alert('Selecione pelo menos um usuário específico');
        return;
    }
    
    try {
        // Obter admin logado
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Erro de autenticação');
            return;
        }

        // INSERIR NA TABELA NOTIFICATIONS (estrutura básica)
        const { data: notification, error: notifError } = await supabase
            .from('notifications')
            .insert({
                title: formData.titulo,
                message: formData.mensagem,
                tipo: formData.tipo,
                destinatarios: formData.destinatarios,
                data_validade: formData.dataValidade,
                created_by_uuid: user.id,
                is_active: true,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (notifError) {
            alert('Erro ao criar notificação: ' + notifError.message);
            return;
        }

        // AGORA INSERIR DESTINATÁRIOS
        let usersToInsert = [];
        
        if (formData.destinatarios === 'specific') {
            // Usuários específicos selecionados
            usersToInsert = formData.userIds.map(userId => ({
                notification_id: notification.id,
                user_id: userId,
                created_at: new Date().toISOString()
            }));
        } else {
            // Buscar usuários automaticamente
            let query = supabase.from('profiles').select('id');
            
            if (formData.destinatarios === 'free') {
                query = query.eq('is_premium', false);
            } else if (formData.destinatarios === 'premium') {
                query = query.eq('is_premium', true);
            }
            
            const { data: users, error: usersError } = await query;
            if (usersError) {
                alert('Erro ao buscar usuários: ' + usersError.message);
                return;
            }
            
            usersToInsert = users.map(user => ({
                notification_id: notification.id,
                user_id: user.id,
                created_at: new Date().toISOString()
            }));
        }

        // Inserir destinatários se houver
        if (usersToInsert.length > 0) {
            const { error: recipientsError } = await supabase
                .from('notification_recipients')
                .insert(usersToInsert);
            
            if (recipientsError) {
                alert('Erro ao adicionar destinatários: ' + recipientsError.message);
                return;
            }
        }

        alert('✅ Notificação enviada com sucesso para ' + usersToInsert.length + ' usuários!');
        limparFormulario();
        carregarHistorico();
        
    } catch (error) {
        alert('Erro inesperado: ' + error.message);
    }
});

// ==================== CARREGAR HISTÓRICO ====================
async function carregarHistorico() {
    if (!verificarAutenticacao()) return;
    
    const container = document.getElementById('historicoContainer');
    
    try {
        const { data: notificacoes, error } = await supabase
            .from('notifications')
            .select(`
                *,
                notification_recipients (
                    id,
                    delivered,
                    read_status,
                    bonus_redeemed
                )
            `)
            .order('created_at', { ascending: false })
            .limit(50);
        
        if (error) throw error;
        
        if (!notificacoes || notificacoes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📭</div>
                    <h3>Nenhuma notificação enviada</h3>
                    <p>Comece criando sua primeira notificação.</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = notificacoes.map(notif => {
            const totalDestinatarios = notif.notification_recipients?.length || 0;
            const entregues = notif.notification_recipients?.filter(r => r.delivered)?.length || 0;
            const lidas = notif.notification_recipients?.filter(r => r.read_status)?.length || 0;
            
            const badgeClass = `badge-${notif.tipo}`;
            const badgeText = notif.tipo === 'bonus' ? '🎁 Bônus' : 
                            notif.tipo === 'advertencia' ? '⚠️ Advertência' : '📢 Aviso';
            
            return `
                <div class="notification-card">
                    <div class="notification-header">
                        <div class="notification-title">${notif.title}</div>
                        <div class="notification-badge ${badgeClass}">${badgeText}</div>
                    </div>
                    
                    <div class="notification-meta">
                        <strong>Para:</strong> ${traduzirDestinatarios(notif.destinatarios)} | 
                        <strong>Enviada:</strong> ${new Date(notif.created_at).toLocaleString('pt-BR')} |
                        <strong>Validade:</strong> ${new Date(notif.data_validade).toLocaleString('pt-BR')}
                    </div>
                    
                    <div class="notification-message">
                        ${notif.message}
                    </div>
                    
                    <div class="notification-stats">
                        <div class="stat-item">
                            <div class="stat-number">${totalDestinatarios}</div>
                            <div class="stat-label">Destinatários</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${entregues}</div>
                            <div class="stat-label">Entregues</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-number">${lidas}</div>
                            <div class="stat-label">Lidas</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar histórico</h3>
                <p>Tente novamente mais tarde.</p>
                <button class="btn btn-primary" onclick="carregarHistorico()" style="margin-top: 1rem;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

// ==================== CARREGAR ESTATÍSTICAS ====================
async function carregarEstatisticas() {
    if (!verificarAutenticacao()) return;
    
    const container = document.getElementById('estatisticasContainer');
    
    try {
        const { data: notificacoes, error: notifError } = await supabase
            .from('notifications')
            .select('tipo, created_at, is_active');
        
        const { data: recipients, error: recipError } = await supabase
            .from('notification_recipients')
            .select('delivered, read_status');
        
        if (notifError || recipError) throw notifError || recipError;
        
        const stats = {
            totalNotificacoes: notificacoes?.length || 0,
            notificacoesAtivas: notificacoes?.filter(n => n.is_active)?.length || 0,
            porTipo: {},
            totalEntregues: recipients?.filter(r => r.delivered)?.length || 0,
            totalLidas: recipients?.filter(r => r.read_status)?.length || 0
        };
        
        if (notificacoes) {
            notificacoes.forEach(notif => {
                stats.porTipo[notif.tipo] = (stats.porTipo[notif.tipo] || 0) + 1;
            });
        }
        
        const taxaEntrega = stats.totalNotificacoes > 0 ? 
            ((stats.totalEntregues / (stats.totalNotificacoes * (recipients?.length || 1))) * 100).toFixed(1) : 0;
        
        const taxaleitura = stats.totalEntregues > 0 ? 
            ((stats.totalLidas / stats.totalEntregues) * 100).toFixed(1) : 0;
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem;">
                <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 10px;">
                    <h3 style="color: var(--primary); margin-bottom: 1rem;">📈 Estatísticas Gerais</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>Total de Notificações:</span>
                            <strong>${stats.totalNotificacoes}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Notificações Ativas:</span>
                            <strong style="color: var(--success);">${stats.notificacoesAtivas}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Taxa de Entrega:</span>
                            <strong style="color: var(--info);">${taxaEntrega}%</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Taxa de Leitura:</span>
                            <strong style="color: var(--info);">${taxaleitura}%</strong>
                        </div>
                    </div>
                </div>

                <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 10px;">
                    <h3 style="color: var(--primary); margin-bottom: 1rem;">📊 Distribuição por Tipo</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>🎁 Bônus:</span>
                            <strong>${stats.porTipo.bonus || 0}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>⚠️ Advertências:</span>
                            <strong>${stats.porTipo.advertencia || 0}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>📢 Avisos:</span>
                            <strong>${stats.porTipo.aviso || 0}</strong>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar estatísticas</h3>
                <p>Tente novamente mais tarde.</p>
            </div>
        `;
    }
}

// ==================== FUNÇÕES AUXILIARES ====================
function traduzirDestinatarios(destinatarios) {
    const traducoes = {
        'all': '👥 Todos os usuários',
        'free': '🆓 Usuários Free', 
        'premium': '⭐ Usuários Premium',
        'specific': '🎯 Usuários Específicos'
    };
    return traducoes[destinatarios] || destinatarios;
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    document.getElementById(sectionName).classList.add('active');
    
    const activeButton = document.querySelector(`.nav-btn[onclick*="${sectionName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    switch(sectionName) {
        case 'historico':
            carregarHistorico();
            break;
        case 'estatisticas':
            carregarEstatisticas();
            break;
    }
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    if (!verificarAutenticacao()) return;
    
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    document.getElementById('dataValidade').value = defaultDate.toISOString().slice(0, 16);
    
    carregarHistorico();
});