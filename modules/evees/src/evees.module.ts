import { interfaces } from 'inversify';

import { MicroModule, i18nextModule, Dictionary } from '@uprtcl/micro-orchestrator';
import { PatternsModule } from '@uprtcl/cortex';
import { SourcesModule } from '@uprtcl/multiplatform';
import { GraphQlSchemaModule } from '@uprtcl/graphql';
import { AccessControlModule } from '@uprtcl/access-control';

import { DefaultSecuredPattern } from './patterns/default-secured.pattern';
import { DefaultSignedPattern } from './patterns/default-signed.pattern';
import { CidHashedPattern } from './patterns/cid-hashed.pattern';
import {
  PerspectiveLinks,
  PerspectiveLens,
  PerspectiveAccessControl,
} from './patterns/perspective.pattern';
import { CommitLens, CommitLinked } from './patterns/commit.pattern';
import { CommitHistory } from './elements/evees-commit-history';
import { EveesBindings } from './bindings';
import { Evees } from './services/evees';
import { EveesRemote } from './services/evees.remote';
import { eveesTypeDefs } from './graphql/schema';
import { eveesResolvers } from './graphql/resolvers';
import { PerspectivesList } from './elements/evees-perspectives-list';
import { EveesInfoPopper } from './elements/evees-info-popper';

import en from './i18n/en.json';
import { RemotesConfig } from './types';
import { EveesInfoPage } from './elements/evees-info-page';
import { ItemWithMenu } from './elements/common-ui/evees-list-item';
import { EveesOptionsMenu } from './elements/common-ui/evees-options-menu';
import { RecursiveContextMergeStrategy } from './uprtcl-evees';

/**
 * Configure a _Prtcl Evees module with the given service providers
 *
 * Example usage:
 *
 * ```ts
 * import { MicroOrchestrator } from '@uprtcl/micro-orchestrator';
 * import { IpfsConnection } from '@uprtcl/ipfs-provider';
 * import { HolochainConnection } from '@uprtcl/holochain-provider';
 * import { EthereumConnection } from '@uprtcl/ethereum-provider';
 * import { EveesModule, EveesEthereum, EveesHolochain, EveesBindings } from '@uprtcl/evees';
 *
 * const ipfsConnection = new IpfsConnection({
 *   host: 'ipfs.infura.io',
 *   port: 5001,
 *   protocol: 'https'
 * });
 *
 * // Don't put anything on host to get from Metamask's ethereum provider
 * const ethConnection = new EthereumConnection({});
 *
 * const eveesEth = new EveesEthereum(ethConnection, ipfsConnection);
 *
 * const hcConnection = new HolochainConnection({ host: 'ws://localhost:8888' });
 *
 * const eveesHolochain = new EveesHolochain('test-instance', hcConnection);
 *
 * const evees = new EveesModule([eveesHolochain, eveesEth]);
 *
 * const orchestrator = new MicroOrchestrator();
 *
 * await orchestrator.loadModule(evees);
 * ```
 *
 * @category CortexModule
 *
 * @param eveesProviders
 * @param localEvees
 */
export class EveesModule extends MicroModule {
  static id = 'evees-module';

  dependencies = [AccessControlModule.id];

  static bindings = EveesBindings;

  constructor(
    protected eveesProviders: Array<EveesRemote>,
    protected remotesConfig: RemotesConfig
  ) {
    super();
  }

  async onLoad(container: interfaces.Container) {
    container.bind(EveesModule.bindings.Evees).to(Evees);
    container.bind(EveesModule.bindings.MergeStrategy).to(RecursiveContextMergeStrategy);
    container.bind(EveesModule.bindings.RemotesConfig).toConstantValue(this.remotesConfig);

    this.eveesProviders.map((evees) => ({
      symbol: AccessControlModule.bindings.Authority,
      source: evees,
    }))

    customElements.define('evees-commit-history', CommitHistory);
    customElements.define('evees-perspectives-list', PerspectivesList);
    customElements.define('evees-info-popper', EveesInfoPopper);
    customElements.define('evees-info-page', EveesInfoPage);
    customElements.define('evees-list-item', ItemWithMenu);
    customElements.define('evees-options-menu', EveesOptionsMenu);
  }

  submodules = [
    new GraphQlSchemaModule(eveesTypeDefs, eveesResolvers),
    new i18nextModule('evees', { en: en }),
    new PatternsModule({
      [EveesModule.bindings.Hashed]: [CidHashedPattern],
      [EveesModule.bindings.Signed]: [DefaultSignedPattern],
      [EveesModule.bindings.Secured]: [DefaultSecuredPattern],
      [EveesModule.bindings.PerspectivePattern]: [
        PerspectiveLinks,
        PerspectiveLens,
        PerspectiveAccessControl,
      ],
      [EveesModule.bindings.CommitPattern]: [CommitLinked, CommitLens],
    }),
    new SourcesModule(
      this.eveesProviders.map((evees) => ({
        symbol: EveesModule.bindings.EveesRemote,
        source: evees,
      }))
    ),
  ];
}
