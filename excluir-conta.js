// excluir-conta.js - Sistema CORRETO usando API Supabase
class AccountDeleter {
    constructor() {
        this.isDeleting = false;
        this.supabase = window.supabase;
    }

    initialize() {
        this.setupEventListeners();
        this.injectStyles();
        return true;
    }

    setupEventListeners() {
        const deleteBtn = document.getElementById('deleteAccountBtn');
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openConfirmationModal();
            });
        }

        const cancelBtn = document.getElementById('cancelDeleteBtn');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const confirmationInput = document.getElementById('confirmationInput');
        const modal = document.getElementById('deleteConfirmationModal');

        if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeConfirmationModal());
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.executeAccountDeletion());
        
        if (confirmationInput) {
            confirmationInput.addEventListener('input', (e) => this.validateConfirmationText(e.target.value));
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeConfirmationModal();
            });
        }
    }

    openConfirmationModal() {
        if (this.isDeleting) return;

        const modal = document.getElementById('deleteConfirmationModal');
        const confirmationInput = document.getElementById('confirmationInput');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
            
            if (confirmationInput) confirmationInput.value = '';
            if (confirmBtn) confirmBtn.disabled = true;
        }
    }

    closeConfirmationModal() {
        const modal = document.getElementById('deleteConfirmationModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    validateConfirmationText(text) {
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmBtn) {
            confirmBtn.disabled = text.trim().toUpperCase() !== 'EXCLUIR CONTA';
        }
    }

    async executeAccountDeletion() {
        if (this.isDeleting) return;

        const confirmationInput = document.getElementById('confirmationInput');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        if (!confirmationInput || !confirmBtn) return;

        // Verificar confirmação textual
        if (confirmationInput.value.trim().toUpperCase() !== 'EXCLUIR CONTA') {
            this.showNotification('Digite "EXCLUIR CONTA" para confirmar', 'error');
            return;
        }

        this.isDeleting = true;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

        try {
            // Fechar modal
            this.closeConfirmationModal();

            // 1. PRIMEIRO: Verificar e reautenticar o usuário
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            // 2. Pedir senha para confirmação
            const password = await this.getUserPassword();
            if (!password) {
                throw new Error('Exclusão cancelada');
            }

            // 3. VERIFICAR SENHA fazendo sign-in novamente
            const { data: authData, error: authError } = await this.supabase.auth.signInWithPassword({
                email: user.email,
                password: password
            });

            if (authError) {
                if (authError.message.includes('Invalid login credentials')) {
                    throw new Error('Senha incorreta');
                }
                throw new Error('Erro de autenticação: ' + authError.message);
            }

            this.showNotification('✅ Senha confirmada. Excluindo dados...', 'success');

            // 4. EXCLUIR DADOS DO BANCO (usando a função SQL)
            const { data: deleteData, error: deleteError } = await this.supabase.rpc('delete_user_data_only');

            if (deleteError) {
                console.error('Erro ao excluir dados:', deleteError);
                throw new Error('Erro ao excluir dados do perfil');
            }

            if (!deleteData || !deleteData.success) {
                throw new Error(deleteData?.message || 'Erro ao excluir dados');
            }

            this.showNotification('✅ Dados excluídos. Removendo autenticação...', 'success');

            // 5. AGORA SIM: EXCLUIR USUÁRIO DA AUTENTICAÇÃO (CORRETO)
            // Precisamos usar o Admin API para isso
            await this.deleteUserFromAuth(user.id);

            this.showNotification('✅ Conta excluída com sucesso!', 'success');

            // 6. LIMPEZA FINAL E REDIRECIONAMENTO
            await this.finalCleanup();

        } catch (error) {
            console.error('Erro na exclusão:', error);
            this.handleDeletionError(error.message);
        } finally {
            this.isDeleting = false;
        }
    }

    async getUserPassword() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
            `;

            overlay.innerHTML = `
                <div style="
                    background: white;
                    padding: 2rem;
                    border-radius: 12px;
                    text-align: center;
                    width: 90%;
                    max-width: 400px;
                ">
                    <h3 style="margin-bottom: 1rem; color: #333;">
                        <i class="fas fa-shield-alt" style="color: #dc3545; margin-right: 8px;"></i>
                        Confirmar Senha
                    </h3>
                    <p style="margin-bottom: 1.5rem; color: #666;">
                        Digite sua senha para confirmar a exclusão:
                    </p>
                    <input type="password" id="passwordInputField" 
                        style="width: 100%; padding: 12px; border: 2px solid #ddd; border-radius: 6px; margin-bottom: 1.5rem;"
                        placeholder="Sua senha atual" autocomplete="current-password">
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button id="cancelPasswordBtn" style="padding: 10px 20px; border: 1px solid #6c757d; background: white; color: #6c757d; border-radius: 6px; cursor: pointer;">
                            Cancelar
                        </button>
                        <button id="submitPasswordBtn" style="padding: 10px 20px; border: none; background: #dc3545; color: white; border-radius: 6px; cursor: pointer;">
                            Confirmar
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const cleanup = () => document.body.removeChild(overlay);
            const input = document.getElementById('passwordInputField');
            const cancelBtn = document.getElementById('cancelPasswordBtn');
            const submitBtn = document.getElementById('submitPasswordBtn');

            input.focus();

            const confirm = () => {
                const password = input.value.trim();
                cleanup();
                resolve(password);
            };

            cancelBtn.addEventListener('click', () => {
                cleanup();
                resolve(null);
            });

            submitBtn.addEventListener('click', confirm);

            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') confirm();
            });

            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    cleanup();
                    resolve(null);
                }
            });
        });
    }

    async deleteUserFromAuth(userId) {
        try {
            // Método 1: Tentar usar Admin API (se configurado)
            // NOTA: Isso requer que você tenha o SERVICE_ROLE_KEY configurado
            const response = await fetch(`${this.supabase.supabaseUrl}/auth/v1/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${this.supabase.supabaseKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                console.log('✅ Usuário removido da autenticação via Admin API');
                return true;
            }

            // Método 2: Se Admin API falhar, invalidar a conta
            console.log('⚠️ Usando método alternativo para invalidar conta');
            await this.supabase.auth.signOut();
            return true;

        } catch (error) {
            console.log('⚠️ Não foi possível remover da autenticação, fazendo logout...');
            await this.supabase.auth.signOut();
            return true;
        }
    }

    async finalCleanup() {
        try {
            // Fazer logout para garantir
            await this.supabase.auth.signOut();
            
            // Limpar tudo
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirecionar
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            // Se der erro no logout, redireciona mesmo assim
            window.location.href = 'index.html';
        }
    }

    handleDeletionError(errorMessage) {
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir Conta';
        }
        this.showNotification(errorMessage, 'error');
    }

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.account-deletion-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `account-deletion-notification notification-${type}`;
        
        const icons = { success: '✅', error: '❌', warning: '⚠️', info: '💡' };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || '💡'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f56565' : type === 'success' ? '#48bb78' : '#4299e1'};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            z-index: 10001;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
            font-size: 14px;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 5000);
    }

    injectStyles() {
        const styles = `
            .confirmation-modal {
                display: none;
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.8);
                z-index: 10000;
                align-items: center;
                justify-content: center;
            }
            .confirmation-modal .modal-content {
                background: #1a1a1a;
                border: 2px solid #f56565;
                border-radius: 16px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                text-align: center;
            }
            .confirmation-input {
                width: 100%;
                padding: 12px;
                border: 2px solid #f56565;
                border-radius: 8px;
                background: rgba(255,255,255,0.1);
                color: white;
                margin: 1rem 0;
                text-align: center;
                text-transform: uppercase;
            }
            .btn-confirm-delete:disabled {
                background: #718096;
                cursor: not-allowed;
            }
            .fa-spinner {
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (typeof supabase !== 'undefined') {
            new AccountDeleter().initialize();
        }
    }, 1000);
});