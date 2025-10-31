// 📋 CLASSE COMPLETA - EXCLUSÃO SEGURA DA CONTA
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
            'ESTA AÇÃO É IRREVERSÍVEL!\n\n' +
            '✅ O que será excluído:\n' +
            '• Sua conta de login (NUNCA mais vai conseguir acessar)\n' +  
            '• Todos os seus dados pessoais\n' +
            '• Mensagens, fotos, histórico\n' +
            '• Assinaturas e pagamentos\n\n' +
            '⚠️  VOCÊ SERÁ DESCONECTADO IMEDIATAMENTE!\n\n' +
            'CONFIRMA A EXCLUSÃO TOTAL?'
        );

        if (userConfirmed) {
            this.executeDeletion();
        }
    }

    async executeDeletion() {
        if (this.isDeleting) return;
        
        this.isDeleting = true;
        
        // Mostrar loading
        const originalText = document.getElementById('deleteAccountBtn').textContent;
        document.getElementById('deleteAccountBtn').textContent = 'EXCLUINDO...';
        document.getElementById('deleteAccountBtn').disabled = true;

        try {
            // 1. Pegar usuário atual
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            // 2. ESTRATÉGIA SEGURA: Excluir auth via API segura
            await this.deleteUserAuthSecure(user.id);

            // 3. Limpeza final local
            await this.supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            
            // 4. Feedback e redirecionamento
            alert('✅ CONTA EXCLUÍDA PERMANENTEMENTE!\n\nVocê será redirecionado...');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);

        } catch (error) {
            console.error('Erro na exclusão:', error);
            alert('❌ ERRO: ' + error.message);
            
            // Restaurar botão
            document.getElementById('deleteAccountBtn').textContent = originalText;
            document.getElementById('deleteAccountBtn').disabled = false;
            
        } finally {
            this.isDeleting = false;
        }
    }

    // 🔐 MÉTODO SEGURO PARA EXCLUIR AUTH (SEM EXPOR CHAVES)
    async deleteUserAuthSecure(userId) {
        try {
            // Estratégia 1: Chamar RPC que exclui TUDO (incluindo auth)
            const { data, error } = await this.supabase.rpc('delete_user_complete', {
                user_id: userId
            });

            if (error) throw error;

            return { success: true };

        } catch (error) {
            console.error('Erro método seguro:', error);
            throw new Error('Não foi possível excluir a conta. Tente novamente.');
        }
    }
}

// Inicializar automaticamente
document.addEventListener('DOMContentLoaded', () => {
    new AccountDeleter();
});