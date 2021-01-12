import { PatternRecognizer } from '@uprtcl/cortex';

import { RemoteEvees } from '../services/remote.evees';
import { EveesConfig } from '../types';
import { RecursiveContextMergeStrategy } from '../merge/recursive-context.merge-strategy';
import { Evees } from '../services/evees.service';
import { ClientLocal } from '../services/clients/client.local';
import { ClientOnMemory } from '../services/clients/client.memory';
import { RemoteRouter } from '../services/clients/client.router';
import { CASStore } from '../services/cas/cas-store';
import { EveesContentModule } from '../evees.content.module';

export const buildEvees = (
  remotes: Array<RemoteEvees>,
  store: CASStore,
  recognizer: PatternRecognizer,
  config?: EveesConfig,
  modules?: EveesContentModule[]
): Evees => {
  config = config || {};
  config.defaultRemote = config.defaultRemote ? config.defaultRemote : remotes[0];

  config.officialRemote = config.officialRemote
    ? config.officialRemote
    : remotes.length > 1
    ? remotes[1]
    : remotes[0];

  config.editableRemotesIds = config.editableRemotesIds
    ? config.editableRemotesIds
    : [remotes[0].id];

  const router = new RemoteRouter(remotes, store);
  const cached = new ClientLocal(router, store);
  const onMemory = new ClientOnMemory(cached, store);
  const merge = new RecursiveContextMergeStrategy();

  return new Evees(onMemory, recognizer, remotes, merge, config, modules);
};
