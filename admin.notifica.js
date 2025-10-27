// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VARIÁVEIS GLOBAIS ====================
let destinoSelecionado = 'all';
let usuarioEspecificoSelecionado = null;
let expiracaoSelecionada = 'never';

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

function irParaAdmin() {
    window.location.href = 'admin.html';
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    if (!verificarAutenticacao()) return;
    
    inicializarSistema();
    
    setInterval(() => {
        carregarEstatisticas();
    }, 30000);
});

async function inicializarSistema() {
    try {
        await carregarEstatisticas();
        await carregarVisaoGeral();
    } catch (error) {
        console.error('Erro ao inicializar sistema:', error);
        mostrarErro('Erro ao inicializar sistema');
    }
}

// ==================== ESTATÍSTICAS ====================
async function carregarEstatisticas() {
    if (!verificarAutenticacao()) return;
    
    try {
        const { count: totalNotificacoes, error: error1 } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true });

        const { count: naoLidas, error: error2 } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', false);

        const { count: totalUsuarios, error: error3 } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        const { count: templatesAtivos, error: error4 } = await supabase
            .from('notification_templates')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        if (error1 || error2 || error3 || error4) {
            throw new Error('Erro ao carregar estatísticas');
        }

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
    if (!container) return;
    
    try {
        container.innerHTML = `
            <div class="loading">
                <div class="spinner"></div>
                <p>Carregando dados do sistema...</p>
            </div>
        `;

        // Carregar notificações recentes
        const { data: notificacoes, error } = await supabase
            .from('user_notifications')
            .select(`
                *,
                user:user_id(nickname, avatar_url)
            `)
            .order('created_at', { ascending: false })
            .limit(10);

        if (error) throw error;

        // Carregar estatísticas detalhadas
        const estatisticas = await carregarEstatisticasDetalhadasVisaoGeral();

        let html = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem;">
                <div>
                    <h3 style="color: var(--primary); margin-bottom: 1rem;">📈 Estatísticas Rápidas</h3>
                    <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 10px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
                            <span>Notificações Hoje:</span>
                            <strong>${estatisticas.notificacoesHoje}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.8rem;">
                            <span>Taxa de Leitura:</span>
                            <strong>${estatisticas.taxaLeitura}%</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Usuários Ativos:</span>
                            <strong>${estatisticas.usuariosAtivos}</strong>
                        </div>
                    </div>
                </div>
                
                <div>
                    <h3 style="color: var(--primary); margin-bottom: 1rem;">🚨 Ações Rápidas</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        <button class="btn btn-primary" onclick="showSection('send')">
                            ✉️ Enviar Notificação
                        </button>
                        <button class="btn btn-success" onclick="mostrarModalNovoTemplate()">
                            🎯 Criar Template
                        </button>
                        <button class="btn btn-info" onclick="showSection('history')">
                            📋 Ver Histórico
                        </button>
                    </div>
                </div>
            </div>
            
            <div>
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
            html += '<div style="display: flex; flex-direction: column; gap: 1rem;">';
            
            notificacoes.forEach(notificacao => {
                const badgeColor = getBadgeColor(notificacao.category);
                html += `
                    <div style="border: 1px solid var(--light-gray); border-radius: 10px; padding: 1.5rem; background: white;">
                        <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                            <div style="font-weight: bold; flex: 1;">${escapeHtml(notificacao.title)}</div>
                            <div style="background: ${badgeColor}; color: white; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem;">
                                ${getCategoryLabel(notificacao.category)}
                            </div>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.9rem; color: var(--gray);">
                            <span>Para: ${notificacao.user?.nickname || 'Usuário'}</span>
                            <span>${formatarData(notificacao.created_at)}</span>
                            ${notificacao.is_read ? '<span>✅ Lida</span>' : '<span style="color: var(--danger);">🔴 Não lida</span>'}
                        </div>
                        <div style="margin-bottom: 1rem;">${escapeHtml(notificacao.message)}</div>
                        <div style="font-size: 0.8rem; color: var(--gray);">
                            <small>Expira: ${formatarData(notificacao.expires_at)}</small>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }

        container.innerHTML = html;

    } catch (error) {
        console.error('Erro ao carregar visão geral:', error);
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar</h3>
                <p>${error.message}</p>
            </div>
        `;
    }
}

async function carregarEstatisticasDetalhadasVisaoGeral() {
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
            .gte('last_online_at', umDiaAtras.toISOString())
            .eq('is_active', true);

        return {
            notificacoesHoje: notificacoesHoje || 0,
            taxaLeitura: taxaLeitura,
            usuariosAtivos: usuariosAtivos || 0
        };

    } catch (error) {
        console.error('Erro ao carregar estatísticas detalhadas:', error);
        return {
            notificacoesHoje: 0,
            taxaLeitura: 0,
            usuariosAtivos: 0
        };
    }
}

