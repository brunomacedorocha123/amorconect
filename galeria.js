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
            
            // ✅ CORREÇÃO: Usar PremiumManager que já funciona
            this.isPremium = await PremiumManager.checkPremiumStatus();
            
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
                .from('gallery')
                .upload(filePath, file);

            if (error) throw error;

            const { data: urlData } = await supabase.storage
                .from('gallery')
                .getPublicUrl(filePath);

            const galleryData = {
                user_id: this.currentUser.id,
                image_name: fileName,
                image_url: filePath,
                file_size_bytes: file.size,
                mime_type: file.type,
                public_url: urlData.publicUrl,
                created_at: new Date().toISOString()
            };

            const { error: dbError } = await supabase
                .from('user_gallery')
                .insert([galleryData]);

            if (dbError) {
                await supabase.storage.from('gallery').remove([filePath]);
                throw dbError;
            }

            this.showNotification('Imagem adicionada com sucesso', 'success');

        } catch (error) {
            this.showNotification('Erro ao fazer upload da imagem', 'error');
        }
    }

    async loadUserGallery() {
        try {
            const { data: files, error } = await supabase.storage
                .from('gallery')
                .list(this.currentUser.id + '/');

            if (error) {
                if (error.message?.includes('not found')) {
                    this.displayGallery([]);
                    return;
                }
                throw error;
            }

            const images = files
                .filter(file => file.name !== '.emptyFolderPlaceholder')
                .map(file => ({
                    id: file.id || file.name,
                    image_url: `${this.currentUser.id}/${file.name}`,
                    image_name: file.name,
                    created_at: file.created_at
                }));

            this.images = images;
            this.displayGallery(images);
            
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
                    <i class="fas fa-images" style="font-size: 3rem; color: var(--lilas); margin-bottom: 1rem;"></i>
                    <p>Sua galeria está vazia</p>
                    <p style="font-size: 0.9rem; color: var(--text-light);">Adicione fotos para compartilhar momentos especiais</p>
                </div>
            `;
            return;
        }
        
        galleryGrid.innerHTML = images.map((image, index) => `
            <div class="gallery-item" data-index="${index}">
                <div class="gallery-image-container">
                    <img src="" data-src="${image.image_url}" alt="Imagem da galeria" class="gallery-image">
                    <div class="image-loading">Carregando...</div>
                </div>
                <div class="gallery-actions">
                    <button class="gallery-btn" onclick="galleryManager.deleteGalleryImage('${image.image_url}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        this.loadGalleryImages();
    }

    async loadGalleryImages() {
        const images = document.querySelectorAll('.gallery-image[data-src]');
        
        for (const img of images) {
            const imageUrl = img.getAttribute('data-src');
            await this.loadGalleryImage(img, imageUrl);
        }
    }

    async loadGalleryImage(imgElement, imageUrl) {
        try {
            const { data, error } = await supabase.storage
                .from('gallery')
                .createSignedUrl(imageUrl, 3600);
        
            if (error) {
                this.showFallbackImage(imgElement);
                return;
            }
            
            if (data && data.signedUrl) {
                imgElement.src = data.signedUrl;
                imgElement.removeAttribute('data-src');
                imgElement.style.display = 'block';
                
                const loading = imgElement.parentElement.querySelector('.image-loading');
                if (loading) loading.style.display = 'none';
            }
            
        } catch (error) {
            this.showFallbackImage(imgElement);
        }
    }

    showFallbackImage(imgElement) {
        imgElement.style.background = 'linear-gradient(135deg, var(--lilas), var(--vermelho-rosado))';
        imgElement.style.display = 'flex';
        imgElement.style.alignItems = 'center';
        imgElement.style.justifyContent = 'center';
        imgElement.style.color = 'white';
        imgElement.style.fontSize = '2rem';
        imgElement.innerHTML = '🖼️';
        imgElement.removeAttribute('data-src');
        
        const loading = imgElement.parentElement.querySelector('.image-loading');
        if (loading) loading.style.display = 'none';
    }

    async deleteGalleryImage(imagePath) {
        if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;
        
        try {
            const { error } = await supabase.storage
                .from('gallery')
                .remove([imagePath]);
            
            if (error) throw error;
            
            this.showNotification('Imagem excluída com sucesso', 'success');
            await this.loadUserGallery();
            await this.updateStorageDisplay();
            
        } catch (error) {
            this.showNotification('Erro ao excluir imagem', 'error');
        }
    }

    async getStorageUsage() {
        try {
            const { data: files, error } = await supabase.storage
                .from('gallery')
                .list(this.currentUser.id + '/');
            
            if (error) return 0;
            
            return files.reduce((total, file) => total + (file.metadata?.size || 0), 0);
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