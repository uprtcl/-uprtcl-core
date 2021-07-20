import { LitElement, property, html, css, internalProperty } from 'lit-element';

const styleMap = (style) => {
  return Object.entries(style).reduce((styleString, [propName, propValue]) => {
    propName = propName.replace(/([A-Z])/g, (matches) => `-${matches[0].toLowerCase()}`);
    return `${styleString}${propName}:${propValue};`;
  }, '');
};

import {
  Logger,
  PerspectiveType,
  CommitType,
  Evees,
  UpdatePerspectiveData,
  CreateEvee,
  FlushConfig,
} from '@uprtcl/evees';
import { servicesConnect, eveeColor } from '@uprtcl/evees-ui';

import { TextType, DocNode, CustomBlocks } from '../types';
import { icons } from './prosemirror/icons';
import { DocumentsBindings } from '../bindings';
import { DocumentsModule } from '../documents.module';

const LOGINFO = false;
const SELECTED_BACKGROUND = 'rgb(200,200,200,0.2);';

export class DocumentEditor extends servicesConnect(LitElement) {
  logger = new Logger('DOCUMENT-EDITOR');

  @property({ type: String, attribute: 'uref' })
  uref!: string;

  @property({ type: Boolean, attribute: 'read-only' })
  readOnly = false;

  @property({ type: Boolean, attribute: 'show-info' })
  showInfo = false;

  @property({ type: Boolean, attribute: 'keep-info-padding' })
  keepInfoPadding = false;

  @property({ type: Number, attribute: 'root-level' })
  rootLevel = 0;

  @property({ type: String, attribute: 'parent-id' })
  parentId!: string;

  /** if true, content updates are emited instead of sent to the localEvees */
  @property({ type: Boolean, attribute: 'emit-updates' })
  emitUpdates: boolean = false;

  @property({ type: String, attribute: 'default-type' })
  defaultType: string = PerspectiveType;

  @property({ type: String })
  color!: string;

  @property({ type: Object })
  flushConfig!: FlushConfig;

  @internalProperty()
  getEveeInfo!: Function;

  @property({ type: Object, attribute: false })
  localEvees!: Evees;

  @internalProperty()
  reloading = true;

  @internalProperty()
  checkedOutPerspectives: {
    [key: string]: { firstUref: string; newUref: string };
  } = {};

  doc: DocNode | undefined = undefined;

  loadingPromise!: Promise<any>;

  protected editableRemotesIds!: string[];
  protected customBlocks!: CustomBlocks;

  async firstUpdated() {
    const documentsModule = this.evees.modules.get(DocumentsModule.id);
    this.customBlocks = documentsModule ? documentsModule.config.customBlocks : undefined;
    this.editableRemotesIds = this.evees.config.editableRemotesIds
      ? this.evees.config.editableRemotesIds
      : [];

    /** overwrite evees sercive with provided client */
    if (!this.localEvees) {
      this.localEvees = this.evees;
    }

    if (LOGINFO) this.logger.log('firstUpdated()', this.uref);

    this.loadingPromise = this.loadDoc();
    await this.loadingPromise;
    this.reloading = false;
  }

  updated(changedProperties) {
    // if (LOGINFO)
    //   this.logger.log('updated()', {
    //     uref: this.uref,
    //     changedProperties,
    //   });

    let reload = false;

    if (changedProperties.has('uref')) {
      reload = true;
    }

    if (changedProperties.has('localEvees')) {
      reload = true;
    }

    if (changedProperties.has('readOnly')) {
      reload = true;
    }

    if (reload) {
      this.reload();
    }
  }

  async reload() {
    this.reloading = true;
    await this.loadDoc();
    this.reloading = false;
  }

  async loadDoc(): Promise<void> {
    if (LOGINFO) this.logger.log('loadDoc()', this.uref);

    if (!this.uref) return;
    this.doc = await this.loadNodeRec(this.uref);
    this.requestUpdate();
  }