// ==================== SEÇÃO: ENVIAR NOTIFICAÇÃO ====================
async function carregarFormularioEnvio() {
    const container = document.getElementById('sendContent');
    if (!container) return;
    
    try {
        container.innerHTML = `
            <form id="formEnvioNotificacao" onsubmit="enviarNotificacao(event)">
                <!-- SELEÇÃO DE DESTINATÁRIOS -->
                <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 10px; margin-bottom: 1.5rem;">
                    <h4 style="color: var(--primary); margin-bottom: 1rem;">🎯 Escolher Destinatários</h4>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                        <div class="target-option selected" data-target="all" onclick="selecionarDestino('all')" style="border: 2px solid var(--primary); background: white; padding: 1rem; border-radius: 8px; text-align: center; cursor: pointer;">
                            <div style="font-size: 1.5rem;">📧</div>
                            <div style="font-weight: bold;">Todos os Usuários</div>
                            <small style="color: var(--gray);">Todos os usuários do sistema</small>
                        </div>
                        <div class="target-option" data-target="free" onclick="selecionarDestino('free')" style="border: 1px solid var(--light-gray); background: white; padding: 1rem; border-radius: 8px; text-align: center; cursor: pointer;">
                            <div style="font-size: 1.5rem;">🆓</div>
                            <div style="font-weight: bold;">Usuários Free</div>
                            <small style="color: var(--gray);">Apenas usuários gratuitos</small>
                        </div>
                        <div class="target-option" data-target="premium" onclick="selecionarDestino('premium')" style="border: 1px solid var(--light-gray); background: white; padding: 1rem; border-radius: 8px; text-align: center; cursor: pointer;">
                            <div style="font-size: 1.5rem;">⭐</div>
                            <div style="font-weight: bold;">Usuários Premium</div>
                            <small style="color: var(--gray);">Apenas usuários premium</small>
                        </div>
                        <div class="target-option" data-target="specific" onclick="selecionarDestino('specific')" style="border: 1px solid var(--light-gray); background: white; padding: 1rem; border-radius: 8px; text-align: center; cursor: pointer;">
                            <div style="font-size: 1.5rem;">👤</div>
                            <div style="font-weight: bold;">Usuário Específico</div>
                            <small style="color: var(--gray);">Buscar usuário específico</small>
                        </div>
                    </div>

                    <!-- BUSCA DE USUÁRIO ESPECÍFICO -->
                    <div id="usuarioEspecificoContainer" style="display: none; margin-top: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Buscar Usuário</label>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="buscarUsuarioInput" placeholder="Digite nickname ou email..." 
                                style="flex: 1; padding: 0.7rem; border: 1px solid var(--light-gray); border-radius: 6px;" 
                                oninput="buscarUsuarios(this.value)">
                            <button type="button" class="btn btn-primary" onclick="buscarUsuarios(document.getElementById('buscarUsuarioInput').value)">
                                🔍 Buscar
                            </button>
                        </div>
                        <div id="resultadosBuscaUsuarios" style="display: none; margin-top: 0.5rem; border: 1px solid var(--light-gray); border-radius: 6px; max-height: 200px; overflow-y: auto;"></div>
                    </div>

                    <!-- RESUMO DOS DESTINATÁRIOS -->
                    <div id="resumoDestinatarios" style="margin-top: 1rem; padding: 1rem; background: #e8f5e8; border-radius: 6px;">
                        <strong>📋 Destinatários selecionados:</strong> 
                        <span id="textoResumoDestinatarios">Todos os usuários do sistema</span>
                        <span id="contadorDestinatarios" style="float: right; font-weight: bold;">Todos</span>
                    </div>
                </div>

                <!-- CONTEÚDO DA NOTIFICAÇÃO -->
                <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 10px; margin-bottom: 1.5rem;">
                    <h4 style="color: var(--primary); margin-bottom: 1rem;">📝 Conteúdo da Notificação</h4>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1rem;">
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Categoria *</label>
                            <select style="width: 100%; padding: 0.7rem; border: 1px solid var(--light-gray); border-radius: 6px;" id="categoriaNotificacao" required>
                                <option value="system">🔄 Sistema</option>
                                <option value="bonus">🎁 Bônus</option>
                                <option value="warning">⚠️ Advertência</option>
                                <option value="info">ℹ️ Informativo</option>
                            </select>
                        </div>
                        
                        <div>
                            <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Prioridade *</label>
                            <select style="width: 100%; padding: 0.7rem; border: 1px solid var(--light-gray); border-radius: 6px;" id="prioridadeNotificacao" required>
                                <option value="low">🔵 Baixa</option>
                                <option value="normal" selected>🟢 Normal</option>
                                <option value="high">🟡 Alta</option>
                                <option value="urgent">🔴 Urgente</option>
                            </select>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Título *</label>
                        <input type="text" style="width: 100%; padding: 0.7rem; border: 1px solid var(--light-gray); border-radius: 6px;" id="tituloNotificacao" 
                            placeholder="Ex: 🎉 Bônus Exclusivo para Premium!" required>
                    </div>
                    
                    <div style="margin-bottom: 1rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Mensagem *</label>
                        <textarea style="width: 100%; padding: 0.7rem; border: 1px solid var(--light-gray); border-radius: 6px; min-height: 120px; resize: vertical;" id="mensagemNotificacao" 
                            placeholder="Digite a mensagem da notificação..." required></textarea>
                    </div>

                    <!-- SISTEMA DE EXPIRAÇÃO -->
                    <div>
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">⏰ Configurar Expiração</label>
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 0.5rem; margin-bottom: 1rem;">
                            <div class="expiration-option selected" data-expiration="never" onclick="selecionarExpiracao('never')" style="border: 2px solid var(--primary); background: white; padding: 1rem; border-radius: 8px; text-align: center; cursor: pointer;">
                                <div style="font-size: 1.2rem;">∞</div>
                                <div style="font-weight: bold;">Nunca expira</div>
                            </div>
                            <div class="expiration-option" data-expiration="days:7" onclick="selecionarExpiracao('days:7')" style="border: 1px solid var(--light-gray); background: white; padding: 1rem; border-radius: 8px; text-align: center; cursor: pointer;">
                                <div style="font-size: 1.2rem;">7d</div>
                                <div style="font-weight: bold;">7 dias</div>
                            </div>
                            <div class="expiration-option" data-expiration="days:30" onclick="selecionarExpiracao('days:30')" style="border: 1px solid var(--light-gray); background: white; padding: 1rem; border-radius: 8px; text-align: center; cursor: pointer;">
                                <div style="font-size: 1.2rem;">30d</div>
                                <div style="font-weight: bold;">30 dias</div>
                            </div>
                            <div class="expiration-option" data-expiration="custom" onclick="selecionarExpiracao('custom')" style="border: 1px solid var(--light-gray); background: white; padding: 1rem; border-radius: 8px; text-align: center; cursor: pointer;">
                                <div style="font-size: 1.2rem;">📅</div>
                                <div style="font-weight: bold;">Personalizado</div>
                            </div>
                        </div>

                        <!-- DIAS PERSONALIZADOS -->
                        <div id="diasPersonalizadosContainer" style="display: none; margin-top: 1rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem;">
                                <label style="font-weight: bold;">Expirar após:</label>
                                <input type="number" id="diasPersonalizados" style="width: 100px; padding: 0.5rem; border: 1px solid var(--light-gray); border-radius: 6px;" 
                                    min="1" max="3650" value="7">
                                <span>dias</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- AÇÕES -->
                <div style="display: flex; gap: 1rem; justify-content: flex-end; flex-wrap: wrap;">
                    <button type="button" class="btn" style="background: var(--gray); color: white;" onclick="previsualizarNotificacao()">
                        👁️ Pré-visualizar
                    </button>
                    <button type="submit" class="btn btn-success">
                        ✉️ Enviar Notificação
                    </button>
                </div>
            </form>
        `;

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
function selecionarDestino(destino) {
    destinoSelecionado = destino;
    
    document.querySelectorAll('.target-option').forEach(opt => {
        opt.style.border = '1px solid var(--light-gray)';
        opt.style.borderColor = 'var(--light-gray)';
    });
    
    const selected = document.querySelector(`[data-target="${destino}"]`);
    if (selected) {
        selected.style.border = '2px solid var(--primary)';
        selected.style.borderColor = 'var(--primary)';
    }
    
    const usuarioContainer = document.getElementById('usuarioEspecificoContainer');
    const resultadosBusca = document.getElementById('resultadosBuscaUsuarios');
    
    if (destino === 'specific') {
        if (usuarioContainer) usuarioContainer.style.display = 'block';
    } else {
        if (usuarioContainer) usuarioContainer.style.display = 'none';
        if (resultadosBusca) resultadosBusca.style.display = 'none';
        usuarioEspecificoSelecionado = null;
    }
    
    atualizarResumoDestinatarios();
}

async function buscarUsuarios(termo) {
    const container = document.getElementById('resultadosBuscaUsuarios');
    if (!container) return;
    
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
            container.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--gray);">Nenhum usuário encontrado</div>';
            container.style.display = 'block';
            return;
        }

        let html = '';
        usuarios.forEach(usuario => {
            const tipo = usuario.is_premium ? '⭐' : '🆓';
            html += `
                <div style="padding: 0.8rem; border-bottom: 1px solid var(--light-gray); cursor: pointer; transition: background 0.2s;" 
                     onmouseover="this.style.background='var(--light-gray)'" 
                     onmouseout="this.style.background='white'"
                     onclick="selecionarUsuario('${usuario.id}', '${(usuario.nickname || usuario.email).replace(/'/g, "\\'")}')">
                    <strong>${tipo} ${usuario.nickname || 'Sem nickname'}</strong>
                    <br><small>${usuario.email}</small>
                </div>
            `;
        });

        container.innerHTML = html;
        container.style.display = 'block';

    } catch (error) {
        console.error('Erro na busca de usuários:', error);
        container.innerHTML = '<div style="padding: 1rem; text-align: center; color: var(--danger);">Erro na busca</div>';
        container.style.display = 'block';
    }
}

