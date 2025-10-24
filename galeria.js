class GalleryManager {
    constructor() {
        this.currentUser = null;
        this.images = [];
        this.maxSizeMB = 10;
        this.isPremium = false;
        this.currentLightboxIndex = 0;
        
        setTimeout(() => this.init(), 100);
    }

    async init() {
        try {
            await this.checkAuthentication();
            
            // Verificar status premium
            if (window.PremiumManager) {
                this.isPremium = await PremiumManager.checkPremiumStatus();
            } else {
                // Fallback se PremiumManager não existir
                this.isPremium = false;
            }
            
            if (this.isPremium) {
                this.showGalleryForPremium();
                await this.loadUserGallery();
                this.setupGalleryEvents();
                this.createLightbox();
                await this.updateStorageDisplay();
            } else {
                this.hideGalleryForFree();
            }
        } catch (error) {
            console.error('Erro ao inicializar galeria:', error);
            this.hideGalleryForFree();
        }
    }

    async checkAuthentication() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            this.currentUser = user;
        } else {
            throw new Error('Usuário não autenticado');
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
        if (galleryUpgradeCTA) galleryUpgradeCTA.style.display = 'block';
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

    createLightbox() {
        // Criar estrutura do lightbox se não existir
        if (!document.getElementById('lightboxOverlay')) {
            const lightboxHTML = `
                <div id="lightboxOverlay" class="lightbox-overlay">
                    <div class="lightbox-content">
                        <button class="lightbox-close">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="lightbox-nav">
                            <button class="lightbox-prev">
                                <i class="fas fa-chevron-left"></i>
                            </button>
                            <button class="lightbox-next">
                                <i class="fas fa-chevron-right"></i>
                            </button>
                        </div>
                        <img class="lightbox-image" src="" alt="">
                        <div class="lightbox-caption"></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', lightboxHTML);
            this.setupLightboxEvents();
        }
    }

    setupLightboxEvents() {
        const lightbox = document.getElementById('lightboxOverlay');
        const closeBtn = lightbox.querySelector('.lightbox-close');
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');
        const lightboxImage = lightbox.querySelector('.lightbox-image');

        // Fechar lightbox
        closeBtn.addEventListener('click', () => this.closeLightbox());
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) this.closeLightbox();
        });

        // Navegação
        prevBtn.addEventListener('click', () => this.showPreviousImage());
        nextBtn.addEventListener('click', () => this.showNextImage());

        // Teclado
        document.addEventListener('keydown', (e) => {
            if (!lightbox.classList.contains('active')) return;
            
            switch(e.key) {
                case 'Escape':
                    this.closeLightbox();
                    break;
                case 'ArrowLeft':
                    this.showPreviousImage();
                    break;
                case 'ArrowRight':
                    this.showNextImage();
                    break;
            }
        });

        // Prevenir que clique na imagem feche o lightbox
        lightboxImage.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    async handleGalleryUpload(files) {
        if (!this.isPremium) return;

        const validFiles = Array.from(files).filter(file => 
            file.type.startsWith('image/') && 
            file.size <= this.maxSizeMB * 1024 * 1024
        );

        if (validFiles.length === 0) {
            this.showNotification('Selecione imagens válidas (JPG, PNG, GIF - máx. 10MB)', 'error');
            return;
        }

        // Mostrar loading
        this.showNotification(`Enviando ${validFiles.length} imagem(ns)...`, 'info');

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            try {
                await this.uploadGalleryImage(file);
                successCount++;
            } catch (error) {
                console.error('Erro no upload:', error);
                errorCount++;
            }
        }

        if (successCount > 0) {
            this.showNotification(`${successCount} imagem(ns) adicionada(s) com sucesso!`, 'success');
        }
        if (errorCount > 0) {
            this.showNotification(`${errorCount} imagem(ns) falharam no upload`, 'error');
        }

        await this.loadUserGallery();
        await this.updateStorageDisplay();
    }

    async uploadGalleryImage(file) {
        try {
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `${this.currentUser.id}/${fileName}`;

            // Fazer upload para o storage
            const { data, error } = await supabase.storage
                .from('gallery-images')
                .upload(filePath, file);

            if (error) throw error;

            // Salvar metadados no banco
            const galleryData = {
                user_id: this.currentUser.id,
                image_name: file.name,
                image_url: filePath,
                image_size: file.size,
                uploaded_at: new Date().toISOString(),
                is_active: true
            };

            const { error: dbError } = await supabase
                .from('user_gallery')
                .insert([galleryData]);

            if (dbError) {
                // Se der erro no banco, remove do storage
                await supabase.storage.from('gallery-images').remove([filePath]);
                throw dbError;
            }

            return true;

        } catch (error) {
            console.error('Erro no upload da imagem:', error);
            throw error;
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
            console.error('Erro ao carregar galeria:', error);
            this.images = [];
            this.displayGallery([]);
        }
    }

    displayGallery(images) {
        const galleryGrid = document.getElementById('galleryGrid');
        
        if (!galleryGrid) return;
        
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
        
        galleryGrid.innerHTML = images.map((image, index) => `
            <div class="gallery-item">
                <div class="gallery-image-container" onclick="galleryManager.openLightbox(${index})">
                    <img src="${this.getImageUrl(image.image_url)}" 
                         alt="${image.image_name}" 
                         class="gallery-image"
                         loading="lazy"
                         onload="this.style.opacity='1'"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="image-fallback" style="display: none;">
                        <i class="fas fa-image"></i>
                        <span>${image.image_name}</span>
                    </div>
                </div>
                <div class="gallery-actions">
                    <button class="delete-btn" onclick="galleryManager.deleteGalleryImage(${image.id}, '${image.image_url}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Pré-carregar imagens para melhor performance
        this.preloadImages(images);
    }

    getImageUrl(imagePath) {
        const { data } = supabase.storage
            .from('gallery-images')
            .getPublicUrl(imagePath);
        return data.publicUrl;
    }

    preloadImages(images) {
        images.forEach(image => {
            const img = new Image();
            img.src = this.getImageUrl(image.image_url);
        });
    }

    openLightbox(index) {
        if (index < 0 || index >= this.images.length) return;
        
        this.currentLightboxIndex = index;
        const image = this.images[index];
        const lightbox = document.getElementById('lightboxOverlay');
        const lightboxImage = lightbox.querySelector('.lightbox-image');
        const caption = lightbox.querySelector('.lightbox-caption');

        // Mostrar loading
        lightboxImage.style.opacity = '0';

        // Carregar imagem
        lightboxImage.src = this.getImageUrl(image.image_url);
        lightboxImage.alt = image.image_name;
        
        // Configurar caption
        caption.textContent = image.image_name;

        // Quando a imagem carregar
        lightboxImage.onload = () => {
            lightboxImage.style.opacity = '1';
        };

        // Em caso de erro
        lightboxImage.onerror = () => {
            caption.textContent = 'Erro ao carregar imagem';
            lightboxImage.style.opacity = '1';
        };

        // Mostrar lightbox
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Atualizar estado dos botões de navegação
        this.updateNavigationButtons();
    }

    closeLightbox() {
        const lightbox = document.getElementById('lightboxOverlay');
        const lightboxImage = lightbox.querySelector('.lightbox-image');
        
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
        
        // Limpar src para liberar memória
        setTimeout(() => {
            lightboxImage.src = '';
        }, 300);
    }

    showPreviousImage() {
        if (this.images.length <= 1) return;
        
        this.currentLightboxIndex = (this.currentLightboxIndex - 1 + this.images.length) % this.images.length;
        this.openLightbox(this.currentLightboxIndex);
    }

    showNextImage() {
        if (this.images.length <= 1) return;
        
        this.currentLightboxIndex = (this.currentLightboxIndex + 1) % this.images.length;
        this.openLightbox(this.currentLightboxIndex);
    }

    updateNavigationButtons() {
        const lightbox = document.getElementById('lightboxOverlay');
        const prevBtn = lightbox.querySelector('.lightbox-prev');
        const nextBtn = lightbox.querySelector('.lightbox-next');

        // Mostrar/ocultar botões baseado no número de imagens
        if (this.images.length <= 1) {
            prevBtn.style.display = 'none';
            nextBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'flex';
            nextBtn.style.display = 'flex';
        }
    }

    async deleteGalleryImage(imageId, imagePath) {
        if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;
        
        try {
            // Atualizar status no banco para inativo
            const { error: dbError } = await supabase
                .from('user_gallery')
                .update({ is_active: false })
                .eq('id', imageId);

            if (dbError) throw dbError;

            // Remover do storage
            const { error: storageError } = await supabase.storage
                .from('gallery-images')
                .remove([imagePath]);

            if (storageError) {
                console.warn('Imagem removida do banco mas não do storage:', storageError);
            }

            this.showNotification('Imagem excluída com sucesso', 'success');
            await this.loadUserGallery();
            await this.updateStorageDisplay();
            
        } catch (error) {
            console.error('Erro ao excluir imagem:', error);
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
        try {
            const storageUsed = await this.getStorageUsage();
            const storageUsedMB = (storageUsed / (1024 * 1024)).toFixed(1);
            const storagePercentage = (storageUsed / (10 * 1024 * 1024)) * 100;
            
            const storageUsedElement = document.getElementById('storageUsed');
            const storageFillElement = document.getElementById('storageFill');
            
            if (storageUsedElement) {
                storageUsedElement.textContent = `${storageUsedMB}MB de 10MB usados`;
            }
            if (storageFillElement) {
                storageFillElement.style.width = `${Math.min(storagePercentage, 100)}%`;
                
                // Mudar cor baseado no uso
                if (storagePercentage > 90) {
                    storageFillElement.style.background = '#dc2626';
                } else if (storagePercentage > 70) {
                    storageFillElement.style.background = '#f59e0b';
                } else {
                    storageFillElement.style.background = 'var(--burgundy)';
                }
            }
        } catch (error) {
            console.error('Erro ao atualizar storage:', error);
        }
    }

    showNotification(message, type = 'info') {
        // Usar o sistema de notificação existente se disponível
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }

        // Fallback simples
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remover após 4 segundos
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 4000);
    }

    // Método para atualizar quando usuário faz upgrade
    async onPremiumUpgrade() {
        this.isPremium = true;
        this.showGalleryForPremium();
        await this.loadUserGallery();
        this.setupGalleryEvents();
        this.createLightbox();
        await this.updateStorageDisplay();
    }

    // Método para limpar a galeria (útil para logout)
    cleanup() {
        this.images = [];
        this.currentLightboxIndex = 0;
        const galleryGrid = document.getElementById('galleryGrid');
        if (galleryGrid) {
            galleryGrid.innerHTML = '';
        }
    }
}

// Inicializar galeria quando o DOM estiver pronto
let galleryManager;

document.addEventListener('DOMContentLoaded', () => {
    galleryManager = new GalleryManager();
});

// Expor para uso global
window.galleryManager = galleryManager;

// Função global para ser chamada quando usuário fizer upgrade
window.onPremiumUpgrade = function() {
    if (galleryManager) {
        galleryManager.onPremiumUpgrade();
    }
};