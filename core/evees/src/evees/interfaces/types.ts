import { Entity } from './entity';
import { ClientRemote } from './client.remote';
import { Signed } from '../../patterns';

/** Core perspective format. A perspective is like a URL, it includes the coordinates to reach a current head.
 * The hash of the perspective is the perspective id. */
export interface Perspective {
  remote: string;
  path: string;
  creatorId: string;
  context: string;
  timestamp: number;
  meta?: any; // optional parameters handle arbitrary metadata
}

/** A remote stores and resolves data to each perspective. The data a remote stores
 * is of type PerspectiveDetails
 * - The head commit (a Commit object with the history of the perspective and current content (under dataId))
 * - The guardianId: Useful to handle access control in general, it specifies from which other perspective, this perspective inherits its access control.
 * - The canUpdate: This is used only when fetching the perspective, and informs whether the current logged user on the remote can update it.
 */
export interface PerspectiveDetails {
  headId?: string;
  guardianId?: string;
  /** for read only */
  canUpdate?: boolean;
}

export interface Commit {
  creatorsIds: string[];
  timestamp: number;
  message?: string;
  forking?: string;
  parentsIds: Array<string>;
  dataId: string;
}

/** An update to perspective is summarized into an Update object */
export interface Update {
  perspectiveId: string;
  details: PerspectiveDetails;
  fromPerspectiveId?: string;
  indexData?: IndexData;
}

export interface IndexData {
  linkChanges?: LinkChanges;
  text?: string;
}

/** Each update can optionally include the changes in the way a persective is
 * connected/linked with other objects. We have a special type of link called children
 * which explicitely considers the link a child and a part of the parent, and can be used
 * for recurse-by-default operations */

export interface ArrayChanges {
  added: string[];
  removed: string[];
}

export enum LinksType {
  onEcosystem = 'onEcosystem',
  children = 'children',
  linksTo = 'linksTo',
}

export type LinkChanges = {
  [key in LinksType]?: ArrayChanges;
};

/** Remote interface to create a perspective  */
export interface NewPerspective {
  perspective: Secured<Perspective>;
  update: Update;
}

/** A perspective-like object that is useful as input for functions that can create a new perspective object and
 * some properties are left optional */
export interface PartialPerspective {
  remote?: string;
  path?: string;
  creatorId?: string;
  context?: string;
  timestamp?: number;
  meta?: any;
}

/** Optional entry to be stored under meta.forking */
export interface ForkDetails {
  perspectiveId: string;
  headId?: string;
}

/** Helper interface with info typically needed by high level user interfaces to create a new perspective */
export interface CreateEvee {
  remoteId?: string;
  object?: any;
  partialPerspective?: PartialPerspective;
  /** receive the perspectiveId in case the perspective was already created */
  perspectiveId?: string;
  perspective?: Secured<Perspective>;
  guardianId?: string;
  indexData?: IndexData;
}

export interface GetPerspectiveOptions {
  levels?: number;
  entities?: boolean;
  details?: boolean;
}

export interface PerspectiveAndDetails {
  id: string;
  details: PerspectiveDetails;
}

export interface Slice {
  perspectives: PerspectiveAndDetails[];
  entities: Entity[];
}

export interface PerspectiveGetResult {
  details: PerspectiveDetails;
  slice?: Slice;
}

export interface EveesMutation {
  newPerspectives: NewPerspective[];
  updates: Update[];
  deletedPerspectives: string[];
}

export interface EveesMutationCreate {
  newPerspectives?: NewPerspective[];
  updates?: Update[];
  deletedPerspectives?: string[];
  entities?: Entity[];
}

export interface EveesOptions {
  creatorId?: string;
  createdBefore?: number;
  createdAfter?: number;
  updatedBefore?: number;
  updatedAfter?: number;
}

export interface SearchOptions {
  start?: SearchOptionsTree;
  linksTo?: SearchOptionsLink;
  text?: {
    value: string;
    textLevels?: number;
  };
  orderBy?: string;
  pagination?: {
    first: number;
    offset: number;
  };
}

export enum Join {
  inner = 'INNER_JOIN',
  full = 'FULL_JOIN',
}

export interface SearchOptionsTree {
  joinType?: Join.inner | Join.full;
  elements: JoinTree[];
}

export interface SearchOptionsLink {
  joinType?: Join.inner | Join.full;
  elements: string[];
}

export interface JoinTree {
  id: string;
  direction?: 'under' | 'above';
  levels?: number;
  forks?: SearchForkOptions;
}

export interface SearchForkOptions {
  exclusive?: boolean;
  independent?: boolean;
  independentOf?: string;
}

export interface SearchResult {
  perspectiveIds: string[];
  ended?: boolean;
  forksDetails?: ForkOf[];
  slice?: Slice;
}

export interface ParentAndChild {
  parentId: string;
  childId: string;
}

export interface ForkOf {
  forkIds: string[];
  ofPerspectiveId: string;
  atHeadId?: string;
}

export interface EveesConfig {
  defaultRemote?: ClientRemote;
  officialRemote?: ClientRemote;
  editableRemotesIds?: string[];
  emitIf?: {
    remote: string;
    owner: string;
  };
  flush?: FlushConfig;
}

export interface UpdateDetails {
  path: string[];
  newData: Entity;
  oldData?: Entity;
  update: Update;
}

export interface UpdatePerspectiveData {
  perspectiveId: string;
  object: any;
  onHeadId?: string;
  guardianId?: string;
  indexData?: IndexData;
  flush?: FlushConfig;
}

export interface FlushConfig {
  debounce?: number;
  autoflush?: boolean;
  levels?: number;
  condensate?: boolean;
}

export type Secured<T> = Entity<Signed<T>>;
