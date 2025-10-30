// excluir-conta.js - SISTEMA SIMPLIFICADO E FUNCIONAL
class AccountDeleter {
    constructor() {
        this.isDeleting = false;
        this.supabase = window.supabase;
    }

    initialize() {
        this.setupEventListeners();
        console.log('AccountDeleter inicializado');
        return true;
    }

    setupEventListeners() {
        const deleteBtn = document.getElementById('deleteAccountBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSimpleConfirmation();
            });
        } else {
            console.error('Botão de exclusão não encontrado');
        }
    }

    showSimpleConfirmation() {
        if (this.isDeleting) {
            this.showNotification('Já está processando uma exclusão', 'error');
            return;
        }

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0; 
            left: 0;
            width: 100%; 
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10002;
            backdrop-filter: blur(5px);
        `;

        overlay.innerHTML = `
            <div style="
                background: white;
                padding: 2rem;
                border-radius: 12px;
                text-align: center;
                width: 90%;
                max-width: 400px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            ">
                <div style="font-size: 3rem; color: #dc3545; margin-bottom: 1rem;">
                    <i class="fas fa-exclamation-triangle"></i>
                </div>
                
                <h3 style="margin-bottom: 1rem; color: #333; font-weight: 600;">
                    Excluir Conta Permanentemente?
                </h3>
                
                <p style="margin-bottom: 1.5rem; color: #666; line-height: 1.5;">
                    Esta ação <strong style="color: #dc3545;">não pode ser desfeita</strong>. 
                    Todos os seus dados serão permanentemente removidos.
                </p>

                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: left;">
                    <p style="margin: 0; color: #856404; font-size: 0.9rem;">
                        <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                        Você será desconectado e perderá acesso a todos os dados.
                    </p>
                </div>
                
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="cancelSimpleBtn" style="
                        padding: 12px 24px; 
                        border: 2px solid #6c757d; 
                        background: white; 
                        color: #6c757d; 
                        border-radius: 8px; 
                        cursor: pointer;
                        font-weight: 600;
                        flex: 1;
                        transition: all 0.2s ease;
                    ">
                        Cancelar
                    </button>
                    <button id="confirmSimpleBtn" style="
                        padding: 12px 24px; 
                        border: none; 
                        background: #dc3545; 
                        color: white; 
                        border-radius: 8px; 
                        cursor: pointer;
                        font-weight: 600;
                        flex: 1;
                        transition: all 0.2s ease;
                    ">
                        <i class="fas fa-trash-alt"></i> Excluir
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

        const cancelBtn = document.getElementById('cancelSimpleBtn');
        const confirmBtn = document.getElementById('confirmSimpleBtn');

        // Efeitos hover nos botões
        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = '#f8f9fa';
        });
        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'white';
        });

        confirmBtn.addEventListener('mouseenter', () => {
            confirmBtn.style.background = '#c53030';
            confirmBtn.style.transform = 'translateY(-1px)';
        });
        confirmBtn.addEventListener('mouseleave', () => {
            confirmBtn.style.background = '#dc3545';
            confirmBtn.style.transform = 'translateY(0)';
        });

        cancelBtn.addEventListener('click', cleanup);
        
        confirmBtn.addEventListener('click', () => {
            cleanup();
            this.executeSimpleDeletion();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup();
        });

        // Foco no botão de cancelar por segurança
        setTimeout(() => cancelBtn.focus(), 100);
    }

    async executeSimpleDeletion() {
        if (this.isDeleting) return;
        
        this.isDeleting = true;
        this.showNotification('Iniciando exclusão da conta...', 'info');

        try {
            // 1. Verifica se o usuário está autenticado
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            this.showNotification('Excluindo seus dados...', 'info');

            // 2. Chama a função PostgreSQL para excluir todos os dados
            const { data: deleteData, error: deleteError } = await this.supabase.rpc('delete_user_account');

            if (deleteError) {
                console.error('Erro na exclusão:', deleteError);
                throw new Error('Erro ao excluir dados da conta: ' + deleteError.message);
            }

            if (!deleteData) {
                throw new Error('Resposta vazia do servidor');
            }

            if (!deleteData.success) {
                throw new Error(deleteData.message || 'Falha na exclusão dos dados');
            }

            this.showNotification('Conta excluída com sucesso! Redirecionando...', 'success');

            // 3. Limpeza final e logout
            await this.finalCleanup();

        } catch (error) {
            console.error('Erro completo:', error);
            this.handleDeletionError(error.message);
        } finally {
            this.isDeleting = false;
        }
    }

    async finalCleanup() {
        try {
            // Faz logout
            const { error } = await this.supabase.auth.signOut();
            if (error) {
                console.warn('Erro no logout:', error);
            }
            
            // Limpa storage local
            localStorage.clear();
            sessionStorage.clear();
            
            // Redireciona para página inicial após 2 segundos
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('Erro na limpeza final:', error);
            // Mesmo com erro, redireciona
            window.location.href = 'index.html';
        }
    }

    handleDeletionError(errorMessage) {
        let userMessage = errorMessage;
        
        // Traduz mensagens comuns de erro
        if (errorMessage.includes('Invalid login credentials')) {
            userMessage = 'Sessão expirada. Faça login novamente.';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            userMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (errorMessage.includes('JWT')) {
            userMessage = 'Sessão expirada. Faça login novamente.';
        }

        this.showNotification(userMessage, 'error');
    }

    showNotification(message, type = 'info') {
        // Remove notificação existente
        const existing = document.querySelector('.account-deletion-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `account-deletion-notification notification-${type}`;
        
        const icons = { 
            success: '✅', 
            error: '❌', 
            info: '⏳',
            warning: '⚠️'
        };
        
        const backgrounds = {
            success: '#48bb78',
            error: '#f56565', 
            info: '#4299e1',
            warning: '#ed8936'
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
            background: ${backgrounds[type] || '#4299e1'};
            color: white;
            padding: 16px 20px;
            border-radius: 12px;
            box-shadow: 0 8px 25px rgba(0,0,0,0.15);
            z-index: 10001;
            max-width: 400px;
            animation: slideInRight 0.3s ease;
            font-size: 14px;
            font-weight: 500;
        `;

        document.body.appendChild(notification);

        // Remove automaticamente após 5 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
    }
}

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM carregado, inicializando AccountDeleter...');
    
    // Aguarda o Supabase carregar
    const checkSupabase = setInterval(() => {
        if (typeof window.supabase !== 'undefined' && window.supabase.auth) {
            clearInterval(checkSupabase);
            const deleter = new AccountDeleter();
            deleter.initialize();
            console.log('AccountDeleter inicializado com sucesso');
        }
    }, 100);

    // Timeout de segurança
    setTimeout(() => {
        clearInterval(checkSupabase);
    }, 10000);
});

// Adiciona os keyframes CSS dinamicamente se não existirem
if (!document.querySelector('#accountDeletionStyles')) {
    const style = document.createElement('style');
    style.id = 'accountDeletionStyles';
    style.textContent = `
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
    `;
    document.head.appendChild(style);
}