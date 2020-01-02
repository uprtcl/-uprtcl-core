import { CacheService } from '@uprtcl/multiplatform';

import { WikisProvider } from './services/wikis.provider';

export interface Wiki {
  title: string;
  pages: Array<string>;
  type: 'Wiki';
}

export type WikisLocal = CacheService & WikisProvider;
