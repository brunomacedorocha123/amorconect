// ==================== CONFIGURAÇÃO SUPABASE ====================
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== VARIÁVEIS GLOBAIS ====================
let templates = [];
let usuarios = [];

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    if (!verificarAutenticacao()) return;
    
    inicializarSistema();
});

function verificarAutenticacao() {
    if (sessionStorage.getItem('adminAuthenticated') !== 'true') {
        window.location.href = 'login-admin.html';
        return false;
    }
    return true;
}

async function inicializarSistema() {
    try {
        await configurarEventos();
        await carregarTemplates();
        await carregarUsuarios();
        
        console.log('✅ Sistema de notificações inicializado');
    } catch (error) {
        console.error('Erro na inicialização:', error);
        mostrarMensagem('❌ Erro ao carregar sistema', 'erro');
    }
}

function configurarEventos() {
    // Formulário principal
    document.getElementById('formNotificacao').addEventListener('submit', function(e) {
        e.preventDefault();
        enviarNotificacao();
    });

    // Campos condicionais
    document.getElementById('tipoUsuario').addEventListener('change', toggleCamposUsuarios);
    document.getElementById('validade').addEventListener('change', toggleDataExpiracao);

    // Botões
    document.querySelector('.btn-limpar').addEventListener('click', limparFormulario);
    document.querySelector('.btn-template').addEventListener('click', salvarComoTemplate);
}

// ==================== CARREGAR DADOS ====================
async function carregarTemplates() {
    try {
        const { data, error } = await supabase
            .from('notification_templates')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;
        
        templates = data || [];
        atualizarSelectTemplates();

    } catch (error) {
        console.error('Erro ao carregar templates:', error);
    }
}

async function carregarUsuarios() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, nickname, email, is_premium')
            .order('created_at', { ascending: false });

        if (error) throw error;
        
        usuarios = data || [];

    } catch (error) {
        console.error('Erro ao carregar usuários:', error);
    }
}

function atualizarSelectTemplates() {
    const select = document.getElementById('templateSelect');
    
    // Limpar options exceto o primeiro
    while (select.children.length > 1) {
        select.removeChild(select.lastChild);
    }

    // Adicionar templates
    templates.forEach(template => {
        const option = document.createElement('option');
        option.value = template.id;
        option.textContent = template.name;
        select.appendChild(option);
    });
}

// ==================== INTERFACE ====================
function toggleCamposUsuarios() {
    const tipo = document.getElementById('tipoUsuario').value;
    const especificoGroup = document.getElementById('usuariosEspecificosGroup');
    const selecionadosGroup = document.getElementById('usuariosSelecionadosGroup');
    
    especificoGroup.style.display = tipo === 'specific' ? 'block' : 'none';
    selecionadosGroup.style.display = tipo === 'selected' ? 'block' : 'none';
    
    if (tipo === 'selected') {
        renderizarListaUsuarios();
    }
}

function toggleDataExpiracao() {
    const validade = document.getElementById('validade').value;
    const dataGroup = document.getElementById('dataEspecificaGroup');
    dataGroup.style.display = validade === 'specific' ? 'block' : 'none';
}

function renderizarListaUsuarios() {
    const container = document.getElementById('listaUsuarios');
    
    if (usuarios.length === 0) {
        container.innerHTML = '<div class="empty-state">Nenhum usuário encontrado</div>';
        return;
    }

    container.innerHTML = usuarios.map(usuario => `
        <div class="usuario-item">
            <input type="checkbox" class="usuario-checkbox" value="${usuario.id}" id="user_${usuario.id}">
            <label for="user_${usuario.id}">
                <strong>${usuario.nickname || 'Sem nome'}</strong>
                <small>${usuario.email} • ${usuario.is_premium ? '⭐ Premium' : '🆓 Free'}</small>
            </label>
        </div>
    `).join('');
}

