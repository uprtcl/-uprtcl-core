import { LitElement, property, html, css, internalProperty } from 'lit-element';

import { MenuOptions, prettyTimePeriod } from '@uprtcl/common-ui';
import {
  Evees,
  Logger,
  Perspective,
  ProposalEvents,
  ConnectionLoggedEvents,
  Signed,
} from '@uprtcl/evees';
import { servicesConnect } from '@uprtcl/evees-ui';

import { EveesPolkadotCouncil } from './evees.polkadot-council';

import { ProposalManifest, ProposalSummary } from './types';
import { ProposalStatus, VoteValue } from './proposal.config.types';
import { ConnectionEvents } from 'src/connection.polkadot';

export class EveesPolkadotCouncilProposal extends servicesConnect(LitElement) {
  logger = new Logger('EveesPolkadotCouncilProposalElement');

  @property({ type: String, attribute: 'proposal-id' })
  proposalId!: string;

  @internalProperty()
  loading = true;

  @internalProperty()
  showDetails = false;

  @internalProperty()
  voting = false;

  @internalProperty()
  proposalStatusUI!: {
    summary: ProposalSummary;
    council: string[];
    isCouncilMember: boolean;
  };

  remote!: EveesPolkadotCouncil;
  proposalManifest!: ProposalManifest;
  eveesWorkspace!: Evees;

  async firstUpdated() {
    this.remote = this.evees.findRemote<EveesPolkadotCouncil>('council');

    this.remote.events.on(ConnectionLoggedEvents.logged_status_changed, () => this.load());

    this.remote.proposals.events.on(ProposalEvents.status_changed, (proposalStatus) => {
      if (proposalStatus.id === this.proposalId) {
        this.logger.log('proposal status changed', proposalStatus);
        this.loadProposalStatus();
      }
    });

    if (this.remote.connection.events) {
      this.remote.connection.events.on(ConnectionEvents.newBlock, () => this.loadProposalStatus());
    }

    this.load();
  }

  updated(changedProperties) {
    if (changedProperties.has('proposalId') && changedProperties.get('proposalId') !== undefined) {
      this.loadProposalStatus();
    }
  }

  async load() {
    this.loading = true;
    await this.loadManifest();
    await this.loadProposalStatus();
    this.loading = false;
  }

  async loadManifest() {
    const perspective = await this.evees.getEntity<Signed<Perspective>>(this.proposalId);
    if (!perspective) throw new Error('Proposal not found');
    this.proposalManifest = perspective.object.payload.meta.proposal;

    // apply the changes in the proposal on a new Evees workspace
    this.eveesWorkspace = await this.evees.clone('CouncilProposalClient');
    this.eveesWorkspace.update(this.proposalManifest.mutation);
  }

  async vote(value: VoteValue) {
    this.voting = true;
    await this.remote.proposals.vote(this.proposalId, value);
    await this.load();
    this.voting = false;
  }

  async loadProposalStatus() {
    const proposalSummary = await this.remote.proposals.getProposalSummary(this.proposalId);

    if (!proposalSummary) throw new Error('Vote status not found');

    const council = await this.remote.proposals.councilStore.getCouncil(
      this.proposalManifest.block
    );

    this.proposalStatusUI = {
      summary: proposalSummary,
      council,
      isCouncilMember: this.remote.userId ? council.includes(this.remote.userId) : false,
    };
  }

  showProposalDetails() {
    this.showDetails = true;
  }

  renderCouncilMember() {
    const vote = this.proposalStatusUI.summary.votes.find(
      (vote) => vote.member === this.remote.userId
    );

    return html`
      <uprtcl-indicator class="your-vote" label="Your vote">
        ${this.voting
          ? html` <uprtcl-loading></uprtcl-loading> `
          : vote
          ? html` ${vote.value} `
          : this.proposalStatusUI.summary.status === ProposalStatus.Pending
          ? html`
              <div class="vote-buttons">
                <uprtcl-button
                  class="vote-btn"
                  skinny
                  @click=${() => this.vote(VoteValue.No)}
                  icon="clear"
                  >Reject</uprtcl-button
                >
                <uprtcl-button
                  class="vote-btn vote-btn-approve"
                  @click=${() => this.vote(VoteValue.Yes)}
                  icon="done"
                  >Approve</uprtcl-button
                >
              </div>
            `
          : 'proposal closed'}
      </uprtcl-indicator>
    `;
  }

