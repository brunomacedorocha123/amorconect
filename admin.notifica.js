// CONFIGURAÇÃO SUPABASE
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// QUANDO A PÁGINA CARREGAR
document.addEventListener('DOMContentLoaded', function() {
    if (sessionStorage.getItem('adminAuthenticated') !== 'true') {
        alert('⚠️ Faça login como admin primeiro!');
        window.location.href = 'login-admin.html';
        return;
    }

    document.getElementById('tipoUsuario').addEventListener('change', function() {
        const usuarioEspecificoGroup = document.getElementById('usuarioEspecificoGroup');
        usuarioEspecificoGroup.classList.toggle('hidden', this.value !== 'specific');
    });

    document.getElementById('formNotificacao').addEventListener('submit', function(e) {
        e.preventDefault();
        enviarNotificacao();
    });
});

// ENVIAR NOTIFICAÇÃO
async function enviarNotificacao() {
    const categoria = document.getElementById('categoria').value;
    const tipoUsuario = document.getElementById('tipoUsuario').value;
    const usuarioEspecifico = document.getElementById('usuarioEspecifico').value;
    const titulo = document.getElementById('titulo').value.trim();
    const mensagem = document.getElementById('mensagem').value.trim();
    const validade = document.getElementById('validade').value;

    if (!titulo || !mensagem) {
        mostrarErro('❌ Preencha título e mensagem!');
        return;
    }

    if (tipoUsuario === 'specific' && !usuarioEspecifico) {
        mostrarErro('❌ Digite o ID do usuário específico!');
        return;
    }

    mostrarLoading();

    try {
        const destinatarios = await buscarDestinatarios(tipoUsuario, usuarioEspecifico);
        
        if (destinatarios.length === 0) {
            mostrarErro('❌ Nenhum usuário encontrado!');
            return;
        }

        const batchId = await criarNotificacaoBanco({
            titulo,
            mensagem,
            categoria,
            tipoUsuario,
            totalDestinatarios: destinatarios.length
        });

        await enviarParaUsuarios(destinatarios, titulo, mensagem, categoria, batchId, validade);

        mostrarSucesso(`✅ Notificação enviada para ${destinatarios.length} usuários!`);
        limparFormulario();

    } catch (erro) {
        mostrarErro('❌ Erro ao enviar notificação');
    }
}

// BUSCAR DESTINATÁRIOS
async function buscarDestinatarios(tipoUsuario, usuarioEspecifico) {
    let query = supabase
        .from('profiles')
        .select('id')
        .eq('is_active', true);

    switch (tipoUsuario) {
        case 'free':
            query = query.eq('is_premium', false);
            break;
        case 'premium':
            query = query.eq('is_premium', true);
            break;
        case 'specific':
            query = query.eq('id', usuarioEspecifico);
            break;
    }

    const { data, error } = await query;
    if (error) throw error;
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

    if (error) throw error;
    return data.id;
}

// ENVIAR PARA USUÁRIOS
async function enviarParaUsuarios(destinatarios, titulo, mensagem, categoria, batchId, validade) {
    const expiresAt = calcularExpiracao(validade);
    
    const notificacoes = destinatarios.map(usuario => ({
        user_id: usuario.id,
        title: titulo,
        message: mensagem,
        category: categoria,
        batch_id: batchId,
        expires_at: expiresAt
    }));

    const { error } = await supabase
        .from('user_notifications')
        .insert(notificacoes);

    if (error) throw error;
}

// CALCULAR EXPIRAÇÃO
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
}