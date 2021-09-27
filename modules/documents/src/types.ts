import { Client, Entity, HasChildren } from '@uprtcl/evees';
import { HasDocNodeLenses } from './patterns/document-patterns';

export enum TextType {
  Title = 'Title',
  Paragraph = 'Paragraph',
}

export interface TextNode {
  text: string;
  type: TextType;
  links: string[];
}

export interface DocNode {
  uref: string;
  remoteId: string;
  data?: Entity;
  draft: any;
  draftType: string;
  type?: string;
  coord: number[];
  level: number;
  append?: any; // used by upper layer to tell the docnode lense to append content using its internal appending logic.
  childrenNodes: DocNode[];
  editable: boolean;
  parent?: DocNode;
  ix?: number; // ix on parent
  focused: boolean;
  canConvertTo: string[];
  draggingOver?: boolean;
  draggingOverTimeout?: any;
}

export interface DocNodeEventsHandlers {
  focus: () => void;
  blur: () => void;
  contentChanged: (newContent: any, lift: boolean) => void;
  split: (tail: string, asChild: boolean) => void;
  joinBackward: (tail: string) => void;
  pullDownward: () => void;
  focusBackward: () => void;
  focusDownward: () => void;
  lift: () => void;
  appended: () => void;
  convertedTo: (blockType: string) => void;
}
export interface CustomBlock {
  default: any;
  canConvertTo: Record<string, (node: DocNode, client: Client) => Promise<any>>;
}

export type CustomBlocks = Map<string, CustomBlock>;
