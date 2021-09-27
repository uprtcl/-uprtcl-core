import { LitElement, html, css, property } from 'lit-element';

export class UprtclIconAndName extends LitElement {
  @property({ type: String, attribute: 'name' })
  name!: string;

  @property({ type: String, attribute: 'icon-src' })
  iconSource!: string;

  @property({ type: Boolean, attribute: 'show-name' })
  showName = false;

  render() {
    return html`
      <div class="icon-container">
        <slot>
          ${this.iconSource
            ? html`<img class="avatar-image" src=${this.iconSource} />`
            : html`<div class="icon-placeholder"></div>`}
        </slot>
      </div>
      ${this.showName ? html`<div class="name-container">${this.name ? this.name : ''}</div>` : ''}
      <div class="overlay"></div>
    `;
  }

  static get styles() {
    return [
      css`
        :host {
          display: flex;
          align-items: center;
          position: relative;
        }
        .icon-container {
          width: var(--icon-margin);
          overflow: hidden;
          width: var(--icon-size, 40px);
          height: var(--icon-size, 40px);
          border-radius: var(--border-radius-complete);
          flex: 0 0 auto;
        }
        .icon-placeholder {
          background-color: #cccccc;
          height: 100%;
        }
        .name-container {
          color: var(--font-color, #636668);
          font-weight: var(--font-weight, bold);
          font-size: var(--font-size);
          margin-left: var(--name-margin-left, 6px);
          white-space: nowrap;
        }
        .overlay {
          height: 100%;
          width: 100%;
          position: absolute;
          top: 0px;
          left: 0px;
          pointer-events: none;
          background-image: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0),
            rgba(255, 255, 255, 0),
            rgba(255, 255, 255, 0),
            rgba(255, 255, 255, 0),
            rgba(255, 255, 255, 1)
          );
        }
      `,
    ];
  }
}
