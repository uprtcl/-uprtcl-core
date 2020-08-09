import { LitElement, html, css, property } from 'lit-element';
import { moduleConnect } from '@uprtcl/micro-orchestrator';
import { EveesModule, EveesRemote } from '@uprtcl/evees';
import { HttpEthAuthProvider } from '@uprtcl/http-provider';

import { Router } from '@vaadin/router';

export class Doc extends moduleConnect(LitElement) {
  @property({ attribute: false })
  docId!: string;

  @property({ attribute: false })
  defaultRemote!: string;

  async firstUpdated() {
    this.docId = window.location.pathname.split('/')[2];

    const eveesHttpProvider = this.requestAll(
      EveesModule.bindings.EveesRemote
    ).find((provider: EveesRemote) =>
      provider.id.startsWith('http')
    ) as HttpEthAuthProvider;

    await eveesHttpProvider.connect();
    this.defaultRemote = eveesHttpProvider.id;
  }

  goHome() {
    Router.go(`/home`);
  }

  render() {
    if (this.docId === undefined) return '';
    return html`
      <wiki-drawer
        @back=${() => this.goHome()}
        uref=${this.docId}
        default-remote=${this.defaultRemote}
        .editableRemotes=${[this.defaultRemote]}
      ></wiki-drawer>
    `;
  }

  static styles = css`
    :host {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
    }

    wiki-drawer {
      flex-grow: 1;
    }
  `;
}