// ==================== ENVIO DE NOTIFICAÇÕES ====================
async function enviarNotificacao() {
    if (!verificarAutenticacao()) return;

    // Coletar dados do formulário
    const dados = coletarDadosFormulario();
    
    if (!validarDados(dados)) return;

    mostrarLoading(true);

    try {
        // 1. Buscar destinatários
        const destinatarios = await buscarDestinatarios(dados);
        if (destinatarios.length === 0) {
            mostrarMensagem('❌ Nenhum destinatário encontrado', 'erro');
            return;
        }

        // 2. Configurar expiração
        const expiracao = configurarExpiracao(dados.validade, dados.dataExpiracao);

        // 3. Criar lote de notificação
        const batchId = await criarBatchNotificacao(dados, destinatarios.length, expiracao);

        // 4. Enviar notificações individuais
        await enviarNotificacoesIndividuais(destinatarios, dados, expiracao, batchId);

        // 5. Atualizar batch
        await atualizarBatchCompleto(batchId, destinatarios.length);

        mostrarMensagem(`✅ Notificação enviada para ${destinatarios.length} usuários!`, 'sucesso');
        limparFormulario();

    } catch (error) {
        console.error('Erro ao enviar notificação:', error);
        mostrarMensagem('❌ Erro ao enviar notificação: ' + error.message, 'erro');
    } finally {
        mostrarLoading(false);
    }
}

function coletarDadosFormulario() {
    return {
        titulo: document.getElementById('titulo').value.trim(),
        mensagem: document.getElementById('mensagem').value.trim(),
        categoria: document.getElementById('categoria').value,
        prioridade: document.getElementById('prioridade').value,
        tipoUsuario: document.getElementById('tipoUsuario').value,
        usuariosEspecificos: document.getElementById('usuariosEspecificos').value,
        validade: document.getElementById('validade').value,
        dataExpiracao: document.getElementById('dataExpiracao').value
    };
}

function validarDados(dados) {
    if (!dados.titulo || !dados.mensagem) {
        mostrarMensagem('❌ Preencha título e mensagem', 'erro');
        return false;
    }

    if (dados.tipoUsuario === 'specific' && !dados.usuariosEspecificos) {
        mostrarMensagem('❌ Informe os IDs dos usuários específicos', 'erro');
        return false;
    }

    if (dados.tipoUsuario === 'selected') {
        const selecionados = document.querySelectorAll('.usuario-checkbox:checked');
        if (selecionados.length === 0) {
            mostrarMensagem('❌ Selecione pelo menos um usuário', 'erro');
            return false;
        }
    }

    return true;
}

