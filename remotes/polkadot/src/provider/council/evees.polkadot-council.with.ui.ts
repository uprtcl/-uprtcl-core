import { RemoteWithUI } from '@uprtcl/evees-ui';
import { html } from 'lit-html';
import { EveesPolkadotCouncil } from './evees.polkadot-council';

export class EveesPolkadotCouncilWithUI extends EveesPolkadotCouncil implements RemoteWithUI {
  avatar(userId: string, config: any = { showName: true }) {
    return html`<polkadot-account account=${userId} ?show-name=${config.showName}>
    </polkadot-account> `;
  }
}
