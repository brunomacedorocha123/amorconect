// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// QUANDO A PÁGINA CARREGAR
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Página carregada!');
    
    // Verificar se está autenticado
    if (sessionStorage.getItem('adminAuthenticated') !== 'true') {
        alert('⚠️ Faça login como admin primeiro!');
        window.location.href = 'login-admin.html';
        return;
    }

    // Configurar eventos
    document.getElementById('tipoUsuario').addEventListener('change', function() {
        const usuarioEspecificoGroup = document.getElementById('usuarioEspecificoGroup');
        usuarioEspecificoGroup.classList.toggle('hidden', this.value !== 'specific');
    });

    document.getElementById('formNotificacao').addEventListener('submit', enviarNotificacao);
});

// FUNÇÃO PRINCIPAL - ENVIAR NOTIFICAÇÃO
async function enviarNotificacao(event) {
    if (event) event.preventDefault();
    
    console.log('🎯 Iniciando envio de notificação...');
    
    // Pegar dados do formulário
    const categoria = document.getElementById('categoria').value;
    const tipoUsuario = document.getElementById('tipoUsuario').value;
    const usuarioEspecifico = document.getElementById('usuarioEspecifico').value;
    const titulo = document.getElementById('titulo').value.trim();
    const mensagem = document.getElementById('mensagem').value.trim();
    const validade = document.getElementById('validade').value;

    // Validar
    if (!titulo || !mensagem) {
        mostrarErro('❌ Preencha título e mensagem!');
        return;
    }

    if (tipoUsuario === 'specific' && !usuarioEspecifico) {
        mostrarErro('❌ Digite o ID do usuário específico!');
        return;
    }

    // Mostrar loading
    mostrarLoading();

    try {
        console.log('📦 Buscando destinatários...');
        
        // 1. BUSCAR DESTINATÁRIOS
        const destinatarios = await buscarDestinatarios(tipoUsuario, usuarioEspecifico);
        
        if (destinatarios.length === 0) {
            mostrarErro('❌ Nenhum usuário encontrado!');
            return;
        }

        console.log(`👥 ${destinatarios.length} destinatários encontrados`);

        // 2. CRIAR NOTIFICAÇÃO NO BANCO
        const batchId = await criarNotificacaoBanco({
            titulo,
            mensagem,
            categoria,
            tipoUsuario,
            totalDestinatarios: destinatarios.length
        });

        console.log('📝 Notificação criada no banco:', batchId);

        // 3. ENVIAR PARA CADA USUÁRIO
        await enviarParaUsuarios(destinatarios, titulo, mensagem, categoria, batchId, validade);

        // 4. SUCESSO!
        mostrarSucesso(`✅ Notificação enviada para ${destinatarios.length} usuários!`);
        limparFormulario();

        console.log('🎉 Notificação enviada com sucesso!');

    } catch (erro) {
        console.error('💥 ERRO:', erro);
        mostrarErro('❌ Erro ao enviar: ' + (erro.message || 'Tente novamente'));
    }
}

// BUSCAR DESTINATÁRIOS
async function buscarDestinatarios(tipoUsuario, usuarioEspecifico) {
    let query = supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

    // Filtrar por tipo de usuário
    switch (tipoUsuario) {
        case 'free':
            query = query.eq('is_premium', false);
            break;
        case 'premium':
            query = query.eq('is_premium', true);
            break;
        case 'specific':
            if (usuarioEspecifico) {
                query = query.eq('id', usuarioEspecifico);
            }
            break;
        // 'all' não precisa de filtro
    }

    const { data, error } = await query;

    if (error) {
        console.error('Erro ao buscar destinatários:', error);
        throw new Error('Erro ao buscar usuários');
    }

    return data || [];
}

// CRIAR NOTIFICAÇÃO NO BANCO
async function criarNotificacaoBanco(dados) {
    const { data, error } = await supabase
        .from('notification_batches')
        .insert({
            title: dados.titulo,
            message: dados.mensagem,
            category: dados.categoria,
            target_type: dados.tipoUsuario,
            total_recipients: dados.totalDestinatarios,
            total_sent: dados.totalDestinatarios,
            status: 'completed'
        })
        .select()
        .single();

    if (error) {
        console.error('Erro ao criar notificação:', error);
        throw new Error('Erro ao salvar notificação');
    }

    return data.id;
}

// ENVIAR PARA USUÁRIOS INDIVIDUAIS
async function enviarParaUsuarios(destinatarios, titulo, mensagem, categoria, batchId, validade) {
    // Calcular data de expiração
    const expiresAt = calcularExpiracao(validade);

    // Criar array de notificações
    const notificacoes = destinatarios.map(usuario => ({
        user_id: usuario.id,
        title: titulo,
        message: mensagem,
        category: categoria,
        batch_id: batchId,
        expires_at: expiresAt
    }));

    console.log(`📤 Enviando ${notificacoes.length} notificações...`);

    // Inserir no banco (em lotes se for muitos)
    const batchSize = 50;
    for (let i = 0; i < notificacoes.length; i += batchSize) {
        const batch = notificacoes.slice(i, i + batchSize);
        const { error } = await supabase
            .from('user_notifications')
            .insert(batch);

        if (error) {
            console.error('Erro ao enviar notificações:', error);
            throw new Error('Erro ao enviar para usuários');
        }
    }

    console.log('✅ Todas as notificações salvas!');
}

// CALCULAR DATA DE EXPIRAÇÃO
function calcularExpiracao(validade) {
    if (validade === 'never') {
        return '9999-12-31 23:59:59';
    }
    
    const days = parseInt(validade);
    const data = new Date();
    data.setDate(data.getDate() + days);
    return data.toISOString();
}

// FUNÇÕES DE INTERFACE
function mostrarLoading() {
    document.getElementById('mensagemSucesso').classList.add('hidden');
    document.getElementById('mensagemErro').classList.add('hidden');
}

function mostrarSucesso(mensagem) {
    const elemento = document.getElementById('mensagemSucesso');
    elemento.textContent = mensagem;
    elemento.classList.remove('hidden');
    document.getElementById('mensagemErro').classList.add('hidden');
}

function mostrarErro(mensagem) {
    const elemento = document.getElementById('mensagemErro');
    elemento.textContent = mensagem;
    elemento.classList.remove('hidden');
    document.getElementById('mensagemSucesso').classList.add('hidden');
}

function limparFormulario() {
    document.getElementById('formNotificacao').reset();
    document.getElementById('usuarioEspecificoGroup').classList.add('hidden');
    document.getElementById('mensagemSucesso').classList.add('hidden');
    document.getElementById('mensagemErro').classList.add('hidden');
    console.log('🧹 Formulário limpo!');
}

// TESTE RÁPIDO DA CONEXÃO
async function testarConexao() {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('count')
            .limit(1);

        if (error) throw error;
        console.log('✅ Conexão com Supabase OK!');
    } catch (erro) {
        console.error('❌ Erro na conexão:', erro);
    }
}

// Testar conexão quando carregar
setTimeout(testarConexao, 1000);