function selecionarUsuario(usuarioId, usuarioNome) {
    usuarioEspecificoSelecionado = { id: usuarioId, nome: usuarioNome };
    
    const resultadosBusca = document.getElementById('resultadosBuscaUsuarios');
    const buscarInput = document.getElementById('buscarUsuarioInput');
    
    if (resultadosBusca) resultadosBusca.style.display = 'none';
    if (buscarInput) buscarInput.value = usuarioNome;
    
    atualizarResumoDestinatarios();
}

function atualizarResumoDestinatarios() {
    const resumo = document.getElementById('resumoDestinatarios');
    const texto = document.getElementById('textoResumoDestinatarios');
    const contador = document.getElementById('contadorDestinatarios');
    
    if (!resumo || !texto || !contador) return;
    
    let textoResumo = '';
    let count = '';
    
    switch(destinoSelecionado) {
        case 'all':
            textoResumo = '📧 Todos os usuários do sistema';
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
}

// ==================== SISTEMA DE EXPIRAÇÃO ====================
function selecionarExpiracao(expiracao) {
    expiracaoSelecionada = expiracao;
    
    document.querySelectorAll('.expiration-option').forEach(opt => {
        opt.style.border = '1px solid var(--light-gray)';
        opt.style.borderColor = 'var(--light-gray)';
    });
    
    const selected = document.querySelector(`[data-expiration="${expiracao}"]`);
    if (selected) {
        selected.style.border = '2px solid var(--primary)';
        selected.style.borderColor = 'var(--primary)';
    }
    
    const diasContainer = document.getElementById('diasPersonalizadosContainer');
    if (diasContainer) {
        if (expiracao === 'custom') {
            diasContainer.style.display = 'block';
        } else {
            diasContainer.style.display = 'none';
        }
    }
}

// ==================== ENVIO DE NOTIFICAÇÃO ====================
async function enviarNotificacao(event) {
    event.preventDefault();
    
    if (!verificarAutenticacao()) return;
    
    const tituloInput = document.getElementById('tituloNotificacao');
    const mensagemInput = document.getElementById('mensagemNotificacao');
    
    if (!tituloInput || !mensagemInput) {
        mostrarErro('Formulário não carregado corretamente');
        return;
    }
    
    const dadosNotificacao = {
        category: document.getElementById('categoriaNotificacao').value,
        title: tituloInput.value.trim(),
        message: mensagemInput.value.trim(),
        priority: document.getElementById('prioridadeNotificacao').value,
        expiration_type: expiracaoSelecionada.startsWith('days:') ? 'days' : 
                        expiracaoSelecionada === 'custom' ? 'days' : 
                        expiracaoSelecionada === 'never' ? 'never' : 'days',
        expiration_days: expiracaoSelecionada.startsWith('days:') ? 
                        parseInt(expiracaoSelecionada.split(':')[1]) :
                        expiracaoSelecionada === 'custom' ? 
                        parseInt(document.getElementById('diasPersonalizados').value) : null
    };
    
    if (!dadosNotificacao.title || !dadosNotificacao.message) {
        mostrarErro('Preencha título e mensagem');
        return;
    }
    
    let userIDs = [];
    try {
        userIDs = await obterDestinatarios();
        if (userIDs.length === 0) {
            mostrarErro('Nenhum usuário selecionado');
            return;
        }
    } catch (error) {
        console.error('Erro ao buscar destinatários:', error);
        mostrarErro('Erro ao buscar destinatários');
        return;
    }
    
    if (userIDs.length > 1) {
        const confirmacao = confirm(`Enviar para ${userIDs.length} usuários?\n\nTítulo: ${dadosNotificacao.title}`);
        if (!confirmacao) return;
    }
    
    try {
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
        
        const { error } = await supabase
            .from('user_notifications')
            .insert(notificacoes);
        
        if (error) throw error;
        
        mostrarSucesso(`✅ Notificação enviada para ${userIDs.length} usuário(s)!`);
        
        // Limpar formulário
        const form = document.getElementById('formEnvioNotificacao');
        if (form) form.reset();
        
        selecionarDestino('all');
        selecionarExpiracao('never');
        usuarioEspecificoSelecionado = null;
        
        // Recarregar dados
        carregarEstatisticas();
        carregarVisaoGeral();
        
    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        mostrarErro('❌ Erro ao enviar notificação: ' + error.message);
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
            .limit(10000);
        
        if (error) throw error;
        return usuarios.map(u => u.id);
    } catch (error) {
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
        throw error;
    }
}

// ==================== SEÇÃO: TEMPLATES ====================
async function carregarTemplates() {
    const container = document.getElementById('templatesContent');
    if (!container) return;
    
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
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1rem;">
        `;

        templates.forEach(template => {
            const badgeColor = getBadgeColor(template.category);
            html += `
                <div style="border: 1px solid var(--light-gray); border-radius: 10px; padding: 1.5rem; background: white;">
                    <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                        <div style="font-weight: bold; flex: 1;">${escapeHtml(template.name)}</div>
                        <div style="background: ${badgeColor}; color: white; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem;">
                            ${getCategoryLabel(template.category)}
                        </div>
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>Título:</strong> ${escapeHtml(template.title_template)}
                    </div>
                    <div style="margin-bottom: 1rem;">
                        <strong>Mensagem:</strong> ${escapeHtml(template.message_template)}
                    </div>
                    <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 1rem; font-size: 0.9rem; color: var(--gray);">
                        <small>Expiração: ${template.expiration_type === 'never' ? 'Nunca' : template.default_expiration_days + ' dias'}</small>
                        ${template.is_active ? '<span>✅ Ativo</span>' : '<span>⏸️ Inativo</span>'}
                    </div>
                    <div style="display: flex; gap: 0.5rem;">
                        <button class="btn btn-primary" onclick="usarTemplate('${template.id}')">
                            ✉️ Usar
                        </button>
                        <button class="btn" style="background: var(--warning); color: white;" onclick="editarTemplate('${template.id}')">
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
    // Implementação simplificada - criar template diretamente
    const nome = prompt('Nome do template:');
    if (!nome) return;
    
    const titulo = prompt('Título do template:');
    if (!titulo) return;
    
    const mensagem = prompt('Mensagem do template:');
    if (!mensagem) return;
    
    criarTemplate(nome, titulo, mensagem);
}

async function criarTemplate(nome, titulo, mensagem) {
    try {
        const { error } = await supabase
            .from('notification_templates')
            .insert({
                name: nome,
                title_template: titulo,
                message_template: mensagem,
                category: 'system',
                priority: 'normal',
                expiration_type: 'days',
                default_expiration_days: 30,
                is_active: true
            });

        if (error) throw error;

        mostrarSucesso('✅ Template criado com sucesso!');
        carregarTemplates();

    } catch (error) {
        console.error('Erro ao criar template:', error);
        mostrarErro('❌ Erro ao criar template');
    }
}

function fecharModalTemplate() {
    // Implementação do modal seria aqui
    console.log('Fechar modal template');
}

// ==================== SEÇÃO: HISTÓRICO ====================
async function carregarHistorico() {
    const container = document.getElementById('historyContent');
    if (!container) return;
    
    try {
        // Como não temos a tabela notification_batches, vamos usar user_notifications
        const { data: notificacoes, error } = await supabase
            .from('user_notifications')
            .select(`
                *,
                user:user_id(nickname)
            `)
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (!notificacoes || notificacoes.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📋</div>
                    <h3>Nenhum envio registrado</h3>
                    <p>O histórico de envios aparecerá aqui.</p>
                </div>
            `;
            return;
        }

        let html = '<div style="display: flex; flex-direction: column; gap: 1rem;">';
        
        notificacoes.forEach(notificacao => {
            const badgeColor = getBadgeColor(notificacao.category);
            html += `
                <div style="border: 1px solid var(--light-gray); border-radius: 10px; padding: 1.5rem; background: white;">
                    <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 1rem;">
                        <div style="font-weight: bold; flex: 1;">${escapeHtml(notificacao.title)}</div>
                        <div style="background: ${badgeColor}; color: white; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem;">
                            ${getCategoryLabel(notificacao.category)}
                        </div>
                    </div>
                    <div style="display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.9rem; color: var(--gray); flex-wrap: wrap;">
                        <span>${formatarData(notificacao.created_at)}</span>
                        <span>Para: ${notificacao.user?.nickname || 'Usuário'}</span>
                        <span>${notificacao.is_read ? '✅ Lida' : '🔴 Não lida'}</span>
                    </div>
                    <div style="margin-bottom: 1rem;">${escapeHtml(notificacao.message)}</div>
                    <div style="font-size: 0.8rem; color: var(--gray);">
                        <small>Expira: ${formatarData(notificacao.expires_at)}</small>
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
    
    // Remover active de todos os botões
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    const section = document.getElementById(sectionName);
    if (section) {
        section.classList.add('active');
    }
    
    // Ativar botão clicado
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
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
        const form = document.getElementById('formEnvioNotificacao');
        if (form) form.reset();
        selecionarDestino('all');
        selecionarExpiracao('never');
        usuarioEspecificoSelecionado = null;
    }
}

function previsualizarNotificacao() {
    const tituloInput = document.getElementById('tituloNotificacao');
    const mensagemInput = document.getElementById('mensagemNotificacao');
    const categoriaSelect = document.getElementById('categoriaNotificacao');
    
    if (!tituloInput || !mensagemInput || !categoriaSelect) {
        mostrarErro('Formulário não carregado');
        return;
    }
    
    const titulo = tituloInput.value;
    const mensagem = mensagemInput.value;
    const categoria = categoriaSelect.value;
    
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
    if (!text) return '';
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

// ==================== FUNÇÕES DE TEMPLATE ====================
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
        console.error('Erro ao excluir template:', error);
        mostrarErro('❌ Erro: ' + error.message);
    }
}

// ==================== EXPORTAÇÕES PARA HTML ====================
window.showSection = showSection;
window.carregarTudo = carregarTudo;
window.logoutAdmin = logoutAdmin;
window.irParaAdmin = irParaAdmin;
window.limparFormulario = limparFormulario;
window.salvarComoTemplate = function() { mostrarSucesso('Funcionalidade em desenvolvimento - salvar como template'); };
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
window.carregarFormularioEnvio = carregarFormularioEnvio;
window.carregarTemplates = carregarTemplates;
window.carregarVisaoGeral = carregarVisaoGeral;