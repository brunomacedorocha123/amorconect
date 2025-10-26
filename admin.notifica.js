// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let usuariosCache = [];

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

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    if (!verificarAutenticacao()) return;
    
    console.log('🚀 Gestor de Notificações iniciado');
    inicializarSistema();
    
    // Atualizar estatísticas a cada 30 segundos
    setInterval(() => {
        carregarEstatisticas();
    }, 30000);
});

async function inicializarSistema() {
    try {
        await carregarEstatisticas();
        await carregarVisaoGeral();
        await carregarUsuariosCache();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        mostrarErro('Erro ao inicializar sistema');
    }
}

// ==================== ESTATÍSTICAS ====================
async function carregarEstatisticas() {
    if (!verificarAutenticacao()) return;
    
    try {
        // Total de notificações
        const { count: totalNotificacoes } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true });

        // Notificações não lidas
        const { count: naoLidas } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false);

        // Total de usuários
        const { count: totalUsuarios } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        // Templates ativos
        const { count: templatesAtivos } = await supabase
            .from('notification_templates')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // Atualizar interface
        document.getElementById('totalNotifications').textContent = totalNotificacoes || 0;
        document.getElementById('unreadNotifications').textContent = naoLidas || 0;
        document.getElementById('totalUsers').textContent = totalUsuarios || 0;
        document.getElementById('activeTemplates').textContent = templatesAtivos || 0;

        document.getElementById('lastUpdate').textContent = 
            `Última atualização: ${new Date().toLocaleString('pt-BR')}`;

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

