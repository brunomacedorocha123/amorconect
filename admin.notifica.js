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
            // Simulação - substitua pela sua API real
            this.categories = [
                { id: 1, name: 'Bônus', color: '#28a745' },
                { id: 2, name: 'Avisos', color: '#ffc107' },
                { id: 3, name: 'Advertências', color: '#dc3545' },
                { id: 4, name: 'Informações', color: '#17a2b8' }
            ];
            
            this.populateCategorySelect();
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
        }
    }

    async loadUserTypes() {
        try {
            // Simulação - substitua pela sua API real
            this.userTypes = [
                { id: 1, name: 'Todos' },
                { id: 2, name: 'Free' },
                { id: 3, name: 'Premium' }
            ];
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
                // Remove seleção anterior
                options.forEach(opt => opt.classList.remove('selected'));
                // Adiciona seleção atual
                option.classList.add('selected');
                // Marca o radio button
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = true;
            });

            // Inicializa seleção padrão
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
            specific_user_id: userType === 'specific' ? parseInt(document.getElementById('specificUserId').value) : null,
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
        // Simulação do envio - substitua pela sua API real
        console.log('Enviando notificação:', data);
        
        // Exemplo de como seria com fetch:
        /*
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            throw new Error('Erro na requisição');
        }

        return await response.json();
        */
        
        // Simulando delay de rede
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, id: Math.random() * 1000 };
    }

    showSuccess(message) {
        alert('✅ ' + message); // Você pode substituir por um toast mais elegante
    }

    showError(message) {
        alert('❌ ' + message); // Você pode substituir por um toast mais elegante
    }

    resetForm() {
        document.getElementById('notificationForm').reset();
        document.getElementById('userSpecific').style.display = 'none';
        document.getElementById('notificationPreview').style.display = 'none';
        
        // Resetar seleção visual dos expiration options
        const options = document.querySelectorAll('.expiration-option');
        options.forEach(option => option.classList.remove('selected'));
        options[1].classList.add('selected'); // Seleciona 7 dias
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new NotificationManager();
});

// Funções auxiliares para integração com seu sistema
class NotificationAPI {
    static async createNotification(notificationData) {
        // Implemente a integração com sua API aqui
        const response = await fetch('/api/notifications/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('admin_token')
            },
            body: JSON.stringify(notificationData)
        });
        
        if (!response.ok) {
            throw new Error('Falha ao criar notificação');
        }
        
        return await response.json();
    }

    static async getCategories() {
        // Implemente para buscar categorias do banco
        const response = await fetch('/api/notification-categories');
        return await response.json();
    }

    static async getUserTypes() {
        // Implemente para buscar tipos de usuário do banco
        const response = await fetch('/api/user-types');
        return await response.json();
    }
}