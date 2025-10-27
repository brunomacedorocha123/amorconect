// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VERIFICAÇÃO DE AUTENTICAÇÃO ====================
function verificarAutenticacao() {
    if (sessionStorage.getItem('adminAuthenticated') !== 'true') {
        window.location.href = 'login-admin.html';
        return false;
    }
    return true;
}

// ==================== VARIÁVEIS GLOBAIS ====================
let templates = [];
let batches = [];

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    if (!verificarAutenticacao()) return;
    
    carregarEstatisticas();
    carregarTemplates();
    carregarHistorico();
    configurarEventListeners();
});

function configurarEventListeners() {
    // Mostrar/ocultar campos condicionais
    document.getElementById('tipoUsuario').addEventListener('change', function() {
        const usuariosEspecificosGroup = document.getElementById('usuariosEspecificosGroup');
        usuariosEspecificosGroup.style.display = this.value === 'specific' ? 'block' : 'none';
    });

    document.getElementById('validade').addEventListener('change', function() {
        const dataEspecificaGroup = document.getElementById('dataEspecificaGroup');
        dataEspecificaGroup.style.display = this.value === 'specific' ? 'block' : 'none';
    });

    // Form de envio de notificação
    document.getElementById('formNotificacao').addEventListener('submit', enviarNotificacao);
}

// ==================== FUNÇÕES DE INTERFACE ====================
function showSection(sectionName) {
    // Esconder todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Mostrar seção selecionada
    document.getElementById(sectionName).classList.add('active');

    // Carregar conteúdo específico
    switch(sectionName) {
        case 'templates':
            carregarTemplates();
            break;
        case 'historico':
            carregarHistorico();
            break;
        case 'enviar':
            carregarTemplatesSelect();
            break;
    }
}

// ==================== ESTATÍSTICAS ====================
async function carregarEstatisticas() {
    try {
        // Total de templates
        const { count: totalTemplates } = await supabase
            .from('notification_templates')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // Total de notificações enviadas
        const { count: totalEnviadas } = await supabase
            .from('notification_batches')
            .select('*', { count: 'exact', head: true });

        // Total de usuários
        const { count: totalUsuarios } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .eq('is_active', true);

        // Notificações lidas (estimativa)
        const { count: totalLidas } = await supabase
            .from('user_notifications')
            .select('*', { count: 'exact', head: true })
            .eq('is_read', true);

        document.getElementById('totalTemplates').textContent = totalTemplates || 0;
        document.getElementById('totalEnviadas').textContent = totalEnviadas || 0;
        document.getElementById('totalLidas').textContent = totalLidas || 0;
        document.getElementById('totalUsuarios').textContent = totalUsuarios || 0;

    } catch (erro) {
        alert('Erro ao carregar estatísticas');
    }
}

// ==================== ENVIO DE NOTIFICAÇÕES ====================
async function enviarNotificacao(event) {
    event.preventDefault();
    
    if (!verificarAutenticacao()) return;

    const titulo = document.getElementById('titulo').value;
    const mensagem = document.getElementById('mensagem').value;
    const categoria = document.getElementById('categoria').value;
    const prioridade = document.getElementById('prioridade').value;
    const tipoUsuario = document.getElementById('tipoUsuario').value;
    const validade = document.getElementById('validade').value;
    const usuariosEspecificos = document.getElementById('usuariosEspecificos').value;
    const dataExpiracao = document.getElementById('dataExpiracao').value;

    try {
        // 1. Obter lista de destinatários
        const destinatarios = await obterDestinatarios(tipoUsuario, usuariosEspecificos);
        
        if (destinatarios.length === 0) {
            alert('❌ Nenhum destinatário encontrado para os critérios selecionados.');
            return;
        }

        // 2. Configurar expiração
        const configExpiracao = configurarExpiracao(validade, dataExpiracao);

        // 3. Criar lote de notificação
        const batchId = await criarBatchNotificacao({
            titulo,
            mensagem,
            categoria,
            prioridade,
            tipoUsuario,
            destinatarios: destinatarios.length,
            configExpiracao
        });

        // 4. Enviar notificações individuais
        await enviarNotificacoesIndividuais(
            destinatarios,
            titulo,
            mensagem,
            categoria,
            prioridade,
            configExpiracao,
            batchId
        );

        // 5. Atualizar estatísticas do batch
        await atualizarBatchCompleto(batchId, destinatarios.length);

        alert(`✅ Notificação enviada com sucesso para ${destinatarios.length} usuários!`);
        document.getElementById('formNotificacao').reset();
        carregarEstatisticas();
        carregarHistorico();

    } catch (erro) {
        alert('❌ Erro ao enviar notificação: ' + (erro.message || 'Erro desconhecido'));
    }
}

