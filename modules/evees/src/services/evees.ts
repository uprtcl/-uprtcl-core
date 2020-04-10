import { ApolloClient, gql } from 'apollo-boost';
import { multiInject, injectable, inject } from 'inversify';

import {
  PatternRecognizer,
  HasChildren,
  CortexModule,
  Signed,
  Entity
} from '@uprtcl/cortex';
import { KnownSourcesService, DiscoveryModule } from '@uprtcl/multiplatform';
import { Logger } from '@uprtcl/micro-orchestrator';
import { ApolloClientModule } from '@uprtcl/graphql';

import {
  Perspective,
  Commit,
  PerspectiveDetails,
  RemotesConfig,
  UprtclAction,
  CREATE_DATA_ACTION,
  CREATE_COMMIT_ACTION,
  CREATE_AND_INIT_PERSPECTIVE_ACTION
} from '../types';
import { EveesBindings } from '../bindings';
import { EveesRemote } from './evees.remote';
import { Secured, signAndHashObject, hashObject } from '../utils/cid-hash';

export interface NoHeadPerspectiveArgs {
  name?: string;
  context?: string;
}

export type CreatePerspectiveArgs = {
  parentId?: string;
  ofPerspectiveId?: string;
  canWrite?: string;
} & (
  | { newPerspective: NewPerspectiveArgs }
  | { fromDetails: { headId: string; context?: string; name?: string } }
);

export interface NewPerspectiveArgs {
  autority: string;
  timestamp?: number;
}

export interface CreateCommitArgs {
  parentsIds?: string[];
  dataId: string;
  creatorsIds?: string[];
  timestamp?: number;
  message?: string;
}

/**
 * Main service used to interact with _Prtcl compatible objects and providers
 */
@injectable()
export class Evees {
  logger = new Logger('evees');

  constructor(
    @inject(CortexModule.bindings.Recognizer) protected patternRecognizer: PatternRecognizer,
    @inject(DiscoveryModule.bindings.LocalKnownSources)
    public knownSources: KnownSourcesService,
    @multiInject(EveesBindings.EveesRemote)
    protected eveesRemotes: EveesRemote[],
    @inject(ApolloClientModule.bindings.Client)
    protected client: ApolloClient<any>,
    @inject(EveesBindings.RemotesConfig)
    protected remotesConfig: RemotesConfig
  ) {}

  /** Public functions */

  public getAuthority(authorityID: string | undefined): EveesRemote {
    if (!authorityID && this.eveesRemotes.length === 1) return this.eveesRemotes[0];

    const remote = this.eveesRemotes.find(remote => remote.authorityID === authorityID);

    if (!remote) throw new Error(`Authority ${authorityID}  is not registered`);

    return remote;
  }

  /**
   * Returns the uprtcl remote that controls the given perspective, from its origin
   * @returns the uprtcl remote
   */
  public getPerspectiveProvider(perspective: Signed<Perspective>): EveesRemote {
    const perspectiveOrigin = perspective.payload.origin;

    return this.getAuthority(perspectiveOrigin);
  }

  /**
   * Returns the uprtcl remote that controls the given perspective, from its origin
   * @returns the uprtcl remote
   */
  public async getPerspectiveProviderById(perspectiveId: String): Promise<EveesRemote> {
    const result = await this.client.query({
      query: gql`
        {
          entity(ref: "${perspectiveId}") {
            id 
            ... on Perspective {
              payload {
                origin
              }
            }
          }
        }
      `
    });

    const perspectiveOrigin = result.data.entity.payload.origin;
    return this.getAuthority(perspectiveOrigin);
  }

  public async getContextPerspectives(context: string): Promise<string[]> {
    const promises = this.eveesRemotes.map(async remote => {
      const thisPerspectivesIds = await remote.getContextPerspectives(context);
      thisPerspectivesIds.forEach(pId => {
        this.knownSources.addKnownSources(pId, [remote.casID]);
      });
      return thisPerspectivesIds;
    });

    const perspectivesIds = await Promise.all(promises);

    return ([] as string[]).concat(...perspectivesIds);
  }

  /** Creators */

