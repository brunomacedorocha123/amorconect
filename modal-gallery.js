// Sistema de Modal para Galeria Premium
class GalleryModal {
    constructor() {
        this.modal = document.getElementById('imageModal');
        this.modalImage = document.getElementById('modalImageView');
        this.closeBtn = document.getElementById('closeModalBtn');
        
        this.init();
    }

    init() {
        // Event listener para fechar modal
        this.closeBtn.addEventListener('click', () => this.close());
        
        // Fechar modal clicando fora da imagem
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Fechar com tecla ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }

    // Abrir modal com imagem
    open(imageSrc) {
        this.modalImage.src = imageSrc;
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Adiciona efeito de loading
        this.modalImage.onload = () => {
            this.modalImage.style.opacity = '1';
        };
        
        this.modalImage.style.opacity = '0'; // CORREÇÃO: estava incompleto
    }

    // Fechar modal
    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = 'auto';
        
        // Reset da imagem
        setTimeout(() => {
            this.modalImage.src = '';
        }, 300);
    }
}

// Sistema principal da galeria
class PremiumGallery {
    constructor() {
        this.modal = new GalleryModal();
        this.galleryGrid = document.getElementById('galleryGrid');
        this.uploadBtn = document.getElementById('uploadGalleryBtn');
        this.fileInput = document.getElementById('galleryUpload');
        this.galleryManager = document.getElementById('galleryManager');
        this.galleryUpgradeCTA = document.getElementById('galleryUpgradeCTA');
        
        this.init();
    }

    init() {
        // Verificar se usuário é premium e mostrar/ocultar galeria
        this.checkPremiumStatus();
        
        // Event listeners
        if (this.uploadBtn && this.fileInput) {
            this.uploadBtn.addEventListener('click', () => this.fileInput.click());
            this.fileInput.addEventListener('change', (e) => this.handleImageUpload(e));
        }

        // Carregar imagens existentes
        this.loadGalleryImages();
    }

    checkPremiumStatus() {
        // Verificar se usuário é premium
        const isPremium = document.querySelector('.premium-badge')?.classList.contains('premium');
        
        if (isPremium && this.galleryManager && this.galleryUpgradeCTA) {
            this.galleryManager.style.display = 'block';
            this.galleryUpgradeCTA.style.display = 'none';
        } else {
            this.galleryManager.style.display = 'none';
            this.galleryUpgradeCTA.style.display = 'block';
        }
    }

    handleImageUpload(event) {
        const files = event.target.files;
        if (!files.length) return;

        Array.from(files).forEach(file => {
            if (file.type.startsWith('image/')) {
                this.previewImage(file);
            }
        });

        // Limpar input
        event.target.value = '';
    }

    previewImage(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.addImageToGallery(e.target.result, file.name);
        };
        
        reader.readAsDataURL(file);
    }

    addImageToGallery(imageSrc, filename) {
        // Remover mensagem de galeria vazia se existir
        const emptyGallery = this.galleryGrid.querySelector('.empty-gallery');
        if (emptyGallery) {
            emptyGallery.remove();
        }

        // Criar elemento da imagem
        const galleryItem = document.createElement('div');
        galleryItem.className = 'gallery-item';
        galleryItem.innerHTML = `
            <div class="gallery-image-container">
                <img src="${imageSrc}" alt="${filename}" class="gallery-image" loading="lazy">
                <div class="gallery-actions">
                    <button class="delete-btn" onclick="premiumGallery.deleteImage(this)">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;

        // Adicionar evento de clique para abrir modal
        const imgElement = galleryItem.querySelector('.gallery-image');
        imgElement.addEventListener('click', () => {
            this.modal.open(imageSrc);
        });

        // Adicionar à galeria
        this.galleryGrid.appendChild(galleryItem);
    }

    deleteImage(button) {
        const galleryItem = button.closest('.gallery-item');
        if (galleryItem) {
            galleryItem.style.animation = 'zoomOut 0.3s ease';
            setTimeout(() => {
                galleryItem.remove();
                
                // Mostrar mensagem de galeria vazia se não houver mais imagens
                if (this.galleryGrid.children.length === 0) {
                    this.showEmptyGallery();
                }
            }, 300);
        }
    }

    showEmptyGallery() {
        this.galleryGrid.innerHTML = `
            <div class="empty-gallery">
                <i class="fas fa-images"></i>
                <p>Sua galeria está vazia</p>
                <p>Adicione fotos para compartilhar momentos especiais</p>
            </div>
        `;
    }

    loadGalleryImages() {
        // Aqui você carregaria as imagens do Supabase
        // Por enquanto, vamos simular algumas imagens de exemplo
        // Remova esta parte na implementação real
        
        const exampleImages = [
            'https://via.placeholder.com/300x300/4A5568/FFFFFF?text=Imagem+1',
            'https://via.placeholder.com/300x300/2D3748/FFFFFF?text=Imagem+2',
            'https://via.placeholder.com/300x300/1A202C/FFFFFF?text=Imagem+3'
        ];

        exampleImages.forEach((imgSrc, index) => {
            this.addImageToGallery(imgSrc, `imagem-${index + 1}.jpg`);
        });
    }
}

// Inicializar quando o DOM estiver pronto
let premiumGallery;

document.addEventListener('DOMContentLoaded', function() {
    premiumGallery = new PremiumGallery();
});

// Para uso global
window.premiumGallery = premiumGallery;