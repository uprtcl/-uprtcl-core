import { LitElement, property, html, css, query } from 'lit-element';
type ButtonVariant = 'normal' | 'long' | 'icon';

export class UprtclButtonLoading extends LitElement {
  @property({ type: Boolean })
  loading = false;

  @property({ type: Boolean })
  outlined = false;

  @property({ type: Boolean })
  skinny = false;

  @property({ type: Boolean })
  transition = false;

  @property({ type: Boolean })
  disabled = false;

  @property({ type: String })
  icon = '';

  @property({ type: String })
  variant: ButtonVariant = 'normal';

  render() {
    const loadingClasses = this.skinny ? ['loading-skinny'] : ['loading-filled'];
    loadingClasses.push('loading');

    return html`
      <uprtcl-button
        ?outlined=${this.outlined}
        ?transition=${this.transition}
        ?skinny=${this.skinny}
        ?disabled=${this.disabled}
        icon=${this.loading ? '' : this.icon}
        variant=${this.variant}
      >
        ${this.loading
          ? html` <uprtcl-loading class=${loadingClasses.join(' ')}></uprtcl-loading> `
          : html` <slot></slot> `}
      </uprtcl-button>
    `;
  }

  static get styles() {
    return css`
      :host {
        display: block;
        width: fit-content;
        border-radius: var(--border-radius-complete);
        position: relative;

      }
      .loading {
        --height: 36px;
      }
      .loading-filled {
        --fill: white;
      }
      .loading-skinny {
        --fill: #50b0ff;
      }
    `;
  }
}
