import { css, html } from 'lit-element';
import { EveesBaseEditable } from '@uprtcl/evees-ui';

import { TextNode } from '../types';
import { FlushConfig } from '@uprtcl/evees';

/** a document editor that has one official version and one draft for the logged user */
export class EditableDocumentEditor extends EveesBaseEditable<TextNode> {
  flushConfig: FlushConfig = {
    autoflush: true,
    debounce: 2000,
  };

  render() {
    if (this.loading) return html`<uprtcl-loading></uprtcl-loading>`;

    return html`<div class="info-container">${this.renderInfo()}</div>
      <documents-editor uref=${this.uref} .flushConfig=${this.flushConfig}></documents-editor>`;
  }

  static get styles() {
    return super.styles.concat([
      css`
        :host {
          display: flex;
          flex-direction: column;
          width: 100%;
        }
        .infocontainer {
          flex: 0 0 auto;
        }
        documents-editor {
          flex: 1 0 auto;
        }
      `,
    ]);
  }
}
