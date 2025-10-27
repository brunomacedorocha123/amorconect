class NotificationManager {
    constructor() {
        this.categories = [];
        this.userTypes = [];
        this.init();
    }

    async init() {
        await this.loadCategories();
        await this.loadUserTypes();
        this.setupEventListeners();
        this.setupExpirationOptions();
    }

    async loadCategories() {
        try {
            const { data, error } = await supabase
                .from('notification_categories')
                .select('*')
                .order('name');

            if (error) throw error;
            
            this.categories = data || [];
            this.populateCategorySelect();
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            // Fallback para categorias padrão
            this.categories = [
                { id: 1, name: 'Bônus', color: '#28a745' },
                { id: 2, name: 'Avisos', color: '#ffc107' },
                { id: 3, name: 'Advertências', color: '#dc3545' },
                { id: 4, name: 'Informações', color: '#17a2b8' }
            ];
            this.populateCategorySelect();
        }
    }

    async loadUserTypes() {
        try {
            const { data, error } = await supabase
                .from('user_types')
                .select('*')
                .order('name');

            if (error) throw error;
            
            this.userTypes = data || [];
        } catch (error) {
            console.error('Erro ao carregar tipos de usuário:', error);
        }
    }

    populateCategorySelect() {
        const select = document.getElementById('notificationCategory');
        select.innerHTML = '<option value="">Selecione uma categoria</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            option.style.color = category.color;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        // Mostrar/ocultar campo de usuário específico
        document.querySelectorAll('input[name="userType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const userSpecificDiv = document.getElementById('userSpecific');
                userSpecificDiv.style.display = e.target.value === 'specific' ? 'block' : 'none';
                this.updatePreview();
            });
        });

        // Atualizar preview quando campos mudarem
        document.getElementById('notificationTitle').addEventListener('input', () => this.updatePreview());
        document.getElementById('notificationMessage').addEventListener('input', () => this.updatePreview());
        document.getElementById('notificationCategory').addEventListener('change', () => this.updatePreview());

        // Envio do formulário
        document.getElementById('notificationForm').addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setupExpirationOptions() {
        const options = document.querySelectorAll('.expiration-option');
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = true;
            });

            if (option.querySelector('input[type="radio"]').checked) {
                option.classList.add('selected');
            }
        });
    }

    updatePreview() {
        const title = document.getElementById('notificationTitle').value;
        const message = document.getElementById('notificationMessage').value;
        const categoryId = document.getElementById('notificationCategory').value;
        const preview = document.getElementById('notificationPreview');

        if (title || message) {
            preview.style.display = 'block';
            document.getElementById('previewTitle').textContent = title || '(Sem título)';
            document.getElementById('previewMessage').textContent = message || '(Sem mensagem)';
            
            if (categoryId) {
                const category = this.categories.find(cat => cat.id == categoryId);
                document.getElementById('previewCategory').textContent = category ? `Categoria: ${category.name}` : '';
                document.getElementById('previewCategory').style.color = category ? category.color : '';
            } else {
                document.getElementById('previewCategory').textContent = '';
            }
        } else {
            preview.style.display = 'none';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        try {
            await this.sendNotification(formData);
            this.showSuccess('Notificação enviada com sucesso!');
            this.resetForm();
        } catch (error) {
            this.showError('Erro ao enviar notificação: ' + error.message);
        }
    }

    getFormData() {
        const userType = document.querySelector('input[name="userType"]:checked').value;
        
        return {
            title: document.getElementById('notificationTitle').value.trim(),
            message: document.getElementById('notificationMessage').value.trim(),
            category_id: parseInt(document.getElementById('notificationCategory').value),
            user_type: userType,
            specific_user_id: userType === 'specific' ? document.getElementById('specificUserId').value.trim() : null,
            expiration_days: parseInt(document.querySelector('input[name="expiration"]:checked').value)
        };
    }

    validateForm(data) {
        if (!data.title) {
            this.showError('Por favor, insira um título para a notificação.');
            return false;
        }

        if (!data.message) {
            this.showError('Por favor, insira uma mensagem para a notificação.');
            return false;
        }

        if (!data.category_id) {
            this.showError('Por favor, selecione uma categoria.');
            return false;
        }

        if (data.user_type === 'specific' && !data.specific_user_id) {
            this.showError('Por favor, insira o ID do usuário específico.');
            return false;
        }

        return true;
    }

    async sendNotification(data) {
        try {
            // 1. Primeiro, criar a notificação principal
            const notificationData = {
                title: data.title,
                message: data.message,
                category_id: data.category_id,
                expiration_days: data.expiration_days,
                is_active: true
            };

            console.log('Enviando notificação:', notificationData);

            const { data: notification, error: notificationError } = await supabase
                .from('notifications')
                .insert(notificationData)
                .select()
                .single();

            if (notificationError) {
                console.error('Erro ao criar notificação:', notificationError);
                throw new Error('Falha ao criar notificação: ' + notificationError.message);
            }

            // 2. Agora, processar os destinatários
            await this.processRecipients(notification.id, data);
            
            return notification;

        } catch (error) {
            console.error('Erro completo no envio:', error);
            throw error;
        }
    }

    async processRecipients(notificationId, data) {
        try {
            if (data.user_type === 'specific') {
                // Usuário específico
                await this.addUserToNotification(notificationId, data.specific_user_id);
            } else {
                // Grupo de usuários (Todos, Free, Premium)
                const users = await this.getUsersByType(data.user_type);
                
                for (const user of users) {
                    await this.addUserToNotification(notificationId, user.id);
                }
            }
        } catch (error) {
            console.error('Erro ao processar destinatários:', error);
            throw new Error('Erro ao definir destinatários: ' + error.message);
        }
    }

    async getUsersByType(userType) {
        try {
            let query = supabase
                .from('profiles')
                .select('id, is_premium');

            if (userType === 'free') {
                query = query.eq('is_premium', false);
            } else if (userType === 'premium') {
                query = query.eq('is_premium', true);
            }
            // 'all' não precisa de filtro

            const { data, error } = await query;

            if (error) throw error;
            return data || [];

        } catch (error) {
            console.error('Erro ao buscar usuários:', error);
            return [];
        }
    }

    async addUserToNotification(notificationId, userId) {
        try {
            const { error } = await supabase
                .from('notification_users')
                .insert({
                    notification_id: notificationId,
                    user_id: userId
                });

            if (error) throw error;

        } catch (error) {
            console.error('Erro ao adicionar usuário à notificação:', error);
            throw error;
        }
    }

    showSuccess(message) {
        alert('✅ ' + message);
    }

    showError(message) {
        alert('❌ ' + message);
    }

    resetForm() {
        document.getElementById('notificationForm').reset();
        document.getElementById('userSpecific').style.display = 'none';
        document.getElementById('notificationPreview').style.display = 'none';
        
        const options = document.querySelectorAll('.expiration-option');
        options.forEach(option => option.classList.remove('selected'));
        options[1].classList.add('selected');
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new NotificationManager();
});