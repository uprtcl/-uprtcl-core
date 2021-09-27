import { EntityResolver } from '../interfaces/entity.resolver';
import { Commit, Secured } from '../interfaces/index';

interface Path {
  visited: { [commitId: string]: boolean };
  heads: string[];
}

export class FindMostRecentCommonAncestor {
  allCommits: { [key: string]: Secured<Commit> } = {};
  paths: Path[];

  constructor(protected entityResolver: EntityResolver, commitsIds: string[]) {
    this.paths = commitsIds.map((commitId) => ({
      visited: {},
      heads: [commitId],
    }));
  }

  private getMostRecentCommonAncestor(pathToExplore: Path): string | undefined {
    // Do we have a commit that has already been visited by all other paths?
    const otherPaths = this.paths.filter((p) => p !== pathToExplore);
    return pathToExplore.heads.find((commitId) =>
      otherPaths.every((path) => path.visited[commitId])
    );
  }

  /**
   * Explore the given path: get the parents of its heads and prepare the path for the next iteration
   */
  private async explorePath(pathToExplore: Path): Promise<Path> {
    const promises = pathToExplore.heads.map(async (commitId) => {
      let commit: Secured<Commit> | undefined = this.allCommits[commitId];
      if (!commit) {
        try {
          commit = await this.entityResolver.getEntity(commitId);
        } catch (e) {
          console.error(`explorePath() state`, { paths: this.paths, commits: this.allCommits });
          throw new Error(`Could not get ancestor commit ${commitId}`);
        }

        this.allCommits[commitId] = commit;
      }

      pathToExplore.visited[commitId] = true;
      return commit;
    });

    const commits = await Promise.all(promises);
    const nextCommits = commits.map((commit) =>
      commit.object.payload.parentsIds.concat(
        commit.object.payload.forking ? [commit.object.payload.forking] : []
      )
    );

    pathToExplore.heads = Array.prototype.concat.apply([], nextCommits);
    return pathToExplore;
  }

  public async compute(): Promise<string | undefined> {
    // Iterate until there is no more parent commits to explore
    while (this.paths.find((path) => path.heads.length > 0)) {
      for (let i = 0; i < this.paths.length; i++) {
        const commonAncestor = this.getMostRecentCommonAncestor(this.paths[i]);

        // If so, we have the most recent common ancestor, return it
        if (commonAncestor) {
          return commonAncestor;
        }

        // Else, explore parents and prepare for next iteration
        this.paths[i] = await this.explorePath(this.paths[i]);
      }
    }

    return undefined;
  }
}

export default function findMostRecentCommonAncestor(
  entityResolver: EntityResolver
): (commitsIds: string[]) => Promise<string | undefined> {
  return (commitsIds: string[]) =>
    new FindMostRecentCommonAncestor(entityResolver, commitsIds).compute();
}
