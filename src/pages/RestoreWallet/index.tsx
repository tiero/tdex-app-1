import React, { useState } from 'react';
import {
  IonContent,
  IonButton,
  IonPage,
  IonLoading,
  IonInput,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import { RouteComponentProps, withRouter } from 'react-router';
import PageDescription from '../../components/PageDescription';
import classNames from 'classnames';
import { useDispatch } from 'react-redux';
import {
  clearStorage,
  setMnemonicInSecureStorage,
} from '../../utils/storage-helper';
import { setIsBackupDone, signIn } from '../../redux/actions/appActions';
import { useFocus, useMnemonic } from '../../utils/custom-hooks';
import PinModal from '../../components/PinModal';
import {
  addErrorToast,
  addSuccessToast,
} from '../../redux/actions/toastActions';
import * as bip39 from 'bip39';
import { onPressEnterKeyFactory } from '../../utils/keyboard';
import './style.scss';
import {
  AppError,
  InvalidMnemonicError,
  PINsDoNotMatchError,
  SecureStorageError,
} from '../../utils/errors';
import {
  PIN_TIMEOUT_FAILURE,
  PIN_TIMEOUT_SUCCESS,
} from '../../utils/constants';
import Header from '../../components/Header';

const RestoreWallet: React.FC<RouteComponentProps> = ({ history }) => {
  const [mnemonic, setMnemonicWord] = useMnemonic();
  const [modalOpen, setModalOpen] = useState<'first' | 'second'>();
  const [firstPin, setFirstPin] = useState<string>();
  const [needReset, setNeedReset] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [isWrongPin, setIsWrongPin] = useState<boolean | null>(null);
  const dispatch = useDispatch();

  const handleConfirm = () => {
    if (!bip39.validateMnemonic(mnemonic.join(' '))) {
      dispatch(addErrorToast(InvalidMnemonicError));
      return;
    }
    setModalOpen('first');
  };

  // use for keyboard tricks
  const [refs, setFocus] = useFocus(12, handleConfirm);

  const onFirstPinConfirm = (newPin: string) => {
    setFirstPin(newPin);
    setIsWrongPin(false);
    setTimeout(() => {
      setModalOpen('second');
      setIsWrongPin(null);
      setNeedReset(true);
    }, PIN_TIMEOUT_SUCCESS);
  };

  const onSecondPinConfirm = (newPin: string) => {
    if (newPin === firstPin) {
      setLoading(true);
      const restoredMnemonic = mnemonic.join(' ');
      setMnemonicInSecureStorage(restoredMnemonic, newPin)
        .then(() => {
          dispatch(
            addSuccessToast('Mnemonic generated and encrypted with your PIN.')
          );
          setIsWrongPin(false);
          dispatch(signIn(newPin));
          dispatch(setIsBackupDone(true));
          setTimeout(() => {
            // we don't need to ask backup if the mnemonic is restored
            history.push('/wallet');
            setIsWrongPin(null);
          }, PIN_TIMEOUT_SUCCESS);
        })
        .catch(() => onError(SecureStorageError))
        .finally(() => setLoading(false));
      return;
    }
    onError(PINsDoNotMatchError);
  };

  const onError = (e: AppError) => {
    console.error(e);
    clearStorage().catch(console.error);
    dispatch(addErrorToast(e));
    setIsWrongPin(true);
    setTimeout(() => {
      setIsWrongPin(null);
      setFirstPin('');
      setNeedReset(true);
    }, PIN_TIMEOUT_FAILURE);
  };

  return (
    <IonPage>
      <IonLoading isOpen={loading} />
      <PinModal
        open={modalOpen === 'first' || modalOpen === 'second'}
        title={
          modalOpen === 'first'
            ? 'Set your secret PIN'
            : 'Repeat your secret PIN'
        }
        description={
          modalOpen === 'first'
            ? "Enter a 6-digit secret PIN to secure your wallet's seed."
            : 'Confirm your secret PIN.'
        }
        onConfirm={
          modalOpen === 'first' ? onFirstPinConfirm : onSecondPinConfirm
        }
        onClose={
          modalOpen === 'first'
            ? () => {
                setModalOpen(undefined);
                history.goBack();
              }
            : () => {
                setModalOpen('first');
                setNeedReset(true);
                setFirstPin('');
                setIsWrongPin(null);
              }
        }
        isWrongPin={isWrongPin}
        needReset={needReset}
        setNeedReset={setNeedReset}
      />
      <IonContent className="restore-wallet">
        <Header hasBackButton={true} title="SECRET PHRASE" />
        <IonGrid className="ion-text-center">
          <PageDescription
            description="Paste your 12 words recovery phrase in the correct order"
            title="Restore Wallet"
          />
          <div className="restore-input-wrapper ion-margin-vertical">
            {mnemonic.map((item: string, index: number) => {
              return (
                <label
                  key={index}
                  className={classNames('restore-input', {
                    active: mnemonic[index],
                  })}
                >
                  <div className="input-number">{index + 1}</div>
                  <IonInput
                    ref={refs[index]}
                    className="input-word"
                    onKeyDown={onPressEnterKeyFactory(() =>
                      setFocus(index + 1)
                    )}
                    onIonChange={(e) =>
                      setMnemonicWord(e.detail.value || '', index)
                    }
                    value={item}
                    type="text"
                    enterkeyhint={index === refs.length - 1 ? 'done' : 'next'}
                  />
                </label>
              );
            })}
          </div>

          <IonRow className="restore-btn-container">
            <IonCol size="8" offset="2" sizeMd="6" offsetMd="3">
              <IonButton
                disabled={mnemonic.includes('')}
                onClick={handleConfirm}
                className="main-button"
              >
                RESTORE WALLET
              </IonButton>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default withRouter(RestoreWallet);