  async loadNodeRec(uref: string, ix?: number, parent?: DocNode): Promise<DocNode> {
    if (LOGINFO) this.logger.log('loadNodeRec()', { uref, ix, parent });

    const node = await this.refToNode(uref, parent, ix);

    const loadChildren = this.localEvees.behaviorConcat(node.draft, 'children').map(
      async (child, ix): Promise<DocNode> => {
        return child !== undefined && child !== ''
          ? await this.loadNodeRec(child, ix, node)
          : node.childrenNodes[ix];
      }
    );

    node.parent = parent;
    node.childrenNodes = await Promise.all(loadChildren);

    /** focus if top element */
    if (node.uref === this.uref && node.editable) {
      node.focused = true;
    }

    return node;
  }

  async refToNode(uref: string, parent?: DocNode, ix?: number) {
    const entity = await this.localEvees.getEntity(uref);

    let entityType = this.localEvees.recognizer.recognizeType(entity.object);

    let editable = false;
    let dataId: string | undefined;
    let remoteId: string | undefined;

    if (entityType === PerspectiveType) {
      const remote = await this.localEvees.getPerspectiveRemote(entity.hash);
      remoteId = remote.id;

      const { details } = await this.localEvees.getPerspective(uref, { levels: -1 });
      const headId = details.headId;

      if (!this.readOnly) {
        const editableRemote =
          this.editableRemotesIds.length > 0 ? this.editableRemotesIds.includes(remote.id) : true;
        if (editableRemote) {
          editable = details.canUpdate !== undefined ? details.canUpdate : false;
        }
      } else {
        editable = false;
      }

      const head = headId ? await this.localEvees.getEntity(headId) : undefined;
      dataId = head ? head.object.payload.dataId : undefined;
    } else {
      if (entityType === CommitType) {
        if (!parent) throw new Error('Commit must have a parent');

        editable = parent.editable;
        remoteId = parent.remoteId;

        const head = await this.localEvees.getEntity(uref);
        dataId = head ? head.object.payload.dataId : undefined;
      } else {
        entityType = 'Data';
        remoteId = '';
        editable = false;
        dataId = uref;
      }
    }

    if (!dataId || !entityType) throw Error(`data not loaded for uref ${uref}`);

    // TODO get data and patterns hasChildren/hasDocNodeLenses from query
    const data = await this.localEvees.getEntity(dataId);
    const dataType = this.localEvees.recognizer.recognizeType(data.object);
    const canConvertTo = this.customBlocks
      ? Object.getOwnPropertyNames(this.customBlocks[dataType].canConvertTo)
      : [];

    /** disable editable */
    if (this.readOnly) {
      editable = false;
    }

    // Add node coordinates
    const coord = this.setNodeCoordinates(parent, ix);

    // Add node level
    const level = this.getLevel(coord);

    const node: DocNode = {
      uref: entity.hash,
      remoteId,
      type: entityType,
      ix,
      childrenNodes: [],
      data,
      draft: data ? data.object : undefined,
      draftType: dataType,
      coord,
      level,
      editable,
      focused: false,
      canConvertTo,
    };

    return node;
  }

