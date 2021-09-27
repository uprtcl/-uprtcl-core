import { LitElement, html, css, property, internalProperty } from 'lit-element';
import { unsafeSVG } from 'lit-html/directives/unsafe-svg';
import { polkadotIcon } from '@polkadot/ui-shared';

import { PolkadotConnection } from '../connection.polkadot';
import { Logger } from '@uprtcl/evees';
import { servicesConnect } from '@uprtcl/evees-ui';

export class PolkadotAccountElement extends servicesConnect(LitElement) {
  logger = new Logger('POLKADOT-ACCOUNT-ELEMENT');

  @property({ type: String })
  account!: string;

  @property({ type: Boolean, attribute: 'show-name' })
  showName = false;

  @property({ type: String })
  size = '32px';

  @internalProperty()
  loading = true;

  @property({ attribute: false })
  displayName!: string;

  connection!: PolkadotConnection;
  identity!: any;

  async firstUpdated() {
    // MultiService must be initialized with the polkadot connection service using this same name
    this.connection = this.request('polkadot-connection');
    if (!this.connection) {
      throw new Error('Polkadot connection not found');
    }

    this.load();
  }

  updated(changedProperties) {
    if (changedProperties.has('account')) {
      this.load();
    }
  }

  async load() {
    this.loading = true;

    const identity = this.connection.identitiesCache[this.account]
      ? this.connection.identitiesCache[this.account]
      : await this.connection.getIdentityInfo(this.account);
    this.connection.identitiesCache[this.account] = identity;

    this.identity = { ...identity };

    this.displayName =
      this.identity && this.identity.display && this.identity.display.Raw
        ? this.identity.display.Raw.length > 23
          ? `${this.identity.display.Raw.substr(0, 20)}...`
          : this.identity.display.Raw
        : `${this.account.substr(0, 20)}...`;

    this.loading = false;
  }

  renderIdenticon() {
    const circles = polkadotIcon(this.account, { isAlternative: false });
    return html`<svg height=${this.size} width=${this.size} viewBox="0 0 64 64">
      ${circles.map(({ cx, cy, fill, r }) =>
        unsafeSVG(`<circle cx=${cx} cy=${cy} fill="${fill}" r=${r}></circle>`)
      )}
    </svg>`;
  }

  render() {
    if (this.loading) {
      return html`<uprtcl-loading></uprtcl-loading>`;
    }
    return html`<div class="icon">${this.renderIdenticon()}</div>
      ${this.showName ? html`<div class="name">${this.displayName}</div>` : ''}`;
  }

  static get styles() {
    return [
      css`
        :host {
          display: flex;
          align-items: center;
        }
        .icon {
          height: 32px;
          width: 32px;
        }
        .name {
          color: #636668;
          font-weight: bold;
          margin-left: 6px;
          text-align: left;
          width: 200px;
        }
      `,
    ];
  }
}
