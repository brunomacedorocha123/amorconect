// sistema-vibe.js - Sistema completo do Vibe Exclusive
class SistemaVibe {
    constructor() {
        this.supabase = supabase;
        this.currentUser = null;
        this.currentAgreement = null;
        this.pendingProposals = [];
        this.messageThreshold = 30; // 30 mensagens para propor
        this.coolingOffDays = 7; // 7 dias de quarentena
    }

    async initialize(user) {
        try {
            this.currentUser = user;
            console.log('🔄 Inicializando Sistema Vibe...');
            
            await this.loadCurrentAgreement();
            await this.loadPendingProposals();
            this.setupRealtimeListeners();
            
            console.log('✅ Sistema Vibe inicializado');
        } catch (error) {
            console.error('❌ Erro ao inicializar Sistema Vibe:', error);
        }
    }

    // ==================== VERIFICAÇÕES ====================
    
    async canShowFidelityButton(otherUserId) {
        try {
            console.log(`🔍 Verificando condições para Vibe com usuário: ${otherUserId}`);
            
            const conditions = await Promise.all([
                this.hasMinimumMessages(otherUserId),
                this.isUserPremium(),
                this.noActiveAgreement(),
                this.noCoolingOffPeriod(),
                this.notAlreadyProposed(otherUserId)
            ]);

            const canShow = conditions.every(Boolean);
            console.log(`📊 Condições: ${conditions} → Pode mostrar: ${canShow}`);
            
            return canShow;

        } catch (error) {
            console.error('Erro ao verificar condições:', error);
            return false;
        }
    }

    async hasMinimumMessages(otherUserId) {
        try {
            const { data: messages, error } = await this.supabase
                .rpc('get_conversation_message_count', {
                    p_user1_id: this.currentUser.id,
                    p_user2_id: otherUserId
                });

            if (error) {
                // Fallback: contar mensagens manualmente
                return await this.countMessagesFallback(otherUserId);
            }

            const hasEnoughMessages = messages >= this.messageThreshold;
            console.log(`💬 Mensagens com ${otherUserId}: ${messages}/${this.messageThreshold} → ${hasEnoughMessages}`);
            
            return hasEnoughMessages;

        } catch (error) {
            console.error('Erro ao contar mensagens:', error);
            return false;
        }
    }

    async countMessagesFallback(otherUserId) {
        const { data: messages, error } = await this.supabase
            .from('messages')
            .select('id')
            .or(`and(sender_id.eq.${this.currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${this.currentUser.id})`);

        if (error) return false;
        
        return messages.length >= this.messageThreshold;
    }

    async isUserPremium() {
        try {
            // ✅ USANDO SEU PREMIUM-MANAGER EXISTENTE
            if (window.PremiumManager && typeof window.PremiumManager.checkPremiumStatus === 'function') {
                const isPremium = await PremiumManager.checkPremiumStatus();
                console.log(`👑 Premium pelo PremiumManager: ${isPremium}`);
                return isPremium;
            }

            // ✅ FALLBACK: verificar na tabela de subscriptions
            const { data: subscription, error } = await this.supabase
                .from('user_subscriptions')
                .select('status, expires_at')
                .eq('user_id', this.currentUser.id)
                .eq('status', 'active')
                .gte('expires_at', new Date().toISOString())
                .single();

            const isPremium = !error && subscription !== null;
            console.log(`👑 Premium direto do banco: ${isPremium}`);
            return isPremium;

        } catch (error) {
            console.error('Erro ao verificar premium:', error);
            return false;
        }
    }

    async noActiveAgreement() {
        const noActive = !this.currentAgreement || this.currentAgreement.status !== 'active';
        console.log(`🚫 Sem acordo ativo: ${noActive}`);
        return noActive;
    }

    async noCoolingOffPeriod() {
        try {
            const { data: lastAgreement, error } = await this.supabase
                .from('fidelity_agreements')
                .select('cancelled_at')
                .or(`user_a.eq.${this.currentUser.id},user_b.eq.${this.currentUser.id}`)
                .eq('status', 'cancelled')
                .order('cancelled_at', { ascending: false })
                .limit(1)
                .single();

            if (error || !lastAgreement) {
                console.log('📅 Sem histórico de cancelamento');
                return true;
            }

            const cancelledDate = new Date(lastAgreement.cancelled_at);
            const quarantineEnd = new Date(cancelledDate);
            quarantineEnd.setDate(quarantineEnd.getDate() + this.coolingOffDays);
            
            const isInQuarantine = new Date() < quarantineEnd;
            console.log(`⏰ Em quarentena: ${isInQuarantine} (até ${quarantineEnd.toLocaleDateString()})`);
            
            return !isInQuarantine;

        } catch (error) {
            console.error('Erro ao verificar quarentena:', error);
            return true;
        }
    }

