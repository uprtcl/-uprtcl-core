import { Entity, PatternRecognizer, HasChildren, Signed } from '@uprtcl/cortex';

import { Commit, EveesConfig, Perspective } from '../types';
import { signObject } from '../utils/signed';
import { EveesBindings } from '../bindings';
import { hashObject, Secured } from '../utils/cid-hash';
import { Client } from './client';
import { MergeStrategy } from '../merge/merge-strategy';
import { RemoteEvees } from './remote.evees';

export interface CreateCommit {
  dataId: string;
  parentsIds?: string[];
  creatorsIds?: string[];
  message?: string;
  timestamp?: number;
}

export interface CreatePerspective {
  headId?: string;
  parentId?: string;
  context?: string;
  name?: string;
  canUpdate?: string;
  timestamp?: number;
  creatorId?: string;
}

export class Evees {
  constructor(
    readonly client: Client,
    readonly recognizer: PatternRecognizer,
    readonly remotes: RemoteEvees[],
    readonly merge: MergeStrategy,
    readonly config: EveesConfig
  ) {}

  async getRemote(remoteId: string): Promise<RemoteEvees> {
    const remote = this.remotes.find((r) => r.id === remoteId);
    if (!remote) throw new Error(`remote ${remoteId} not found`);
    return remote;
  }

  async getPerspectiveRemote(perspectiveId: string, client?: Client): Promise<RemoteEvees> {
    client = client || this.client;
    const perspective = await client.getEntity(perspectiveId);
    if (!perspective) throw new Error('perspective not found');
    const remoteId = perspective.object.payload.remote;
    return this.getRemote(remoteId);
  }

  async getPerspectiveDataId(perspectiveId: string, client?: Client): Promise<string | undefined> {
    client = client || this.client;
    const result = await client.getPerspective(perspectiveId);
    if (result.details.headId === undefined) return undefined;
    return this.getCommitDataId(result.details.headId, client);
  }

  async getPerspectiveData(perspectiveId: string, client?: Client): Promise<Entity<any>> {
    client = client || this.client;
    const result = await client.getPerspective(perspectiveId);
    if (result.details.headId === undefined)
      throw new Error(`Data not found for perspective ${perspectiveId}`);
    return this.getCommitData(result.details.headId, client);
  }

  async getCommitData(commitId: string, client?: Client): Promise<Entity<any>> {
    client = client || this.client;
    const dataId = await this.getCommitDataId(commitId, client);
    const data = await client.getEntity(dataId);
    return data;
  }

  async getCommitDataId(commitId: string, client?: Client): Promise<string> {
    client = client || this.client;
    const commit = await client.getEntity(commitId);
    return commit.object.payload.dataId;
  }

  async getData(uref: string, client?: Client) {
    client = client || this.client;
    const entity = await client.getEntity(uref);

    let entityType: string = this.recognizer.recognizeType(entity);

    switch (entityType) {
      case EveesBindings.PerspectiveType:
        return this.getPerspectiveData(uref, client);

      case EveesBindings.CommitType:
        return this.getCommitData(uref, client);

      default:
        return entity;
    }
  }

  async getChildren(
    recognizer: PatternRecognizer,
    uref: string,
    client?: Client
  ): Promise<string[]> {
    const data = await this.getData(uref, client);

    const hasChildren: HasChildren = recognizer
      .recognizeBehaviours(data)
      .find((b) => (b as HasChildren).getChildrenLinks);

    return hasChildren.getChildrenLinks(data);
  }

  async createCommit(commit: CreateCommit, client?: Client): Promise<Secured<Commit>> {
    client = client || this.client;

    const message = commit.message !== undefined ? commit.message : '';
    const timestamp = commit.timestamp !== undefined ? commit.timestamp : Date.now();
    const creatorsIds = commit.creatorsIds !== undefined ? commit.creatorsIds : [];
    const parentsIds = commit.parentsIds !== undefined ? commit.parentsIds : [];

    const commitData: Commit = {
      creatorsIds: creatorsIds,
      dataId: commit.dataId,
      message: message,
      timestamp: timestamp,
      parentsIds: parentsIds,
    };

    const commitObject = signObject(commitData);
    const created = await client.storeEntities([commitObject]);
    return created[0];
  }

  async isAncestorCommit(client: Client, perspectiveId: string, commitId: string, stopAt?: string) {
    const result = await client.getPerspective(perspectiveId);
    if (result.details.headId === undefined) return false;
    const findAncestor = new FindAncestor(client, commitId, stopAt);
    return findAncestor.checkIfParent(result.details.headId);
  }

  async checkEmit(perspectiveId: string, client?: Client): Promise<boolean> {
    client = client || this.client;
    if (this.config.emitIf === undefined) return false;

    const toRemote = await this.getPerspectiveRemote(perspectiveId, client);
    if (toRemote.id === this.config.emitIf.remote) {
      const owner = await (toRemote.accessControl as any).getOwner(perspectiveId);
      return owner === this.config.emitIf.owner;
    }

    return false;
  }

  async snapDefaultPerspective(
    remote: RemoteEvees,
    creatorId?: string,
    context?: string,
    timestamp?: number,
    path?: string,
    fromPerspectiveId?: string,
    fromHeadId?: string
  ) {
    creatorId = creatorId ? creatorId : remote.userId ? remote.userId : '';
    timestamp = timestamp !== undefined ? timestamp : Date.now();

    const defaultContext = await hashObject({
      creatorId,
      timestamp,
    });

    context = context || defaultContext;

    const object: Perspective = {
      creatorId: creatorId as string,
      remote: remote.id,
      path: path !== undefined ? path : remote.defaultPath,
      timestamp,
      context,
    };

    if (fromPerspectiveId) object.meta.fromPerspectiveId = fromPerspectiveId;
    if (fromHeadId) object.meta.fromHeadId = fromHeadId;

    const hash = await this.client.hashEntity(object, remote.id);
    return {
      id: hash,
      object,
    };
  }