async function obterDestinatarios(tipoUsuario, usuariosEspecificos) {
    let query = supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

    // Aplicar filtros baseados no tipo de usuário
    switch (tipoUsuario) {
        case 'free':
            query = query.eq('is_premium', false);
            break;
        case 'premium':
            query = query.eq('is_premium', true);
            break;
        case 'specific':
            if (usuariosEspecificos) {
                const ids = usuariosEspecificos.split(',').map(id => id.trim()).filter(id => id);
                query = query.in('id', ids);
            }
            break;
        // 'all' não precisa de filtro adicional
    }

    const { data, error } = await query;
    
    if (error) throw error;
    return data || [];
}

function configurarExpiracao(validade, dataExpiracao) {
    if (validade === 'specific' && dataExpiracao) {
        return {
            expiration_type: 'specific_date',
            specific_expires_at: dataExpiracao,
            expiration_days: null
        };
    } else if (validade === 'never') {
        return {
            expiration_type: 'never',
            specific_expires_at: null,
            expiration_days: null
        };
    } else {
        const days = parseInt(validade);
        return {
            expiration_type: 'days',
            specific_expires_at: null,
            expiration_days: days
        };
    }
}

async function criarBatchNotificacao(dados) {
    const { data, error } = await supabase
        .from('notification_batches')
        .insert({
            title: dados.titulo,
            message: dados.mensagem,
            category: dados.categoria,
            target_type: dados.tipoUsuario,
            expiration_type: dados.configExpiracao.expiration_type,
            expiration_days: dados.configExpiracao.expiration_days,
            specific_expires_at: dados.configExpiracao.specific_expires_at,
            total_recipients: dados.destinatarios,
            status: 'sending'
        })
        .select()
        .single();

    if (error) throw error;
    return data.id;
}

async function enviarNotificacoesIndividuais(destinatarios, titulo, mensagem, categoria, prioridade, configExpiracao, batchId) {
    const notificacoes = destinatarios.map(usuario => ({
        user_id: usuario.id,
        title: titulo,
        message: mensagem,
        category: categoria,
        priority: prioridade,
        expiration_type: configExpiracao.expiration_type,
        expiration_days: configExpiracao.expiration_days,
        specific_expires_at: configExpiracao.specific_expires_at,
        batch_id: batchId
    }));

    // Enviar em lotes de 50 para evitar timeout
    const batchSize = 50;
    for (let i = 0; i < notificacoes.length; i += batchSize) {
        const batch = notificacoes.slice(i, i + batchSize);
        const { error } = await supabase
            .from('user_notifications')
            .insert(batch);

        if (error) throw error;
    }
}

async function atualizarBatchCompleto(batchId, totalDestinatarios) {
    const { error } = await supabase
        .from('notification_batches')
        .update({
            status: 'completed',
            total_sent: totalDestinatarios
        })
        .eq('id', batchId);

    if (error) throw error;
}

