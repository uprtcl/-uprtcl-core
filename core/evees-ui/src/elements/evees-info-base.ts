import {
  LitElement,
  property,
  html,
  css,
  query,
  TemplateResult,
  internalProperty,
} from 'lit-element';

import { MenuOptions, UprtclDialog } from '@uprtcl/common-ui';
import {
  Perspective,
  PerspectiveDetails,
  Commit,
  Logger,
  Evees,
  ClientRemote,
  PerspectiveType,
  CommitType,
  MergeConfig,
  RecursiveContextMergeStrategy,
  Proposal,
  Entity,
  Signed,
} from '@uprtcl/evees';

import { ProposalCreatedEvent } from './events';
import { EveesDiffExplorer } from './evees-diff-explorer';
import { servicesConnect } from 'src/uprtcl-evees-ui';

interface PerspectiveData {
  id?: string;
  perspective?: Perspective;
  details?: PerspectiveDetails;
  canUpdate?: Boolean;
  permissions?: any;
  head?: Entity<Commit>;
  data?: Entity;
}

/** An evees info base component, it starts from the first-uref */
export class EveesInfoBase extends servicesConnect(LitElement) {
  logger = new Logger('EVEES-INFO');

  @property({ type: String, attribute: 'uref' })
  uref!: string;

  @property({ type: String, attribute: 'first-uref' })
  firstRef!: string;

  @property({ type: String, attribute: 'parent-id' })
  parentId!: string;

  @property({ type: String, attribute: 'evee-color' })
  eveeColor!: string;

  @property({ type: Boolean, attribute: 'emit-proposals' })
  emitProposals = false;

  @property({ type: String, attribute: false })
  entityType: string | undefined = undefined;

  @internalProperty()
  loading: Boolean = false;

  @internalProperty()
  isLogged = false;

  @internalProperty()
  isLoggedOnDefault;

  @internalProperty()
  forceUpdate = 'true';

  @internalProperty()
  showUpdatesDialog = false;

  @internalProperty()
  loggingIn = false;

  @internalProperty()
  creatingNewPerspective = false;

  @internalProperty()
  proposingUpdate = false;

  @internalProperty()
  makingPublic = false;

  @internalProperty()
  firstHasChanges!: boolean;

  @internalProperty()
  merging = false;

  @query('#updates-dialog')
  updatesDialogEl!: UprtclDialog;

  @query('#evees-diff-explorer')
  eveesDiffEl!: EveesDiffExplorer;

  @internalProperty()
  eveesDiffInfoMessage!: TemplateResult;

  perspectiveData!: PerspectiveData;
  eveesPull: Evees | undefined = undefined;

  protected remote!: ClientRemote;

  async firstUpdated() {}

  updated(changedProperties) {
    if (changedProperties.get('uref') !== undefined) {
      this.logger.info('updated() reload', { changedProperties });
      this.load();
    }
  }

  /** must be called from subclass as super.load() */
  async load() {
    this.logger.info('Loading evee perspective', this.uref);

    this.remote = await this.evees.getPerspectiveRemote(this.uref);

    const entity = await this.evees.getEntity(this.uref);
    if (!entity) throw Error(`Entity not found ${this.uref}`);

    this.entityType = this.evees.recognizer.recognizeType(entity.object);

    this.loading = true;

    if (this.entityType === PerspectiveType) {
      const { details } = await this.evees.getPerspective(this.uref);

      const head =
        details.headId !== undefined ? await this.evees.getEntity(details.headId) : undefined;
      const data =
        head !== undefined ? await this.evees.getEntity(head.object.payload.dataId) : undefined;

      this.perspectiveData = {
        id: this.uref,
        details,
        perspective: (entity.object as Signed<Perspective>).payload,
        head,
        data,
      };

      this.logger.info('load', { perspectiveData: this.perspectiveData });
    }

    if (this.entityType === CommitType) {
      const head = await this.evees.getEntity(this.uref);
      const data =
        head !== undefined ? await this.evees.getEntity(head.object.payload.dataId) : undefined;

      this.perspectiveData = {
        head,
        data,
      };
    }

    this.isLogged = await this.remote.isLogged();

    this.loading = false;
    this.logger.log(`evee ${this.uref} loaded`, {
      perspectiveData: this.perspectiveData,
      isLogged: this.isLogged,
      isLoggedOnDefault: this.isLoggedOnDefault,
    });
  }

