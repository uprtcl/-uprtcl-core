import { ApiPromise, WsProvider } from '@polkadot/api';
import { Option } from '@polkadot/types';
import { AddressOrPair, Signer, SignerResult } from '@polkadot/api/types';
import { stringToHex } from '@polkadot/util';
import {
  web3Accounts,
  web3Enable,
  web3FromAddress
} from '@polkadot/extension-dapp';
import { IdentityInfo, Registration } from '@polkadot/types/interfaces';
// import { ExtensionStore } from '@polkadot/ui-keyring/stores';

import { Connection, ConnectionOptions } from '@uprtcl/multiplatform';
import { Logger } from '@uprtcl/micro-orchestrator';

const getIdentityInfo = (identity: Option<Registration>) => {
  if (identity && identity.isSome) {
    const { info }: any = identity.toHuman();
    return info;
  }
  return {};
};

// Picks out the the cid parts from the users additional fields and assembles the final string
const getCID = (info: IdentityInfo): string => {
  if (!info.additional) {
    return '';
  }
  const [[, { Raw: cid1 }], [, { Raw: cid0 }]] = (info.additional as any)
    .filter(([k]) => k.Raw === 'evees-cid1' || k.Raw === 'evees-cid0')
    .sort(([a], [b]) => (a.Raw > b.Raw ? -1 : 1));

  const cid = cid1 + cid0;
  return cid;
};

export interface UserPerspectivesDetails {
  [perspectiveId: string]: {
    headId?: string;
    context?: string;
  };
}

export class PolkadotConnection extends Connection {
  public api?: ApiPromise;
  public account?: string;
  private chain?: string;
  private identityInfo?: IdentityInfo;
  private signer?: Signer;

  logger = new Logger('Polkadot-Connection');

  constructor(protected ws: string, protected apiOptions?: any, options?: ConnectionOptions) {
    super(options);
  }

  public async connect(): Promise<void> {
    this.logger.log('Connecting');

    const wsProvider = new WsProvider('ws://127.0.0.1:9944');
    this.api = await ApiPromise.create({ provider: wsProvider });
    // Retrieve the chain name
    // E.g. "Westend", "Kusama"
    this.chain = (await this.api.rpc.system.chain()).toString();

    this.logger.log('Connected', {
      api: this.api
    });
  }

  public getNetworkId() {
    return this.chain;
  }

  public async canSign(): Promise<boolean> {
    return this.signer !== undefined;
  }

  public async connectWallet(): Promise<void> {
    const allInjected = await web3Enable('uprtcl-wiki');

    const allAccounts = await web3Accounts();
    this.account = allAccounts[0]?.address;

    // Set extension account as signer
    const injector = await web3FromAddress(this.account);
    this.api?.setSigner(injector.signer);
    this.signer = injector.signer;
    return;
  }

  public async getUserPerspectivesDetailsHash(userId: string) {
    const identity = await this.api?.query.identity.identityOf(userId);
    this.identityInfo = getIdentityInfo(<Option<Registration>>identity);
    return getCID(<IdentityInfo>this.identityInfo);
  }

  public async updateUserPerspectivesDetailsHash(userPerspectivesDetailsHash: string) {
    // update evees entry
    const cid1 = userPerspectivesDetailsHash.substring(0, 32);
    const cid0 = userPerspectivesDetailsHash.substring(32, 64);
    const result = this.api?.tx.identity.setIdentity({
      ...(this.identityInfo as any),
      additional: [
        [{ Raw: 'evees-cid1' }, { Raw: cid1 }],
        [{ Raw: 'evees-cid0' }, { Raw: cid0 }]
      ]
    });
    // TODO: Dont block here, cache value
    await new Promise(async (resolve, reject) => {
      const unsub = await result?.signAndSend(<AddressOrPair>this?.account, result => {
        if (result.status.isInBlock) {
        } else if (result.status.isFinalized) {
          if (unsub) unsub();
          resolve();
        }
      });
    });
  }

  public async signText(messageText): Promise<string | void> {
    if (this.signer?.signRaw !== undefined && this.account !== undefined) {
      const { signature } = await this.signer.signRaw({
        address: this.account,
        data: stringToHex(messageText),
        type: 'bytes'
      });
      return signature;
    }
  }
}
