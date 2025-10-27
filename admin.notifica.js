// Configuração Supabase
const SUPABASE_URL = 'https://rohsbrkbdlbewonibclf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJvaHNicmtiZGxiZXdvbmliY2xmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2MTc5MDMsImV4cCI6MjA3NjE5MzkwM30.PUbV15B1wUoU_-dfggCwbsS5U7C1YsoTrtcahEKn_Oc';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class NotificationManager {
    constructor() {
        this.categories = [];
        this.init();
    }

    async init() {
        await this.loadCategories();
        this.setupEventListeners();
        this.setupExpirationOptions();
        this.updatePreview();
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
            this.categories = [
                { id: 1, name: 'Bônus', color: '#28a745' },
                { id: 2, name: 'Avisos', color: '#ffc107' },
                { id: 3, name: 'Advertências', color: '#dc3545' },
                { id: 4, name: 'Informações', color: '#17a2b8' }
            ];
            this.populateCategorySelect();
        }
    }

    populateCategorySelect() {
        const select = document.getElementById('notificationCategory');
        select.innerHTML = '<option value="">Selecione uma categoria</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        document.querySelectorAll('input[name="userType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const userSpecificDiv = document.getElementById('userSpecific');
                userSpecificDiv.style.display = e.target.value === 'specific' ? 'block' : 'none';
                this.updatePreview();
            });
        });

        document.getElementById('notificationTitle').addEventListener('input', () => this.updatePreview());
        document.getElementById('notificationMessage').addEventListener('input', () => this.updatePreview());
        document.getElementById('notificationCategory').addEventListener('change', () => this.updatePreview());
        document.getElementById('specificUserId').addEventListener('input', () => this.updatePreview());

        document.getElementById('notificationForm').addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setupExpirationOptions() {
        const options = document.querySelectorAll('.expiration-option');
        
        options.forEach(option => {
            option.addEventListener('click', (e) => {
                e.preventDefault();
                
                options.forEach(opt => {
                    opt.classList.remove('selected');
                    const radio = opt.querySelector('input[type="radio"]');
                    radio.checked = false;
                });
                
                option.classList.add('selected');
                const radio = option.querySelector('input[type="radio"]');
                radio.checked = true;
            });

            const radio = option.querySelector('input[type="radio"]');
            if (radio.checked) {
                option.classList.add('selected');
            }
        });
    }

    updatePreview() {
        const title = document.getElementById('notificationTitle').value;
        const message = document.getElementById('notificationMessage').value;
        const categoryId = document.getElementById('notificationCategory').value;
        const userType = document.querySelector('input[name="userType"]:checked').value;
        const specificUserId = document.getElementById('specificUserId').value;
        const preview = document.getElementById('notificationPreview');

        preview.style.display = 'block';
        
        document.getElementById('previewTitle').textContent = title || '(Sem título)';
        document.getElementById('previewMessage').textContent = message || '(Sem mensagem)';
        
        if (categoryId) {
            const category = this.categories.find(cat => cat.id == categoryId);
            document.getElementById('previewCategory').textContent = category ? `Categoria: ${category.name}` : 'Categoria: Não selecionada';
        } else {
            document.getElementById('previewCategory').textContent = 'Categoria: Não selecionada';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.innerHTML;
        
        try {
            submitBtn.innerHTML = '⏳ Enviando...';
            submitBtn.disabled = true;

            const formData = this.getFormData();
            
            if (!this.validateForm(formData)) {
                return;
            }

            await this.sendNotification(formData);
            this.showSuccess('Notificação enviada com sucesso!');
            this.resetForm();
            
        } catch (error) {
            this.showError('Erro ao enviar notificação: ' + error.message);
        } finally {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        }
    }

    getFormData() {
        const userType = document.querySelector('input[name="userType"]:checked').value;
        const expiration = document.querySelector('input[name="expiration"]:checked').value;
        
        return {
            title: document.getElementById('notificationTitle').value.trim(),
            message: document.getElementById('notificationMessage').value.trim(),
            category_id: parseInt(document.getElementById('notificationCategory').value),
            user_type: userType,
            specific_user_id: userType === 'specific' ? document.getElementById('specificUserId').value.trim() : null,
            expiration_days: parseInt(expiration)
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
            // Buscar user_type_id baseado no nome
            const userTypeId = await this.getUserTypeId(data.user_type);
            
            const notificationData = {
                title: data.title,
                message: data.message,
                category_id: data.category_id,
                user_type_id: userTypeId,
                expiration_days: data.expiration_days,
                is_active: true
            };

            const { data: notification, error } = await supabase
                .from('notifications')
                .insert(notificationData)
                .select()
                .single();

            if (error) throw error;

            // Se for usuário específico, adicionar na tabela notification_users
            if (data.user_type === 'specific' && data.specific_user_id) {
                await supabase
                    .from('notification_users')
                    .insert({
                        notification_id: notification.id,
                        user_id: data.specific_user_id
                    });
            }

            return notification;

        } catch (error) {
            throw new Error('Falha ao enviar notificação: ' + error.message);
        }
    }

    async getUserTypeId(userTypeName) {
        try {
            const { data, error } = await supabase
                .from('user_types')
                .select('id')
                .eq('name', userTypeName === 'all' ? 'Todos' : 
                            userTypeName === 'free' ? 'Free' : 'Premium')
                .single();

            if (error) throw error;
            return data.id;
        } catch (error) {
            return 1; // Fallback para 'Todos'
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
        
        this.updatePreview();
    }
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new NotificationManager();
});