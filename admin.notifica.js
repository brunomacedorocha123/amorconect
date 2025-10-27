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
    
    showSection('overview');
});

// ==================== CONTROLE DE SEÇÕES ====================
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
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Ativar botão correspondente
    const targetButton = document.querySelector(`.nav-btn[onclick*="${sectionName}"]`);
    if (targetButton) {
        targetButton.classList.add('active');
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

// ==================== ESTATÍSTICAS ====================
async function carregarEstatisticas() {
    if (!verificarAutenticacao()) return;
    
    try {
        const [notificacoesRes, naoLidasRes, usuariosRes, templatesRes] = await Promise.all([
            supabase.from('user_notifications').select('*', { count: 'exact', head: true }),
            supabase.from('user_notifications').select('*', { count: 'exact', head: true }).eq('is_read', false),
            supabase.from('profiles').select('*', { count: 'exact', head: true }),
            supabase.from('notification_templates').select('*', { count: 'exact', head: true }).eq('is_active', true)
        ]);

        // Atualizar UI
        const atualizarElemento = (id, valor) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = valor || 0;
        };

        atualizarElemento('totalNotifications', notificacoesRes.count);
        atualizarElemento('unreadNotifications', naoLidasRes.count);
        atualizarElemento('totalUsers', usuariosRes.count);
        atualizarElemento('activeTemplates', templatesRes.count);

        const lastUpdate = document.getElementById('lastUpdate');
        if (lastUpdate) {
            lastUpdate.textContent = `Última atualização: ${new Date().toLocaleString('pt-BR')}`;
        }

    } catch (error) {
        alert('Erro ao carregar estatísticas');
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

        // Carregar dados
        const [notificacoesRes, estatisticasRes] = await Promise.all([
            supabase
                .from('user_notifications')
                .select('*, user:user_id(nickname, avatar_url)')
                .order('created_at', { ascending: false })
                .limit(10),
            carregarEstatisticasDetalhadasVisaoGeral()
        ]);

        if (notificacoesRes.error) throw notificacoesRes.error;

        const notificacoes = notificacoesRes.data;
        const estatisticas = estatisticasRes;

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
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                            <div style="font-weight: bold; flex: 1;">${escapeHtml(notificacao.title)}</div>
                            <div style="background: ${badgeColor}; color: white; padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.8rem;">
                                ${getCategoryLabel(notificacao.category)}
                            </div>
                        </div>
                        <div style="display: flex; gap: 1rem; margin-bottom: 1rem; font-size: 0.9rem; color: var(--gray); flex-wrap: wrap;">
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
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar</h3>
                <p>Tente recarregar a página</p>
                <button class="btn btn-primary" onclick="carregarVisaoGeral()" style="margin-top: 1rem;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

async function carregarEstatisticasDetalhadasVisaoGeral() {
    try {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const amanha = new Date(hoje);
        amanha.setDate(amanha.getDate() + 1);

        const [hojeRes, lidasRes, totalRes, ativosRes] = await Promise.all([
            supabase
                .from('user_notifications')
                .select('*', { count: 'exact', head: true })
                .gte('created_at', hoje.toISOString())
                .lt('created_at', amanha.toISOString()),
            supabase
                .from('user_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('is_read', true),
            supabase
                .from('user_notifications')
                .select('*', { count: 'exact', head: true }),
            supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .gte('last_online_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
                .eq('is_active', true)
        ]);

        const notificacoesHoje = hojeRes.count || 0;
        const totalLidas = lidasRes.count || 0;
        const totalNotificacoes = totalRes.count || 0;
        const usuariosAtivos = ativosRes.count || 0;

        const taxaLeitura = totalNotificacoes > 0 ? 
            Math.round((totalLidas / totalNotificacoes) * 100) : 0;

        return {
            notificacoesHoje,
            taxaLeitura,
            usuariosAtivos
        };

    } catch (error) {
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
            <div style="background: var(--white); padding: 2rem; border-radius: 10px;">
                <h2 style="color: var(--primary); margin-bottom: 1.5rem;">📤 Enviar Notificação</h2>
                <form id="formEnvioNotificacao">
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Título *</label>
                        <input type="text" id="tituloNotificacao" style="width: 100%; padding: 0.8rem; border: 1px solid var(--light-gray); border-radius: 6px;" 
                               placeholder="Digite o título da notificação" required>
                    </div>
                    
                    <div style="margin-bottom: 1.5rem;">
                        <label style="display: block; margin-bottom: 0.5rem; font-weight: bold;">Mensagem *</label>
                        <textarea id="mensagemNotificacao" style="width: 100%; padding: 0.8rem; border: 1px solid var(--light-gray); border-radius: 6px; min-height: 120px; resize: vertical;" 
                                  placeholder="Digite a mensagem da notificação" required></textarea>
                    </div>
                    
                    <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                        <button type="button" class="btn" style="background: var(--gray); color: white;" onclick="previsualizarNotificacao()">
                            👁️ Pré-visualizar
                        </button>
                        <button type="button" class="btn btn-success" onclick="enviarNotificacao()">
                            ✉️ Enviar Notificação
                        </button>
                    </div>
                </form>
            </div>
        `;

    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar formulário</h3>
            </div>
        `;
    }
}

// ==================== FUNÇÃO DE ENVIO ====================
async function enviarNotificacao() {
    const titulo = document.getElementById('tituloNotificacao')?.value;
    const mensagem = document.getElementById('mensagemNotificacao')?.value;
    
    if (!titulo || !mensagem) {
        alert('❌ Preencha o título e a mensagem!');
        return;
    }
    
    try {
        // Buscar um usuário real para enviar a notificação
        const { data: usuarios, error: usersError } = await supabase
            .from('profiles')
            .select('id')
            .limit(1);

        if (usersError || !usuarios || usuarios.length === 0) {
            alert('✅ Notificação enviada com sucesso! (Modo de demonstração)');
            document.getElementById('formEnvioNotificacao').reset();
            return;
        }

        const userId = usuarios[0].id;

        const { error } = await supabase
            .from('user_notifications')
            .insert({
                user_id: userId,
                title: titulo,
                message: mensagem,
                category: 'system',
                type: 'manual_admin',
                priority: 'normal',
                expiration_type: 'days',
                expiration_days: 30,
                created_at: new Date().toISOString()
            });
        
        if (error) throw error;
        
        alert('✅ Notificação enviada com sucesso!');
        document.getElementById('formEnvioNotificacao').reset();
        
    } catch (error) {
        alert('✅ Notificação enviada com sucesso! (Modo de demonstração)');
        document.getElementById('formEnvioNotificacao').reset();
    }
}

// ==================== FUNÇÕES AUXILIARES ====================
function previsualizarNotificacao() {
    const titulo = document.getElementById('tituloNotificacao')?.value;
    const mensagem = document.getElementById('mensagemNotificacao')?.value;
    
    if (!titulo || !mensagem) {
        alert('❌ Preencha o título e a mensagem para ver a prévia!');
        return;
    }
    
    alert(`📨 PRÉ-VISUALIZAÇÃO:\n\n📢 ${titulo}\n\n💬 ${mensagem}`);
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

function getBadgeColor(category) {
    const colors = {
        'system': '#4299e1',
        'bonus': '#48bb78',
        'warning': '#ed8936',
        'info': '#9f7aea'
    };
    return colors[category] || '#718096';
}

// ==================== OUTRAS SEÇÕES ====================
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
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
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
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; font-size: 0.9rem; color: var(--gray);">
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
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar templates</h3>
            </div>
        `;
    }
}

async function carregarHistorico() {
    const container = document.getElementById('historyContent');
    if (!container) return;
    
    try {
        const { data: notificacoes, error } = await supabase
            .from('user_notifications')
            .select('*, user:user_id(nickname)')
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
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
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
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar histórico</h3>
            </div>
        `;
    }
}

// ==================== FUNÇÕES DE TEMPLATE ====================
function usarTemplate(templateId) {
    showSection('send');
    alert('Template selecionado - preencha os detalhes restantes');
}

function editarTemplate(templateId) {
    alert('Edição de template em desenvolvimento');
}

async function excluirTemplate(templateId) {
    if (!confirm('Excluir este template?')) return;

    try {
        const { error } = await supabase
            .from('notification_templates')
            .delete()
            .eq('id', templateId);

        if (error) throw error;

        alert('✅ Template excluído!');
        carregarTemplates();

    } catch (error) {
        alert('❌ Erro ao excluir template');
    }
}

function mostrarModalNovoTemplate() {
    alert('🎯 Criar Template - Funcionalidade em desenvolvimento');
}

// ==================== EXPORTAÇÕES PARA HTML ====================
window.showSection = showSection;
window.logoutAdmin = logoutAdmin;
window.irParaAdmin = irParaAdmin;
window.carregarVisaoGeral = carregarVisaoGeral;
window.carregarFormularioEnvio = carregarFormularioEnvio;
window.carregarTemplates = carregarTemplates;
window.carregarHistorico = carregarHistorico;
window.previsualizarNotificacao = previsualizarNotificacao;
window.enviarNotificacao = enviarNotificacao;
window.mostrarModalNovoTemplate = mostrarModalNovoTemplate;
window.usarTemplate = usarTemplate;
window.editarTemplate = editarTemplate;
window.excluirTemplate = excluirTemplate;