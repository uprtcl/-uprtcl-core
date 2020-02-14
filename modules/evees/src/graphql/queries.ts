import { gql } from 'apollo-boost';

export const UPDATE_HEAD = gql`
  mutation UpdatePerspectiveHead($perspectiveId: ID!, $headId: ID!) {
    updatePerspectiveHead(perspectiveId: $perspectiveId, headId: $headId) {
      id
      head {
        id
        data {
          id
        }
      }
      payload {
        origin
      }
    }
  }
`;

export const CREATE_COMMIT = gql`
  mutation CreateCommit(
    $creatorsIds: [String]
    $dataId: ID!
    $parentsIds: [ID!]!
    $message: String
    $source: String
    $timestamp: Date
  ) {
    createCommit(
      creatorsIds: $creatorsIds
      dataId: $dataId
      parentsIds: $parentsIds
      message: $message
      source: $source
      timestamp: $timestamp
    ) {
      id
      creatorsIds
      data {
        id
      }
      parentCommits {
        id
      }
      message
      timestamp
    }
  }
`;

export const CREATE_PERSPECTIVE = gql`
  mutation CreatePerspective(
    $creatorId: String
    $origin: String
    $timestamp: Date
    $headId: ID
    $context: String
    $name: String
    $authority: String
    $canWrite: String
    $parentId: String
  ) {
    createPerspective(
      creatorId: $creatorId
      origin: $origin
      timestamp: $timestamp
      headId: $headId
      context: $context
      name: $name
      authority: $authority
      canWrite: $canWrite
      parentId: $parentId
    ) {
      id
      name
      head {
        id
        data {
          id
        }
      }
      payload {
        creatorId
        origin
        timestamp
      }
    }
  }
`;

export const CREATE_PROPOSAL = gql`
  mutation AddProposal($toPerspectiveId: ID!, $fromPerspectiveId: ID!, $updateRequests: [HeadUpdateInput!]) {
    addProposal(toPerspectiveId: $toPerspectiveId, fromPerspectiveId: $fromPerspectiveId, updateRequests: $updateRequests) {
      id
      proposals {
        id
        # toPerspective
        # fromPerspective
        # updates
        # authorized
        # canAuthorize
        # executed
      }
    }
  }
`;