async function buscarDestinatarios(dados) {
    let query = supabase.from('profiles').select('id');

    switch (dados.tipoUsuario) {
        case 'free':
            query = query.eq('is_premium', false);
            break;
        case 'premium':
            query = query.eq('is_premium', true);
            break;
        case 'specific':
            const ids = dados.usuariosEspecificos.split(',').map(id => id.trim()).filter(id => id);
            query = query.in('id', ids);
            break;
        case 'selected':
            const selecionados = Array.from(document.querySelectorAll('.usuario-checkbox:checked')).map(cb => cb.value);
            query = query.in('id', selecionados);
            break;
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
}

function configurarExpiracao(validade, dataExpiracao) {
    if (validade === 'specific' && dataExpiracao) {
        return {
            type: 'specific_date',
            expires_at: dataExpiracao
        };
    } else if (validade === 'never') {
        return {
            type: 'never',
            expires_at: '9999-12-31T23:59:59Z'
        };
    } else {
        const days = parseInt(validade);
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        return {
            type: 'days',
            expires_at: expiresAt.toISOString()
        };
    }
}

async function criarBatchNotificacao(dados, totalDestinatarios, expiracao) {
    const batchData = {
        title: dados.titulo,
        message: dados.mensagem,
        category: dados.categoria,
        priority: dados.prioridade,
        target_type: dados.tipoUsuario,
        total_recipients: totalDestinatarios,
        expiration_type: expiracao.type,
        status: 'sending'
    };

    if (expiracao.type === 'days') {
        batchData.expiration_days = parseInt(dados.validade);
    } else if (expiracao.type === 'specific_date') {
        batchData.specific_expires_at = expiracao.expires_at;
    }

    const { data, error } = await supabase
        .from('notification_batches')
        .insert(batchData)
        .select()
        .single();

    if (error) throw error;
    return data.id;
}

async function enviarNotificacoesIndividuais(destinatarios, dados, expiracao, batchId) {
    const notificacoes = destinatarios.map(usuario => ({
        user_id: usuario.id,
        title: dados.titulo,
        message: dados.mensagem,
        category: dados.categoria,
        priority: dados.prioridade,
        batch_id: batchId,
        expires_at: expiracao.expires_at,
        expiration_type: expiracao.type
    }));

    // Enviar em lotes para melhor performance
    const batchSize = 50;
    for (let i = 0; i < notificacoes.length; i += batchSize) {
        const batch = notificacoes.slice(i, i + batchSize);
        const { error } = await supabase
            .from('user_notifications')
            .insert(batch);

        if (error) throw error;
    }
}

async function atualizarBatchCompleto(batchId, totalEnviadas) {
    const { error } = await supabase
        .from('notification_batches')
        .update({
            status: 'completed',
            total_sent: totalEnviadas
        })
        .eq('id', batchId);

    if (error) throw error;
}

// ==================== TEMPLATES ====================
function carregarTemplate() {
    const templateId = document.getElementById('templateSelect').value;
    if (!templateId) return;

    const template = templates.find(t => t.id === templateId);
    if (!template) return;

    // Preencher formulário com template
    document.getElementById('titulo').value = template.title_template;
    document.getElementById('mensagem').value = template.message_template;
    document.getElementById('categoria').value = template.category;
    document.getElementById('prioridade').value = template.priority;

    if (template.expiration_type === 'never') {
        document.getElementById('validade').value = 'never';
    } else if (template.expiration_type === 'days') {
        document.getElementById('validade').value = template.default_expiration_days.toString();
    }

    toggleDataExpiracao();
}

async function salvarComoTemplate() {
    const dados = coletarDadosFormulario();
    
    if (!dados.titulo || !dados.mensagem) {
        mostrarMensagem('❌ Preencha título e mensagem antes de salvar', 'erro');
        return;
    }

    const nome = prompt('Digite um nome para o template:');
    if (!nome) return;

    try {
        const expiracao = configurarExpiracao(dados.validade, dados.dataExpiracao);
        
        const { error } = await supabase
            .from('notification_templates')
            .insert({
                name: nome,
                title_template: dados.titulo,
                message_template: dados.mensagem,
                category: dados.categoria,
                priority: dados.prioridade,
                expiration_type: expiracao.type,
                default_expiration_days: expiracao.type === 'days' ? parseInt(dados.validade) : null
            });

        if (error) throw error;

        mostrarMensagem('✅ Template salvo com sucesso!', 'sucesso');
        await carregarTemplates();

    } catch (error) {
        console.error('Erro ao salvar template:', error);
        mostrarMensagem('❌ Erro ao salvar template', 'erro');
    }
}

// ==================== UTILITÁRIOS ====================
function mostrarLoading(mostrar) {
    // Implementar visual de loading se necessário
}

function mostrarMensagem(mensagem, tipo) {
    alert(mensagem); // Pode ser substituído por um sistema de notificação visual
}

function limparFormulario() {
    document.getElementById('formNotificacao').reset();
    document.getElementById('usuariosEspecificosGroup').style.display = 'none';
    document.getElementById('usuariosSelecionadosGroup').style.display = 'none';
    document.getElementById('dataEspecificaGroup').style.display = 'none';
    mostrarMensagem('Formulário limpo', 'info');
}

// ==================== EXPORTAÇÕES ====================
window.mostrarSecao = function(secao) {
    document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
    document.getElementById(secao).classList.add('active');
};