class GalleryManager {
    constructor() {
        this.currentUser = null;
        this.images = [];
        this.maxSizeMB = 10;
        this.isPremium = false;
        
        setTimeout(() => this.init(), 100);
    }

    async init() {
        try {
            await this.checkAuthentication();
            
            if (window.PremiumManager) {
                this.isPremium = await PremiumManager.checkPremiumStatus();
            }
            
            if (this.isPremium) {
                this.showGalleryForPremium();
                await this.loadUserGallery();
                this.setupGalleryEvents();
                await this.updateStorageDisplay();
            } else {
                this.hideGalleryForFree();
            }
        } catch (error) {
            this.hideGalleryForFree();
        }
    }

    async checkAuthentication() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            this.currentUser = user;
        }
    }

    showGalleryForPremium() {
        const galleryManager = document.getElementById('galleryManager');
        const galleryUpgradeCTA = document.getElementById('galleryUpgradeCTA');
        
        if (galleryManager) galleryManager.style.display = 'block';
        if (galleryUpgradeCTA) galleryUpgradeCTA.style.display = 'none';
    }

    hideGalleryForFree() {
        const galleryManager = document.getElementById('galleryManager');
        const galleryUpgradeCTA = document.getElementById('galleryUpgradeCTA');
        
        if (galleryManager) galleryManager.style.display = 'none';
        if (galleryUpgradeCTA) galleryUpgradeCTA.style.display = 'flex';
    }

    setupGalleryEvents() {
        const uploadBtn = document.getElementById('uploadGalleryBtn');
        const galleryUpload = document.getElementById('galleryUpload');
        
        if (uploadBtn && galleryUpload) {
            uploadBtn.addEventListener('click', () => {
                galleryUpload.click();
            });
            
            galleryUpload.addEventListener('change', (e) => {
                this.handleGalleryUpload(e.target.files);
                e.target.value = '';
            });
        }
    }

    async handleGalleryUpload(files) {
        if (!this.isPremium) return;

        const validFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/') && 
            file.size <= this.maxSizeMB * 1024 * 1024
        );

        if (validFiles.length === 0) {
            this.showNotification('Selecione imagens válidas (JPG, PNG - máx. 10MB)', 'error');
            return;
        }

        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            await this.uploadGalleryImage(file);
        }

        await this.loadUserGallery();
        await this.updateStorageDisplay();
    }

    async uploadGalleryImage(file) {
        try {
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `${this.currentUser.id}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('gallery-images')
                .upload(filePath, file);

            if (error) throw error;

            const { data: urlData } = supabase.storage
                .from('gallery-images')
                .getPublicUrl(filePath);

            const galleryData = {
                user_id: this.currentUser.id,
                image_name: file.name,
                image_url: filePath,
                image_size: file.size,
                uploaded_at: new Date().toISOString()
            };

            const { error: dbError } = await supabase
                .from('user_gallery')
                .insert([galleryData]);

            if (dbError) {
                await supabase.storage.from('gallery-images').remove([filePath]);
                throw dbError;
            }

            this.showNotification('Imagem adicionada com sucesso', 'success');

        } catch (error) {
            this.showNotification('Erro ao fazer upload da imagem', 'error');
        }
    }

    async loadUserGallery() {
        try {
            const { data: images, error } = await supabase
                .from('user_gallery')
                .select('*')
                .eq('user_id', this.currentUser.id)
                .eq('is_active', true)
                .order('uploaded_at', { ascending: false });

            if (error) throw error;

            this.images = images || [];
            this.displayGallery(this.images);
            
        } catch (error) {
            this.images = [];
            this.displayGallery([]);
        }
    }

    displayGallery(images) {
        const galleryGrid = document.getElementById('galleryGrid');
        
        if (!images || images.length === 0) {
            galleryGrid.innerHTML = `
                <div class="empty-gallery">
                    <i class="fas fa-images"></i>
                    <p>Sua galeria está vazia</p>
                    <p>Adicione fotos para compartilhar momentos especiais</p>
                </div>
            `;
            return;
        }
        
        galleryGrid.innerHTML = images.map(image => `
            <div class="gallery-item">
                <img src="${image.image_url}" alt="${image.image_name}" class="gallery-image">
                <div class="gallery-actions">
                    <button class="gallery-btn delete-btn" onclick="galleryManager.deleteGalleryImage(${image.id}, '${image.image_url}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    async deleteGalleryImage(imageId, imagePath) {
        if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;
        
        try {
            const { error: dbError } = await supabase
                .from('user_gallery')
                .update({ is_active: false })
                .eq('id', imageId);

            if (dbError) throw dbError;

            const { error: storageError } = await supabase.storage
                .from('gallery-images')
                .remove([imagePath]);

            if (storageError) throw storageError;

            this.showNotification('Imagem excluída com sucesso', 'success');
            await this.loadUserGallery();
            await this.updateStorageDisplay();
            
        } catch (error) {
            this.showNotification('Erro ao excluir imagem', 'error');
        }
    }

    async getStorageUsage() {
        try {
            const { data: images, error } = await supabase
                .from('user_gallery')
                .select('image_size')
                .eq('user_id', this.currentUser.id)
                .eq('is_active', true);

            if (error) return 0;
            
            return images.reduce((total, image) => total + (image.image_size || 0), 0);
        } catch (error) {
            return 0;
        }
    }

    async updateStorageDisplay() {
        const storageUsed = await this.getStorageUsage();
        const storageUsedMB = (storageUsed / (1024 * 1024)).toFixed(1);
        const storagePercentage = (storageUsed / (10 * 1024 * 1024)) * 100;
        
        const storageUsedElement = document.getElementById('storageUsed');
        const storageFillElement = document.getElementById('storageFill');
        
        if (storageUsedElement) storageUsedElement.textContent = `${storageUsedMB}MB`;
        if (storageFillElement) storageFillElement.style.width = `${Math.min(storagePercentage, 100)}%`;
    }

    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }

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
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 4000);
    }
}

let galleryManager;
document.addEventListener('DOMContentLoaded', () => {
    galleryManager = new GalleryManager();
});