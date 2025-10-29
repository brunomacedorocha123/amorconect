// sistema-vibe.js - VERSÃO COMPLETA E FUNCIONAL
class SistemaVibe {
    constructor() {
        this.supabase = supabase;
        this.currentUser = null;
        this.currentAgreement = null;
        this.pendingProposals = [];
        this.receivedProposals = [];
    }

    async initialize(user) {
        this.currentUser = user;
        await this.loadCurrentAgreement();
        await this.loadPendingProposals();
        await this.loadReceivedProposals();
        this.createProposalsButton();
        this.createFidelityButton();
    }

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
                                <button class="btn btn-success" onclick="acceptProposal('${proposal.id}')">
                                    <i class="fas fa-check"></i> Aceitar
                                </button>
                                <button class="btn btn-outline" onclick="rejectProposal('${proposal.id}')">
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

    createProposalsButton() {
        // Verificar se o botão já existe
        if (document.getElementById('viewProposalsBtn')) {
            return;
        }

        // Aguardar o chat header carregar
        const checkChatHeader = () => {
            const chatHeader = document.querySelector('.chat-header-actions');
            
            if (!chatHeader) {
                setTimeout(checkChatHeader, 500);
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

    createFidelityButton() {
        if (document.getElementById('fidelityProposeBtn')) {
            return;
        }

        const checkChatHeader = () => {
            const chatHeader = document.querySelector('.chat-header-actions');
            
            if (!chatHeader) {
                setTimeout(checkChatHeader, 500);
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

    async proposeFidelityAgreement(otherUserId) {
        try {
            const { data, error } = await this.supabase
                .rpc('propose_fidelity_agreement', {
                    p_proposer_id: this.currentUser.id,
                    p_receiver_id: otherUserId
                });

            if (error) throw error;

            if (data === 'success') {
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
            this.showNotification('Proposta recusada', 'info');
            this.closeAllModals();

        } catch (error) {
            this.showNotification('Erro ao recusar proposta', 'error');
        }
    }

    async loadCurrentAgreement() {
        try {
            const { data: agreements, error } = await this.supabase
                .from('fidelity_agreements')
                .select('id, user_a, user_b, status, accepted_at')
                .or(`user_a.eq.${this.currentUser.id},user_b.eq.${this.currentUser.id}`)
                .eq('status', 'active')
                .single();

            this.currentAgreement = agreements;
        } catch (error) {
            this.currentAgreement = null;
        }
    }

    async loadPendingProposals() {
        try {
            const { data: proposals, error } = await this.supabase
                .from('fidelity_agreements')
                .select('id, user_a, user_b, status')
                .eq('status', 'pending')
                .or(`user_a.eq.${this.currentUser.id},user_b.eq.${this.currentUser.id}`);

            this.pendingProposals = proposals || [];
        } catch (error) {
            this.pendingProposals = [];
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

    closeAllModals() {
        const modals = ['fidelityModal', 'manageFidelityModal'];
        modals.forEach(modalId => {
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
        });
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            alert(message);
        }
    }
}

// Inicialização automática
function initializeSistemaVibe() {
    if (window.MessagesSystem && window.MessagesSystem.currentUser) {
        window.sistemaVibe = new SistemaVibe();
        window.sistemaVibe.initialize(window.MessagesSystem.currentUser);
    } else {
        setTimeout(initializeSistemaVibe, 1000);
    }
}

// Iniciar quando a página carregar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeSistemaVibe);
} else {
    initializeSistemaVibe();
}

// Funções globais para o HTML
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

window.closeFidelityModal = function() {
    const modal = document.getElementById('fidelityModal');
    if (modal) modal.style.display = 'none';
};

window.closeManageFidelityModal = function() {
    const modal = document.getElementById('manageFidelityModal');
    if (modal) modal.style.display = 'none';
};