  async createNode(draft: any, parent?: DocNode, ix?: number): Promise<DocNode> {
    const dataType = this.localEvees.recognizer.recognizeType(draft);
    const canConvertTo = this.customBlocks
      ? Object.getOwnPropertyNames(this.customBlocks[dataType].canConvertTo)
      : [];

    if (!parent) {
      throw new Error("Can't create a new node without a parent");
    }

    const remoteId = parent.remoteId;

    /** create is sent asyncronously, the flow continues as if it were successful */
    const parents: string[] = [parent.uref];
    let grandParent = parent.parent;
    while (grandParent !== undefined) {
      if (!parents.includes(grandParent.uref)) {
        parents.push(grandParent.uref);
      }
      grandParent = grandParent.parent;
    }

    /** snap is async because it performs a hash, should be fast enough for UX flow */
    const perspective = await this.localEvees.getRemote(remoteId).snapPerspective({});
    /** Perspective entity is created and await for it to be ready for immediate reading. */
    await this.localEvees.putEntity(perspective);

    const creteEvee: CreateEvee = {
      object: draft,
      guardianId: parent ? parent.uref : undefined,
      remoteId: remoteId,
      perspectiveId: perspective.hash,
      indexData: {
        linkChanges: {
          onEcosystem: {
            added: parents,
            removed: [],
          },
        },
      },
    };

    /** Create is sent asyncronously, the flow continues as if it were successful */
    this.localEvees.createEvee(creteEvee);

    if (LOGINFO) this.logger.log(`createNode()`, { perspective, draft });

    // Add node coordinates
    const coord = this.setNodeCoordinates(parent, ix);

    // Add node level
    const level = this.getLevel(coord);

    return {
      uref: perspective.hash,
      remoteId,
      ix,
      parent,
      draft,
      draftType: dataType,
      coord,
      level,
      childrenNodes: [],
      editable: true,
      focused: false,
      canConvertTo,
    };
  }

  async updateNode(node: DocNode, draft: any) {
    // optimistically set the dratf
    node.draft = draft;

    /** index onEcosystem.
     * onEcosystem is not really a formal and exaustive list
     * of the perspective onEcosystem (all other perspectives of which
     * this perspective is on their ecosystem), but a local mark used
     * to flush portions of mutations based on their parents. */
    const parents: string[] = [node.uref];
    let parent = node.parent;
    while (parent !== undefined) {
      if (!parents.includes(parent.uref)) {
        parents.push(parent.uref);
      }
      parent = parent.parent;
    }

    const update: UpdatePerspectiveData = {
      perspectiveId: node.uref,
      object: draft,
      indexData: {
        linkChanges: {
          onEcosystem: {
            added: parents,
            removed: [],
          },
        },
      },
      flush: this.flushConfig,
    };

    if (LOGINFO) this.logger.log('updatePerspectiveData()', { update });
    this.localEvees.updatePerspectiveData(update);
  }

  setNodeCoordinates(parent?: DocNode, ix?: number) {
    const currentIndex = ix ? ix : 0;
    const coord = parent && parent.coord ? parent.coord.concat([currentIndex]) : [currentIndex];

    return coord;
  }

  getLevel(coord) {
    return this.rootLevel + (coord.length - 1);
  }

  defaultEntity(text: string, type: TextType) {
    return {
      data: { text, type, links: [] },
      entityType: DocumentsBindings.TextNodeType,
    };
  }

  /** replace the actual node object in the doc tree */
  replaceNode(node: DocNode) {
    const coord = [...node.coord];

    /** root node */
    let leaf = this.doc;
    let thisCoord = coord.shift();
    if (thisCoord !== 0) throw new Error('What? the first coordinate must always be zero');
    if (!leaf) throw new Error('doc not defined');

    /** navigate to the parent node */
    while (coord.length > 1) {
      thisCoord = coord.shift();
      if (!thisCoord) throw new Error('thisCoord not defined');
      leaf = leaf.childrenNodes[thisCoord];
      if (!leaf) throw new Error('doc not defined');
    }

    const childIx = coord.shift();
    if (childIx === undefined) throw new Error('coord was emoty');
    /** now we are at the parent */
    leaf.childrenNodes[childIx] = node;
  }

