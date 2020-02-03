import gql from 'graphql-tag';

export const accessControlTypes = gql`
  extend type Patterns {
    accessControl: AccessControl
  }

  extend type Mutation {
    changeOwner(entityId: ID!, newOwner: ID!): Entity! @discover
  }

  type AccessControl {
    canWrite: Boolean!
    permissions: JSON!
  }
`;
