// excluir-conta.js - Sistema de Exclusão de Conta
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
        // Botão principal de excluir conta
        const deleteBtn = document.getElementById('deleteAccountBtn');
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.openConfirmationModal();
            });
        }

        // Eventos do modal
        const cancelBtn = document.getElementById('cancelDeleteBtn');
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        const confirmationInput = document.getElementById('confirmationInput');
        const modal = document.getElementById('deleteConfirmationModal');

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.closeConfirmationModal());
        }

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.executeAccountDeletion());
        }

        if (confirmationInput) {
            confirmationInput.addEventListener('input', (e) => this.validateConfirmationText(e.target.value));
            confirmationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !confirmBtn.disabled) {
                    this.executeAccountDeletion();
                }
            });
        }

        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeConfirmationModal();
                }
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
                this.closeConfirmationModal();
            }
        });
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
                confirmationInput.focus();
            }
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir Conta Permanentemente';
            }
        }
    }

    closeConfirmationModal() {
        if (this.isDeleting) return;

        const modal = document.getElementById('deleteConfirmationModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    validateConfirmationText(text) {
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (!confirmBtn) return;

        const normalizedText = text.trim().toUpperCase();
        confirmBtn.disabled = normalizedText !== 'EXCLUIR CONTA';
    }

    async executeAccountDeletion() {
        if (this.isDeleting) return;

        const confirmationInput = document.getElementById('confirmationInput');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        if (!confirmationInput || !confirmBtn) return;

        const confirmationText = confirmationInput.value.trim().toUpperCase();
        
        if (confirmationText !== 'EXCLUIR CONTA') {
            this.showNotification('Digite "EXCLUIR CONTA" para confirmar', 'error');
            return;
        }

        this.isDeleting = true;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

        try {
            const password = prompt('Digite sua senha para confirmar a exclusão:');
            
            if (!password) {
                throw new Error('Exclusão cancelada');
            }

            const { data, error } = await this.supabase.rpc('delete_user_account', {
                user_password: password
            });

            if (error) {
                throw new Error(this.getErrorMessage(error));
            }

            if (data && data.success) {
                await this.finalCleanup();
                this.redirectToHome();
            } else {
                throw new Error(data?.message || 'Erro ao excluir conta');
            }

        } catch (error) {
            this.handleDeletionError(error.message);
        } finally {
            this.isDeleting = false;
        }
    }

    getErrorMessage(error) {
        const message = error.message || error;
        
        if (message.includes('Senha incorreta')) {
            return 'Senha incorreta. Tente novamente.';
        }
        if (message.includes('não autenticado')) {
            return 'Sessão expirada. Faça login novamente.';
        }
        if (message.includes('cancelada')) {
            return 'Exclusão cancelada.';
        }
        
        return 'Erro ao excluir conta. Tente novamente mais tarde.';
    }

    handleDeletionError(errorMessage) {
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir Conta Permanentemente';
        }

        this.showNotification(errorMessage, 'error');
        
        if (errorMessage.includes('Senha incorreta')) {
            setTimeout(() => {
                this.openConfirmationModal();
            }, 1000);
        }
    }

    async finalCleanup() {
        try {
            await this.supabase.auth.signOut();
            localStorage.clear();
            sessionStorage.clear();
            
            document.cookie.split(";").forEach(function(c) {
                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
            });
        } catch (error) {
            // Ignorar erros de limpeza
        }
    }

    redirectToHome() {
        this.showNotification('Conta excluída com sucesso! Redirecionando...', 'success');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 2000);
    }

    showNotification(message, type = 'info') {
        const existingNotification = document.querySelector('.account-deletion-notification');
        if (existingNotification) {
            existingNotification.remove();
        }

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

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#f56565' : 
                         type === 'success' ? '#48bb78' : 
                         type === 'warning' ? '#ed8936' : '#4299e1'};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            z-index: 10001;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
            font-size: 14px;
            border: 1px solid rgba(255,255,255,0.1);
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    injectStyles() {
        const styles = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .confirmation-modal {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.8);
                z-index: 10000;
                align-items: center;
                justify-content: center;
                backdrop-filter: blur(5px);
                animation: fadeIn 0.3s ease;
            }

            .confirmation-modal .modal-content {
                background: #1a1a1a;
                border: 2px solid #f56565;
                border-radius: 16px;
                padding: 2rem;
                max-width: 500px;
                width: 90%;
                text-align: center;
                animation: slideInRight 0.3s ease;
                box-shadow: 0 20px 40px rgba(0,0,0,0.3);
            }

            .modal-icon {
                font-size: 3rem;
                color: #f56565;
                margin-bottom: 1rem;
            }

            .modal-title {
                color: #f56565;
                margin-bottom: 1rem;
                font-size: 1.5rem;
                font-weight: bold;
            }

            .modal-warning {
                background: rgba(245, 101, 101, 0.1);
                border: 1px solid #f56565;
                border-radius: 8px;
                padding: 1rem;
                margin: 1rem 0;
                text-align: left;
            }

            .modal-warning ul {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .modal-warning li {
                margin-bottom: 0.5rem;
                color: #e2e8f0;
                font-size: 0.9rem;
            }

            .modal-warning i {
                color: #f56565;
                margin-right: 0.5rem;
            }

            .confirmation-input {
                width: 100%;
                padding: 12px;
                border: 2px solid #f56565;
                border-radius: 8px;
                background: rgba(255, 255, 255, 0.1);
                color: white;
                font-size: 1rem;
                text-align: center;
                text-transform: uppercase;
                margin: 1rem 0;
                transition: all 0.3s ease;
            }

            .confirmation-input:focus {
                outline: none;
                border-color: #d53f8c;
                background: rgba(255, 255, 255, 0.15);
            }

            .modal-actions {
                display: flex;
                gap: 1rem;
                justify-content: center;
                margin-top: 1.5rem;
            }

            .btn-cancel {
                background: #718096;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .btn-cancel:hover {
                background: #4a5568;
            }

            .btn-confirm-delete {
                background: #f56565;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
            }

            .btn-confirm-delete:disabled {
                background: #718096;
                cursor: not-allowed;
                opacity: 0.6;
            }

            .btn-confirm-delete:not(:disabled):hover {
                background: #e53e3e;
                transform: translateY(-2px);
            }

            .danger-zone {
                border: 2px solid #f56565;
                background: rgba(245, 101, 101, 0.05);
                border-radius: 12px;
                padding: 2rem;
                margin-top: 2rem;
            }

            .danger-zone h3 {
                color: #f56565;
                margin-bottom: 1rem;
            }

            .btn-danger {
                background: #f56565;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 8px;
                cursor: pointer;
                font-size: 1rem;
                transition: all 0.3s ease;
                font-weight: bold;
            }

            .btn-danger:hover {
                background: #e53e3e;
                transform: translateY(-2px);
            }

            .danger-actions small {
                display: block;
                margin-top: 0.5rem;
                color: #a0aec0;
                font-size: 0.8rem;
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

// Inicialização automática quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    // Aguardar um pouco para garantir que o Supabase esteja carregado
    setTimeout(() => {
        if (typeof supabase !== 'undefined') {
            const accountDeleter = new AccountDeleter();
            accountDeleter.initialize();
        }
    }, 1000);
});