  /** node updated as reference */
  async spliceChildren(
    node: DocNode,
    elements: any[] = [],
    index?: number,
    count = 0
  ): Promise<DocNode[]> {
    if (LOGINFO) this.logger.log('spliceChildren()', { node, elements, index, count });

    const currentChildren: string[] = this.localEvees.behaviorConcat(node.draft, 'children');
    index = index !== undefined ? index : currentChildren.length;

    /** create objects if elements is not an id */
    const getNewNodes = elements.map((el, ix) => {
      const elIndex = (index as number) + ix;
      if (typeof el !== 'string') {
        if (el.object !== undefined) {
          /** element is an object from which a DocNode should be create */
          const uref = this.createNode(el.object, node, elIndex);
          return Promise.resolve(uref);
        } else {
          /** element is a DocNode */
          return Promise.resolve(el);
        }
      } else {
        /** element is a string (a uref) */
        return this.loadNodeRec(el, elIndex, node);
      }
    });

    const newNodes = await Promise.all(getNewNodes);

    let newChildren = [...currentChildren];
    newChildren.splice(index, count, ...newNodes.map((node) => node.uref));
    const removed = node.childrenNodes.splice(index, count, ...newNodes);

    /** update ix and parent of child nodes */
    node.childrenNodes.map((child, ix) => {
      child.ix = ix;
      child.parent = node;
      child.coord = node.coord.concat(ix);
      child.level = node.level + 1;
    });

    const newDraft = this.localEvees.behaviorFirst(node.draft, 'replaceChildren')(newChildren);
    this.updateNode(node, newDraft);

    return removed;
  }

  /** explore node children at path until the last child of the last child is find
   * and returns the path to that element */
  getLastChild(node: DocNode) {
    let child = node;
    while (child.childrenNodes.length > 0) {
      child = child.childrenNodes[child.childrenNodes.length - 1];
    }
    return child;
  }

  getNextSiblingOf(node: DocNode): DocNode | undefined {
    if (!node.parent) return undefined;
    if (node.ix === undefined) return undefined;

    if (node.ix === node.parent.childrenNodes.length - 1) {
      /** this is the last child of its parent */
      return undefined;
    } else {
      /** return the next  */
      return node.parent.childrenNodes[node.ix + 1];
    }
  }

  /** find the next sibling of the parent with a next sibling */
  getNextSiblingOfLastParent(node: DocNode): DocNode | undefined {
    let parent = node.parent;

    let nextSibling = parent ? this.getNextSiblingOf(parent) : undefined;

    while (parent && !nextSibling) {
      parent = parent.parent;
      nextSibling = parent ? this.getNextSiblingOf(parent) : undefined;
    }

    return nextSibling;
  }

  /** the tree of nodes is falttened, this gets the upper node in that flat list */
  getDownwardNode(node: DocNode): DocNode | undefined {
    if (node.childrenNodes.length > 0) {
      /** downward is the first child */
      return node.childrenNodes[0];
    } else {
      let nextSibling = this.getNextSiblingOf(node);
      if (nextSibling) {
        return nextSibling;
      } else {
        return this.getNextSiblingOfLastParent(node);
      }
    }
  }

  getBackwardNode(node: DocNode): DocNode | undefined {
    if (node.ix === undefined) throw new Error('Node dont have an ix');

    if (node.ix === 0) {
      /** backward is the parent */
      return node.parent;
    } else {
      /** backward is the last child of the upper sybling */
      if (!node.parent) return undefined;
      return this.getLastChild(node.parent.childrenNodes[node.ix - 1]);
    }
  }

  async createChild(node: DocNode, newEntity: any, index?: number) {
    if (LOGINFO) this.logger.log('createChild()', { node, newEntity, index });

    if (typeof newEntity !== 'string') newEntity = { object: newEntity };

    await this.spliceChildren(node, [newEntity], 0);

    /** focus child */
    const child = node.childrenNodes[0];

    if (child.parent) {
      child.parent.focused = false;
    }
    child.focused = true;

    this.requestUpdate();
  }

  async createSibling(node: DocNode, newEntity: any) {
    if (!node.parent) throw new Error('Node dont have a parent');
    if (node.ix === undefined) throw new Error('Node dont have an ix');

    if (LOGINFO) this.logger.log('createSibling()', { node, newEntity });
    if (typeof newEntity !== 'string') newEntity = { object: newEntity };

    await this.spliceChildren(node.parent, [newEntity], node.ix + 1);

    /** focus sibling */
    const sibling = node.parent.childrenNodes[node.ix + 1];
    node.focused = false;
    sibling.focused = true;

    this.requestUpdate();
  }

