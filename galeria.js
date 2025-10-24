// Sistema Completo de Galeria
class GalleryManager {
    constructor() {
        this.currentUser = null;
        this.images = [];
        this.maxSizeMB = 10;
        this.isPremium = false;
        this.modal = null;
        this.modalImage = null;
        this.closeBtn = null;
        this.clickTimer = null;
        
        this.init();
    }

    async init() {
        try {
            await this.checkAuthentication();
            await this.checkPremiumStatus();
            
            if (this.isPremium) {
                this.showGalleryForPremium();
                await this.loadUserGallery();
                this.setupGalleryEvents();
                this.createModal();
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
        } else {
            throw new Error('Usuário não autenticado');
        }
    }

    async checkPremiumStatus() {
        if (window.PremiumManager) {
            this.isPremium = await PremiumManager.checkPremiumStatus();
        } else {
            const premiumBadge = document.querySelector('.premium-badge');
            this.isPremium = premiumBadge?.classList.contains('premium') || false;
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

    createModal() {
        // Criar modal se não existir
        if (!document.getElementById('imageModal')) {
            const modalHTML = `
                <div id="imageModal" class="image-modal">
                    <div class="modal-overlay"></div>
                    <div class="modal-container">
                        <button class="modal-close-btn" id="closeModalBtn">
                            <i class="fas fa-times"></i>
                        </button>
                        <div class="modal-image-wrapper">
                            <img id="modalImageView" src="" alt="Imagem ampliada">
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
        
        // Garantir que os elementos são encontrados
        this.modal = document.getElementById('imageModal');
        this.modalImage = document.getElementById('modalImageView');
        this.closeBtn = document.getElementById('closeModalBtn');
        
        // Configurar eventos
        this.setupModalEvents();
    }

    setupModalEvents() {
        if (!this.closeBtn) {
            console.error('Botão fechar não encontrado');
            return;
        }
        
        // CORREÇÃO: Evento do botão X
        this.closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeModal();
        });
        
        // Fechar clicando fora
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Fechar com ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.closeModal();
            }
        });
    }

    openModal(imageSrc) {
        if (!this.modal || !this.modalImage) {
            console.error('Modal não inicializado');
            return;
        }
        
        this.modalImage.src = imageSrc;
        this.modal.classList.add('active');
    }

    closeModal() {
        if (!this.modal) return;
        
        this.modal.classList.remove('active');
        setTimeout(() => {
            if (this.modalImage) {
                this.modalImage.src = '';
            }
        }, 300);
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

        this.showNotification(`Enviando ${validFiles.length} imagem(ns)...`, 'info');

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < validFiles.length; i++) {
            const file = validFiles[i];
            try {
                await this.uploadGalleryImage(file);
                successCount++;
            } catch (error) {
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

            const { data, error } = await supabase.storage
                .from('gallery-images')
                .upload(filePath, file);

            if (error) throw error;

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
                await supabase.storage.from('gallery-images').remove([filePath]);
                throw dbError;
            }

            return true;

        } catch (error) {
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
                <div class="gallery-image-container">
                    <img src="${this.getImageUrl(image.image_url)}" 
                         alt="${image.image_name}" 
                         class="gallery-image"
                         loading="lazy"
                         onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                    <div class="image-fallback" style="display: none;">
                        <i class="fas fa-image"></i>
                        <span>${image.image_name}</span>
                    </div>
                </div>
                <div class="gallery-actions">
                    <button class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');

        // Adicionar eventos após criar os elementos
        this.addImageEvents();
    }

    addImageEvents() {
        const galleryItems = document.querySelectorAll('.gallery-item');
        
        galleryItems.forEach((item, index) => {
            const imgElement = item.querySelector('.gallery-image');
            const deleteBtn = item.querySelector('.delete-btn');
            const imageSrc = imgElement.src;

            // Clique único
            imgElement.addEventListener('click', (e) => {
                if (this.clickTimer) {
                    clearTimeout(this.clickTimer);
                    this.clickTimer = null;
                }
                this.clickTimer = setTimeout(() => {
                    this.openModal(imageSrc);
                }, 300);
            });

            // Duplo clique
            imgElement.addEventListener('dblclick', (e) => {
                if (this.clickTimer) {
                    clearTimeout(this.clickTimer);
                    this.clickTimer = null;
                }
                this.openModal(imageSrc);
            });

            // Botão deletar
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const imageId = this.images[index]?.id;
                const imagePath = this.images[index]?.image_url;
                if (imageId && imagePath) {
                    this.deleteGalleryImage(imageId, imagePath);
                }
            });
        });
    }

    getImageUrl(imagePath) {
        const { data } = supabase.storage
            .from('gallery-images')
            .getPublicUrl(imagePath);
        return data.publicUrl;
    }

    async deleteGalleryImage(imageId, imagePath) {
        if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;
        
        try {
            const { error: storageError } = await supabase.storage
                .from('gallery-images')
                .remove([imagePath]);

            if (storageError) throw storageError;

            const { error: dbError } = await supabase
                .from('user_gallery')
                .delete()
                .eq('id', imageId);

            if (dbError) throw dbError;

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
        try {
            const storageUsed = await this.getStorageUsage();
            const storageUsedMB = (storageUsed / (1024 * 1024)).toFixed(1);
            const storagePercentage = (storageUsed / (10 * 1024 * 1024)) * 100;
            
            const storageUsedElement = document.getElementById('storageUsed');
            const storageFillElement = document.getElementById('storageFill');
            
            if (storageUsedElement) storageUsedElement.textContent = `${storageUsedMB}MB de 10MB usados`;
            if (storageFillElement) {
                storageFillElement.style.width = `${Math.min(storagePercentage, 100)}%`;
                
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
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }

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
        
        setTimeout(() => {
            if (notification.parentElement) notification.remove();
        }, 4000);
    }

    async onPremiumUpgrade() {
        this.isPremium = true;
        this.showGalleryForPremium();
        await this.loadUserGallery();
        this.setupGalleryEvents();
        this.createModal();
        await this.updateStorageDisplay();
    }
}

// Inicializar quando o DOM estiver pronto
let galleryManager;

document.addEventListener('DOMContentLoaded', () => {
    galleryManager = new GalleryManager();
});

window.galleryManager = galleryManager;

window.onPremiumUpgrade = function() {
    if (galleryManager) {
        galleryManager.onPremiumUpgrade();
    }
};