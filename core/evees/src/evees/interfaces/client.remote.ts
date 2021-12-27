import { AccessControl } from './access-control';
import { PartialPerspective, Perspective, Secured } from './types';
import { Proposals } from '../proposals/proposals';
import { Ready } from '../../utils/ready';
import { ConnectionLogged } from './connection.logged';
import { ClientAndExplore, ClientAndExploreCached } from './client.explore';
import { EntityRemote } from './entity.remote';

/** A remote is a Client that connects to backend. It is identified within
 * the app with a unique id. */
export interface ClientRemote extends ClientAndExploreCached, Ready, ConnectionLogged {
  accessControl: AccessControl;
  proposals?: Proposals;
  /**
   * The id is used to select the JS remote from the listed of available Remotes.
   * A path is used to addreess a given request to that remote.
   * The defaultPath is used to simplify "get" or "create"s operations that dont receive a path.
   */
  id: string;
  defaultPath: string;
  entityRemote: EntityRemote;

  snapPerspective(
    perspective: PartialPerspective,
    guardianId?: string
  ): Promise<Secured<Perspective>>;
}
