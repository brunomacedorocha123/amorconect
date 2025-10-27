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

// ==================== FUNÇÕES DE NAVEGAÇÃO ====================
function voltarParaAdmin() {
    window.location.href = 'admin.html';
}

function logoutAdmin() {
    sessionStorage.removeItem('adminAuthenticated');
    window.location.href = 'login-admin.html';
}

function irParaNotificacoes() {
    window.location.href = 'admin-notifica.html';
}

// ==================== FUNÇÕES PRINCIPAIS ====================
async function carregarEstatisticas() {
    if (!verificarAutenticacao()) return;
    
    try {
        const { count: totalDenuncias } = await supabase
            .from('user_reports')
            .select('*', { count: 'exact', head: true });

        const { count: denunciasPendentes } = await supabase
            .from('user_reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending');

        const { count: denunciasResolvidas } = await supabase
            .from('user_reports')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'resolved');

        const { count: totalUsuarios } = await supabase
            .from('profiles')
            .select('*', { count: 'exact', head: true });

        document.getElementById('totalDenuncias').textContent = totalDenuncias || 0;
        document.getElementById('pendentesDenuncias').textContent = denunciasPendentes || 0;
        document.getElementById('resolvidasDenuncias').textContent = denunciasResolvidas || 0;
        document.getElementById('totalUsuarios').textContent = totalUsuarios || 0;

        document.getElementById('lastUpdate').textContent = 
            `Última atualização: ${new Date().toLocaleString('pt-BR')}`;

    } catch (erro) {
        console.error('Erro ao carregar estatísticas:', erro);
        alert('Erro ao carregar estatísticas');
    }
}

