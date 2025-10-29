// sistema-vibe.js - Sistema completo do Vibe Exclusive CORRIGIDO
class SistemaVibe {
    constructor() {
        this.supabase = supabase;
        this.currentUser = null;
        this.currentAgreement = null;
        this.pendingProposals = [];
        this.receivedProposals = [];
        this.initialized = false;
    }

    async initialize(user) {
        try {
            if (this.initialized) return;
            
            this.currentUser = user;
            
            await this.loadCurrentAgreement();
            await this.loadPendingProposals();
            await this.loadReceivedProposals();
            this.setupRealtimeListeners();
            this.createProposalsButton();
            this.createFidelityButton();
            
            this.initialized = true;
            
        } catch (error) {
            console.error('Erro ao inicializar Sistema Vibe:', error);
        }
    }

    // ==================== VERIFICAÇÕES ====================
    
    async canShowFidelityButton(otherUserId) {
        try {
            const conditions = await Promise.all([
                this.hasMinimumMessages(otherUserId),
                this.isUserPremium(),
                this.noActiveAgreement(),
                this.noCoolingOffPeriod(),
                this.notAlreadyProposed(otherUserId)
            ]);

            return conditions.every(Boolean);

        } catch (error) {
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
                return await this.countMessagesFallback(otherUserId);
            }

            return messages >= 30;

        } catch (error) {
            return false;
        }
    }

    async countMessagesFallback(otherUserId) {
        const { data: messages, error } = await this.supabase
            .from('messages')
            .select('id')
            .or(`and(sender_id.eq.${this.currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${this.currentUser.id})`);

        if (error) return false;
        return messages.length >= 30;
    }

    async isUserPremium() {
        try {
            if (window.PremiumManager && typeof window.PremiumManager.checkPremiumStatus === 'function') {
                return await PremiumManager.checkPremiumStatus();
            }

            const { data: subscription, error } = await this.supabase
                .from('user_subscriptions')
                .select('status, expires_at')
                .eq('user_id', this.currentUser.id)
                .eq('status', 'active')
                .gte('expires_at', new Date().toISOString())
                .single();

            return !error && subscription !== null;

        } catch (error) {
            return false;
        }
    }

    async noActiveAgreement() {
        return !this.currentAgreement || this.currentAgreement.status !== 'active';
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

            if (error || !lastAgreement) return true;

            const cancelledDate = new Date(lastAgreement.cancelled_at);
            const quarantineEnd = new Date(cancelledDate);
            quarantineEnd.setDate(quarantineEnd.getDate() + 7);
            
            return new Date() >= quarantineEnd;

        } catch (error) {
            return true;
        }
    }

    async notAlreadyProposed(otherUserId) {
        return !this.pendingProposals.some(proposal => proposal.receiver_id === otherUserId);
    }

    // ==================== PROPOSTAS ====================

    async proposeFidelityAgreement(otherUserId) {
        try {
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
                await this.loadPendingProposals();
                this.showNotification('Proposta de Vibe Exclusive enviada!', 'success');
                return true;
            } else {
                throw new Error(data);
            }

        } catch (error) {
            this.showNotification(error.message || 'Erro ao enviar proposta', 'error');
            return false;
        }
    }

    async acceptFidelityProposal(proposalId) {
        try {
            const { data, error } = await this.supabase
                .rpc('accept_fidelity_agreement', {
                    p_agreement_id: proposalId,
                    p_acceptor_id: this.currentUser.id
                });

            if (error) throw error;

            if (data === 'success') {
                await this.loadCurrentAgreement();
                await this.loadReceivedProposals();
                this.updateProposalsButton();
                this.showNotification('Vibe Exclusive ativado!', 'success');
                
                this.closeAllModals();
                return true;
            } else {
                throw new Error(data);
            }

        } catch (error) {
            this.showNotification(error.message || 'Erro ao aceitar proposta', 'error');
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

            await this.loadReceivedProposals();
            this.updateProposalsButton();
            this.showNotification('Proposta recusada', 'info');
            
            this.closeAllModals();

        } catch (error) {
            this.showNotification('Erro ao recusar proposta', 'error');
        }
    }

    // ==================== PROPOSTAS RECEBIDAS ====================

    async loadReceivedProposals() {
        try {
            const { data: proposals, error } = await this.supabase
                .from('fidelity_agreements')
                .select(`
                    id,
                    proposed_by,
                    user_a,
                    user_b,
                    proposed_at,
                    status,
                    profile_proposer:profiles!fidelity_agreements_proposed_by_fkey(nickname, avatar_url)
                `)
                .eq('user_b', this.currentUser.id)
                .eq('status', 'pending');

            if (error) throw error;

            this.receivedProposals = proposals || [];
            this.updateProposalsButton();

        } catch (error) {
            this.receivedProposals = [];
        }
    }

    showReceivedProposalsModal() {
        if (this.receivedProposals.length === 0) {
            this.showNotification('Nenhuma proposta pendente', 'info');
            return;
        }

        const modalContent = `
            <div class="proposals-modal">
                <h4><i class="fas fa-gem"></i> Propostas de Vibe Exclusive</h4>
                <div class="proposals-list">
                    ${this.receivedProposals.map(proposal => `
                        <div class="proposal-item">
                            <div class="proposer-info">
                                <div class="proposer-avatar">
                                    ${proposal.profile_proposer?.avatar_url ? 
                                        `<img src="${proposal.profile_proposer.avatar_url}" alt="${proposal.profile_proposer.nickname}">` :
                                        `<div class="avatar-fallback">${proposal.profile_proposer?.nickname?.charAt(0) || 'U'}</div>`
                                    }
                                </div>
                                <div class="proposer-details">
                                    <strong>${proposal.profile_proposer?.nickname || 'Usuário'}</strong>
                                    <small>Proposta: ${new Date(proposal.proposed_at).toLocaleDateString('pt-BR')}</small>
                                </div>
                            </div>
                            <div class="proposal-actions">
                                <button class="btn btn-success" onclick="sistemaVibe.acceptFidelityProposal('${proposal.id}')">
                                    <i class="fas fa-check"></i> Aceitar
                                </button>
                                <button class="btn btn-outline" onclick="sistemaVibe.rejectFidelityProposal('${proposal.id}')">
                                    <i class="fas fa-times"></i> Recusar
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        this.showCustomModal('Propostas Recebidas', modalContent);
    }

    // ==================== BOTÃO DE PROPOSTAS ====================

    createProposalsButton() {
        const checkChatHeader = () => {
            const chatHeader = document.querySelector('.chat-header-actions');
            
            if (!chatHeader) {
                setTimeout(checkChatHeader, 500);
                return;
            }
            
            if (document.getElementById('viewProposalsBtn')) {
                return;
            }
            
            const proposalsBtn = document.createElement('button');
            proposalsBtn.id = 'viewProposalsBtn';
            proposalsBtn.className = 'chat-action-btn proposals-btn';
            proposalsBtn.title = 'Propostas recebidas';
            proposalsBtn.innerHTML = `
                <i class="fas fa-bell"></i>
                <span class="proposal-badge" id="proposalBadge"></span>
            `;
            
            proposalsBtn.onclick = () => {
                this.showReceivedProposalsModal();
            };
            
            proposalsBtn.style.display = 'none';
            chatHeader.appendChild(proposalsBtn);
            
            this.updateProposalsButton();
        };
        
        checkChatHeader();
    }

    updateProposalsButton() {
        const proposalsBtn = document.getElementById('viewProposalsBtn');
        const proposalBadge = document.getElementById('proposalBadge');
        
        if (!proposalsBtn || !proposalBadge) {
            setTimeout(() => this.updateProposalsButton(), 500);
            return;
        }

        if (this.receivedProposals.length > 0) {
            proposalsBtn.style.display = 'flex';
            proposalBadge.textContent = this.receivedProposals.length;
            proposalBadge.style.display = 'flex';
        } else {
            proposalsBtn.style.display = 'none';
            proposalBadge.style.display = 'none';
        }
    }

    // ==================== BOTÃO VIBE EXCLUSIVE ====================

    createFidelityButton() {
        const checkChatHeader = () => {
            const chatHeader = document.querySelector('.chat-header-actions');
            
            if (!chatHeader) {
                setTimeout(checkChatHeader, 500);
                return;
            }
            
            if (document.getElementById('fidelityProposeBtn')) {
                return;
            }
            
            const fidelityBtn = document.createElement('button');
            fidelityBtn.id = 'fidelityProposeBtn';
            fidelityBtn.className = 'chat-action-btn fidelity-btn';
            fidelityBtn.title = 'Propor Vibe Exclusive';
            fidelityBtn.innerHTML = '<i class="fas fa-gem"></i> Vibe Exclusive';
            fidelityBtn.style.display = 'none';
            
            fidelityBtn.onclick = () => {
                if (window.MessagesSystem && window.MessagesSystem.currentConversation) {
                    this.proposeFidelityAgreement(window.MessagesSystem.currentConversation);
                } else {
                    this.showNotification('Selecione uma conversa primeiro', 'error');
                }
            };
            
            chatHeader.prepend(fidelityBtn);
        };
        
        checkChatHeader();
    }

    // ==================== RESTRIÇÕES ====================

    async applyFidelityRestrictions() {
        this.updateUIForFidelity();
    }

    updateUIForFidelity() {
        const searchButtons = document.querySelectorAll('[href*="busca"], [href*="home"]');
        searchButtons.forEach(btn => {
            btn.style.display = 'none';
        });

        this.updateChatHeaderForFidelity();
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

            const { data, error } = await this.supabase
                .rpc('cancel_fidelity_agreement', {
                    p_agreement_id: this.currentAgreement.id,
                    p_user_id: this.currentUser.id
                });

            if (error) throw error;

            if (data === 'success') {
                await this.loadCurrentAgreement();
                this.removeFidelityRestrictions();
                this.showNotification('Vibe Exclusive cancelado. Quarentena de 7 dias.', 'info');
                return true;
            } else {
                throw new Error(data);
            }

        } catch (error) {
            this.showNotification('Erro ao cancelar acordo', 'error');
            return false;
        }
    }

    removeFidelityRestrictions() {
        const searchButtons = document.querySelectorAll('[href*="busca"], [href*="home"]');
        searchButtons.forEach(btn => {
            btn.style.display = 'flex';
        });

        const fidelityBtn = document.getElementById('fidelityProposeBtn');
        if (fidelityBtn) {
            fidelityBtn.style.display = 'none';
        }
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

            if (this.currentAgreement && this.currentAgreement.status === 'active') {
                await this.applyFidelityRestrictions();
            }

        } catch (error) {
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

        } catch (error) {
            this.pendingProposals = [];
        }
    }

    // ==================== TEMPO REAL ====================

    setupRealtimeListeners() {
        this.supabase
            .channel('fidelity-proposals')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'fidelity_agreements',
                    filter: `user_b=eq.${this.currentUser.id}`
                },
                (payload) => {
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
                    this.handleAgreementUpdate(payload.new);
                }
            )
            .subscribe();
    }

    handleNewProposal(proposal) {
        this.receivedProposals.unshift(proposal);
        this.updateProposalsButton();
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

    // ==================== INTEGRAÇÃO COM MESSAGES.JS ====================

    async onConversationSelected(otherUserId) {
        if (!otherUserId) return;
        
        const canShowButton = await this.canShowFidelityButton(otherUserId);
        this.updateFidelityButton(canShowButton, otherUserId);
    }

    updateFidelityButton(show, otherUserId) {
        const fidelityBtn = document.getElementById('fidelityProposeBtn');
        
        if (!fidelityBtn) {
            this.createFidelityButton();
            return;
        }
        
        if (show && !this.currentAgreement) {
            fidelityBtn.style.display = 'flex';
            fidelityBtn.innerHTML = '<i class="fas fa-gem"></i> Vibe Exclusive';
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
                    <p>Com: <strong>${partner?.nickname || 'Usuário'}</strong></p>
                    <p>Desde: <strong>${new Date(this.currentAgreement.accepted_at).toLocaleDateString('pt-BR')}</strong></p>
                </div>

                <div class="fidelity-stats">
                    <h5>Estatísticas da Conexão:</h5>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <span class="stat-value">${this.getDaysTogether()}</span>
                            <span class="stat-label">dias juntos</span>
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

        const modal = document.getElementById('manageFidelityModal');
        const content = document.getElementById('manageFidelityContent');
        
        if (modal && content) {
            content.innerHTML = modalContent;
            modal.style.display = 'flex';
        }
    }

    showCustomModal(title, content) {
        const modal = document.getElementById('fidelityModal');
        const modalContent = document.getElementById('fidelityModalContent');
        
        if (modal && modalContent) {
            const fullContent = `
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="closeFidelityModal()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            `;
            
            modalContent.innerHTML = fullContent;
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

    closeAllModals() {
        const modals = ['fidelityModal', 'manageFidelityModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
        });
    }

    // ==================== UTILITÁRIOS ====================

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 16px;
                border-radius: 8px;
                color: white;
                z-index: 1000;
                background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            `;
            notification.innerHTML = `
                <div style="display: flex; align-items: center; gap: 8px;">
                    <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;
            
            document.body.appendChild(notification);
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 3000);
        }
    }

    destroy() {
        this.supabase.removeAllChannels();
        this.initialized = false;
    }
}