  focused(node: DocNode) {
    if (LOGINFO) this.logger.log('focused()', { node });
    node.focused = true;
    this.requestUpdate();
  }

  blured(node: DocNode) {
    if (LOGINFO) this.logger.log('blured()', { node });
    node.focused = false;
    this.requestUpdate();
  }

  focusBackward(node: DocNode) {
    if (LOGINFO) this.logger.log('focusBackward()', { node });

    const backwardNode = this.getBackwardNode(node);
    if (!backwardNode) return;

    node.focused = false;
    backwardNode.focused = true;
    this.requestUpdate();
  }

  focusDownward(node: DocNode) {
    if (LOGINFO) this.logger.log('focusDownward()', { node });

    const downwardNode = this.getDownwardNode(node);
    if (!downwardNode) return;

    node.focused = false;
    downwardNode.focused = true;
    this.requestUpdate();
  }

  async contentChanged(node: DocNode, content: any, lift?: boolean) {
    if (LOGINFO) this.logger.log('contentChanged()', { node, content });

    const oldType = node.draft.type;

    await this.updateNode(node, content);

    /** react to type change by manipulating the tree */
    /** PAR => TITLE */
    if (oldType === TextType.Paragraph && content.type === TextType.Title) {
      if (lift === undefined || lift === false) {
        await this.nestAfter(node);
      } else {
        if (!node.parent) throw new Error('parent undefined');
        await this.nestAfter(node);
        await this.liftChildren(node.parent, node.ix, 1);
      }
    }

    /** TITLE => PAR */
    if (oldType === TextType.Title && content.type === TextType.Paragraph) {
      /** remove this node children */
      const children = await this.spliceChildren(node, [], 0, node.childrenNodes.length);
      /** append backwards this node with its children as siblings */
      await this.appendBackwards(node, '', [node].concat(children));
    }

    this.requestUpdate();
  }

  /** take all next syblings of node and nest them under it */
  async nestAfter(node: DocNode) {
    if (!node.parent) return;
    if (node.ix === undefined) return;

    const ix = node.ix;
    const ixNext = ix + 1;
    const deltaWithChidren = node.parent.childrenNodes
      .slice(ixNext)
      .findIndex((sibling) => sibling.childrenNodes.length > 0);

    /** remove next siblings (until the first sibling with childs is found) from parent */
    const removed = await this.spliceChildren(
      node.parent,
      [],
      ixNext,
      deltaWithChidren !== -1 ? deltaWithChidren : node.parent.childrenNodes.length - ixNext
    );

    /** add them as child of this node */
    await this.spliceChildren(node, removed);
  }

  async liftChildren(node: DocNode, index?: number, count?: number) {
    if (!node.parent) throw new Error('parent undefined');
    if (node.ix === undefined) throw new Error('ix undefined');

    /** default to all children */
    index = index !== undefined ? index : 0;
    count = count !== undefined ? count : node.childrenNodes.length;

    /** remove children */
    const removed = await this.spliceChildren(node, [], index, count);

    /** add to parent */
    await this.spliceChildren(node.parent, removed, node.ix + 1);
  }

  /** content is appended to the node, elements are added as silblings */
  async appendBackwards(node: DocNode, content: any, elements: DocNode[]) {
    const backwardNode = this.getBackwardNode(node);
    if (!backwardNode) throw new Error('backward node not found');

    if (node.parent === undefined) throw new Error('cant remove node');
    if (node.ix === undefined) throw new Error('cant remove node');

    /** set the content to append to the backward node */
    backwardNode.append = content;
    /** remove this node */
    await this.spliceChildren(node.parent, [], node.ix, 1);

    if (elements.length > 0) {
      if (backwardNode.parent !== undefined) {
        if (backwardNode.ix === undefined) throw new Error('cant append elements');
        /** add elements as siblings of backward node */
        await this.spliceChildren(backwardNode.parent, elements, backwardNode.ix + 1);
      } else {
        /** add elements as children of backward node */
        await this.spliceChildren(backwardNode, elements, 0);
      }
    }

    backwardNode.focused = true;
    node.focused = false;
  }

