import { gql } from 'apollo-boost';

export const eveesTypeDefs = gql`
  scalar Date

  extend type Mutation {
    updatePerspectiveHead(perspectiveId: ID!, headId: ID!): Perspective!
    createCommit(dataId: ID!, parentsIds: [ID!]!, message: String, source: String): Commit!
    createPerspective(headId: ID, context: String, authority: String, canWrite: String, recursive: Boolean): Perspective!
  }

  type Context {
    identifier: String!
    perspectives: [Perspective!] @discover
  }

  type HeadUpdate {
    fromPerspective: Perspective! @discover
    oldHead: Commit! @discover
    toPerspective: Perspective! @discover
    newHead: Commit! @discover
  }

  type UpdateProposal {
    id: ID!
    
    creatorId: String
    toPerspective: Perspective! @discover
    fromPerspective: Perspective! @discover
    updates: [HeadUpdate!]
    authorized: Boolean,
    canAuthorize: Boolean,
    executed: Boolean
  }

  type Commit implements Entity {
    id: ID!

    parentCommits: [Commit!]! @discover
    timestamp: Date!
    message: String
    data: Entity @discover

    _context: EntityContext!
  }

  type Perspective implements Entity {
    id: ID!

    head: Commit @discover
    name: String
    context: Context
    payload: Payload
    proposals: [UpdateProposal!]

    _context: EntityContext!
  }

  type Payload {
    origin: String
    creatorId: String
    timestamp: Date
  }
`;
