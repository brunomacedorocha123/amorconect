class AccountDeleter {
    constructor() {
        this.isDeleting = false;
        this.supabase = window.supabase;
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const deleteBtn = document.getElementById('deleteAccountBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showConfirmation();
            });
        }
    }

    showConfirmation() {
        if (this.isDeleting) return;

        const userConfirmed = confirm(
            '🚨 EXCLUSÃO DEFINITIVA DA CONTA 🚨\n\n' +
            'ESTA AÇÃO NÃO PODE SER DESFEITA!\n\n' +
            'Todos os seus dados serão apagados:\n' +
            '• Perfil e fotos\n' +
            '• Mensagens e matches\n' +
            '• Histórico de atividades\n' +
            '• Acesso à plataforma\n\n' +
            'VOCÊ NUNCA MAIS VAI CONSEGUIR LOGAR!\n\n' +
            'TEM CERTEZA ABSOLUTA?'
        );

        if (userConfirmed) {
            this.requestPasswordConfirmation();
        }
    }

    requestPasswordConfirmation() {
        const password = prompt('Por segurança, digite sua senha atual:');
        if (password && password.trim() !== '') {
            this.executeDeletion(password.trim());
        } else {
            alert('Senha é obrigatória para excluir a conta.');
        }
    }

    async executeDeletion(password) {
        if (this.isDeleting) return;
        
        this.isDeleting = true;
        
        const deleteBtn = document.getElementById('deleteAccountBtn');
        const originalText = deleteBtn.textContent;
        deleteBtn.textContent = 'EXCLUINDO CONTA...';
        deleteBtn.disabled = true;

        try {
            // OBTER USUÁRIO ATUAL
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            // CONFIRMAR SENHA
            const { error: signInError } = await this.supabase.auth.signInWithPassword({
                email: user.email,
                password: password
            });

            if (signInError) {
                throw new Error('Senha incorreta. Não foi possível confirmar sua identidade.');
            }

            // EXCLUIR TODOS OS DADOS DO BANCO
            const { data: deleteData, error: deleteError } = await this.supabase.rpc('delete_user_account');

            if (deleteError) {
                throw new Error('Erro ao excluir dados do perfil: ' + deleteError.message);
            }

            if (!deleteData || !deleteData.success) {
                throw new Error('Falha ao excluir dados: ' + (deleteData?.message || 'Erro desconhecido'));
            }

            // ESTRATÉGIA PARA IMPEDIR LOGIN FUTURO - DEFINITIVO
            const randomString = Math.random().toString(36).slice(2) + Date.now().toString(36);
            
            // 1. ALTERAR EMAIL - IMPOSSIBILITA LOGIN COM EMAIL ORIGINAL
            await this.supabase.auth.updateUser({
                email: `deleted_account_${randomString}@deleted.permanent`
            });

            // 2. ALTERAR SENHA - IMPOSSIBILITA ACESSO
            await this.supabase.auth.updateUser({
                password: `deleted_${randomString}_permanent_lock`
            });

            // 3. LIMPEZA TOTAL
            await this.supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            
            // 4. CONFIRMAÇÃO E REDIRECIONAMENTO
            alert('✅ CONTA EXCLUÍDA COM SUCESSO!\n\nTodos os seus dados foram removidos permanentemente.');
            window.location.href = '/index.html';

        } catch (error) {
            console.error('Erro na exclusão:', error);
            alert('❌ ERRO: ' + error.message);
            
            // FAZER LOGOUT MESMO COM ERRO
            try {
                await this.supabase.auth.signOut();
            } catch (e) {
                console.log('Logout automático');
            }
        } finally {
            this.isDeleting = false;
            // RESTAURAR BOTÃO
            if (deleteBtn) {
                deleteBtn.textContent = originalText;
                deleteBtn.disabled = false;
            }
        }
    }
}

// INICIALIZAÇÃO AUTOMÁTICA
document.addEventListener('DOMContentLoaded', () => {
    new AccountDeleter();
    console.log('Sistema de exclusão de conta carregado');
});