  appended(node: DocNode) {
    node.append = undefined;
    this.requestUpdate();
  }

  async convertedTo(node: DocNode, type: string) {
    if (!node.draftType) throw new Error(`Draft type not defined for ${JSON.stringify(node)}`);

    const newObject = await this.customBlocks[node.draftType].canConvertTo[type](
      node,
      this.localEvees
    );

    /** update all the node properties */
    node = await this.createNode(newObject, node.parent, node.ix);

    const loadChildren = this.localEvees.behaviorConcat(node.draft, 'children').map(
      async (child, ix): Promise<DocNode> => {
        return child !== undefined && child !== ''
          ? await this.loadNodeRec(child, ix, node)
          : node.childrenNodes[ix];
      }
    );

    node.childrenNodes = await Promise.all(loadChildren);

    this.replaceNode(node);

    this.contentChanged(node, newObject);
  }

  async joinBackward(node: DocNode, tail: string) {
    if (LOGINFO) this.logger.log('joinBackward()', { node, tail });

    /** remove this node children */
    const removed = await this.spliceChildren(node, [], 0, node.childrenNodes.length);
    await this.appendBackwards(node, tail, removed);

    this.requestUpdate();
  }

  async pullDownward(node: DocNode) {
    if (LOGINFO) this.logger.log('pullDownward()', { node });

    const next = this.getDownwardNode(node);
    if (!next) return;

    await this.joinBackward(next, next.draft.text);
    this.requestUpdate();
  }

  async lift(node: DocNode) {
    if (!node.parent) throw new Error('parent undefined');
    if (node.ix === undefined) throw new Error('ix undefined');

    await this.liftChildren(node.parent, node.ix, 1);

    this.requestUpdate();
  }

  async split(node: DocNode, tail: string, asChild: boolean) {
    if (LOGINFO) this.logger.log('split()', { node, tail });

    const dftEntity = this.defaultEntity(tail, TextType.Paragraph);

    if (asChild) {
      await this.createChild(node, dftEntity.data, 0);
    } else {
      await this.createSibling(node, dftEntity.data);
    }

    this.requestUpdate();
  }

  isNodeFocused() {
    if (!this.doc) return false;
    return this.isNodeFocusedRec(this.doc);
  }

  isNodeFocusedRec(node: DocNode): boolean {
    if (node.focused) {
      return true;
    } else {
      for (let ix = 0; ix < node.childrenNodes.length; ix++) {
        if (this.isNodeFocusedRec(node.childrenNodes[ix])) {
          return true;
        }
      }
    }
    return false;
  }

  getLastNode(): DocNode | undefined {
    if (!this.doc) return undefined;
    return this.getLastNodeRec(this.doc);
  }

  getLastNodeRec(node: DocNode): DocNode {
    if (node.childrenNodes.length === 0) {
      return node;
    } else {
      return this.getLastNodeRec(node.childrenNodes[node.childrenNodes.length - 1]);
    }
  }