    async notAlreadyProposed(otherUserId) {
        const alreadyProposed = this.pendingProposals.some(
            proposal => proposal.receiver_id === otherUserId
        );
        
        console.log(`📨 Já proposto: ${alreadyProposed}`);
        return !alreadyProposed;
    }

    // ==================== PROPOSTAS ====================

    async proposeFidelityAgreement(otherUserId) {
        try {
            console.log(`🎯 Propondo Vibe Exclusive para: ${otherUserId}`);
            
            // Verificar condições novamente (segurança)
            const canPropose = await this.canShowFidelityButton(otherUserId);
            if (!canPropose) {
                throw new Error('Não atende às condições para propor Vibe Exclusive');
            }

            const { data, error } = await this.supabase
                .rpc('propose_fidelity_agreement', {
                    p_proposer_id: this.currentUser.id,
                    p_receiver_id: otherUserId
                });

            if (error) throw error;

            if (data === 'success') {
                console.log('✅ Proposta enviada com sucesso');
                await this.loadPendingProposals(); // Atualizar lista
                this.showNotification('Proposta de Vibe Exclusive enviada!', 'success');
                return true;
            } else {
                throw new Error(data);
            }

        } catch (error) {
            console.error('❌ Erro ao propor acordo:', error);
            this.showNotification(error.message || 'Erro ao enviar proposta', 'error');
            return false;
        }
    }

    async acceptFidelityProposal(proposalId) {
        try {
            console.log(`✅ Aceitando proposta: ${proposalId}`);
            
            const { data, error } = await this.supabase
                .rpc('accept_fidelity_agreement', {
                    p_agreement_id: proposalId,
                    p_acceptor_id: this.currentUser.id
                });

            if (error) throw error;

            if (data === 'success') {
                console.log('🎉 Acordo ativado com sucesso!');
                await this.loadCurrentAgreement();
                await this.applyFidelityRestrictions();
                this.showNotification('Vibe Exclusive ativado!', 'success');
                return true;
            } else {
                throw new Error(data);
            }

        } catch (error) {
            console.error('❌ Erro ao aceitar proposta:', error);
            this.showNotification('Erro ao aceitar proposta', 'error');
            return false;
        }
    }

    async rejectFidelityProposal(proposalId) {
        try {
            const { error } = await this.supabase
                .from('fidelity_agreements')
                .update({ status: 'rejected' })
                .eq('id', proposalId);

            if (error) throw error;

            console.log('❌ Proposta rejeitada');
            await this.loadPendingProposals();
            this.showNotification('Proposta recusada', 'info');

        } catch (error) {
            console.error('Erro ao rejeitar proposta:', error);
            this.showNotification('Erro ao recusar proposta', 'error');
        }
    }

    // ==================== RESTRIÇÕES ====================

    async applyFidelityRestrictions() {
        console.log('🔒 Aplicando restrições do Vibe Exclusive...');
        
        // As restrições serão aplicadas via:
        // 1. RLS (Row Level Security) no Supabase
        // 2. Filtros nas queries do frontend
        // 3. Atualização da UI
        
        this.updateUIForFidelity();
    }

    updateUIForFidelity() {
        // Esconder botões de busca
        const searchButtons = document.querySelectorAll('[href*="busca"], [href*="home"]');
        searchButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        // Atualizar header do chat
        this.updateChatHeaderForFidelity();
        
        console.log('🎨 UI atualizada para modo Vibe Exclusive');
    }

    updateChatHeaderForFidelity() {
        const fidelityBtn = document.getElementById('fidelityProposeBtn');
        if (fidelityBtn) {
            fidelityBtn.innerHTML = '<i class="fas fa-gem"></i> Vibe Ativo';
            fidelityBtn.classList.add('active');
            fidelityBtn.onclick = () => this.showManageFidelityModal();
        }
    }

    // ==================== CANCELAMENTO ====================

    async cancelFidelityAgreement() {
        try {
            if (!this.currentAgreement) {
                throw new Error('Nenhum acordo ativo para cancelar');
            }

            console.log('🛑 Cancelando Vibe Exclusive...');

            const { data, error } = await this.supabase
                .rpc('cancel_fidelity_agreement', {
                    p_agreement_id: this.currentAgreement.id,
                    p_user_id: this.currentUser.id
                });

            if (error) throw error;

            if (data === 'success') {
                console.log('✅ Acordo cancelado, entrando em quarentena...');
                await this.loadCurrentAgreement();
                this.removeFidelityRestrictions();
                this.showNotification('Vibe Exclusive cancelado. Quarentena de 7 dias.', 'info');
                return true;
            } else {
                throw new Error(data);
            }

        } catch (error) {
            console.error('❌ Erro ao cancelar acordo:', error);
            this.showNotification('Erro ao cancelar acordo', 'error');
            return false;
        }
    }

