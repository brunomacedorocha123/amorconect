// Sistema de Galeria Premium
class GalleryManager {
    constructor() {
        this.currentUser = null;
        this.images = [];
        this.maxSizeMB = 10;
        this.isPremium = false;
        this.init();
    }

    async init() {
        try {
            await this.checkAuthentication();
            await this.checkPremiumStatus();
            this.toggleGallerySection();
            
            if (this.isPremium) {
                await this.loadGallery();
                this.setupEventListeners();
            } else {
                this.showUpgradeMessage();
            }
        } catch (error) {
            console.error('Erro na inicialização da galeria:', error);
        }
    }

    async checkAuthentication() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return;
        }
        this.currentUser = user;
    }

    async checkPremiumStatus() {
        try {
            const { data: subscription, error } = await supabase
                .from('user_subscriptions')
                .select('status, plan_type')
                .eq('user_id', this.currentUser.id)
                .eq('status', 'active')
                .single();

            this.isPremium = subscription && subscription.plan_type === 'premium';
        } catch (error) {
            this.isPremium = false;
        }
    }

    toggleGallerySection() {
        const gallerySection = document.getElementById('gallerySection');
        if (gallerySection) {
            gallerySection.style.display = 'block';
        }
    }

    showUpgradeMessage() {
        const galleryGrid = document.getElementById('galleryGrid');
        const uploadArea = document.getElementById('galleryUploadArea');
        
        if (galleryGrid) {
            galleryGrid.innerHTML = `
                <div class="gallery-message info" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                    <i class="fas fa-crown" style="font-size: 3rem; margin-bottom: 1rem; color: var(--gold);"></i>
                    <h4 style="color: var(--gold); margin-bottom: 1rem;">Galeria Exclusiva Premium</h4>
                    <p style="margin-bottom: 1.5rem;">Faça upgrade para desbloquear o acesso à galeria de fotos</p>
                    <a href="pricing.html" class="btn btn-premium">
                        <i class="fas fa-rocket"></i>
                        Fazer Upgrade para Premium
                    </a>
                </div>
            `;
        }
        
        if (uploadArea) uploadArea.style.display = 'none';
    }

    setupEventListeners() {
        const uploadArea = document.getElementById('galleryUploadArea');
        const fileInput = document.getElementById('galleryFileInput');
        const uploadBtn = document.getElementById('uploadGalleryBtn');
        
        if (uploadArea && fileInput) {
            uploadArea.addEventListener('click', () => fileInput.click());
            
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });
            
            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                this.handleFileUpload(e.dataTransfer.files);
            });
            
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files);
                e.target.value = '';
            });
        }

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                document.getElementById('galleryFileInput')?.click();
            });
        }

        const modal = document.getElementById('galleryModal');
        const modalClose = document.getElementById('galleryModalClose');
        
        if (modal && modalClose) {
            modalClose.addEventListener('click', () => this.closeModal());
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    async handleFileUpload(files) {
        if (!this.isPremium) {
            this.showNotification('Acesso restrito a usuários premium', 'error');
            return;
        }

        const validFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/') && 
            file.size <= this.maxSizeMB * 1024 * 1024
        );

        if (validFiles.length === 0) {
            this.showNotification('Selecione imagens válidas (máx. 10MB)', 'error');
            return;
        }

        this.showProgress(true);

        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            await this.uploadImage(file, i + 1, validFiles.length);
        }

        this.showProgress(false);
        await this.loadGallery();
    }

    async uploadImage(file, current, total) {
        try {
            this.updateProgress(`Enviando ${current} de ${total}`, (current / total) * 100);

            const fileExt = file.name.split('.').pop();
            const fileName = `${this.currentUser.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            
            const { data, error } = await supabase.storage
                .from('gallery-images')
                .upload(fileName, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('gallery-images')
                .getPublicUrl(fileName);

            const { error: dbError } = await supabase
                .from('user_gallery')
                .insert({
                    user_id: this.currentUser.id,
                    image_name: file.name,
                    image_url: publicUrl,
                    image_size: file.size
                });

            if (dbError) throw dbError;

        } catch (error) {
            this.showNotification(`Erro ao enviar imagem ${current}`, 'error');
        }
    }

    async loadGallery() {
        if (!this.isPremium) return;

        try {
            const { data: images, error } = await supabase
                .from('user_gallery')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('is_active', true)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;

            this.images = images || [];
            this.updateGalleryDisplay();

        } catch (error) {
            this.showNotification('Erro ao carregar galeria', 'error');
        }
    }

    updateGalleryDisplay() {
        const galleryGrid = document.getElementById('galleryGrid');
        const imageCount = document.getElementById('imageCount');
        
        if (galleryGrid) {
            galleryGrid.innerHTML = this.images.length === 0 ? 
                this.renderEmptyState() : 
                this.renderImages();
        }
        
        if (imageCount) {
            imageCount.textContent = this.images.length;
        }

        this.setupImageClickEvents();
    }

    renderEmptyState() {
        return `
            <div class="gallery-empty">
                <div class="gallery-empty-icon">
                    <i class="fas fa-images"></i>
                </div>
                <div class="gallery-empty-text">Sua galeria está vazia</div>
                <div class="gallery-empty-subtext">Adicione suas primeiras fotos para começar</div>
            </div>
        `;
    }

    renderImages() {
        return this.images.map(image => `
            <div class="gallery-item" data-image-id="${image.id}">
                <img src="${image.image_url}" alt="${image.image_name}" class="gallery-image" loading="lazy">
                <div class="gallery-item-overlay">
                    <span class="gallery-item-size">${this.formatFileSize(image.image_size)}</span>
                    <button class="gallery-item-delete" onclick="galleryManager.deleteImage(${image.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    setupImageClickEvents() {
        document.querySelectorAll('.gallery-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.gallery-item-delete')) {
                    const imageId = item.dataset.imageId;
                    const image = this.images.find(img => img.id == imageId);
                    if (image) this.openModal(image.image_url);
                }
            });
        });
    }

    openModal(imageUrl) {
        const modal = document.getElementById('galleryModal');
        const modalImage = document.getElementById('galleryModalImage');
        
        if (modal && modalImage) {
            modalImage.src = imageUrl;
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modal = document.getElementById('galleryModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    }

    async deleteImage(imageId) {
        if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;

        try {
            const { error } = await supabase
                .from('user_gallery')
                .update({ is_active: false })
                .eq('id', imageId)
                .eq('user_id', this.currentUser.id);

            if (error) throw error;

            this.showNotification('Imagem excluída com sucesso', 'success');
            await this.loadGallery();

        } catch (error) {
            this.showNotification('Erro ao excluir imagem', 'error');
        }
    }

    showProgress(show) {
        const progress = document.getElementById('galleryProgress');
        if (progress) {
            progress.style.display = show ? 'block' : 'none';
        }
    }

    updateProgress(text, percent) {
        const progressFill = document.getElementById('galleryProgressFill');
        const progressText = document.getElementById('galleryProgressText');
        
        if (progressFill) progressFill.style.width = `${percent}%`;
        if (progressText) progressText.textContent = text;
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showNotification(message, type = 'info') {
        // Usar o sistema de notificação existente do painel
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }

        // Fallback caso não exista
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            background: ${type === 'error' ? '#dc2626' : type === 'success' ? '#16a34a' : '#2563eb'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            z-index: 10000;
            max-width: 300px;
            animation: fadeIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 4000);
    }
}

// Inicializar galeria quando o DOM estiver pronto
let galleryManager;
document.addEventListener('DOMContentLoaded', () => {
    galleryManager = new GalleryManager();
});