  renderProposalStatus() {
    const votedYes = this.proposalStatusUI.summary.votes.filter(
      (vote) => vote.value === VoteValue.Yes
    );
    const votedNo = this.proposalStatusUI.summary.votes.filter(
      (vote) => vote.value === VoteValue.No
    );
    const blocksRemaining =
      this.proposalManifest.block +
      this.proposalManifest.config.duration -
      this.proposalStatusUI.summary.block;

    const secondsRemaining = blocksRemaining * 6.0;

    return html`
      <div class="status-top">
        <uprtcl-indicator label="Proposal status"
          >${this.proposalStatusUI.summary.status}</uprtcl-indicator
        >
        ${secondsRemaining > 0
          ? html`
              <uprtcl-indicator label="Remaining time"
                >${prettyTimePeriod(secondsRemaining)}</uprtcl-indicator
              >
            `
          : html`
              <uprtcl-indicator label="Closed at block"
                >${this.proposalManifest.block}</uprtcl-indicator
              >
            `}
        <uprtcl-indicator label="Voters">
          ${votedYes.length}/${this.proposalStatusUI.council.length}
        </uprtcl-indicator>
      </div>

      <uprtcl-indicator class="vote-list-indicator" label="Votes">
        <uprtcl-list
          >${votedYes.concat(votedNo).map((vote) => {
            let icon: string;
            switch (vote.value) {
              case VoteValue.Yes:
                icon = 'done';
                break;
              case VoteValue.No:
                icon = 'clear';
                break;

              case VoteValue.Undefined:
                icon = 'question';
                break;

              default:
                throw new Error(`Unexpected vote value ${vote.value}`);
            }

            return html`
              <uprtcl-list-item
                ><uprtcl-icon-button icon=${icon} button></uprtcl-icon-button
                ><evees-author
                  user-id=${vote.member}
                  remote-id=${this.remote.id}
                  show-name
                ></evees-author
              ></uprtcl-list-item>
            `;
          })}</uprtcl-list
        >
      </uprtcl-indicator>
    `;
  }

  renderDetails() {
    const options: MenuOptions = new Map();
    options.set('close', { text: 'close', icon: 'clear' });

    return html`
      <uprtcl-dialog .options=${options} @option-selected=${() => (this.showDetails = false)}>
        <div class="dialog-element">
          <div class="row">
            by
            <evees-author
              user-id=${this.proposalManifest.creatorId ? this.proposalManifest.creatorId : ''}
              show-name
            ></evees-author>
            current block: ${this.proposalStatusUI.summary.block}
          </div>
          <evees-diff-explorer
            .localEvees=${this.eveesWorkspace}
            perspective-id=${this.proposalManifest.toPerspectiveId}
          >
          </evees-diff-explorer>
          <div class="column">
            ${this.proposalStatusUI.isCouncilMember ? this.renderCouncilMember() : ''}
            ${this.renderProposalStatus()}
          </div>
        </div>
      </uprtcl-dialog>
    `;
  }

  render() {
    if (this.loading) {
      return html` <uprtcl-loading></uprtcl-loading> `;
    }

    const creatorId = this.proposalManifest.creatorId ? this.proposalManifest.creatorId : '';
    let icon;

    switch (this.proposalStatusUI.summary.status) {
      case ProposalStatus.Pending:
        icon = 'hourglass_empty';
        break;
      case ProposalStatus.Accepted:
        icon = 'done';
        break;
      case ProposalStatus.Rejected:
        icon = 'clear';
        break;
    }

    return html`
      <div @click=${() => this.showProposalDetails()} class="row-container">
        <div class="proposal-name">
          <evees-author user-id=${creatorId} show-name></evees-author>
        </div>
        <div class="proposal-state">
          <uprtcl-icon-button icon=${icon}></uprtcl-icon-button>
        </div>
      </div>
      ${this.showDetails ? this.renderDetails() : ''}
    `;
  }

  static get styles() {
    return css`
      .row-container {
        height: 100%;
        display: flex;
        flex-direction: row;
      }
      .proposal-name {
        height: 100%;
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .proposal-state {
        width: 140px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      .proposal-state uprtcl-button {
        margin: 0 auto;
      }
      uprtcl-dialog {
        cursor: auto;
      }
      .dialog-element {
        display: flex;
        flex-direction: column;
        flex-grow: 1;
        overflow: hidden;
      }
      .row {
        width: 100%;
        display: flex;
        align-items: center;
      }
      .column {
        display: flex;
        flex-direction: column;
      }
      evees-diff-explorer {
        overflow: auto;
        margin: 10px 0px;
        max-height: 50vh;
      }
      .vote-buttons {
        display: flex;
        flex-direction: row;
        justify-content: center;
        padding: 16px;
      }
      .your-vote {
        width: calc(100% - 12px);
      }
      .row evees-author {
        margin-left: 10px;
      }
      .status-top {
        display: flex;
        width: 100%;
      }
      uprtcl-indicator {
        flex: 1 1 auto;
        margin: 6px;
      }
      .vote-list-indicator {
        width: calc(100% - 12px);
      }
      uprtcl-list {
        margin-top: 4px;
      }
      .vote-row {
        justify-content: center;
      }
      .vote-btn {
        width: 150px;
        margin-left: 12px;
      }
      .vote-btn-approve {
        --background-color: #01c03a;
      }
    `;
  }
}