    removeFidelityRestrictions() {
        // Restaurar UI normal
        const searchButtons = document.querySelectorAll('[href*="busca"], [href*="home"]');
        searchButtons.forEach(btn => {
            btn.style.display = 'flex';
        });

        // Atualizar botão
        const fidelityBtn = document.getElementById('fidelityProposeBtn');
        if (fidelityBtn) {
            fidelityBtn.style.display = 'none';
        }

        console.log('🔓 Restrições removidas');
    }

    // ==================== CARREGAMENTO DE DADOS ====================

    async loadCurrentAgreement() {
        try {
            const { data: agreements, error } = await this.supabase
                .from('fidelity_agreements')
                .select(`
                    id,
                    user_a,
                    user_b,
                    proposed_by,
                    status,
                    proposed_at,
                    accepted_at,
                    cancelled_at,
                    profile_a:profiles!fidelity_agreements_user_a_fkey(nickname, avatar_url),
                    profile_b:profiles!fidelity_agreements_user_b_fkey(nickname, avatar_url)
                `)
                .or(`user_a.eq.${this.currentUser.id},user_b.eq.${this.currentUser.id}`)
                .in('status', ['active', 'pending'])
                .order('proposed_at', { ascending: false })
                .limit(1);

            if (error) throw error;

            this.currentAgreement = agreements && agreements.length > 0 ? agreements[0] : null;
            console.log(`📄 Acordo atual: ${this.currentAgreement ? this.currentAgreement.status : 'Nenhum'}`);

        } catch (error) {
            console.error('Erro ao carregar acordo atual:', error);
            this.currentAgreement = null;
        }
    }

    async loadPendingProposals() {
        try {
            const { data: proposals, error } = await this.supabase
                .from('fidelity_agreements')
                .select(`
                    id,
                    proposed_by,
                    user_a,
                    user_b,
                    proposed_at,
                    profile_proposer:profiles!fidelity_agreements_proposed_by_fkey(nickname, avatar_url),
                    profile_a:profiles!fidelity_agreements_user_a_fkey(nickname),
                    profile_b:profiles!fidelity_agreements_user_b_fkey(nickname)
                `)
                .eq('status', 'pending')
                .or(`user_a.eq.${this.currentUser.id},user_b.eq.${this.currentUser.id}`);

            if (error) throw error;

            this.pendingProposals = proposals || [];
            console.log(`📨 Propostas pendentes: ${this.pendingProposals.length}`);

        } catch (error) {
            console.error('Erro ao carregar propostas:', error);
            this.pendingProposals = [];
        }
    }

    // ==================== TEMPO REAL ====================

