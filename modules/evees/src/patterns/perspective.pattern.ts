import { html, TemplateResult } from 'lit-element';
import { ApolloClient, gql, from } from 'apollo-boost';
import { injectable, inject } from 'inversify';

import {
  HasRedirect,
  Pattern,
  IsSecure,
  HasLinks,
  Creatable,
  HasActions,
  PatternAction,
  Entity,
  Signed,
  CortexModule,
  PatternRecognizer,
  Newable
} from '@uprtcl/cortex';
import { Updatable } from '@uprtcl/access-control';
import { ApolloClientModule } from '@uprtcl/graphql';
import { DiscoveryModule, DiscoveryService, createEntity } from '@uprtcl/multiplatform';
import { HasLenses, Lens } from '@uprtcl/lenses';

import { Secured } from '../patterns/default-secured.pattern';
import {
  Perspective,
  UprtclAction,
  CREATE_DATA_ACTION,
  CreateDataAction,
  CREATE_COMMIT_ACTION,
  CreateCommitAction,
  CREATE_AND_INIT_PERSPECTIVE,
  CreateAndInitPerspectiveAction,
  PerspectiveDetails
} from '../types';
import { EveesBindings } from '../bindings';
import { Evees, NewPerspectiveArgs, CreatePerspectiveArgs } from '../services/evees';
import { MergeStrategy } from '../merge/merge-strategy';
import { CREATE_COMMIT, CREATE_PERSPECTIVE } from '../graphql/queries';

export const propertyOrder = ['origin', 'creatorId', 'timestamp'];

@injectable()
export class PerspectiveEntity implements Entity {
  constructor(@inject(EveesBindings.Secured) protected securedPattern: Pattern & IsSecure<any>) {}
  recognize(object: object) {
    return (
      this.securedPattern.recognize(object) &&
      propertyOrder.every(p =>
        this.securedPattern.extract(object as Secured<Perspective>).hasOwnProperty(p)
      )
    );
  }

  name = 'Perspective';
}

@injectable()
export class PerspectiveLens extends PerspectiveEntity implements HasLenses {
  constructor(
    @inject(EveesBindings.Secured)
    protected securedPattern: Pattern & IsSecure<Secured<Perspective>>
  ) {
    super(securedPattern);
  }

  lenses = (perspective: Secured<Perspective>): Lens[] => {
    return [
      {
        name: 'evees:evee-perspective',
        type: 'evee',
        render: (lensContent: TemplateResult, context: any) => {
          const color: string = context ? (context.color ? context.color : undefined) : undefined;

          const level: number = context ? (context.level !== undefined ? context.level : 1) : 1;
          const index: number = context
            ? context.index !== undefined
              ? context.index
              : undefined
            : undefined;
          const genealogy: string[] = context
            ? context.genealogy !== undefined
              ? context.genealogy
              : []
            : [];

          const onlyChildren: string = context
            ? context.onlyChildren !== undefined
              ? context.onlyChildren
              : 'false'
            : 'false';

          console.log('[PERSPECTIVE-PATTERN] render()', {
            perspective,
            context,
            onlyChildren,
            color
          });

          return html`
            <evees-perspective
              perspective-id=${perspective.id}
              evee-color=${color}
              only-children=${onlyChildren}
              level=${level}
              index=${index}
              .genealogy=${genealogy}
            >
            </evees-perspective>
          `;
        }
      }
    ];
  };
}

