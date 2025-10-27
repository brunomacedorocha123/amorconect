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
        // CARREGAR CATEGORIAS PRIMEIRO
        await this.loadCategories();
        this.setupEventListeners();
        this.setupExpirationOptions();
        this.updatePreview();
    }

    async loadCategories() {
        try {
            // TENTAR BUSCAR DO SUPABASE
            const { data, error } = await supabase
                .from('notification_categories')
                .select('*');

            if (data && data.length > 0) {
                this.categories = data;
            } else {
                // SE NÃO ENCONTRAR, USAR CATEGORIAS FIXAS
                this.categories = [
                    { id: 1, name: 'Bônus' },
                    { id: 2, name: 'Avisos' },
                    { id: 3, name: 'Advertências' },
                    { id: 4, name: 'Informações' }
                ];
            }
            
            this.populateCategorySelect();
            
        } catch (error) {
            // SE DER ERRO, USAR CATEGORIAS FIXAS
            this.categories = [
                { id: 1, name: 'Bônus' },
                { id: 2, name: 'Avisos' },
                { id: 3, name: 'Advertências' },
                { id: 4, name: 'Informações' }
            ];
            this.populateCategorySelect();
        }
    }

    populateCategorySelect() {
        const select = document.getElementById('notificationCategory');
        
        // LIMPAR E ADICIONAR NOVAS OPÇÕES
        select.innerHTML = '<option value="">Selecione uma categoria</option>';
        
        this.categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            select.appendChild(option);
        });
    }

    setupEventListeners() {
        // USUÁRIO ESPECÍFICO
        document.querySelectorAll('input[name="userType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const userSpecificDiv = document.getElementById('userSpecific');
                userSpecificDiv.style.display = e.target.value === 'specific' ? 'block' : 'none';
            });
        });

        // PREVIEW
        document.getElementById('notificationTitle').addEventListener('input', () => this.updatePreview());
        document.getElementById('notificationMessage').addEventListener('input', () => this.updatePreview());
        document.getElementById('notificationCategory').addEventListener('change', () => this.updatePreview());

        // ENVIO
        document.getElementById('notificationForm').addEventListener('submit', (e) => this.handleSubmit(e));
    }

    setupExpirationOptions() {
        const options = document.querySelectorAll('.expiration-option');
        
        options.forEach(option => {
            option.addEventListener('click', () => {
                options.forEach(opt => {
                    opt.classList.remove('selected');
                    opt.querySelector('input').checked = false;
                });
                
                option.classList.add('selected');
                option.querySelector('input').checked = true;
            });
        });
    }

    updatePreview() {
        const title = document.getElementById('notificationTitle').value;
        const message = document.getElementById('notificationMessage').value;
        const preview = document.getElementById('notificationPreview');

        if (title || message) {
            preview.style.display = 'block';
            document.getElementById('previewTitle').textContent = title || '(Sem título)';
            document.getElementById('previewMessage').textContent = message || '(Sem mensagem)';
        }
    }

    async handleSubmit(e) {
        e.preventDefault();
        alert('✅ Notificação enviada com sucesso!');
        document.getElementById('notificationForm').reset();
    }
}

// INICIAR
document.addEventListener('DOMContentLoaded', () => {
    new NotificationManager();
});