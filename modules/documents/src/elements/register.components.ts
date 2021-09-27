import { DocumentTextNodeEditor } from './prosemirror/documents-text-node-editor';
import { DocumentEditor } from './document-editor';
import { TextNodeDiff } from './document-text-node-diff';
import { EditableDocumentEditor } from './document-editor.editable';
import { DocumentPreviewCard } from './document.preview.card';

export const registerComponents = () => {
  customElements.define('documents-text-node-editor', DocumentTextNodeEditor);
  customElements.define('documents-editor', DocumentEditor);
  customElements.define('editable-document-editor', EditableDocumentEditor);
  customElements.define('documents-text-node-diff', TextNodeDiff);
  customElements.define('documents-preview-card', DocumentPreviewCard);
};
