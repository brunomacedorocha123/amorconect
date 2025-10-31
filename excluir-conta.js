// excluir-conta.js - SISTEMA DEFINITIVO DE EXCLUSÃO
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
                this.showSimpleConfirmation();
            });
        }
    }

    showSimpleConfirmation() {
        if (this.isDeleting) return;

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
                    Você perderá acesso permanente à plataforma.
                </p>

                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 1rem; margin-bottom: 1.5rem; text-align: left;">
                    <p style="margin: 0; color: #856404; font-size: 0.9rem;">
                        <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                        Você não conseguirá mais fazer login nesta conta.
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

        document.getElementById('cancelSimpleBtn').addEventListener('click', cleanup);
        
        document.getElementById('confirmSimpleBtn').addEventListener('click', () => {
            cleanup();
            this.executeSimpleDeletion();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) cleanup();
        });
    }

    async executeSimpleDeletion() {
        if (this.isDeleting) return;
        
        this.isDeleting = true;
        this.showNotification('Iniciando exclusão da conta...', 'info');

        try {
            // 1. Verificar autenticação
            const { data: { user }, error: userError } = await this.supabase.auth.getUser();
            
            if (userError || !user) {
                throw new Error('Sessão expirada. Faça login novamente.');
            }

            this.showNotification('Processando exclusão...', 'info');

            // 2. Chamar função do banco para limpar dados
            const { data: deleteData, error: deleteError } = await this.supabase.rpc('delete_user_account');

            if (deleteError) {
                console.warn('Aviso na limpeza de dados:', deleteError);
            }

            this.showNotification('Conta excluída com sucesso!', 'success');

            // 3. Fazer logout e redirecionar
            await this.supabase.auth.signOut();
            
            // Limpar tudo
            localStorage.clear();
            sessionStorage.clear();
            
            // Redirecionar para página inicial
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);

        } catch (error) {
            console.error('Erro:', error);
            this.showNotification(error.message, 'error');
        } finally {
            this.isDeleting = false;
        }
    }

    showNotification(message, type = 'info') {
        const existing = document.querySelector('.account-deletion-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `account-deletion-notification`;
        
        const backgrounds = {
            success: '#48bb78',
            error: '#f56565', 
            info: '#4299e1'
        };

        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span>${message}</span>
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
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }
}

// Inicialização automática
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.supabase) {
            new AccountDeleter().initialize();
        }
    }, 1000);
});