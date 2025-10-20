// ==================== SISTEMA DE GALERIA PREMIUM ====================
console.log('🖼️ painel-galeria.js carregando...');

class GaleriaSystem {
    constructor(supabase, currentUser) {
        this.supabase = supabase;
        this.currentUser = currentUser;
        this.currentGalleryImages = [];
        this.selectedGalleryFiles = [];
        this.isPremium = false;
        this.initialized = false;
    }

    async initialize() {
        try {
            console.log('🎯 Inicializando sistema de galeria...');
            
            // 1. Verificar status premium
            await this.verificarStatusPremium();
            
            // 2. Mostrar/ocultar seção baseado no status
            await this.toggleGallerySection();
            
            // 3. Se for premium, carregar galeria
            if (this.isPremium) {
                await this.loadUserGallery();
                this.setupGalleryEvents();
            }
            
            this.initialized = true;
            console.log('✅ Sistema de galeria inicializado!');
            
        } catch (error) {
            console.error('❌ Erro ao inicializar galeria:', error);
        }
    }

    async verificarStatusPremium() {
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('is_premium')
                .eq('id', this.currentUser.id)
                .single();

            if (error) throw error;
            
            this.isPremium = profile?.is_premium || false;
            console.log(`✅ Status Premium Galeria: ${this.isPremium}`);
            
        } catch (error) {
            console.error('❌ Falha ao verificar premium:', error);
            this.isPremium = false;
        }
    }

    async toggleGallerySection() {
        try {
            const galleryManager = document.getElementById('galleryManager');
            const galleryUpgradeCTA = document.getElementById('galleryUpgradeCTA');
            
            if (this.isPremium) {
                galleryManager.style.display = 'block';
                galleryUpgradeCTA.style.display = 'none';
            } else {
                galleryManager.style.display = 'none';
                galleryUpgradeCTA.style.display = 'flex';
            }
        } catch (error) {
            console.error('❌ Erro ao alternar seção da galeria:', error);
        }
    }

    setupGalleryEvents() {
        console.log('🔄 Configurando eventos da galeria...');
        
        const uploadBtn = document.getElementById('uploadGalleryBtn');
        const galleryUpload = document.getElementById('galleryUpload');
        
        if (uploadBtn && galleryUpload) {
            // Remover event listeners antigos
            uploadBtn.replaceWith(uploadBtn.cloneNode(true));
            galleryUpload.replaceWith(galleryUpload.cloneNode(true));
            
            const newUploadBtn = document.getElementById('uploadGalleryBtn');
            const newGalleryUpload = document.getElementById('galleryUpload');
            
            newUploadBtn.addEventListener('click', () => {
                console.log('🎯 Clicou no botão de upload da galeria');
                newGalleryUpload.click();
            });
            
            newGalleryUpload.addEventListener('change', (event) => {
                console.log('📁 Arquivos selecionados:', event.target.files);
                this.handleGalleryUpload(event);
            });
            
            console.log('✅ Eventos da galeria configurados com sucesso');
        } else {
            console.error('❌ Elementos do upload não encontrados');
        }
    }

    async handleGalleryUpload(event) {
        const files = Array.from(event.target.files);
        
        console.log('🔄 Iniciando upload de:', files.length, 'arquivos');
        
        if (files.length === 0) return;
        
        // Verificar espaço disponível
        const storageUsed = await this.getStorageUsage();
        const availableSpace = 10 * 1024 * 1024 - storageUsed;
        
        let totalNewSize = 0;
        const validFiles = [];
        
        // Validar arquivos
        for (const file of files) {
            if (file.size > 2 * 1024 * 1024) {
                showNotification(`❌ A imagem ${file.name} excede 2MB`, 'error');
                continue;
            }
            
            if (!file.type.startsWith('image/')) {
                showNotification(`❌ ${file.name} não é uma imagem válida`, 'error');
                continue;
            }
            
            totalNewSize += file.size;
            validFiles.push(file);
        }
        
        if (validFiles.length === 0) return;
        
        if (totalNewSize > availableSpace) {
            showNotification('❌ Espaço insuficiente na galeria', 'error');
            return;
        }
        
        // Fazer upload das imagens
        await this.uploadGalleryImages(validFiles);
        
        // Limpar input
        event.target.value = '';
    }

    async uploadGalleryImages(files) {
        const uploadLoading = document.createElement('div');
        uploadLoading.className = 'upload-loading';
        uploadLoading.innerHTML = `
            <div class="spinner" style="width: 30px; height: 30px;"></div>
            <p>Enviando ${files.length} imagem(ns)...</p>
            <div class="upload-progress">
                <div class="upload-progress-bar" style="width: 0%"></div>
            </div>
        `;
        
        const galleryUpload = document.getElementById('galleryUpload');
        galleryUpload.parentNode.appendChild(uploadLoading);
        uploadLoading.style.display = 'block';
        
        try {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const progress = ((i + 1) / files.length) * 100;
                uploadLoading.querySelector('.upload-progress-bar').style.width = `${progress}%`;
                
                await this.uploadGalleryImage(file);
            }
            
            showNotification(`✅ ${files.length} imagem(ns) adicionada(s) com sucesso!`, 'success');
            await this.loadUserGallery();
            await this.updateStorageDisplay();
            
        } catch (error) {
            console.error('❌ Erro ao fazer upload das imagens:', error);
            showNotification('❌ ' + error.message, 'error');
        } finally {
            uploadLoading.remove();
        }
    }

    async uploadGalleryImage(file) {
        try {
            console.log('🔄 Iniciando upload da imagem:', file.name, file.size, 'bytes');
            
            // Verificar status premium ANTES do upload
            if (!this.isPremium) {
                throw new Error('Apenas usuários premium podem fazer upload na galeria');
            }

            // Gerar nome único para o arquivo
            const fileExt = file.name.split('.').pop().toLowerCase();
            const fileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
            const filePath = `${this.currentUser.id}/${fileName}`;
            
            console.log('📤 Fazendo upload para:', filePath);

            // 1. Fazer upload para o storage
            const { data: uploadData, error: uploadError } = await this.supabase.storage
                .from('gallery')
                .upload(filePath, file);

            if (uploadError) {
                console.error('❌ Erro no upload storage:', uploadError);
                
                if (uploadError.message?.includes('policy') || uploadError.message?.includes('row-level security')) {
                    throw new Error('Permissão negada. Verifique se você é usuário premium.');
                }
                
                throw new Error('Erro ao fazer upload: ' + uploadError.message);
            }

            console.log('✅ Upload no storage realizado com sucesso');

            // 2. Obter URL pública
            const { data: urlData } = await this.supabase.storage
                .from('gallery')
                .getPublicUrl(filePath);

            console.log('🔗 URL pública gerada:', urlData.publicUrl);

            // 3. Salvar metadados no banco
            const galleryData = {
                user_id: this.currentUser.id,
                image_name: fileName,
                image_url: filePath,
                file_size_bytes: file.size,
                mime_type: file.type,
                public_url: urlData.publicUrl,
                created_at: new Date().toISOString()
            };

            console.log('💾 Tentando salvar metadados:', galleryData);

            const { data: dbData, error: dbError } = await this.supabase
                .from('user_gallery')
                .insert([galleryData])
                .select();

            if (dbError) {
                console.error('❌ Erro ao salvar metadados:', dbError);
                
                // Reverter upload do storage se falhar no banco
                console.log('🔄 Revertendo upload do storage...');
                await this.supabase.storage.from('gallery').remove([filePath]);
                
                throw new Error('Erro ao salvar metadados: ' + dbError.message);
            }

            console.log('✅ Metadados salvos no banco com sucesso:', dbData);
            return uploadData;

        } catch (error) {
            console.error('❌ Erro crítico no upload:', error);
            throw error;
        }
    }

    async loadUserGallery() {
        try {
            console.log('🔄 Carregando galeria do usuário...');
            
            // Método direto: Listar arquivos do storage
            const { data: files, error } = await this.supabase.storage
                .from('gallery')
                .list(this.currentUser.id + '/');

            if (error) {
                console.error('❌ Erro ao listar arquivos:', error);
                
                // Se a pasta não existe, mostrar galeria vazia
                if (error.message?.includes('not found')) {
                    console.log('📁 Pasta da galeria não existe - será criada automaticamente');
                    this.currentGalleryImages = [];
                    this.displayGallery([]);
                    return;
                }
                throw error;
            }

            // Converter arquivos para o formato esperado
            const images = files
                .filter(file => file.name !== '.emptyFolderPlaceholder')
                .map(file => ({
                    id: file.id || file.name,
                    image_url: `${this.currentUser.id}/${file.name}`,
                    image_name: file.name,
                    created_at: file.created_at
                }));

            console.log(`✅ ${images.length} imagens encontradas no storage`);
            this.currentGalleryImages = images;
            
            this.displayGallery(images);
            await this.updateStorageDisplay();
            
        } catch (error) {
            console.error('❌ Erro ao carregar galeria:', error);
            this.currentGalleryImages = [];
            this.displayGallery([]);
        }
    }

    displayGallery(images) {
        const galleryGrid = document.getElementById('galleryGrid');
        
        if (!images || images.length === 0) {
            galleryGrid.innerHTML = this.createEmptyGalleryHTML();
            return;
        }
        
        galleryGrid.innerHTML = images.map((image, index) => `
            <div class="gallery-item" data-index="${index}">
                <div class="gallery-image-container">
                    <img src="" data-src="${image.image_url}" alt="Imagem da galeria" class="gallery-image">
                    <div class="image-loading">Carregando...</div>
                </div>
                <div class="gallery-actions">
                    <button class="gallery-btn" onclick="galeriaSystem.deleteGalleryImage('${image.image_url}')" title="Excluir">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Carregar imagens imediatamente
        this.loadGalleryImagesImmediately();
    }

    createEmptyGalleryHTML() {
        return `
            <div class="empty-gallery">
                <i class="fas fa-images" style="font-size: 3rem; color: var(--secondary); margin-bottom: 1rem;"></i>
                <p>Sua galeria está vazia</p>
                <p style="font-size: 0.9rem; color: var(--text-light);">Adicione fotos para compartilhar momentos especiais</p>
            </div>
        `;
    }

    loadGalleryImagesImmediately() {
        const images = document.querySelectorAll('.gallery-image[data-src]');
        
        images.forEach(async (img) => {
            const imageUrl = img.getAttribute('data-src');
            await this.loadGalleryImage(img, imageUrl);
        });
    }

    async loadGalleryImage(imgElement, imageUrl) {
        try {
            if (!imageUrl) return;
            
            console.log('🔄 Carregando imagem:', imageUrl);
            
            // Usar URL assinada (para buckets privados)
            const { data, error } = await this.supabase.storage
                .from('gallery')
                .createSignedUrl(imageUrl, 3600); // 1 hora de expiração
        
            if (error) {
                console.error('❌ Erro na URL assinada:', error);
                this.showFallbackImage(imgElement);
                return;
            }
            
            if (data && data.signedUrl) {
                console.log('✅ URL assinada criada com sucesso');
                
                imgElement.src = data.signedUrl;
                imgElement.removeAttribute('data-src');
                imgElement.style.display = 'block';
                imgElement.style.opacity = '1';
                
                // Esconder loading
                const loading = imgElement.parentElement.querySelector('.image-loading');
                if (loading) loading.style.display = 'none';
                
                console.log('✅ Imagem carregada via URL assinada');
            }
            
        } catch (error) {
            console.error('❌ Erro ao carregar imagem:', error);
            this.showFallbackImage(imgElement);
        }
    }

    showFallbackImage(imgElement) {
        console.log('🔄 Mostrando fallback...');
        imgElement.style.background = 'linear-gradient(135deg, var(--secondary), var(--primary))';
        imgElement.style.display = 'flex';
        imgElement.style.alignItems = 'center';
        imgElement.style.justifyContent = 'center';
        imgElement.style.color = 'white';
        imgElement.style.fontSize = '2rem';
        imgElement.innerHTML = '🖼️';
        imgElement.removeAttribute('data-src');
        
        // Esconder loading
        const loading = imgElement.parentElement.querySelector('.image-loading');
        if (loading) loading.style.display = 'none';
    }

    async deleteGalleryImage(imagePath) {
        if (!confirm('Tem certeza que deseja excluir esta imagem?')) return;
        
        try {
            // Excluir do storage
            const { error: storageError } = await this.supabase.storage
                .from('gallery')
                .remove([imagePath]);
            
            if (storageError) throw storageError;

            // Excluir metadados do banco
            const { error: dbError } = await this.supabase
                .from('user_gallery')
                .delete()
                .eq('image_url', imagePath);
            
            if (dbError) {
                console.warn('⚠️ Erro ao excluir metadados, mas imagem foi removida do storage');
            }
            
            showNotification('✅ Imagem excluída com sucesso', 'success');
            await this.loadUserGallery(); // Recarregar a galeria
            
        } catch (error) {
            console.error('❌ Erro ao excluir imagem:', error);
            showNotification('❌ Erro ao excluir imagem', 'error');
        }
    }

    async getStorageUsage() {
        try {
            // Listar arquivos e somar tamanhos
            const { data: files, error } = await this.supabase.storage
                .from('gallery')
                .list(this.currentUser.id + '/');
            
            if (error) return 0;
            
            return files.reduce((total, file) => total + (file.metadata?.size || 0), 0);
        } catch (error) {
            console.error('❌ Erro ao calcular uso de storage:', error);
            return 0;
        }
    }

    async updateStorageDisplay() {
        const storageUsed = await this.getStorageUsage();
        const storageUsedMB = (storageUsed / (1024 * 1024)).toFixed(1);
        const storagePercentage = (storageUsed / (10 * 1024 * 1024)) * 100;
        
        document.getElementById('storageUsed').textContent = `${storageUsedMB}MB`;
        document.getElementById('storageFill').style.width = `${Math.min(storagePercentage, 100)}%`;
    }

    // ==================== MÉTODOS PÚBLICOS ====================
    async recarregarGaleria() {
        console.log('🔄 Recarregando galeria...');
        await this.loadUserGallery();
    }

    getQuantidadeImagens() {
        return this.currentGalleryImages.length;
    }

    isUsuarioPremium() {
        return this.isPremium;
    }

    getImagens() {
        return this.currentGalleryImages;
    }
}

// ==================== INICIALIZAÇÃO GLOBAL ====================
async function inicializarSistemaGaleria(supabase, currentUser) {
    console.log('🌐 inicializarSistemaGaleria CHAMADA!');
    
    if (!supabase || !currentUser) {
        console.error('❌ Parâmetros inválidos para inicialização');
        return null;
    }

    try {
        const sistema = new GaleriaSystem(supabase, currentUser);
        
        // Expor globalmente para acesso fácil
        window.galeriaSystem = sistema;
        
        console.log('✅ Sistema de galeria criado e exposto globalmente!');
        return sistema;
        
    } catch (error) {
        console.error('❌ Falha crítica na criação:', error);
        return null;
    }
}

// ==================== EXPORTAÇÕES GLOBAIS ====================
window.GaleriaSystem = GaleriaSystem;
window.inicializarSistemaGaleria = inicializarSistemaGaleria;

console.log('✅ painel-galeria.js carregado e pronto!');