  async checkPull(fromUref: string) {
    if (this.entityType !== PerspectiveType) {
      this.eveesPull = undefined;
      return;
    }

    if (this.uref === fromUref || !this.perspectiveData.canUpdate) {
      this.eveesPull = undefined;
      return;
    }

    if (this.perspectiveData.perspective === undefined) throw new Error('undefined');

    const config: MergeConfig = {
      forceOwner: true,
      remote: this.perspectiveData.perspective.remote,
      guardianId: this.uref,
    };

    this.eveesPull = this.evees.clone('PullClient');
    const merger = new RecursiveContextMergeStrategy(this.eveesPull as Evees);

    await merger.mergePerspectivesExternal(this.uref, fromUref, {
      forceOwner: true,
    });

    this.logger.info('checkPull()', this.eveesPull);
  }

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('permissions-updated', ((e: CustomEvent) => {
      this.logger.info('CATCHED EVENT: permissions-updated ', {
        perspectiveId: this.uref,
        e,
      });
      e.stopPropagation();
      this.load();
    }) as EventListener);
  }

  async otherPerspectiveMerge(fromPerspectiveId: string, toPerspectiveId: string) {
    this.merging = true;
    this.logger.info(`merge ${fromPerspectiveId} on ${toPerspectiveId}`);

    const toRemote = await this.evees.getPerspectiveRemote(toPerspectiveId);

    const config = {
      forceOwner: true,
    };

    const { details: toDetails } = await this.evees.getPerspective(toPerspectiveId);
    const { details: fromDetails } = await this.evees.getPerspective(fromPerspectiveId);

    const eveesMerge = this.evees.clone('MergeClient');
    const merger = new RecursiveContextMergeStrategy(eveesMerge);
    await merger.mergePerspectivesExternal(toPerspectiveId, fromPerspectiveId, config);

    const canUpdate = toDetails.canUpdate !== undefined;
    const canPropose = toRemote
      ? toRemote.proposals
        ? await toRemote.proposals.canPropose(this.uref, this.remote.userId)
        : false
      : false;

    const options: MenuOptions = new Map();
    options.set('apply', {
      text: canUpdate ? 'merge' : 'propose',
      icon: 'done',
      disabled: !canUpdate && !canPropose,
      skinny: false,
    });
    options.set('close', {
      text: 'close',
      icon: 'clear',
      skinny: true,
    });

    const result = await this.updatesDialog(
      eveesMerge,
      options,
      this.renderFromToPerspective(toPerspectiveId, fromPerspectiveId)
    );

    if (result !== 'apply') {
      this.merging = false;
      return;
    }

    /* its possible to emit the proposal details to be handled in another context. */
    const emitBecauseOfTarget = await this.evees.checkEmit(toPerspectiveId);

    const proposal: Proposal = {
      toPerspectiveId,
      fromPerspectiveId,
      toHeadId: toDetails.headId,
      fromHeadId: fromDetails.headId,
      mutation: await eveesMerge.diff(),
    };

    if (!canUpdate && (emitBecauseOfTarget || this.emitProposals)) {
      const remote = await this.evees.getPerspectiveRemote(toPerspectiveId);
      this.dispatchEvent(
        new ProposalCreatedEvent({
          detail: {
            remote: remote.id,
            proposal,
          },
          bubbles: true,
          composed: true,
        })
      );

      this.merging = false;
      return;
    }

    /* if the merge execution is not delegated, it is done here. A proposal is created
       on the toPerspective remote, or the changes are directly applied.
       Note that it is assumed that if a user canUpdate on toPerspectiveId, he can write 
       on all the perspectives inside the client.updates array. */
    if (canUpdate) {
    } else {
      if (!toRemote.proposals) throw new Error(`proposals not register for remote ${toRemote.id}`);
      await toRemote.proposals.createProposal(proposal);
    }

    if (this.uref !== toPerspectiveId) {
      this.checkoutPerspective(toPerspectiveId);
    }

    this.merging = false;
  }

  async forkPerspective(perspectiveId?: string, remoteId?: string) {
    this.creatingNewPerspective = true;

    const newPerspectiveId = await this.evees.forkPerspective(perspectiveId || this.uref, remoteId);

    this.dispatchEvent(
      new CustomEvent('new-perspective-created', {
        detail: {
          oldPerspectiveId: this.uref,
          newPerspectiveId: newPerspectiveId,
        },
        bubbles: true,
        composed: true,
      })
    );
    this.checkoutPerspective(newPerspectiveId);

    this.logger.info('newPerspectiveClicked() - perspective created', {
      id: newPerspectiveId,
    });
    this.creatingNewPerspective = false;
  }

  checkoutPerspective(perspectiveId: string) {
    this.dispatchEvent(
      new CustomEvent('checkout-perspective', {
        detail: {
          perspectiveId: perspectiveId,
        },
        composed: true,
        bubbles: true,
      })
    );
  }

  async proposeMergeClicked() {
    this.proposingUpdate = true;
    await this.otherPerspectiveMerge(this.uref, this.firstRef);
    this.proposingUpdate = false;
  }

  perspectiveTextColor() {
    if (this.uref === this.firstRef) {
      return '#37352f';
    } else {
      return '#ffffff';
    }
  }

  async delete() {
    this.evees.update({ deletedPerspectives: [this.uref] });
    this.checkoutPerspective(this.firstRef);
  }

  async updatesDialog(
    localEvees: Evees,
    options: MenuOptions,
    message: TemplateResult = html``
  ): Promise<string> {
    this.showUpdatesDialog = true;
    await this.updateComplete;

    this.updatesDialogEl.options = options;
    this.eveesDiffEl.localEvees = localEvees;
    this.eveesDiffInfoMessage = message;

    return new Promise((resolve) => {
      this.updatesDialogEl.resolved = (value) => {
        this.showUpdatesDialog = false;
        resolve(value);
      };
    });
  }

  renderUpdatesDialog() {
    return html`
      <uprtcl-dialog id="updates-dialog">
        <div>${this.eveesDiffInfoMessage}</div>
        <evees-diff-explorer id="evees-diff-explorer"></evees-diff-explorer>
      </uprtcl-dialog>
    `;
  }

  renderFromToPerspective(toPerspectiveId: string, fromPerspectiveId: string) {
    return html`
      <div class="row merge-message">
        <uprtcl-indicator label="To">
          <evees-perspective-icon perspective-id=${toPerspectiveId}></evees-perspective-icon>
        </uprtcl-indicator>
        <div class="arrow">
          <uprtcl-icon-button icon="arrow_back"></uprtcl-icon-button>
        </div>
        <uprtcl-indicator label="From">
          <evees-perspective-icon perspective-id=${fromPerspectiveId}></evees-perspective-icon>
        </uprtcl-indicator>
      </div>
    `;
  }

  renderLoading() {
    return html` <uprtcl-loading></uprtcl-loading> `;
  }

  /** overwrite */
  renderIcon() {
    return html` <evees-perspective-icon perspective-id=${this.uref}></evees-perspective-icon> `;
  }

  renderInfo() {
    return html`
      <div class="perspective-details">
        <div class="prop-name"><h2>${this.entityType}</h2></div>
        ${this.entityType === PerspectiveType
          ? html`
              <div class="prop-name">perspective id</div>
              <pre class="prop-value">${this.perspectiveData.id}</pre>

              <div class="prop-name">perspective</div>
              <pre class="prop-value">
${JSON.stringify(this.perspectiveData.perspective, undefined, 2)}</pre
              >

              <div class="prop-name">authority</div>
              <pre class="prop-value">
${this.perspectiveData.perspective
                  ? `${this.perspectiveData.perspective.remote}:${this.perspectiveData.perspective.path}`
                  : ''}</pre
              >
            `
          : ''}

        <div class="prop-name">head</div>
        <pre class="prop-value">${JSON.stringify(this.perspectiveData.head, undefined, 2)}</pre>

        <div class="prop-name">data</div>
        <pre class="prop-value">${JSON.stringify(this.perspectiveData.data, undefined, 2)}</pre>
      </div>
    `;
  }

  static get styles() {
    return [
      css`
        .perspective-details {
          padding: 5px;
          text-align: left;
          max-width: calc(100vw - 72px);
          min-width: 490px;
        }

        .prop-name {
          font-weight: bold;
          width: 100%;
        }

        .prop-value {
          font-family: Lucida Console, Monaco, monospace;
          font-size: 12px;
          text-align: left;
          background-color: #a0a3cb;
          color: #1c1d27;
          padding: 16px 16px;
          margin-bottom: 16px;
          border-radius: 6px;
          width: 100%;
          overflow: auto;
          width: calc(100% - 32px);
          overflow-x: auto;
        }
        .row {
          width: 100%;
          display: flex;
          margin-bottom: 20px;
        }
        .merge-message uprtcl-indicator {
          flex: 1 1 auto;
          margin: 5px;
        }
        .merge-message .arrow {
          flex: 0.3 1 auto;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
      `,
    ];
  }
}