// ==================== SEÇÃO: VISÃO GERAL ====================
async function carregarVisaoGeral() {
    const container = document.getElementById('overviewContent');
    
    try {
        const { data: notificacoes, error } = await supabase
            .from('user_notifications')
            .select(`
                *,
                user:user_id(nickname, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        let html = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem;">
                <div>
                    <h3 style="color: var(--primary); margin-bottom: 1rem;">📈 Estatísticas Rápidas</h3>
                    <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
                            <span>Notificações Hoje:</span>
                            <strong id="notificacoesHoje">0</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
                            <span>Taxa de Leitura:</span>
                            <strong id="taxaLeitura">0%</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Usuários Ativos:</span>
                            <strong id="usuariosAtivos">0</strong>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 style="color: var(--primary); margin-bottom: 1rem;">🚨 Ações Rápidas</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button class="btn btn-primary" onclick="showSection('send')">
                            ✉️ Enviar Notificação Rápida
                        </button>
                        <button class="btn btn-success" onclick="mostrarModalNovoTemplate()">
                            🎯 Criar Template
                        </button>
                        <button class="btn btn-info" onclick="carregarHistorico()">
                            📋 Ver Relatórios
                        </button>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 2rem;">
                <h3 style="color: var(--primary); margin-bottom: 1rem;">📨 Últimas Notificações</h3>
        `;
        
        if (!notificacoes || notificacoes.length === 0) {
            html += `
                <div class="empty-state">
                    <div class="icon">📭</div>
                    <p>Nenhuma notificação no sistema</p>
                </div>
            `;
        } else {
            html += '<div class="notifications-grid">';
            
            notificacoes.forEach(notificacao => {
                const badgeColor = getBadgeColor(notificacao.category);
                html += `
                    <div class="notification-card">
                        <div class="notification-header">
                            <div class="notification-title">${escapeHtml(notificacao.title)}</div>
                            <div class="notification-badge" style="background: ${badgeColor}">
                                ${getCategoryLabel(notificacao.category)}
                            </div>
                        </div>
                        <div class="notification-meta">
                            <span>Para: ${notificacao.user?.nickname || 'Usuário'}</span>
                            <span>${formatarData(notificacao.created_at)}</span>
                            ${notificacao.is_read ? '<span>✅ Lida</span>' : '<span style="color: var(--danger);">🔴 Não lida</span>'}
                        </div>
                        <div class="notification-message">${escapeHtml(notificacao.message)}</div>
                        <div class="notification-meta">
                            <small>Expira: ${formatarData(notificacao.expires_at)}</small>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }

        container.innerHTML = html;

        // Carregar estatísticas adicionais
        await carregarEstatisticasDetalhadas();

    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

async function carregarEstatisticasDetalhadas() {
    try {
        // Notificações de hoje
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        const { count: notificacoesHoje } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', hoje.toISOString())
            .lt('created_at', amanha.toISOString());

        // Taxa de leitura
        const { count: totalLidas } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', true);

        const { count: totalNotificacoes } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true });

        const taxaLeitura = totalNotificacoes > 0 ? 
            Math.round((totalLidas / totalNotificacoes) * 100) : 0;

        // Usuários ativos (online nas últimas 24h)
        const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const { count: usuariosAtivos } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('last_online_at', umDiaAtras.toISOString());

        // Atualizar UI
        document.getElementById('notificacoesHoje').textContent = notificacoesHoje || 0;
        document.getElementById('taxaLeitura').textContent = taxaLeitura + '%';
        document.getElementById('usuariosAtivos').textContent = usuariosAtivos || 0;

    } catch (error) {
        console.error('Erro ao carregar estatísticas detalhadas:', error);
    }
}

// ==================== SEÇÃO: ENVIAR NOTIFICAÇÃO ====================
async function carregarFormularioEnvio() {
    const container = document.getElementById('sendContent');
    
    try {
        container.innerHTML = `
            <form id="formEnvioNotificacao" onsubmit="enviarNotificacao(event)">
                <!-- SELEÇÃO DE DESTINATÁRIOS -->
                <div class="target-section">
                    <h4 style="color: var(--primary); margin-bottom: 1rem;">🎯 Escolher Destinatários</h4>
                    
                    <div class="target-options">
                        <div class="target-option" data-target="all" onclick="selecionarDestino('all')">
                            <div>📧</div>
                            <div><strong>Todos os Usuários</strong></div>
                            <small>Todos os usuários do sistema</small>
                        </div>
                        <div class="target-option" data-target="free" onclick="selecionarDestino('free')">
                            <div>🆓</div>
                            <div><strong>Usuários Free</strong></div>
                            <small>Apenas usuários gratuitos</small>
                        </div>
                        <div class="target-option" data-target="premium" onclick="selecionarDestino('premium')">
                            <div>⭐</div>
                            <div><strong>Usuários Premium</strong></div>
                            <small>Apenas usuários premium</small>
                        </div>
                        <div class="target-option" data-target="specific" onclick="selecionarDestino('specific')">
                            <div>👤</div>
                            <div><strong>Usuário Específico</strong></div>
                            <small>Buscar usuário específico</small>
                        </div>
                    </div>

                    <!-- BUSCA DE USUÁRIO ESPECÍFICO -->
                    <div id="usuarioEspecificoContainer" style="display: none; margin-top: 1rem;">
                        <label class="form-label">Buscar Usuário</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="buscarUsuarioInput" placeholder="Digite nickname ou email..." 
                                class="form-control" oninput="buscarUsuarios(this.value)">
                            <button type="button" class="btn btn-primary" onclick="buscarUsuarios(document.getElementById('buscarUsuarioInput').value)">
                                🔍 Buscar
                            </button>
                        </div>
                        <div id="resultadosBuscaUsuarios" class="user-search-results" style="display: none;"></div>
                    </div>

                    <!-- RESUMO DOS DESTINATÁRIOS -->
                    <div id="resumoDestinatarios" style="margin-top: 1rem; padding: 1rem; background: #e8f5e8; border-radius: 6px; display: none;">
                        <strong>📋 Destinatários selecionados:</strong> 
                        <span id="textoResumoDestinatarios">--</span>
                        <span id="contadorDestinatarios" style="float: right; font-weight: bold;"></span>
                    </div>
                </div>

                <!-- CONTEÚDO DA NOTIFICAÇÃO -->
                <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 10px; margin-bottom: 1.5rem;">
                    <h4 style="color: var(--primary); margin-bottom: 1rem;">📝 Conteúdo da Notificação</h4>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label class="form-label">Categoria *</label>
                            <select class="form-select" id="categoriaNotificacao" required>
                                <option value="system">🔄 Sistema</option>
                                <option value="bonus">🎁 Bônus</option>
                                <option value="warning">⚠️ Advertência</option>
                                <option value="info">ℹ️ Informativo</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Prioridade *</label>
                            <select class="form-select" id="prioridadeNotificacao" required>
                                <option value="low">🔵 Baixa</option>
                                <option value="normal" selected>🟢 Normal</option>
                                <option value="high">🟡 Alta</option>
                                <option value="urgent">🔴 Urgente</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Título *</label>
                        <input type="text" class="form-control" id="tituloNotificacao" 
                            placeholder="Ex: 🎉 Bônus Exclusivo para Premium!" required>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">Mensagem *</label>
                        <textarea class="form-control form-textarea" id="mensagemNotificacao" 
                            placeholder="Digite a mensagem da notificação..." required></textarea>
                    </div>

                    <!-- SISTEMA DE EXPIRAÇÃO -->
                    <div class="form-group">
                        <label class="form-label">⏰ Configurar Expiração</label>
                        <div class="expiration-options">
                            <div class="expiration-option selected" data-expiration="never" onclick="selecionarExpiracao('never')">
                                <div>∞</div>
                                <div><strong>Nunca expira</strong></div>
                            </div>
                            <div class="expiration-option" data-expiration="days:7" onclick="selecionarExpiracao('days:7')">
                                <div>7d</div>
                                <div><strong>7 dias</strong></div>
                            </div>
                            <div class="expiration-option" data-expiration="days:30" onclick="selecionarExpiracao('days:30')">
                                <div>30d</div>
                                <div><strong>30 dias</strong></div>
                            </div>
                            <div class="expiration-option" data-expiration="custom" onclick="selecionarExpiracao('custom')">
                                <div>📅</div>
                                <div><strong>Personalizado</strong></div>
                            </div>
                        </div>

                        <!-- DIAS PERSONALIZADOS -->
                        <div id="diasPersonalizadosContainer" style="display: none; margin-top: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <label class="form-label">Expirar após:</label>
                                <input type="number" id="diasPersonalizados" class="form-control" 
                                    style="width: 100px;" min="1" max="3650" value="7">
                                <span>dias</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- AÇÕES -->
                <div style="display: flex; gap: 1rem; justify-content: flex-end; flex-wrap: wrap;">
                    <button type="button" class="btn btn-secondary" onclick="previsualizarNotificacao()">
                        👁️ Pré-visualizar
                    </button>
                    <button type="submit" class="btn btn-success">
                        ✉️ Enviar Notificação
                    </button>
                </div>
            </form>
        `;

        // Inicializar seleções padrão
        selecionarDestino('all');
        selecionarExpiracao('never');

    } catch (error) {
        console.error('Erro ao carregar formulário:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar formulário</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ==================== SELEÇÃO DE DESTINATÁRIOS ====================
let destinoSelecionado = 'all';
let usuarioEspecificoSelecionado = null;

function selecionarDestino(destino) {
    destinoSelecionado = destino;
    
    // Remover seleção anterior
    document.querySelectorAll('.target-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Adicionar seleção atual
    document.querySelector(`[data-target="${destino}"]`).classList.add('selected');
    
    // Mostrar/ocultar busca de usuário específico
    const usuarioContainer = document.getElementById('usuarioEspecificoContainer');
    const resultadosBusca = document.getElementById('resultadosBuscaUsuarios');
    
    if (destino === 'specific') {
        usuarioContainer.style.display = 'block';
    } else {
        usuarioContainer.style.display = 'none';
        resultadosBusca.style.display = 'none';
        usuarioEspecificoSelecionado = null;
    }
    
    atualizarResumoDestinatarios();
}

async function buscarUsuarios(termo) {
    const container = document.getElementById('resultadosBuscaUsuarios');
    
    if (!termo || termo.length < 2) {
        container.style.display = 'none';
        return;
    }

    try {
        const { data: usuarios, error } = await supabase
            .from('profiles')
            .select('id, nickname, email, is_premium')
            .or(`nickname.ilike.%${termo}%,email.ilike.%${termo}%`)
            .limit(10);

        if (error) throw error;

        if (!usuarios || usuarios.length === 0) {
            container.innerHTML = '<div class="user-result">Nenhum usuário encontrado</div>';
            container.style.display = 'block';
            return;
        }

        let html = '';
        usuarios.forEach(usuario => {
            const tipo = usuario.is_premium ? '⭐' : '🆓';
            html += `
                <div class="user-result" onclick="selecionarUsuario('${usuario.id}', '${usuario.nickname || usuario.email}')">
                    <strong>${tipo} ${usuario.nickname || 'Sem nickname'}</strong>
                    <br><small>${usuario.email}</small>
                </div>
            `;
        });

        container.innerHTML = html;
        container.style.display = 'block';

    } catch (error) {
        console.error('Erro na busca:', error);
        container.innerHTML = '<div class="user-result">Erro na busca</div>';
        container.style.display = 'block';
    }
}

function selecionarUsuario(usuarioId, usuarioNome) {
    usuarioEspecificoSelecionado = { id: usuarioId, nome: usuarioNome };
    
    document.getElementById('resultadosBuscaUsuarios').style.display = 'none';
    document.getElementById('buscarUsuarioInput').value = usuarioNome;
    
    atualizarResumoDestinatarios();
}

function atualizarResumoDestinatarios() {
    const resumo = document.getElementById('resumoDestinatarios');
    const texto = document.getElementById('textoResumoDestinatarios');
    const contador = document.getElementById('contadorDestinatarios');
    
    let textoResumo = '';
    let count = 0;
    
    switch(destinoSelecionado) {
        case 'all':
            textoResumo = '📧 Todos os usuários do sistema';
            // Aqui você pode buscar a contagem real se quiser
            count = 'Todos';
            break;
        case 'free':
            textoResumo = '🆓 Todos os usuários Free';
            count = 'Free';
            break;
        case 'premium':
            textoResumo = '⭐ Todos os usuários Premium';
            count = 'Premium';
            break;
        case 'specific':
            if (usuarioEspecificoSelecionado) {
                textoResumo = `👤 ${usuarioEspecificoSelecionado.nome}`;
                count = '1 usuário';
            } else {
                textoResumo = '👤 Nenhum usuário selecionado';
                count = '0';
            }
            break;
    }
    
    texto.textContent = textoResumo;
    contador.textContent = count;
    resumo.style.display = 'block';
}

// ==================== SISTEMA DE EXPIRAÇÃO ====================
let expiracaoSelecionada = 'never';

function selecionarExpiracao(expiracao) {
    expiracaoSelecionada = expiracao;
    
    // Remover seleção anterior
    document.querySelectorAll('.expiration-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    // Adicionar seleção atual
    document.querySelector(`[data-expiration="${expiracao}"]`).classList.add('selected');
    
    // Mostrar/ocultar dias personalizados
    const diasContainer = document.getElementById('diasPersonalizadosContainer');
    if (expiracao === 'custom') {
        diasContainer.style.display = 'block';
    } else {
        diasContainer.style.display = 'none';
    }
}

// ==================== ENVIO DE NOTIFICAÇÃO ====================
async function enviarNotificacao(event) {
    event.preventDefault();
    
    if (!verificarAutenticacao()) return;
    
    // Coletar dados do formulário
    const dadosNotificacao = {
        category: document.getElementById('categoriaNotificacao').value,
        title: document.getElementById('tituloNotificacao').value.trim(),
        message: document.getElementById('mensagemNotificacao').value.trim(),
        priority: document.getElementById('prioridadeNotificacao').value,
        expiration_type: expiracaoSelecionada.startsWith('days:') ? 'days' : 
                        expiracaoSelecionada === 'custom' ? 'days' : 
                        expiracaoSelecionada === 'never' ? 'never' : 'days',
        expiration_days: expiracaoSelecionada.startsWith('days:') ? 
                        parseInt(expiracaoSelecionada.split(':')[1]) :
                        expiracaoSelecionada === 'custom' ? 
                        parseInt(document.getElementById('diasPersonalizados').value) : null
    };
    
    // Validações
    if (!dadosNotificacao.title || !dadosNotificacao.message) {
        mostrarErro('Preencha título e mensagem');
        return;
    }
    
    // Obter IDs dos destinatários
    let userIDs = [];
    try {
        userIDs = await obterDestinatarios();
        if (userIDs.length === 0) {
            mostrarErro('Nenhum usuário selecionado para receber a notificação');
            return;
        }
    } catch (error) {
        mostrarErro('Erro ao buscar destinatários: ' + error.message);
        return;
    }
    
    // Confirmação para envio em massa
    if (userIDs.length > 1) {
        const confirmacao = confirm(`Enviar esta notificação para ${userIDs.length} usuários?\n\nTítulo: ${dadosNotificacao.title}\nCategoria: ${getCategoryLabel(dadosNotificacao.category)}`);
        if (!confirmacao) return;
    }
    
    try {
        // Preparar notificações para inserção
        const notificacoes = userIDs.map(userId => ({
            user_id: userId,
            category: dadosNotificacao.category,
            type: 'manual_admin',
            title: dadosNotificacao.title,
            message: dadosNotificacao.message,
            priority: dadosNotificacao.priority,
            expiration_type: dadosNotificacao.expiration_type,
            expiration_days: dadosNotificacao.expiration_days,
            created_at: new Date().toISOString()
        }));
        
        // Inserir em lote
        const { error } = await supabase
            .from('user_notifications')
            .insert(notificacoes);
        
        if (error) throw error;
        
        // Registrar lote se for envio em massa
        if (userIDs.length > 1) {
            await registrarLoteEnvio(dadosNotificacao, destinoSelecionado, userIDs.length);
        }
        
        // Feedback de sucesso
        mostrarSucesso(`✅ Notificação enviada para ${userIDs.length} usuário(s)!`);
        
        // Limpar formulário
        limparFormulario();
        
        // Atualizar estatísticas
        carregarEstatisticas();
        carregarVisaoGeral();
        
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        mostrarErro('❌ Erro ao enviar: ' + error.message);
    }
}

async function obterDestinatarios() {
    switch(destinoSelecionado) {
        case 'all':
            return await buscarTodosUsuarios();
        case 'free':
            return await buscarUsuariosPorTipo('free');
        case 'premium':
            return await buscarUsuariosPorTipo('premium');
        case 'specific':
            return usuarioEspecificoSelecionado ? [usuarioEspecificoSelecionado.id] : [];
        default:
            return [];
    }
}

async function buscarTodosUsuarios() {
    try {
        const { data: usuarios, error } = await supabase
            .from('profiles')
            .select('id')
            .limit(10000); // Limite razoável
        
        if (error) throw error;
        return usuarios.map(u => u.id);
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        throw error;
    }
}

async function buscarUsuariosPorTipo(tipo) {
    try {
        const isPremium = tipo === 'premium';
        const { data: usuarios, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('is_premium', isPremium)
            .limit(10000);
        
        if (error) throw error;
        return usuarios.map(u => u.id);
    } catch (error) {
        console.error(`Erro ao buscar usuários ${tipo}:`, error);
        throw error;
    }
}

async function registrarLoteEnvio(dadosNotificacao, targetType, totalRecipients) {
    try {
        const { error } = await supabase
            .from('notification_batches')
            .insert({
                title: dadosNotificacao.title,
                message: dadosNotificacao.message,
                category: dadosNotificacao.category,
                target_type: targetType,
                total_recipients: totalRecipients,
                total_sent: totalRecipients,
                expiration_type: dadosNotificacao.expiration_type,
                expiration_days: dadosNotificacao.expiration_days,
                status: 'completed',
                created_at: new Date().toISOString()
            });
        
        if (error) throw error;
    } catch (error) {
        console.error('Erro ao registrar lote:', error);
        // Não falhar o envio principal por causa do registro do lote
    }
}

// ==================== SEÇÃO: TEMPLATES ====================
async function carregarTemplates() {
    const container = document.getElementById('templatesContent');
    
    try {
        const { data: templates, error } = await supabase
            .from('notification_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!templates || templates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <h3>Nenhum template</h3>
                    <p>Não há templates criados.</p>
                    <button class="btn btn-success" onclick="mostrarModalNovoTemplate()" style="margin-top: 1rem;">
                        ➕ Criar Primeiro Template
                    </button>
                </div>
            `;
            return;
        }

        let html = `
            <div style="margin-bottom: 1rem;">
                <button class="btn btn-success" onclick="mostrarModalNovoTemplate()">
                    ➕ Novo Template
                </button>
            </div>
            <div class="templates-grid">
        `;

        templates.forEach(template => {
            const badgeColor = getBadgeColor(template.category);
            html += `
                <div class="template-card">
                    <div class="notification-header">
                        <div class="notification-title">${escapeHtml(template.name)}</div>
                        <div class="notification-badge" style="background: ${badgeColor}">
                            ${getCategoryLabel(template.category)}
                        </div>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>Título:</strong> ${escapeHtml(template.title_template)}
                    </div>
                    <div class="notification-message">
                        <strong>Mensagem:</strong> ${escapeHtml(template.message_template)}
                    </div>
                    <div class="notification-meta">
                        <small>Expiração: ${template.expiration_type === 'never' ? 'Nunca' : template.default_expiration_days + ' dias'}</small>
                        ${template.is_active ? '<span>✅ Ativo</span>' : '<span>⏸️ Inativo</span>'}
                    </div>
                    <div class="template-actions">
                        <button class="btn btn-primary" onclick="usarTemplate('${template.id}')">
                            ✉️ Usar
                        </button>
                        <button class="btn btn-warning" onclick="editarTemplate('${template.id}')">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-danger" onclick="excluirTemplate('${template.id}')">
                            🗑️ Excluir
                        </button>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar templates:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar templates</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ==================== MODAL TEMPLATES ====================
function mostrarModalNovoTemplate() {
    document.getElementById('modalTemplate').classList.add('active');
    document.getElementById('formNovoTemplate').reset();
}

function fecharModalTemplate() {
    document.getElementById('modalTemplate').classList.remove('active');
}

async function salvarComoTemplate() {
    // Implementação similar ao envio, mas salvando como template
    mostrarSucesso('Função em desenvolvimento - salvar como template');
}

// ==================== SEÇÃO: HISTÓRICO ====================
async function carregarHistorico() {
    const container = document.getElementById('historyContent');
    
    try {
        const { data: batches, error } = await supabase
            .from('notification_batches')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (!batches || batches.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <h3>Nenhum envio registrado</h3>
                    <p>O histórico de envios aparecerá aqui.</p>
                </div>
            `;
            return;
        }

        let html = '<div class="notifications-grid">';
        
        batches.forEach(batch => {
            const badgeColor = getBadgeColor(batch.category);
            html += `
                <div class="notification-card">
                    <div class="notification-header">
                        <div class="notification-title">${escapeHtml(batch.title)}</div>
                        <div class="notification-badge" style="background: ${badgeColor}">
                            ${getCategoryLabel(batch.category)}
                        </div>
                    </div>
                    <div class="notification-meta">
                        <span>${formatarData(batch.created_at)}</span>
                        <span>${batch.total_recipients} destinatários</span>
                        <span>${batch.total_sent} enviados</span>
                    </div>
                    <div class="notification-message">${escapeHtml(batch.message)}</div>
                    <div class="notification-meta">
                        <small>Destino: ${getTargetLabel(batch.target_type)}</small>
                        <small>Expira: ${batch.expiration_type === 'never' ? 'Nunca' : batch.expiration_days + ' dias'}</small>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar histórico:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar histórico</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

// ==================== FUNÇÕES AUXILIARES ====================
function showSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Mostrar seção selecionada
    document.getElementById(sectionName).classList.add('active');
    event.target.classList.add('active');

    // Carregar conteúdo específico
    switch(sectionName) {
        case 'overview':
            carregarVisaoGeral();
            break;
        case 'send':
            carregarFormularioEnvio();
            break;
        case 'templates':
            carregarTemplates();
            break;
        case 'history':
            carregarHistorico();
            break;
    }
}

function carregarTudo() {
    carregarEstatisticas();
    carregarVisaoGeral();
}

function limparFormulario() {
    if (confirm('Limpar todo o formulário?')) {
        document.getElementById('formEnvioNotificacao').reset();
        selecionarDestino('all');
        selecionarExpiracao('never');
        usuarioEspecificoSelecionado = null;
        document.getElementById('resumoDestinatarios').style.display = 'none';
    }
}

function previsualizarNotificacao() {
    const titulo = document.getElementById('tituloNotificacao').value;
    const mensagem = document.getElementById('mensagemNotificacao').value;
    const categoria = document.getElementById('categoriaNotificacao').value;
    
    if (!titulo || !mensagem) {
        mostrarErro('Preencha o título e a mensagem para ver a prévia');
        return;
    }

    alert(`📨 PRÉ-VISUALIZAÇÃO:\n\n📢 ${titulo}\n\n💬 ${mensagem}\n\n📊 Categoria: ${getCategoryLabel(categoria)}`);
}

function formatarData(data) {
    if (!data) return '--';
    return new Date(data).toLocaleString('pt-BR');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getCategoryLabel(category) {
    const labels = {
        'system': '🔄 Sistema',
        'bonus': '🎁 Bônus', 
        'warning': '⚠️ Advertência',
        'info': 'ℹ️ Informativo'
    };
    return labels[category] || category;
}

function getTargetLabel(target) {
    const labels = {
        'all': '📧 Todos',
        'free': '🆓 Free',
        'premium': '⭐ Premium',
        'specific': '👤 Específico'
    };
    return labels[target] || target;
}

function getBadgeColor(category) {
    const colors = {
        'system': '#4299e1',
        'bonus': '#48bb78',
        'warning': '#ed8936',
        'info': '#9f7aea'
    };
    return colors[category] || '#718096';
}

function mostrarSucesso(mensagem) {
    alert(mensagem);
}

function mostrarErro(mensagem) {
    alert(mensagem);
}

async function carregarUsuariosCache() {
    try {
        const { data: usuarios, error } = await supabase
            .from('profiles')
            .select('id, nickname, email, is_premium')
            .limit(1000);
        
        if (!error) {
            usuariosCache = usuarios || [];
        }
    } catch (error) {
        console.error('Erro ao carregar cache de usuários:', error);
    }
}

// ==================== FUNÇÕES DE TEMPLATE (Placeholders) ====================
function usarTemplate(templateId) {
    showSection('send');
    mostrarSucesso('Template selecionado - preencha os detalhes restantes');
}

function editarTemplate(templateId) {
    mostrarSucesso('Edição de template em desenvolvimento');
}

async function excluirTemplate(templateId) {
    if (!confirm('Excluir este template?')) return;

    try {
        const { error } = await supabase
            .from('notification_templates')
            .delete()
            .eq('id', templateId);

        if (error) throw error;

        mostrarSucesso('✅ Template excluído!');
        carregarTemplates();

    } catch (error) {
        mostrarErro('❌ Erro: ' + error.message);
    }
}

// ==================== EXPORTAÇÕES ====================
window.showSection = showSection;
window.carregarTudo = carregarTudo;
window.logoutAdmin = logoutAdmin;
window.limparFormulario = limparFormulario;
window.salvarComoTemplate = salvarComoTemplate;
window.mostrarModalNovoTemplate = mostrarModalNovoTemplate;
window.fecharModalTemplate = fecharModalTemplate;
window.selecionarDestino = selecionarDestino;
window.buscarUsuarios = buscarUsuarios;
window.selecionarUsuario = selecionarUsuario;
window.selecionarExpiracao = selecionarExpiracao;
window.enviarNotificacao = enviarNotificacao;
window.previsualizarNotificacao = previsualizarNotificacao;
window.usarTemplate = usarTemplate;
window.editarTemplate = editarTemplate;
window.excluirTemplate = excluirTemplate;
window.carregarHistorico = carregarHistorico;