// ==================== INICIALIZAÇÃO GLOBAL CORRIGIDA ====================

window.SistemaVibe = SistemaVibe;

function initializeSistemaVibe() {
    if (window.MessagesSystem && window.MessagesSystem.currentUser && !window.sistemaVibe) {
        window.sistemaVibe = new SistemaVibe();
        window.sistemaVibe.initialize(window.MessagesSystem.currentUser);
        
        // Conectar com o MessagesSystem
        const originalSelectConversation = window.MessagesSystem.selectConversation;
        window.MessagesSystem.selectConversation = async function(otherUserId) {
            const result = await originalSelectConversation.call(this, otherUserId);
            if (window.sistemaVibe) {
                await window.sistemaVibe.onConversationSelected(otherUserId);
            }
            return result;
        };
        
        // Criar botões imediatamente
        setTimeout(() => {
            window.sistemaVibe.createProposalsButton();
            window.sistemaVibe.createFidelityButton();
        }, 1000);
    } else {
        setTimeout(initializeSistemaVibe, 1000);
    }
}

// Iniciar quando DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSistemaVibe);
} else {
    initializeSistemaVibe();
}

// ==================== FUNÇÕES GLOBAIS PARA AS PROPOSTAS ====================

window.acceptProposal = function(proposalId) {
    if (window.sistemaVibe) {
        window.sistemaVibe.acceptFidelityProposal(proposalId);
    }
};

window.rejectProposal = function(proposalId) {
    if (window.sistemaVibe) {
        window.sistemaVibe.rejectFidelityProposal(proposalId);
    }
};

// ==================== FUNÇÕES GLOBAIS PARA OS MODAIS ====================

window.closeFidelityModal = function() {
    const modal = document.getElementById('fidelityModal');
    if (modal) modal.style.display = 'none';
};

window.closeManageFidelityModal = function() {
    const modal = document.getElementById('manageFidelityModal');
    if (modal) modal.style.display = 'none';
};