@injectable()
export class PerspectiveCreate extends PerspectiveEntity
  implements
    Creatable<CreatePerspectiveArgs, Signed<Perspective>>,
    Newable<NewPerspectiveArgs, Signed<Perspective>>,
    HasActions {
  constructor(
    @inject(EveesBindings.Secured) protected securedPattern: Pattern & IsSecure<any>,
    @inject(EveesBindings.Evees) protected evees: Evees,
    @inject(EveesBindings.MergeStrategy) protected merge: MergeStrategy,
    @inject(DiscoveryModule.bindings.DiscoveryService) protected discovery: DiscoveryService,
    @inject(CortexModule.bindings.Recognizer) protected patternRecognizer: PatternRecognizer,
    @inject(ApolloClientModule.bindings.Client) protected client: ApolloClient<any>
  ) {
    super(securedPattern);
  }

  create = () => async (args: CreatePerspectiveArgs, authority: string) => {
    let fromDetails: PerspectiveDetails = (args as any).fromDetails;
    if (fromDetails) {
      fromDetails.context = fromDetails.context || `${Date.now()}:${Math.random() / 1000}`;
      fromDetails.name = fromDetails.name || 'master';

      const result = await this.evees.computeNewGlobalPerspectiveOps(
        authority,
        fromDetails,
        args.canWrite
      );
      const actions = result[1];
      const perspective = result[0];

      const createDataPromises = actions
        .filter(a => a.type === CREATE_DATA_ACTION)
        .map(async (action: UprtclAction<CreateDataAction>) => {
          const dataId = await createEntity(this.patternRecognizer)(
            action.payload.data,
            action.payload.source
          );
          if (dataId !== action.id) {
            throw new Error(`created entity id ${dataId} not as expected ${action.id}`);
          }
        });

      await Promise.all(createDataPromises);

      const createCommitsPromises = actions
        .filter(a => a.type === CREATE_COMMIT_ACTION)
        .map(async (action: UprtclAction<CreateCommitAction>) => {
          const result = await this.client.mutate({
            mutation: CREATE_COMMIT,
            variables: {
              ...action.payload.commit,
              source: action.payload.source
            }
          });
          const headId = result.data.createCommit.id;
          if (headId !== action.id) {
            throw new Error(`created commit id ${headId} not as expected ${action.id}`);
          }
        });

      await Promise.all(createCommitsPromises);

      const createPerspectivesPromises = actions
        .filter(a => a.type === CREATE_AND_INIT_PERSPECTIVE)
        .map(async (action: UprtclAction<CreateAndInitPerspectiveAction>) => {
          const result = await this.client.mutate({
            mutation: CREATE_PERSPECTIVE,
            variables: {
              creatorId: action.payload.perspective.object.payload.creatorId,
              origin: action.payload.perspective.object.payload.origin,
              timestamp: action.payload.perspective.object.payload.timestamp,
              headId: action.payload.details.headId,
              context: action.payload.details.context,
              name: action.payload.details.name,
              authority: action.payload.perspective.object.payload.origin,
              canWrite: action.payload.owner
            }
          });
          if (result.data.createPerspective.id !== action.id) {
            throw new Error(
              `created commit id ${result.data.createPerspective.id} not as expected ${action.id}`
            );
          }
        });

      await Promise.all(createPerspectivesPromises);

      return perspective;
    } else {
      const remote = this.evees.getAuthority(authority);

      const perspective = await this.new()((args as any).newPerspective);
      const result = await this.client.mutate({
        mutation: CREATE_PERSPECTIVE,
        variables: {
          creatorId: perspective.object.payload.creatorId,
          origin: perspective.object.payload.origin,
          timestamp: perspective.object.payload.timestamp,
          authority: perspective.object.payload.origin,
          canWrite: args.canWrite || remote.userId
        }
      });

      return perspective;
    }
  };

  new = () => async (args: NewPerspectiveArgs) => {
    const userId = this.evees.getAuthority(args.autority).userId;

    if (!userId) throw new Error('Cannot create in an authority in which you are not signed in');

    const perspective: Perspective = {
      creatorId: userId,
      origin: args.autority,
      timestamp: args.timestamp || Date.now()
    };

    return this.securedPattern.derive()(perspective);
  };

  actions = (perspective: Secured<Perspective>): PatternAction[] => {
    return [];
  };
}

@injectable()
export class PerspectiveLinks extends PerspectiveEntity implements HasLinks, HasRedirect {
  constructor(
    @inject(EveesBindings.Secured) protected securedPattern: Pattern & IsSecure<any>,
    @inject(ApolloClientModule.bindings.Client) protected client: ApolloClient<any>
  ) {
    super(securedPattern);
  }

  links = async (perspective: Secured<Perspective>) => {
    const result = await this.client.query({
      query: gql`{
        entity(id: "${perspective.id}") {
          id
          ... on Perspective {
            head {
              id
            }
          }
        }
      }`
    });

    const headId = result.data.entity.head ? result.data.entity.head.id : undefined;

    return headId ? [headId] : [];
  };

  redirect = async (perspective: Secured<Perspective>) => {
    const result = await this.client.query({
      query: gql`{
        entity(id: "${perspective.id}") {
          id
          ... on Perspective {
            head {
              id
            }
          }
        }
      }`
    });

    return result.data.entity.head ? result.data.entity.head.id : undefined;
  };
}

@injectable()
export class PerspectiveAccessControl extends PerspectiveEntity
  implements Updatable<Secured<Perspective>> {
  constructor(
    @inject(EveesBindings.Secured) protected securedPattern: Pattern & IsSecure<any>,
    @inject(EveesBindings.Evees) protected evees: Evees
  ) {
    super(securedPattern);
  }

  authority = (perspective: Secured<Perspective>) =>
    this.evees.getPerspectiveProvider(perspective.object);

  accessControl = (perspective: Secured<Perspective>) => {
    const provider = this.evees.getPerspectiveProvider(perspective.object);
    return provider.accessControl;
  };
}
