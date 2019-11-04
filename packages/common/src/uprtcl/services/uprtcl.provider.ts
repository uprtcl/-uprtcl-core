import { Perspective, Commit, PerspectiveDetails } from '../../types';
import { UprtclSource } from './uprtcl.source';
import { Secured } from '../../patterns/default-secured.pattern';

export interface UprtclProvider extends UprtclSource {
  /** Cloners */

  /**
   * Clone a new perspective in the service
   *
   * @param perspective: the signed perspective to create
   */
  clonePerspective(perspective: Secured<Perspective>): Promise<void>;

  /**
   * Clone the given commit in the service
   *
   * @param commit: the signed commit to clone
   */
  cloneCommit(commit: Secured<Commit>): Promise<void>;

  /** Modifiers */

  /**
   * Update details of the perspective
   *
   * @param perspectiveId id of the perspective of which to update the head
   * @param details details to update the perspective to
   */
  updatePerspectiveDetails(perspectiveId: string, details: Partial<PerspectiveDetails>): Promise<void>;
}