// ==================== TEMPLATES ====================
async function carregarTemplates() {
    if (!verificarAutenticacao()) return;
    
    const container = document.getElementById('templatesContainer');
    
    try {
        const { data, error } = await supabase
            .from('notification_templates')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        templates = data || [];

        if (templates.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📝</div>
                    <h3>Nenhum template criado</h3>
                    <p>Crie seu primeiro template para agilizar os envios.</p>
                    <button class="btn btn-primary" onclick="abrirCriarTemplate()" style="margin-top: 1rem;">
                        ➕ Criar Primeiro Template
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = templates.map(template => `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${template.name}</div>
                    <div class="badge ${template.is_active ? 'badge-success' : 'badge-danger'}">
                        ${template.is_active ? 'Ativo' : 'Inativo'}
                    </div>
                </div>
                
                <div class="card-meta">
                    <strong>Categoria:</strong> ${template.category} | 
                    <strong>Prioridade:</strong> ${template.priority} |
                    <strong>Expiração padrão:</strong> ${template.expiration_type === 'never' ? 'Nunca' : 
                       template.expiration_type === 'days' ? `${template.default_expiration_days} dias` : 
                       'Data específica'}
                </div>

                <div style="margin-bottom: 1rem;">
                    <strong>Título:</strong> ${template.title_template}
                </div>
                
                <div style="margin-bottom: 1rem;">
                    <strong>Mensagem:</strong> ${template.message_template}
                </div>

                <div class="card-actions">
                    <button class="btn btn-primary" onclick="usarTemplate('${template.id}')">
                        📨 Usar este Template
                    </button>
                    <button class="btn btn-secondary" onclick="editarTemplate('${template.id}')">
                        ✏️ Editar
                    </button>
                    <button class="btn ${template.is_active ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleTemplate('${template.id}', ${!template.is_active})">
                        ${template.is_active ? '🚫 Desativar' : '✅ Ativar'}
                    </button>
                    <button class="btn btn-danger" onclick="excluirTemplate('${template.id}')">
                        🗑️ Excluir
                    </button>
                </div>
            </div>
        `).join('');

    } catch (erro) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar templates</h3>
                <p>Tente novamente mais tarde.</p>
            </div>
        `;
    }
}

async function carregarTemplatesSelect() {
    const select = document.getElementById('templateSelect');
    
    try {
        const { data, error } = await supabase
            .from('notification_templates')
            .select('id, name, title_template, message_template, category, priority, expiration_type, default_expiration_days')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        // Limpar options exceto o primeiro
        while (select.children.length > 1) {
            select.removeChild(select.lastChild);
        }

        // Adicionar novas options
        (data || []).forEach(template => {
            const option = document.createElement('option');
            option.value = template.id;
            option.textContent = template.name;
            select.appendChild(option);
        });

    } catch (erro) {
        alert('Erro ao carregar templates');
    }
}

async function carregarTemplate() {
    const templateId = document.getElementById('templateSelect').value;
    if (!templateId) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Preencher formulário com dados do template
    document.getElementById('titulo').value = template.title_template;
    document.getElementById('mensagem').value = template.message_template;
    document.getElementById('categoria').value = template.category;
    document.getElementById('prioridade').value = template.priority;
    
    // Configurar expiração baseada no template
    if (template.expiration_type === 'never') {
        document.getElementById('validade').value = 'never';
    } else if (template.expiration_type === 'days') {
        document.getElementById('validade').value = template.default_expiration_days.toString();
    }
}

async function salvarComoTemplate() {
    const nome = prompt('Digite um nome para o template:');
    if (!nome) return;

    const titulo = document.getElementById('titulo').value;
    const mensagem = document.getElementById('mensagem').value;
    const categoria = document.getElementById('categoria').value;
    const prioridade = document.getElementById('prioridade').value;
    const validade = document.getElementById('validade').value;

    if (!titulo || !mensagem) {
        alert('Preencha título e mensagem antes de salvar como template.');
        return;
    }

    try {
        const configExpiracao = configurarExpiracao(validade, null);

        const { error } = await supabase
            .from('notification_templates')
            .insert({
                name: nome,
                title_template: titulo,
                message_template: mensagem,
                category: categoria,
                priority: prioridade,
                expiration_type: configExpiracao.expiration_type,
                default_expiration_days: configExpiracao.expiration_days
            });

        if (error) throw error;

        alert('✅ Template salvo com sucesso!');
        carregarTemplates();
        carregarTemplatesSelect();

    } catch (erro) {
        alert('❌ Erro ao salvar template: ' + (erro.message || 'Erro desconhecido'));
    }
}

function abrirCriarTemplate() {
    // Limpar formulário e mostrar seção de envio
    document.getElementById('formNotificacao').reset();
    showSection('enviar');
    
    // Focar no nome do template (será pedido quando salvar)
    document.getElementById('titulo').focus();
}

async function toggleTemplate(templateId, novoEstado) {
    try {
        const { error } = await supabase
            .from('notification_templates')
            .update({ is_active: novoEstado })
            .eq('id', templateId);

        if (error) throw error;

        alert(`✅ Template ${novoEstado ? 'ativado' : 'desativado'} com sucesso!`);
        carregarTemplates();
        carregarTemplatesSelect();

    } catch (erro) {
        alert('❌ Erro ao atualizar template: ' + (erro.message || 'Erro desconhecido'));
    }
}

async function excluirTemplate(templateId) {
    if (!confirm('Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('notification_templates')
            .delete()
            .eq('id', templateId);

        if (error) throw error;

        alert('✅ Template excluído com sucesso!');
        carregarTemplates();
        carregarTemplatesSelect();

    } catch (erro) {
        alert('❌ Erro ao excluir template: ' + (erro.message || 'Erro desconhecido'));
    }
}

// ==================== HISTÓRICO ====================
async function carregarHistorico() {
    if (!verificarAutenticacao()) return;
    
    const container = document.getElementById('historicoContainer');
    
    try {
        const { data, error } = await supabase
            .from('notification_batches')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        batches = data || [];

        if (batches.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">📊</div>
                    <h3>Nenhum envio realizado</h3>
                    <p>As notificações enviadas aparecerão aqui.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = batches.map(batch => `
            <div class="card">
                <div class="card-header">
                    <div class="card-title">${batch.title}</div>
                    <div class="badge ${batch.status === 'completed' ? 'badge-success' : 'badge-warning'}">
                        ${batch.status === 'completed' ? 'Concluído' : 'Enviando'}
                    </div>
                </div>
                
                <div class="card-meta">
                    <strong>Categoria:</strong> ${batch.category} | 
                    <strong>Destinatários:</strong> ${batch.target_type} |
                    <strong>Data:</strong> ${new Date(batch.created_at).toLocaleString('pt-BR')}
                </div>

                <div style="margin-bottom: 1rem;">
                    <strong>Mensagem:</strong> ${batch.message}
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem; margin-bottom: 1rem;">
                    <div style="text-align: center; padding: 0.5rem; background: var(--light-gray); border-radius: 6px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--primary);">${batch.total_recipients}</div>
                        <div style="font-size: 0.8rem; color: var(--gray);">Destinatários</div>
                    </div>
                    <div style="text-align: center; padding: 0.5rem; background: var(--light-gray); border-radius: 6px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--success);">${batch.total_sent || 0}</div>
                        <div style="font-size: 0.8rem; color: var(--gray);">Enviadas</div>
                    </div>
                    <div style="text-align: center; padding: 0.5rem; background: var(--light-gray); border-radius: 6px;">
                        <div style="font-size: 1.5rem; font-weight: bold; color: var(--info);">${batch.total_read || 0}</div>
                        <div style="font-size: 0.8rem; color: var(--gray);">Lidas</div>
                    </div>
                </div>

                <div class="card-meta">
                    <strong>Expiração:</strong> 
                    ${batch.expiration_type === 'never' ? 'Nunca' : 
                      batch.expiration_type === 'days' ? `${batch.expiration_days} dias` : 
                      `Data específica: ${new Date(batch.specific_expires_at).toLocaleDateString('pt-BR')}`}
                </div>
            </div>
        `).join('');

    } catch (erro) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar histórico</h3>
                <p>Tente novamente mais tarde.</p>
            </div>
        `;
    }
}