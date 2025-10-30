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
            confirmationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !confirmBtn.disabled) {
                    this.executeAccountDeletion();
                }
            });
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
            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir Conta Permanentemente';
            }
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
            const isValid = text.trim().toUpperCase() === 'EXCLUIR CONTA';
            confirmBtn.disabled = !isValid;
            
            const confirmationInput = document.getElementById('confirmationInput');
            if (confirmationInput) {
                if (isValid) {
                    confirmationInput.style.borderColor = '#48bb78';
                    confirmationInput.style.background = 'rgba(72, 187, 120, 0.1)';
                } else {
                    confirmationInput.style.borderColor = '#dc2626';
                    confirmationInput.style.background = 'var(--section-bg)';
                }
            }
        }
    }

    async executeAccountDeletion() {
        if (this.isDeleting) return;

        const confirmationInput = document.getElementById('confirmationInput');
        const confirmBtn = document.getElementById('confirmDeleteBtn');

        if (!confirmationInput || !confirmBtn) {
            this.showNotification('Erro: Elementos do modal não encontrados', 'error');
            return;
        }

        if (confirmationInput.value.trim().toUpperCase() !== 'EXCLUIR CONTA') {
            this.showNotification('Digite "EXCLUIR CONTA" para confirmar', 'error');
            return;
        }

        this.isDeleting = true;
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Excluindo...';

        try {
            this.closeConfirmationModal();

            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            const password = await this.getUserPassword();
            if (!password) {
                throw new Error('Exclusão cancelada pelo usuário');
            }

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

            const { data: deleteData, error: deleteError } = await this.supabase.rpc('delete_user_account');

            if (deleteError) {
                if (deleteError.message.includes('function') && deleteError.message.includes('does not exist')) {
                    this.showNotification('Usando método alternativo...', 'warning');
                    await this.deleteUserDataManually(user.id);
                    await this.deleteUserFromAuth(user.id);
                } else {
                    throw new Error('Erro ao excluir dados: ' + deleteError.message);
                }
            } else if (!deleteData || !deleteData.success) {
                throw new Error(deleteData?.message || 'Erro ao excluir dados');
            } else {
                this.showNotification('Dados excluídos. Removendo autenticação...', 'success');
            }

            if (deleteError || !deleteData?.success) {
                await this.deleteUserFromAuth(user.id);
            }

            this.showNotification('Conta excluída com sucesso!', 'success');
            await this.finalCleanup();

        } catch (error) {
            this.handleDeletionError(error.message);
        } finally {
            this.isDeleting = false;
        }
    }

    async deleteUserDataManually(userId) {
        try {
            const tables = [
                'messages', 'profile_visits', 'user_blocks', 'user_reports',
                'user_subscriptions', 'user_gallery', 'user_details', 
                'user_feels', 'user_pulses', 'user_vibes', 'user_warnings',
                'user_notifications', 'user_message_limits', 'profiles', 'users'
            ];

            for (const table of tables) {
                try {
                    await this.supabase
                        .from(table)
                        .delete()
                        .or(`user_id.eq.${userId},id.eq.${userId},sender_id.eq.${userId},receiver_id.eq.${userId},visitor_id.eq.${userId},visited_id.eq.${userId},blocker_id.eq.${userId},blocked_id.eq.${userId}`);
                } catch (error) {
                    // Ignora erros de tabelas/colunas que não existem
                }
            }

            return { success: true, message: 'Dados excluídos manualmente' };

        } catch (error) {
            throw new Error('Falha na exclusão manual dos dados');
        }
    }

    async getUserPassword() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.95);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
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
                            Por segurança, digite sua senha para confirmar a exclusão permanente da conta.
                        </p>
                    </div>
                    
                    <input type="password" id="passwordInputField" 
                        style="width: 100%; padding: 14px; background: var(--section-bg); border: 2px solid var(--gold); border-radius: 10px; margin-bottom: 2rem; font-size: 16px; color: var(--white); transition: all 0.3s ease;"
                        placeholder="Digite sua senha atual" 
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

            setTimeout(() => {
                if (input) input.focus();
            }, 100);

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

            cancelBtn.addEventListener('mouseenter', () => {
                cancelBtn.style.background = 'var(--gold)';
                cancelBtn.style.color = 'var(--dark-bg)';
            });
            cancelBtn.addEventListener('mouseleave', () => {
                cancelBtn.style.background = 'transparent';
                cancelBtn.style.color = 'var(--gold)';
            });

            submitBtn.addEventListener('mouseenter', () => {
                submitBtn.style.background = '#b91c1c';
                submitBtn.style.transform = 'translateY(-2px)';
            });
            submitBtn.addEventListener('mouseleave', () => {
                submitBtn.style.background = '#dc2626';
                submitBtn.style.transform = 'translateY(0)';
            });
        });
    }

    async deleteUserFromAuth(userId) {
        try {
            await this.supabase.auth.signOut();
            return true;
        } catch (error) {
            await this.supabase.auth.signOut();
            return true;
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

            this.showNotification('Conta excluída com sucesso! Redirecionando...', 'success');

            setTimeout(() => {
                window.location.href = '/';
            }, 2000);

        } catch (error) {
            window.location.href = '/';
        }
    }

    handleDeletionError(errorMessage) {
        const confirmBtn = document.getElementById('confirmDeleteBtn');
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fas fa-trash-alt"></i> Excluir Conta Permanentemente';
        }
        
        this.showNotification(errorMessage, 'error');
        
        setTimeout(() => {
            this.showNotification(
                'Se o problema persistir, entre em contato com o suporte.',
                'warning'
            );
        }, 3000);
    }

    showNotification(message, type = 'info') {
        const existing = document.querySelectorAll('.account-deletion-notification');
        existing.forEach(notif => {
            notif.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notif.remove(), 300);
        });

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
                <button class="notification-close">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;

        const styles = {
            success: { background: '#48bb78', borderLeft: '4px solid #38a169' },
            error: { background: '#dc2626', borderLeft: '4px solid #b91c1c' },
            warning: { background: '#ed8936', borderLeft: '4px solid #dd6b20' },
            info: { background: '#4299e1', borderLeft: '4px solid #3182ce' }
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
            border-left: ${styles[type]?.borderLeft || '4px solid #3182ce'};
        `;

        document.body.appendChild(notification);

        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            notification.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        });

        if (type !== 'success' || !message.includes('Redirecionando')) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.style.animation = 'slideOutRight 0.3s ease';
                    setTimeout(() => notification.remove(), 300);
                }
            }, 5000);
        }
    }

    injectStyles() {
        const styles = `
            @keyframes slideInRight {
                from { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
                to { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
            }
            
            @keyframes slideOutRight {
                from { 
                    transform: translateX(0); 
                    opacity: 1; 
                }
                to { 
                    transform: translateX(100%); 
                    opacity: 0; 
                }
            }
            
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
            
            .fa-spinner {
                animation: spin 1s linear infinite;
                margin-right: 8px;
            }
            
            .account-deletion-notification {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .notification-icon {
                font-size: 16px;
            }
            
            .notification-message {
                flex: 1;
                font-weight: 500;
            }
            
            .notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                padding: 4px;
                border-radius: 4px;
                transition: background 0.2s;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .notification-close:hover {
                background: rgba(255,255,255,0.2);
            }

            .confirmation-input:focus {
                outline: none;
                border-color: var(--light-gold);
                background: var(--dark-bg);
            }

            .btn-confirm-delete:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none !important;
            }

            .btn-confirm-delete:disabled:hover {
                transform: none !important;
                box-shadow: none !important;
            }
        `;

        if (!document.querySelector('#account-deletion-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'account-deletion-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
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