  async getHome(
    remote: RemoteEvees,
    userId?: string,
    client?: Client
  ): Promise<Entity<Perspective>> {
    client = client || this.client;

    const creatorId = userId === undefined ? 'root' : userId;
    const remoteHome: Perspective = {
      remote: remote.id,
      path: remote.defaultPath,
      creatorId,
      timestamp: 0,
      context: `${creatorId}.home`,
    };

    const hash = await client.hashEntity(remoteHome, remote.id);
    return {
      id: hash,
      object: remoteHome,
    };
  }

  async isOfPattern(uref: string, pattern: string, client?: Client): Promise<boolean> {
    client = client || this.client;
    const entity = await client.getEntity(uref);
    const type = this.recognizer.recognizeType(entity);
    return type === pattern;
  }

  /**
   * receives an entity id and compute the actions that will
   * result on this entity being forked on a target remote
   * with a target owner (canUpdate).
   *
   * it also makes sure that all entities are clonned
   * on the target remote default store.
   *
   * recursively fork entity children
   */
  async fork(id: string, remote: string, parentId?: string, client?: Client): Promise<string> {
    client = client || this.client;
    const isPerspective = await this.isOfPattern(id, EveesBindings.PerspectiveType);
    if (isPerspective) {
      return this.forkPerspective(id, remote, parentId, client);
    } else {
      const isCommit = await this.isOfPattern(id, EveesBindings.CommitType);
      if (isCommit) {
        return this.forkCommit(id, remote, parentId, client);
      } else {
        return this.forkEntity(id, remote, parentId, client);
      }
    }
  }

  getEntityChildren(entity: object) {
    let hasChildren: HasChildren | undefined = this.recognizer
      .recognizeBehaviours(entity)
      .find((prop) => !!(prop as HasChildren).getChildrenLinks);

    if (!hasChildren) {
      return [];
    } else {
      return hasChildren.getChildrenLinks(entity);
    }
  }

  replaceEntityChildren(entity: object, newLinks: string[]) {
    let hasChildren: HasChildren | undefined = this.recognizer
      .recognizeBehaviours(entity)
      .find((prop) => !!(prop as HasChildren).getChildrenLinks);

    if (!hasChildren) {
      throw new Error(`entity dont hasChildren ${JSON.stringify(entity)}`);
    } else {
      return hasChildren.replaceChildrenLinks(entity)(newLinks);
    }
  }

  async forkPerspective(
    perspectiveId: string,
    parentId?: string,
    name?: string,
    client?: Client
  ): Promise<string> {
    client = client || this.client;

    const refPerspective: Entity<Signed<Perspective>> = await client.getEntity(perspectiveId);

    const { details } = await client.getPerspective(perspectiveId);

    const perspective = await client.snapPerspective(
      { context: refPerspective.object.payload.context },
      { parentId }
    );

    await client.storeEntities([perspective.object]);

    let forkCommitId: string | undefined = undefined;

    if (details.headId !== undefined) {
      forkCommitId = await this.forkCommit(
        details.headId,
        perspective.object.payload.remote,
        perspective.id, // this perspective is set as the parent of the children's new perspectives
        client
      );
    }

    client.update({
      newPerspectives: [
        {
          perspective,
          details: { headId: forkCommitId },
          links: { parentId },
        },
      ],
    });

    return perspective.id;
  }

  async forkCommit(
    commitId: string,
    remote: string,
    parentId?: string,
    client?: Client
  ): Promise<string> {
    client = client || this.client;

    const commit: Secured<Commit> | undefined = await client.getEntity(commitId);

    const dataId = commit.object.payload.dataId;
    const dataForkId = await this.forkEntity(dataId, remote, parentId, client);

    const eveesRemote = await this.getRemote(remote);

    /** build new head object pointing to new data */
    const newCommit: Commit = {
      creatorsIds: eveesRemote.userId ? [eveesRemote.userId] : [''],
      dataId: dataForkId,
      message: `autocommit to fork ${commitId} on remote ${remote}`,
      forking: commitId,
      parentsIds: [],
      timestamp: Date.now(),
    };

    return client.storeEntity(newCommit, remote);
  }

  async forkEntity(
    entityId: string,
    remote: string,
    parentId?: string,
    client?: Client
  ): Promise<string> {
    client = client || this.client;
    const data = await client.getEntity(entityId);
    if (!data) throw new Error(`data ${entityId} not found`);

    /** createOwnerPreservingEntity of children */
    const getLinksForks = this.getEntityChildren(data).map((link) =>
      this.fork(link, remote, parentId, client)
    );
    const newLinks = await Promise.all(getLinksForks);
    const tempData = this.replaceEntityChildren(data, newLinks);

    return client.storeEntity(tempData.object, remote);
  }
}

export class FindAncestor {
  done = false;

  constructor(protected client: Client, protected lookingFor: string, protected stopAt?: string) {}

  async checkIfParent(commitId: string) {
    /* stop searching all paths once one path finds it */
    if (this.done) {
      return false;
    }

    if (this.lookingFor === commitId) {
      this.done = true;
      return true;
    }

    if (this.stopAt !== undefined) {
      if (this.stopAt === commitId) {
        this.done = true;
        return false;
      }
    }

    const commit = await this.client.getEntity(commitId);

    if (commit.object.payload.parentsIds.length === 0) {
      return false;
    }

    const seeParents = await Promise.all(
      commit.object.payload.parentsIds.map((parentId) => {
        /* recursively look on parents */
        return this.checkIfParent(parentId);
      })
    );

    return seeParents.includes(true);
  }
}