    setupRealtimeListeners() {
        // Escutar novas propostas
        this.supabase
            .channel('fidelity-proposals')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'fidelity_agreements',
                    filter: `user_a=eq.${this.currentUser.id}`
                },
                (payload) => {
                    console.log('📥 Nova proposta recebida:', payload);
                    this.handleNewProposal(payload.new);
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'fidelity_agreements',
                    filter: `or(user_a=eq.${this.currentUser.id},user_b=eq.${this.currentUser.id})`
                },
                (payload) => {
                    console.log('🔄 Atualização de acordo:', payload);
                    this.handleAgreementUpdate(payload.new);
                }
            )
            .subscribe();
    }

    handleNewProposal(proposal) {
        this.pendingProposals.unshift(proposal);
        this.showNotification('Nova proposta de Vibe Exclusive recebida!', 'info');
    }

    async handleAgreementUpdate(agreement) {
        if (agreement.status === 'active') {
            await this.loadCurrentAgreement();
            await this.applyFidelityRestrictions();
        } else if (agreement.status === 'cancelled') {
            await this.loadCurrentAgreement();
            this.removeFidelityRestrictions();
        }
    }

    // ==================== UTILITÁRIOS ====================

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            console.log(`📢 ${type.toUpperCase()}: ${message}`);
        }
    }

    // ==================== MODAIS ====================

    showManageFidelityModal() {
        if (!this.currentAgreement) return;

        const partner = this.currentAgreement.user_a === this.currentUser.id ? 
            this.currentAgreement.profile_b : this.currentAgreement.profile_a;

        const modalContent = `
            <div class="manage-fidelity">
                <div class="fidelity-status">
                    <i class="fas fa-gem"></i>
                    <h4>Vibe Exclusive Ativo</h4>
                    <p>Com: <strong>${partner.nickname}</strong></p>
                    <p>Desde: <strong>${new Date(this.currentAgreement.accepted_at).toLocaleDateString('pt-BR')}</strong></p>
                </div>

                <div class="fidelity-stats">
                    <h5>📊 Estatísticas da Conexão:</h5>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-value" id="daysTogether">${this.getDaysTogether()}</span>
                            <span class="stat-label">dias juntos</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="messagesExchanged">${this.getMessageCount()}</span>
                            <span class="stat-label">mensagens</span>
                        </div>
                    </div>
                </div>

                <div class="fidelity-actions">
                    <div class="action-warning">
                        <i class="fas fa-info-circle"></i>
                        <p>Ao encerrar, entrará em quarentena de <strong>7 dias</strong> antes de poder propor novo Vibe Exclusive.</p>
                    </div>
                </div>
            </div>
        `;

        // Usar modal existente ou criar dinamicamente
        const modal = document.getElementById('manageFidelityModal');
        const content = document.getElementById('manageFidelityContent');
        
        if (modal && content) {
            content.innerHTML = modalContent;
            modal.style.display = 'flex';
        }
    }

    getDaysTogether() {
        if (!this.currentAgreement || !this.currentAgreement.accepted_at) return '0';
        const startDate = new Date(this.currentAgreement.accepted_at);
        const today = new Date();
        const diffTime = Math.abs(today - startDate);
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    getMessageCount() {
        // Implementar contagem de mensagens entre os usuários
        return '∞'; // Placeholder
    }

    // ==================== INTEGRAÇÃO COM MESSAGES.JS ====================

    // Função para o MessagesSystem chamar quando selecionar conversa
    async onConversationSelected(otherUserId) {
        if (!otherUserId) return;
        
        const canShowButton = await this.canShowFidelityButton(otherUserId);
        this.updateFidelityButton(canShowButton);
    }

    updateFidelityButton(show) {
        let fidelityBtn = document.getElementById('fidelityProposeBtn');
        
        if (!fidelityBtn) {
            // Criar botão se não existir
            this.createFidelityButton();
            fidelityBtn = document.getElementById('fidelityProposeBtn');
        }
        
        if (fidelityBtn) {
            if (show && !this.currentAgreement) {
                fidelityBtn.style.display = 'flex';
                fidelityBtn.innerHTML = '<i class="fas fa-gem"></i> Vibe Exclusive';
                fidelityBtn.onclick = () => this.proposeFidelityAgreement(window.MessagesSystem.currentConversation);
                fidelityBtn.classList.remove('active');
            } else if (this.currentAgreement && this.currentAgreement.status === 'active') {
                fidelityBtn.style.display = 'flex';
                fidelityBtn.innerHTML = '<i class="fas fa-gem"></i> Vibe Ativo';
                fidelityBtn.onclick = () => this.showManageFidelityModal();
                fidelityBtn.classList.add('active');
            } else {
                fidelityBtn.style.display = 'none';
            }
        }
    }

    createFidelityButton() {
        const chatHeader = document.querySelector('.chat-header-actions');
        if (!chatHeader) return;
        
        const fidelityBtn = document.createElement('button');
        fidelityBtn.id = 'fidelityProposeBtn';
        fidelityBtn.className = 'chat-action-btn fidelity-btn';
        fidelityBtn.title = 'Propor Vibe Exclusive';
        fidelityBtn.style.display = 'none';
        
        chatHeader.appendChild(fidelityBtn);
    }

    // ==================== DESTRUIÇÃO ====================

    destroy() {
        // Limpar listeners e recursos
        this.supabase.removeAllChannels();
        console.log('🧹 Sistema Vibe destruído');
    }
}

// Inicialização global
window.SistemaVibe = SistemaVibe;

// Inicializar automaticamente quando MessagesSystem estiver pronto
let initializationAttempts = 0;
const maxAttempts = 10;

function initializeSistemaVibe() {
    if (window.MessagesSystem && window.MessagesSystem.currentUser) {
        window.sistemaVibe = new SistemaVibe();
        window.sistemaVibe.initialize(window.MessagesSystem.currentUser);
        
        // 🔄 INTEGRAÇÃO: quando MessagesSystem selecionar conversa
        const originalSelectConversation = window.MessagesSystem.selectConversation;
        window.MessagesSystem.selectConversation = async function(otherUserId) {
            const result = await originalSelectConversation.call(this, otherUserId);
            if (window.sistemaVibe) {
                await window.sistemaVibe.onConversationSelected(otherUserId);
            }
            return result;
        };
        
    } else if (initializationAttempts < maxAttempts) {
        initializationAttempts++;
        setTimeout(initializeSistemaVibe, 1000);
    }
}

// Iniciar quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(initializeSistemaVibe, 2000);
});