async function carregarDenuncias() {
    if (!verificarAutenticacao()) return;
    
    const container = document.getElementById('denunciasContainer');
    
    try {
        const { data: denuncias, error } = await supabase
            .from('user_reports')
            .select(`
                *,
                reporter:reporter_id(nickname, avatar_url, id),
                reported:reported_user_id(nickname, avatar_url, id, email)
            `)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (!denuncias || denuncias.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">🎉</div>
                    <h3>Nenhuma denúncia pendente!</h3>
                    <p>Todas as denúncias foram resolvidas.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = denuncias.map(denuncia => `
            <div class="report-card">
                <div class="report-header">
                    <div class="report-users">
                        <strong>${denuncia.reporter?.nickname || 'Usuário'}</strong> 
                        denunciou 
                        <strong>${denuncia.reported?.nickname || 'Usuário'}</strong>
                    </div>
                    <div class="report-reason">${traduzirMotivo(denuncia.reason)}</div>
                </div>
                
                <div class="report-meta">
                    <small>Data: ${new Date(denuncia.created_at).toLocaleString('pt-BR')}</small>
                    ${denuncia.reported?.email ? `<br><small>Email: ${denuncia.reported.email}</small>` : ''}
                </div>

                ${denuncia.evidence ? `
                    <div class="report-evidence">
                        <strong>Motivo detalhado:</strong> "${denuncia.evidence}"
                    </div>
                ` : ''}

                <div class="report-actions">
                    <button class="btn btn-danger" onclick="tomarAcao('${denuncia.id}', '${denuncia.reported_user_id}', 'banir', '${denuncia.reported?.email || ''}')">
                        🚫 Banir Permanentemente
                    </button>
                    <button class="btn btn-warning" onclick="tomarAcao('${denuncia.id}', '${denuncia.reported_user_id}', 'advertir')">
                        ⚠️ Advertir
                    </button>
                    <button class="btn btn-success" onclick="tomarAcao('${denuncia.id}', null, 'resolver')">
                        ✅ Resolver
                    </button>
                </div>
            </div>
        `).join('');

    } catch (erro) {
        console.error('Erro ao carregar denúncias:', erro);
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar denúncias</h3>
                <p>Tente novamente mais tarde.</p>
                <button class="btn btn-primary" onclick="carregarTudo()" style="margin-top: 1rem;">
                    🔄 Tentar Novamente
                </button>
            </div>
        `;
    }
}

async function tomarAcao(idDenuncia, idUsuario, acao, emailUsuario = '') {
    if (!verificarAutenticacao()) return;
    
    const textoAcao = {
        'banir': 'BANIR PERMANENTEMENTE este usuário',
        'advertir': 'advertir este usuário', 
        'resolver': 'resolver esta denúncia'
    }[acao];
    
    if (acao === 'banir') {
        if (!confirm(`🚨🚨🚨 BANIMENTO PERMANENTE 🚨🚨🚨\n\nEsta ação é IRREVERSÍVEL!\n\n• Email será BLOQUEADO PARA SEMPRE\n• Usuário NUNCA poderá criar nova conta\n• Todos os dados serão removidos\n\nTem certeza absoluta?`)) {
            return;
        }
    } else {
        if (!confirm(`Tem certeza que deseja ${textoAcao}?`)) return;
    }

    try {
        if (acao === 'banir' && idUsuario) {
            await banirUsuario(idUsuario, emailUsuario, idDenuncia);
        } else if (acao === 'advertir' && idUsuario) {
            await advertirUsuario(idUsuario, idDenuncia);
        }
        
        const updateData = { 
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            action_taken: acao
        };

        const { error: reportError } = await supabase
            .from('user_reports')
            .update(updateData)
            .eq('id', idDenuncia);

        if (reportError) throw reportError;

        let mensagem = '';
        if (acao === 'banir') {
            mensagem = '🚫 USUÁRIO BANIDO PERMANENTEMENTE!\n\n• Email BLOQUEADO para sempre\n• Não pode criar nova conta\n• Dados removidos do sistema';
        } else if (acao === 'advertir') {
            mensagem = '⚠️ Advertência administrativa registrada!\n\nUsuário foi notificado sobre a violação.';
        } else {
            mensagem = '✅ Denúncia resolvida sem ações adicionais.';
        }
        
        alert(mensagem);
        carregarTudo();

    } catch (erro) {
        console.error('Erro ao processar ação:', erro);
        alert('Erro ao processar ação: ' + (erro.message || 'Erro desconhecido'));
    }
}

async function banirUsuario(userId, email, denunciaId) {
    try {
        let emailParaBanir = email;
        
        if (!emailParaBanir) {
            const { data: usuario, error: userError } = await supabase
                .from('profiles')
                .select('email')
                .eq('id', userId)
                .single();
                
            if (userError) throw new Error('Usuário não encontrado');
            emailParaBanir = usuario.email;
        }
        
        const motivoDenuncia = await obterMotivoDenuncia(denunciaId);
        const motivo = `BANIMENTO ADMIN: ${motivoDenuncia}`;
        
        const { error: banError } = await supabase
            .from('banned_emails')
            .insert({
                email: emailParaBanir,
                reason: motivo,
                permanent_ban: true,
                related_user_id: userId,
                banned_at: new Date().toISOString()
            });
            
        if (banError && banError.code !== '23505') {
            throw new Error('Erro ao banir email');
        }
        
        await limparDadosUsuario(userId);
        
    } catch (erro) {
        throw erro;
    }
}

async function obterMotivoDenuncia(denunciaId) {
    try {
        const { data: denuncia, error } = await supabase
            .from('user_reports')
            .select('reason, evidence')
            .eq('id', denunciaId)
            .single();
            
        if (error) throw error;
        return denuncia?.evidence || denuncia?.reason || 'Violação grave das regras';
    } catch (erro) {
        return 'Violação grave das regras';
    }
}

async function advertirUsuario(userId, denunciaId) {
    try {
        const motivo = await obterMotivoDenuncia(denunciaId);
        
        const { error: warnError } = await supabase
            .from('user_warnings')
            .insert({
                user_id: userId,
                reason: `⚠️ ADVERTÊNCIA ADMIN: ${motivo}`,
                severity: 'high',
                created_at: new Date().toISOString(),
                admin_notice: 'Próxima violação resultará em banimento permanente'
            });

        if (warnError) {
            await supabase
                .from('profiles')
                .update({
                    warning_count: 1,
                    last_warning_at: new Date().toISOString()
                })
                .eq('id', userId);
        }

    } catch (erro) {
        throw erro;
    }
}

async function limparDadosUsuario(userId) {
    try {
        const { error: profileError } = await supabase
            .from('profiles')
            .update({
                nickname: '[Usuário Banido]',
                full_name: 'Usuário Removido',
                bio: 'Esta conta foi removida permanentemente por violação grave das regras da comunidade.',
                avatar_url: null,
                banned: true,
                banned_at: new Date().toISOString(),
                banned_reason: 'Banimento administrativo permanente - Violação de regras',
                is_active: false,
                last_online_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (profileError) throw profileError;
        
    } catch (erro) {
        throw erro;
    }
}

function traduzirMotivo(motivo) {
    const motivos = {
        'spam': '📢 Spam',
        'inappropriate': '🔞 Conteúdo Inadequado',
        'harassment': '🚨 Assédio',
        'fake_profile': '👤 Perfil Falso', 
        'scam': '💸 Golpe/Fraude',
        'other': '❓ Outro'
    };
    return motivos[motivo] || motivo;
}

// ==================== SEÇÃO ESTATÍSTICAS ====================
async function carregarEstatisticasDetalhadas() {
    if (!verificarAutenticacao()) return;
    
    const container = document.getElementById('estatisticasContainer');
    
    try {
        const { data: denunciasPorMotivo } = await supabase
            .from('user_reports')
            .select('reason, status')
            .limit(1000);

        const { data: usuariosAtivos } = await supabase
            .from('profiles')
            .select('created_at, is_premium')
            .eq('is_active', true);

        const stats = {
            totalDenuncias: denunciasPorMotivo?.length || 0,
            denunciasPorMotivo: {},
            usuariosAtivos: usuariosAtivos?.length || 0,
            usuariosPremium: usuariosAtivos?.filter(u => u.is_premium)?.length || 0,
            usuariosUltimaSemana: usuariosAtivos?.filter(u => 
                new Date(u.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
            )?.length || 0
        };

        if (denunciasPorMotivo) {
            denunciasPorMotivo.forEach(denuncia => {
                stats.denunciasPorMotivo[denuncia.reason] = (stats.denunciasPorMotivo[denuncia.reason] || 0) + 1;
            });
        }

        let html = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem;">
                <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 10px;">
                    <h3 style="color: var(--primary); margin-bottom: 1rem;">📈 Estatísticas de Usuários</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                        <div style="display: flex; justify-content: space-between;">
                            <span>Usuários Ativos:</span>
                            <strong>${stats.usuariosAtivos}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Usuários Premium:</span>
                            <strong style="color: var(--success);">${stats.usuariosPremium}</strong>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span>Novos (7 dias):</span>
                            <strong style="color: var(--info);">${stats.usuariosUltimaSemana}</strong>
                        </div>
                    </div>
                </div>

                <div style="background: var(--light-gray); padding: 1.5rem; border-radius: 10px;">
                    <h3 style="color: var(--primary); margin-bottom: 1rem;">📊 Denúncias por Motivo</h3>
                    <div style="display: flex; flex-direction: column; gap: 0.8rem;">
        `;

        Object.entries(stats.denunciasPorMotivo).forEach(([motivo, quantidade]) => {
            html += `
                <div style="display: flex; justify-content: space-between;">
                    <span>${traduzirMotivo(motivo)}:</span>
                    <strong>${quantidade}</strong>
                </div>
            `;
        });

        html += `
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;

    } catch (erro) {
        console.error('Erro ao carregar estatísticas detalhadas:', erro);
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar estatísticas</h3>
                <p>Tente novamente mais tarde.</p>
            </div>
        `;
    }
}

// ==================== SEÇÃO USUÁRIOS ====================
async function carregarUsuarios() {
    if (!verificarAutenticacao()) return;
    
    const container = document.getElementById('usuariosContainer');
    
    try {
        const { data: usuarios, error } = await supabase
            .from('profiles')
            .select('id, nickname, email, created_at, is_premium, is_active, avatar_url')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        if (!usuarios || usuarios.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="icon">👥</div>
                    <h3>Nenhum usuário encontrado</h3>
                    <p>Não há usuários no sistema.</p>
                </div>
            `;
            return;
        }

        let html = `
            <div style="margin-bottom: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <button class="btn btn-primary" onclick="filtrarUsuarios('all')">
                    👥 Todos (${usuarios.length})
                </button>
                <button class="btn" onclick="filtrarUsuarios('premium')" style="background: var(--success); color: white;">
                    ⭐ Premium (${usuarios.filter(u => u.is_premium).length})
                </button>
                <button class="btn" onclick="filtrarUsuarios('free')" style="background: var(--info); color: white;">
                    🆓 Free (${usuarios.filter(u => !u.is_premium).length})
                </button>
            </div>
            <div id="listaUsuarios">
        `;

        usuarios.forEach(usuario => {
            const iniciais = usuario.nickname ? 
                usuario.nickname.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'U';
            
            html += `
                <div class="user-card" data-user-id="${usuario.id}" data-premium="${usuario.is_premium}">
                    <div class="user-header">
                        <div class="user-info">
                            <div class="user-avatar">
                                ${usuario.avatar_url ? 
                                    `<img src="${usuario.avatar_url}" alt="${usuario.nickname}" style="width: 100%; height: 100%; border-radius: 50%;">` : 
                                    iniciais
                                }
                            </div>
                            <div>
                                <h4>${usuario.nickname || 'Sem nome'}</h4>
                                <p style="color: var(--gray); font-size: 0.9rem;">${usuario.email}</p>
                                <p style="color: var(--gray); font-size: 0.8rem;">
                                    Cadastrado em: ${new Date(usuario.created_at).toLocaleDateString('pt-BR')}
                                    ${usuario.is_premium ? ' | ⭐ Premium' : ' | 🆓 Free'}
                                </p>
                            </div>
                        </div>
                        <div class="report-actions">
                            <button class="btn btn-warning" onclick="advertirUsuarioDireto('${usuario.id}')">
                                ⚠️ Advertir
                            </button>
                            <button class="btn btn-danger" onclick="banirUsuarioDireto('${usuario.id}', '${usuario.email}')">
                                🚫 Banir
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        html += '</div>';
        container.innerHTML = html;

    } catch (erro) {
        console.error('Erro ao carregar usuários:', erro);
        container.innerHTML = `
            <div class="empty-state">
                <div class="icon">❌</div>
                <h3>Erro ao carregar usuários</h3>
                <p>Tente novamente mais tarde.</p>
            </div>
        `;
    }
}

function filtrarUsuarios(filtro) {
    const usuarios = document.querySelectorAll('.user-card');
    
    usuarios.forEach(usuario => {
        switch(filtro) {
            case 'premium':
                usuario.style.display = usuario.dataset.premium === 'true' ? 'block' : 'none';
                break;
            case 'free':
                usuario.style.display = usuario.dataset.premium === 'false' ? 'block' : 'none';
                break;
            default:
                usuario.style.display = 'block';
        }
    });
}

async function advertirUsuarioDireto(userId) {
    const motivo = prompt('Digite o motivo da advertência:');
    if (!motivo) return;

    try {
        const { error } = await supabase
            .from('user_warnings')
            .insert({
                user_id: userId,
                reason: `⚠️ ADVERTÊNCIA ADMIN: ${motivo}`,
                severity: 'medium',
                created_at: new Date().toISOString()
            });

        if (error) throw error;

        alert('✅ Advertência enviada!');
    } catch (erro) {
        console.error('Erro ao advertir usuário:', erro);
        alert('Erro ao enviar advertência');
    }
}

async function banirUsuarioDireto(userId, email) {
    if (!confirm(`Banir permanentemente este usuário?\n\nEmail: ${email}\n\nEsta ação é IRREVERSÍVEL!`)) {
        return;
    }

    try {
        await banirUsuario(userId, email, 'banimento_direto');
        alert('✅ Usuário banido permanentemente!');
        carregarUsuarios();
    } catch (erro) {
        console.error('Erro ao banir usuário:', erro);
        alert('Erro ao banir usuário: ' + (erro.message || 'Erro desconhecido'));
    }
}

// ==================== FUNÇÕES GERAIS ====================
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
    document.getElementById(sectionName).classList.add('active');
    
    // Encontrar e ativar o botão correto
    const activeButton = document.querySelector(`.nav-btn[onclick*="${sectionName}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }

    // Carregar conteúdo da seção
    switch(sectionName) {
        case 'estatisticas':
            carregarEstatisticasDetalhadas();
            break;
        case 'usuarios':
            carregarUsuarios();
            break;
        case 'denuncias':
            carregarDenuncias();
            break;
    }
}

function carregarTudo() {
    carregarEstatisticas();
    carregarDenuncias();
}

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    if (!verificarAutenticacao()) return;
    
    carregarTudo();
    
    // Atualizar estatísticas a cada 30 segundos
    setInterval(() => {
        carregarEstatisticas();
    }, 30000);
});