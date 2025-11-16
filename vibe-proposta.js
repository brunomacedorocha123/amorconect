// vibe-proposta.js - Sistema completo de propostas Vibe Exclusive
class VibePropostaSystem {
    constructor() {
        this.supabase = window.supabase;
        this.currentUser = null;
        this.currentConversation = null;
        this.messageThreshold = 30;
        this.isInitialized = false;
    }

    async initialize(currentUser) {
        if (this.isInitialized) return;
        
        this.currentUser = currentUser;
        await this.startProposalListener();
        this.isInitialized = true;
    }

    async canShowVibeButton(otherUserId) {
        try {
            const isBothPremium = await this.checkBothPremium(otherUserId);
            if (!isBothPremium) return false;

            const messageCount = await this.getMessageCount(otherUserId);
            if (messageCount < this.messageThreshold) return false;

            const hasActiveProposal = await this.checkActiveProposal(otherUserId);
            if (hasActiveProposal) return false;

            return true;

        } catch (error) {
            return false;
        }
    }

    async checkBothPremium(otherUserId) {
        try {
            const { data: profiles, error } = await this.supabase
                .from('profiles')
                .select('is_premium')
                .in('id', [this.currentUser.id, otherUserId]);

            if (error || !profiles || profiles.length !== 2) return false;

            return profiles.every(profile => profile.is_premium === true);

        } catch (error) {
            return false;
        }
    }

    async getMessageCount(otherUserId) {
        try {
            const { data: messages, error } = await this.supabase
                .from('messages')
                .select('id')
                .or(`and(sender_id.eq.${this.currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${this.currentUser.id})`);

            if (error) return 0;
            return messages?.length || 0;

        } catch (error) {
            return 0;
        }
    }

    async checkActiveProposal(otherUserId) {
        try {
            const { data: agreement, error } = await this.supabase
                .rpc('check_active_fidelity_agreement', {
                    p_user_id: this.currentUser.id
                });

            if (error) return false;

            if (agreement?.has_active_agreement) return true;

            const { data: proposals, error: proposalsError } = await this.supabase
                .from('fidelity_agreements')
                .select('*')
                .or(`and(user_a.eq.${this.currentUser.id},user_b.eq.${otherUserId},status.eq.pending),and(user_a.eq.${otherUserId},user_b.eq.${this.currentUser.id},status.eq.pending)`)
                .limit(1);

            if (proposalsError) return false;
            return proposals && proposals.length > 0;

        } catch (error) {
            return false;
        }
    }

    async sendProposal(otherUserId) {
        try {
            const canPropose = await this.canShowVibeButton(otherUserId);
            if (!canPropose) {
                this.showNotification('Não é possível enviar proposta no momento', 'error');
                return false;
            }

            const { data, error } = await this.supabase
                .rpc('propose_fidelity_agreement', {
                    p_proposer_id: this.currentUser.id,
                    p_receiver_id: otherUserId
                });

            if (error) {
                this.showNotification('Erro ao enviar proposta', 'error');
                return false;
            }

            if (data === 'success') {
                this.showNotification('Proposta de Vibe Exclusive enviada!', 'success');
                this.updateVibeButton(otherUserId);
                return true;
            } else {
                this.showNotification(data, 'error');
                return false;
            }

        } catch (error) {
            this.showNotification('Erro ao enviar proposta', 'error');
            return false;
        }
    }

    async showProposalNotification(proposalData) {
        const proposerId = proposalData.user_a === this.currentUser.id ? proposalData.user_b : proposalData.user_a;
        
        const { data: profile, error } = await this.supabase
            .from('profiles')
            .select('nickname')
            .eq('id', proposerId)
            .single();

        const proposerName = profile?.nickname || 'Um usuário';

        const notificationHTML = `
            <div class="vibe-proposal-notification">
                <div class="proposal-header">
                    <i class="fas fa-gem"></i>
                    <h3>Convite Vibe Exclusive</h3>
                </div>
                <div class="proposal-content">
                    <p><strong>${proposerName}</strong> te enviou um convite para Vibe Exclusive! 💎</p>
                    <p>Deseja aceitar esta conexão exclusiva?</p>
                </div>
                <div class="proposal-actions">
                    <button class="btn btn-success" onclick="VibeProposta.acceptProposal('${proposalData.id}')">
                        <i class="fas fa-check"></i> Aceitar
                    </button>
                    <button class="btn btn-outline" onclick="VibeProposta.rejectProposal('${proposalData.id}')">
                        <i class="fas fa-times"></i> Recusar
                    </button>
                </div>
            </div>
        `;

        this.showCustomNotification(notificationHTML, 'vibe-proposal');
    }