  clickAreaClicked() {
    if (!this.isNodeFocused()) {
      const last = this.getLastNode();
      if (last !== undefined) {
        last.focused = true;
      }
    }
    this.requestUpdate();
  }

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener('checkout-perspective', ((event: CustomEvent) => {
      event.stopPropagation();
      this.uref = event.detail.perspectiveId;
    }) as EventListener);
  }

  handleNodePerspectiveCheckout(e: CustomEvent, node: DocNode) {
    if (node.coord.length === 1 && node.coord[0] === 0) {
      /** if this is the top element, let the parent handle this */
      return;
    }

    e.stopPropagation();

    this.checkedOutPerspectives[JSON.stringify(node.coord)] = {
      firstUref: node.uref,
      newUref: e.detail.perspectiveId,
    };

    this.requestUpdate();
  }

  handleEditorPerspectiveCheckout(e: CustomEvent, node: DocNode) {
    // we are in the parent document editor

    e.stopPropagation();

    const nodeCoord = JSON.stringify(node.coord);

    if (this.checkedOutPerspectives[nodeCoord] !== undefined) {
      if (this.checkedOutPerspectives[nodeCoord].firstUref === e.detail.perspectiveId) {
        delete this.checkedOutPerspectives[nodeCoord];
      } else {
        this.checkedOutPerspectives[nodeCoord].newUref = e.detail.perspectiveId;
      }
    }

    this.requestUpdate();
  }

  draggingOver(e, node: DocNode) {
    const wasDragging = node.draggingOver;
    node.draggingOver = true;

    /** delete the last  */
    if (node.draggingOverTimeout) {
      clearTimeout(node.draggingOverTimeout);
    }

    node.draggingOverTimeout = setTimeout(() => {
      node.draggingOver = false;
      this.requestUpdate();
    }, 400);

    if (!wasDragging) {
      this.requestUpdate();
    }
  }

  async handleDrop(e, node: DocNode) {
    const dragged = JSON.parse(e.dataTransfer.getData('text/plain'));
    if (!dragged.uref) return;
    if (dragged.parentId === this.uref) return;

    e.preventDefault();
    e.stopPropagation();

    if (node.draft.type === TextType.Title) {
      await this.createChild(node, dragged.uref, 0);
    } else {
      await this.createSibling(node, dragged.uref);
    }

    this.requestUpdate();
  }

  getColor() {
    return this.color ? this.color : eveeColor(this.uref);
  }

  renderWithCortex(node: DocNode) {
    return html` <uprtcl-entity uref=${node.uref}></uprtcl-entity> `;
  }

  renderTopRow(node: DocNode) {
    // if (LOGINFO) this.logger.log('renderTopRow()', { node });
    /** the uref to which the parent is pointing at */

    const nodeLense = this.localEvees.behaviorFirst(node.draft, 'docNodeLenses')[0];
    const icon = node.uref === '' ? icons.add_box : icons.edit;

    // for the topNode (the docId), the uref can change, for the other nodes it can't (if it does, a new editor is rendered)
    const uref = node.coord.length === 1 && node.coord[0] === 0 ? this.uref : node.uref;

    let marginTop = '-2.5px';
    if (node.draft.type === TextType.Title) {
      switch (node.level) {
        case 0:
          marginTop = '7px';
          break;
        case 1:
          marginTop = '4px';
          break;
        case 2:
          marginTop = '2px';
          break;
        default:
          marginTop = '2px';
          break;
      }
    }

    if (node.draftType === 'Quantity') {
      marginTop = '14px';
    }

    return html`
      <div
        class="row"
        @dragover=${(e) => this.draggingOver(e, node)}
        @drop=${(e) => this.handleDrop(e, node)}
      >
        ${this.showInfo
          ? html` <div class="evee-info" style=${`margin-top:${marginTop}`}>
              ${this.getEveeInfo
                ? this.getEveeInfo({ uref, parentId: node.parent ? node.parent.uref : undefined })
                : ''}
            </div>`
          : this.keepInfoPadding
          ? html`<div class="empty-evees-info"></div>`
          : ''}
        <div class="node-content">
          ${nodeLense.render(node, {
            focus: () => this.focused(node),
            blur: () => this.blured(node),
            contentChanged: (content: any, lift: boolean) =>
              this.contentChanged(node, content, lift),
            focusBackward: () => this.focusBackward(node),
            focusDownward: () => this.focusDownward(node),
            joinBackward: (tail: string) => this.joinBackward(node, tail),
            pullDownward: () => this.pullDownward(node),
            lift: () => this.lift(node),
            split: (tail: string, asChild: boolean) => this.split(node, tail, asChild),
            appended: () => this.appended(node),
            convertedTo: (type) => this.convertedTo(node, type),
          })}
        </div>
        ${node.draggingOver ? html`<div class="row-dragging-over"></div>` : ''}
      </div>
    `;
  }

  renderHere(node: DocNode) {
    return html`
      ${this.renderTopRow(node)}
      ${node.childrenNodes
        ? node.childrenNodes.map((child) => {
            return this.renderDocNode(child);
          })
        : ''}
    `;
  }

  renderDocNode(node: DocNode) {
    const coordString = JSON.stringify(node.coord);

    if (this.checkedOutPerspectives[coordString] !== undefined) {
      return html`
        <documents-editor
          uref=${this.checkedOutPerspectives[coordString].newUref}
          ?read-only=${this.readOnly}
          root-level=${node.level}
          color=${this.getColor()}
          @checkout-perspective=${(e) => this.handleEditorPerspectiveCheckout(e, node)}
        >
        </documents-editor>
      `;
    }

    const renderHere = node.draft
      ? this.localEvees.behaviorFirst(node.draft, 'docNodeLenses').length > 0
      : false;

    return html`
      <div
        style=${styleMap({
          backgroundColor: node.focused ? SELECTED_BACKGROUND : 'transparent',
        })}
        class="doc-node-container"
      >
        ${renderHere ? this.renderHere(node) : this.renderWithCortex(node)}
      </div>
    `;
  }

  renderDocumentEnd() {
    return html` <div class="doc-endSpace"></div>`;
  }

  render() {
    // if (LOGINFO) this.logger.log('render()', { doc: this.doc });

    if (this.reloading || this.doc === undefined) {
      return html` <uprtcl-loading></uprtcl-loading> `;
    }

    const editorClasses = ['editor-container'];

    if (!this.readOnly) {
      editorClasses.concat(['padding-bottom']);
    }

    return html`
      <div class=${editorClasses.join(' ')}>
        ${this.renderDocNode(this.doc)} ${this.renderDocumentEnd()}
      </div>
      <!-- <div @click=${this.clickAreaClicked} class="click-area"></div> -->
    `;
  }

  static get styles() {
    return css`
      :host {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        text-align: left;
        position: relative;
      }

      * {
        font-family: 'Lora', 'normal';
        line-height: 1.8rem;
      }

      .editor-container {
        width: 100%;
        height: 100%;
      }

      .editor-container::-webkit-scrollbar {
        display: none;
      }
      .padding-bottom {
        padding-bottom: 20vh;
      }
      .click-area {
        flex-grow: 1;
      }
      .doc-topbar {
        top: 16px;
        right: 16px;
        display: flex;
        z-index: 2;
        /* Testing */
        height: 50px;
        flex-direction: row-reverse;
        padding: 0 1rem;
      }
      .doc-topbar li {
        list-style-type: none;
        margin: auto 0.7rem;
        display: inline-block;
      }

      .doc-topbar uprtcl-button-loading {
        opacity: 0.9;
        margin-right: 6px;
        width: 90px;
      }

      .doc-node-container {
        border-radius: 4px;
        max-width: 1280px;
        margin: auto;
      }

      .doc-actionbar {
        position: absolute;
        bottom: 5%;
        right: 5%;
        display: flex;
        align-items: center;
      }
      .doc-actionbar > * {
        margin: 0 0.2rem;
        height: inherit;
      }
      .publish-button {
        width: 190px;
      }
      .row {
        position: relative;
        padding: 4px 0px;
        display: flex;
        flex-direction: row;
      }

      .row-dragging-over {
        position: absolute;
        bottom: -1px;
        height: 2px;
        background-color: #2196f3;
        width: 100%;
      }

      .evee-info {
        display: flex;
        flex-direction: column;
        justify-content: start;
        margin-right: 0.9vw;
      }

      .empty-evees-info {
        width: 10px;
        height: 10px;
      }

      .node-content {
        flex: 1 1 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        position: relative;
        padding-right: 4px;
      }

      .node-mark {
        position: absolute;
        top: 0px;
        left: 0px;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        fill: rgb(80, 80, 80, 0.2);
      }

      .node-mark svg {
        height: 14px;
        width: 14px;
      }
    `;
  }
}
