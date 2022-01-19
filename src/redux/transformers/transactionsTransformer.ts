import type { BlindedOutputInterface, InputInterface, TxInterface, UnblindedOutputInterface } from 'ldk';
import { isBlindedOutputInterface } from 'ldk';
import moment from 'moment';
import type { NetworkString } from 'tdex-sdk';

import { isLbtc } from '../../utils/helpers';
import type { Transfer, TxDisplayInterface } from '../../utils/types';
import { TxStatusEnum, TxTypeEnum } from '../../utils/types';

function getTransfers(
  vin: InputInterface[],
  vout: (BlindedOutputInterface | UnblindedOutputInterface)[],
  walletScripts: string[],
  network: NetworkString
): Transfer[] {
  const transfers: Transfer[] = [];
  let feeAmount: number;
  let feeAsset: string;

  const addToTransfers = (amount: number, asset: string, script: string) => {
    const transferIndex = transfers.findIndex((t) => t.asset === asset);

    if (transferIndex >= 0) {
      const tmp = transfers[transferIndex].amount + amount;
      // Check if the transfer is a fee output. Remove it for non-LBTC withdrawal.
      if (Math.abs(tmp) === feeAmount && asset === feeAsset) {
        transfers.splice(transferIndex, 1);
        return;
      }

      // Deduct feeAmount on LBTC withdrawal
      if (feeAmount && isLbtc(asset, network) && transfers.length === 1) {
        transfers[transferIndex].amount = tmp + feeAmount;
      } else {
        transfers[transferIndex].amount = tmp;
      }
      return;
    }

    transfers.push({
      amount,
      asset,
      script,
    });
  };

  for (const input of vin) {
    if (input.prevout && !isBlindedOutputInterface(input.prevout) && walletScripts.includes(input.prevout.script)) {
      addToTransfers(-1 * input.prevout.value, input.prevout.asset, input.prevout.script);
    }
  }

  // Get fee output values
  for (const output of vout) {
    if (
      !isBlindedOutputInterface(output) &&
      output.script === '' &&
      Number(output.assetBlinder) === 0 &&
      Number(output.valueBlinder) === 0
    ) {
      feeAmount = output.value;
      feeAsset = output.asset;
    }
  }

  for (const output of vout) {
    if (!isBlindedOutputInterface(output) && walletScripts.includes(output.script) && output.script !== '') {
      addToTransfers(output.value, output.asset, output.script);
    }
  }

  return transfers;
}

export function txTypeFromTransfer(transfers: Transfer[]): TxTypeEnum {
  if (transfers.length === 1) {
    if (transfers[0].amount > 0) {
      return TxTypeEnum.Receive;
    }

    if (transfers[0].amount < 0) {
      return TxTypeEnum.Send;
    }
  }

  if (transfers.length >= 2) {
    return TxTypeEnum.Swap;
  }

  return TxTypeEnum.Unknown;
}

/**
 * Convert a TxInterface to DisplayInterface
 * @param tx txInterface
 * @param walletScripts the wallet's scripts i.e wallet scripts from wallet's addresses.
 * @param network
 */
export function toDisplayTransaction(
  tx: TxInterface,
  walletScripts: string[],
  network: NetworkString
): TxDisplayInterface {
  const transfers = getTransfers(tx.vin, tx.vout, walletScripts, network);
  return {
    txId: tx.txid,
    blockTime: tx.status.blockTime ? moment(tx.status.blockTime * 1000) : undefined,
    status: tx.status.confirmed ? TxStatusEnum.Confirmed : TxStatusEnum.Pending,
    fee: tx.fee,
    transfers,
    type: txTypeFromTransfer(transfers),
  };
}
