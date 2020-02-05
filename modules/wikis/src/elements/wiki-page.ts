import { LitElement, property, html, css } from 'lit-element';
import { ApolloClient, gql } from 'apollo-boost';

import { TextNode } from '@uprtcl/documents';
import { sharedStyles } from '@uprtcl/lenses';
import { ApolloClientModule } from '@uprtcl/graphql';
import { moduleConnect } from '@uprtcl/micro-orchestrator';

import '@material/mwc-top-app-bar';

export class WikiPage extends moduleConnect(LitElement) {
  @property({ type: String })
  pageHash!: string;

  @property({ type: Object })
  textNode!: TextNode;

  async firstUpdated() {
    const client: ApolloClient<any> = this.request(ApolloClientModule.bindings.Client);
    const result = await client.query({
      query: gql`{
        entity(id: "${this.pageHash}") {
          id

          ... on Perspective {
            head {
              id
              data {
                id
                ... on TextNode {
                  text
                  links
                }
              }
            }
          }

        }
      }`
    });

    this.textNode = result.data.entity.head.data;
  }

  render() {
    if (!this.textNode)
      return html`
        <cortex-loading-placeholder></cortex-loading-placeholder>
      `;

    return html`
      <mwc-top-app-bar> </mwc-top-app-bar>

      <cortex-entity .hash=${this.pageHash} lens-type="evee" .context=${{ onlyChildren: 'false' }}>
      </cortex-entity>
    `;
  }

  static get styles() {
    return [sharedStyles, css`
      :host {
        width: 100%;
      }

      mwc-top-app-bar {
        --mdc-theme-primary: transparent;
        --mdc-theme-on-primary: #37352f;
      }
    `];
  }
}
