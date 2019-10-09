import * as status from '../constants/StatusTypes';
import { TEZOS, CONSEIL } from '../constants/NodesTypes';
import { TRANSACTIONS } from '../constants/TabConstants';
import { getSyncTransactions, syncTransactionsWithState } from './transaction';
import {
  activateAndUpdateAccount,
  getSelectedKeyStore,
  getSelectedHash
} from './general';
import { getSelectedNode } from './nodes';
import { ConseilQueryBuilder, ConseilOperator, ConseilDataClient, ConseilSortDirection } from 'conseiljs';

export function createAccount(account, identity) {
  return {
    account_id: '',
    balance: 0,
    block_id: '',
    counter: 0,
    delegate_setable: false,
    delegate_value: null,
    manager: '',
    script: null,
    spendable: true,
    transactions: [],
    activeTab: TRANSACTIONS,
    status: status.CREATED,
    operations: {},
    order: null,
    publicKey: identity.publicKey,
    privateKey: identity.privateKey,
    ...account
  };
}

export function findAccount(identity, accountId) {
  return (
    identity &&
    (identity.accounts || []).find(account => account.account_id === accountId)
  );
}

export function findAccountIndex(identity, accountId) {
  return (
    identity &&
    (identity.accounts || []).findIndex(
      account => account.account_id === accountId
    )
  );
}

export function createSelectedAccount({ balance = 0, transactions = [] } = {}) {
  return { balance, transactions };
}

export async function getAccountsForIdentity(nodes, id, network, platform) {
  const { url, apiKey } = getSelectedNode(nodes, CONSEIL);

  let accountsquery = ConseilQueryBuilder.blankQuery();
  accountsquery = ConseilQueryBuilder.addFields(accountsquery, 'block_level', 'originated_contracts');
  accountsquery = ConseilQueryBuilder.addPredicate(accountsquery, 'kind', ConseilOperator.EQ, ['origination'], false);
  accountsquery = ConseilQueryBuilder.addPredicate(accountsquery, 'source', ConseilOperator.EQ, [id], false);
  accountsquery = ConseilQueryBuilder.addOrdering(accountsquery, 'block_level', ConseilSortDirection.DESC);
  accountsquery = ConseilQueryBuilder.setLimit(accountsquery, 1000);
  const serverInfo = {url: url, apiKey: apiKey, network: network};
  const accounts = await ConseilDataClient.executeEntityQuery(serverInfo, platform, network, 'operations', accountsquery);
  console.log('accounts----', accounts);
  return accounts.filter(account => account.account_id !== id);
}

export async function getSyncAccount(
  identities,
  account,
  nodes,
  accountHash,
  parentHash,
  isLedger = false,
  network
) {
  const keyStore = getSelectedKeyStore(identities, accountHash, parentHash);
  account = await activateAndUpdateAccount(
    account,
    keyStore,
    nodes,
    isLedger,
    network
  ).catch(e => {
    console.log('-debug: Error in: getSyncAccount for:' + accountHash);
    console.error(e);
    return account;
  });

  const { selectedAccountHash } = getSelectedHash();
  if (accountHash === selectedAccountHash) {
    account.transactions = await getSyncTransactions(
      accountHash,
      nodes,
      account.transactions,
      network
    );
  }
  return account;
}

export function syncAccountWithState(syncAccount, stateAccount) {
  syncAccount.activeTab = stateAccount.activeTab;
  syncAccount.transactions = syncTransactionsWithState(
    syncAccount.transactions,
    stateAccount.transactions
  );

  return syncAccount;
}