    async acceptProposal(proposalId) {
        try {
            const { data, error } = await this.supabase
                .rpc('accept_fidelity_agreement', {
                    p_agreement_id: proposalId,
                    p_acceptor_id: this.currentUser.id
                });

            if (error) return;

            if (data === 'success') {
                this.showNotification('Vibe Exclusive aceito! Redirecionando...', 'success');
                this.removeProposalNotification();
                
                setTimeout(() => {
                    if (window.AuthVibeSystem) {
                        window.AuthVibeSystem.forceCheck();
                    }
                }, 2000);

            } else {
                this.showNotification(data, 'error');
            }

        } catch (error) {
            this.showNotification('Erro ao aceitar proposta', 'error');
        }
    }

    async rejectProposal(proposalId) {
        try {
            const { data, error } = await this.supabase
                .rpc('reject_fidelity_agreement', {
                    p_agreement_id: proposalId,
                    p_rejector_id: this.currentUser.id
                });

            if (error) return;

            if (data === 'success') {
                this.showNotification('Proposta recusada', 'info');
                this.removeProposalNotification();
            } else {
                this.showNotification(data, 'error');
            }

        } catch (error) {
            this.showNotification('Erro ao recusar proposta', 'error');
        }
    }

    async updateVibeButton(otherUserId) {
        const canShow = await this.canShowVibeButton(otherUserId);
        const button = document.getElementById('fidelityProposeBtn');
        
        if (!button) return;

        if (canShow) {
            button.style.display = 'flex';
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-gem"></i> Vibe Exclusive';
        } else {
            button.style.display = 'none';
        }
    }

    async startProposalListener() {
        if (!this.currentUser) return;

        this.supabase
            .channel('vibe_proposals')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'fidelity_agreements',
                    filter: `user_b=eq.${this.currentUser.id}`
                },
                (payload) => {
                    if (payload.new.status === 'pending') {
                        this.showProposalNotification(payload.new);
                    }
                }
            )
            .subscribe();
    }

    showCustomNotification(content, type = 'info') {
        const existing = document.querySelectorAll(`.custom-notification.${type}`);
        existing.forEach(notif => notif.remove());

        const notification = document.createElement('div');
        notification.className = `custom-notification ${type}`;
        notification.innerHTML = content;

        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--exclusive-card);
            border: 2px solid var(--gold);
            border-radius: 15px;
            padding: 20px;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 30000);
    }

    removeProposalNotification() {
        const notification = document.querySelector('.custom-notification.vibe-proposal');
        if (notification) {
            notification.remove();
        }
    }

    showNotification(message, type = 'info') {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (!window.VibeProposta && window.MessagesSystem && window.MessagesSystem.currentUser) {
            window.VibePropostaSystem = new VibePropostaSystem();
            window.VibePropostaSystem.initialize(window.MessagesSystem.currentUser);
        }
    }, 2000);
});

window.VibeProposta = {
    acceptProposal: (proposalId) => {
        if (window.VibePropostaSystem) {
            window.VibePropostaSystem.acceptProposal(proposalId);
        }
    },
    rejectProposal: (proposalId) => {
        if (window.VibePropostaSystem) {
            window.VibePropostaSystem.rejectProposal(proposalId);
        }
    },
    sendProposal: (otherUserId) => {
        if (window.VibePropostaSystem) {
            return window.VibePropostaSystem.sendProposal(otherUserId);
        }
        return false;
    }
};