  /**
   * Creates a new perspective with the given arguments,
   * creating the context, data and commit if necessary
   *
   * @param args the properties of the perspectives
   * @param upl provider to which to create the perspective, needed if there is more than one provider
   */
  public async computeNewGlobalPerspectiveOps(
    authority: string,
    details: PerspectiveDetails,
    ofPerspectiveId?: string,
    canWrite?: string,
    parentId?: string
  ): Promise<[Secured<Perspective>, Array<UprtclAction>]> {
    const eveesRemote = this.getAuthority(authority);

    if (!eveesRemote.userId)
      throw new Error(`Cannot create perspectives on remotes you aren't signed in`);

    let actions: Array<UprtclAction> = [];

    let headId: string;
    if (ofPerspectiveId === undefined) {
      if (!details.headId)
        throw new Error('headId must be provided if ofPerspectiveId is not provided)');
      headId = details.headId;
    } else {
      const result = await this.client.query({
        query: gql`{
          entity(ref: "${ofPerspectiveId}") {
            id
            ... on Perspective {
              head {
                id
              }
            }
          }
        }`
      });

      headId = result.data.entity.head.id;
    }

    // Create the perspective id
    const perspectiveData: Perspective = {
      creatorId: eveesRemote.userId,
      origin: eveesRemote.authorityID,
      timestamp: Date.now()
    };
    const perspective: Secured<Perspective> = await signAndHashObject(perspectiveData);

    const result = await this.client.query({
      query: gql`{
        entity(ref: "${headId}") {
          id
          ... on Commit {
            data {
              id
              _context {
                object
              }
            }
          }
        }
      }`
    });

    const dataId = result.data.entity.data.id;
    const dataRaw = result.data.entity.data._context.object;
    const dataHashed = { id: dataId, entity: dataRaw };

    let newHeadId = headId;

    const hasChildren:
      | HasChildren<Entity<any>>
      | undefined = this.patternRecognizer
      .recognizeBehaviours(dataHashed)
      .find(prop => !!(prop as HasChildren).getChildrenLinks);

    if (hasChildren) {
      const descendantLinks = hasChildren.getChildrenLinks(dataHashed);

      if (descendantLinks.length > 0) {
        const promises = descendantLinks.map(async link => {
          const descendantResult = await this.client.query({
            query: gql`{
              entity(ref: "${link}") {
                id
                ... on Perspective {
                  head {
                    id
                  }
                  name
                  context {
                    id
                  }
                }
              }
            }`
          });

          const perspectiveDetails: PerspectiveDetails = {
            context: descendantResult.data.entity.context.id,
            name: descendantResult.data.entity.name
          };

          return this.computeNewGlobalPerspectiveOps(
            authority,
            perspectiveDetails,
            link,
            canWrite,
            perspective.id
          );
        });

        const results = await Promise.all(promises);

        actions = actions.concat(...results.map(r => r[1]));

        const newLinks = results.map(r => r[0].id);

        const newData: Entity<any> = hasChildren.replaceChildrenLinks(dataHashed)(newLinks);
        const dataSource = this.remotesConfig.map(eveesRemote.authorityID);

        const newHash = await hashObject(newData.entity,dataSource.cidConfig)

        const newEntity: Entity<any> = {
          id: newHash,
          entity: newData.entity
        };

        const newDataAction: UprtclAction = {
          type: CREATE_DATA_ACTION,
          entity: newEntity,
          payload: {
            source: dataSource.casID
          }
        };

        actions.push(newDataAction);

        const newCommit: Commit = {
          dataId: newHash,
          message: `auto-commit for new perspective ${name}`,
          creatorsIds: [eveesRemote.userId],
          parentsIds: headId ? [headId] : [],
          timestamp: Date.now()
        };

        const entity = await signAndHashObject(newCommit, eveesRemote.cidConfig);

        const newCommitAction: UprtclAction = {
          type: CREATE_COMMIT_ACTION,
          entity: entity,
          payload: {
            source: eveesRemote.casID
          }
        };

        newHeadId = entity.id;

        actions.push(newCommitAction);
      }
    }

    const newPerspectiveAction: UprtclAction = {
      type: CREATE_AND_INIT_PERSPECTIVE_ACTION,
      entity: perspective,
      payload: {
        details: { headId: newHeadId, name, context: details.context },
        owner: canWrite || eveesRemote.userId,
        parentId: parentId
      }
    };

    actions.push(newPerspectiveAction);

    return [perspective, actions];
  }
}
