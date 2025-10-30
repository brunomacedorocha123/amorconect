// excluir-conta.js - Exclusão COMPLETA da Conta (Auth + Dados)
class AccountDeleter {
    constructor() {
        this.isDeleting = false;
        this.supabase = window.supabase;
    }

    initialize() {
        this.setupEventListeners();
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
            
            if (confirmationInput) {
                confirmationInput.value = '';
                setTimeout(() => confirmationInput.focus(), 300);
            }
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

        if (confirmationInput.value.trim().toUpperCase() !== 'EXCLUIR CONTA') {
            this.showNotification('Digite "EXCLUIR CONTA" para confirmar', 'error');
            return;
        }

        this.isDeleting = true;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

        try {
            this.closeConfirmationModal();

            // 1. Verificar usuário autenticado
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            // 2. Confirmar com senha
            const password = await this.getUserPassword();
            if (!password) {
                throw new Error('Exclusão cancelada');
            }

            // 3. Reautenticar
            this.showNotification('Verificando senha...', 'info');
            
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

            this.showNotification('Senha confirmada. Excluindo dados...', 'success');

            // 4. PRIMEIRO: Excluir dados do banco
            const { data: deleteData, error: deleteError } = await this.supabase.rpc('delete_user_account');

            if (deleteError) {
                throw new Error('Erro ao excluir dados: ' + deleteError.message);
            }

            if (!deleteData || !deleteData.success) {
                throw new Error(deleteData?.message || 'Erro ao excluir dados');
            }

            this.showNotification('Dados excluídos. Removendo autenticação...', 'success');

            // 5. AGORA: Excluir usuário do Auth
            const authDeleted = await this.deleteUserFromAuth(user.id);

            if (authDeleted) {
                this.showNotification('Conta excluída COMPLETAMENTE!', 'success');
                await this.finalCleanup();
            } else {
                throw new Error('Conta parcialmente excluída. Contate o suporte para remoção completa.');
            }

        } catch (error) {
            this.handleDeletionError(error.message);
        } finally {
            this.isDeleting = false;
        }
    }

    async deleteUserFromAuth(userId) {
        try {
            // Usar a service key que você já configurou no HTML
            if (!window.SUPABASE_SERVICE_KEY) {
                throw new Error('Chave de serviço não configurada');
            }

            const response = await fetch(`${this.supabase.supabaseUrl}/auth/v1/admin/users/${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.SUPABASE_SERVICE_KEY}`,
                    'Content-Type': 'application/json',
                    'API-Key': window.SUPABASE_SERVICE_KEY
                }
            });

            if (response.ok) {
                return true;
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Erro ao remover do Auth');
            }

        } catch (error) {
            console.error('Erro ao excluir do Auth:', error);
            throw error;
        }
    }

    async getUserPassword() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                backdrop-filter: blur(5px);
            `;

            overlay.innerHTML = `
                <div style="
                    background: var(--card-bg);
                    padding: 2.5rem;
                    border-radius: 16px;
                    text-align: center;
                    width: 90%;
                    max-width: 420px;
                    box-shadow: 0 25px 50px rgba(0,0,0,0.5);
                    border: 2px solid #dc2626;
                    color: var(--white);
                ">
                    <div style="margin-bottom: 1.5rem;">
                        <i class="fas fa-shield-alt" style="color: #dc2626; font-size: 3rem; margin-bottom: 1rem;"></i>
                        <h3 style="margin-bottom: 0.5rem; color: var(--gold); font-weight: 700;">Confirmar Senha</h3>
                        <p style="color: var(--beige); line-height: 1.5;">
                            Digite sua senha para confirmar a exclusão PERMANENTE da conta.
                        </p>
                    </div>
                    
                    <input type="password" id="passwordInputField" 
                        style="width: 100%; padding: 14px; background: var(--section-bg); border: 2px solid var(--gold); border-radius: 10px; margin-bottom: 2rem; font-size: 16px; color: var(--white);"
                        placeholder="Sua senha atual" 
                        autocomplete="current-password"
                        autofocus>
                    
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button id="cancelPasswordBtn" style="padding: 12px 24px; border: 2px solid var(--gold); background: transparent; color: var(--gold); border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; flex: 1;">
                            <i class="fas fa-times"></i> Cancelar
                        </button>
                        <button id="submitPasswordBtn" style="padding: 12px 24px; border: none; background: #dc2626; color: white; border-radius: 8px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; flex: 1;">
                            <i class="fas fa-check"></i> Confirmar
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(overlay);

            const cleanup = () => {
                if (overlay.parentElement) {
                    document.body.removeChild(overlay);
                }
            };

            const input = document.getElementById('passwordInputField');
            const cancelBtn = document.getElementById('cancelPasswordBtn');
            const submitBtn = document.getElementById('submitPasswordBtn');

            setTimeout(() => input?.focus(), 100);

            const confirm = () => {
                const password = input ? input.value.trim() : '';
                cleanup();
                resolve(password);
            };

            const cancel = () => {
                cleanup();
                resolve(null);
            };

            cancelBtn.addEventListener('click', cancel);
            submitBtn.addEventListener('click', confirm);
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') confirm();
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) cancel();
            });
        });
    }

    async finalCleanup() {
        try {
            await this.supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            
            this.showNotification('✅ Conta excluída COMPLETAMENTE! Redirecionando...', 'success');

            setTimeout(() => {
                window.location.href = '/';
            }, 3000);

        } catch (error) {
            window.location.href = '/';
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
        const existing = document.querySelectorAll('.account-deletion-notification');
        existing.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `account-deletion-notification notification-${type}`;
        
        const icons = { 
            success: '✅', 
            error: '❌', 
            warning: '⚠️', 
            info: '💡' 
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icons[type] || '💡'}</span>
                <span class="notification-message">${message}</span>
            </div>
        `;

        const styles = {
            success: { background: '#48bb78' },
            error: { background: '#dc2626' },
            warning: { background: '#ed8936' },
            info: { background: '#4299e1' }
        };

        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${styles[type]?.background || '#4299e1'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            z-index: 10001;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
            font-size: 14px;
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 5000);
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    const initAccountDeleter = () => {
        if (typeof window.supabase !== 'undefined' && window.supabase.auth) {
            new AccountDeleter().initialize();
        } else {
            setTimeout(initAccountDeleter, 1000);
        }
    };

    setTimeout(initAccountDeleter, 1000);
});