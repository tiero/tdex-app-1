import {
  IonContent,
  IonList,
  IonItem,
  IonPage,
  IonListHeader,
  IonText,
  IonIcon,
  IonGrid,
  IonRow,
  IonCol,
} from '@ionic/react';
import React, { useState } from 'react';
import { RouteComponentProps, withRouter } from 'react-router';
import './style.scss';
import {
  chevronForwardOutline,
  eye,
  lockOpen,
  trashOutline,
} from 'ionicons/icons';

import ChangePinModals from '../../components/ChangePinModals';
import { useDispatch } from 'react-redux';
import Header from '../../components/Header';
import PinModal from '../../components/PinModal';
import { getMnemonicFromSecureStorage } from '../../utils/storage-helper';
import {
  PIN_TIMEOUT_FAILURE,
  PIN_TIMEOUT_SUCCESS,
} from '../../utils/constants';
import { addErrorToast } from '../../redux/actions/toastActions';
import { IncorrectPINError } from '../../utils/errors';

const Account: React.FC<RouteComponentProps> = ({ history }) => {
  const dispatch = useDispatch();
  const [routeToGo, setRouteToGo] = useState<string>();
  const [showChangePinModal, setShowChangePinModal] = useState(false);

  // Pin modal
  const [isWrongPin, setIsWrongPin] = useState<boolean | null>(null);
  const [needPinReset, setPinNeedReset] = useState<boolean>(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);

  const handlePinConfirm = (pin: string) => {
    getMnemonicFromSecureStorage(pin)
      .then((mnemonic) => {
        setIsWrongPin(false);
        setTimeout(() => {
          setPinModalOpen(false);
          setIsWrongPin(null);
          if (routeToGo === '/settings/show-mnemonic') {
            history.replace({
              pathname: routeToGo,
              state: { mnemonic },
            });
          }
          if (routeToGo === '/settings/delete-mnemonic') {
            history.replace({
              pathname: routeToGo,
              state: { pin },
            });
          }
        }, PIN_TIMEOUT_SUCCESS);
      })
      .catch((e) => {
        setIsWrongPin(true);
        setTimeout(() => {
          setIsWrongPin(null);
          setPinNeedReset(true);
        }, PIN_TIMEOUT_FAILURE);
        dispatch(addErrorToast(IncorrectPINError));
        console.error(e);
      });
  };

  return (
    <IonPage>
      {/* PIN Modal */}
      <PinModal
        needReset={needPinReset}
        setNeedReset={setPinNeedReset}
        open={pinModalOpen}
        title="Unlock your seed"
        description="Enter your secret PIN to unlock your wallet"
        onConfirm={handlePinConfirm}
        onClose={() => setPinModalOpen(false)}
        isWrongPin={isWrongPin}
      />
      {/* IDENTITY */}
      <IonContent className="account">
        <Header title="ACCOUNT" hasBackButton={true} />
        <IonGrid>
          <IonRow>
            <IonCol>
              {/* Show Mnemonic */}
              <IonList>
                <IonListHeader>Identity</IonListHeader>
                <IonItem
                  className="list-item"
                  onClick={() => {
                    setPinModalOpen(true);
                    setRouteToGo('/settings/show-mnemonic');
                  }}
                >
                  <div className="item-main-info">
                    <IonIcon icon={eye} />
                    <div className="item-start">
                      <div className="main-row">Show mnemonic</div>
                      <IonText className="description">
                        Display the secret mnemonic stored in your device's
                        secure storage.
                      </IonText>
                    </div>
                    <IonIcon icon={chevronForwardOutline} />
                  </div>
                </IonItem>

                {/* Show advanced info */}
                {/*<IonItem
            className="list-item"
            onClick={() => {
              history.push('/set-pin');
            }}
          >
            <div className="item-main-info">
              <IonIcon icon={shieldCheckmark} />
              <div className="item-start">
                <div className="main-row">Show advanced info </div>
                <IonText className="description">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </IonText>
              </div>
              <IonIcon icon={chevronForwardOutline} />
            </div>
          </IonItem>*/}
              </IonList>

              <IonList>
                <IonListHeader>Security</IonListHeader>
                {/* Change PIN */}
                <IonItem
                  className="list-item"
                  onClick={() => {
                    setShowChangePinModal(true);
                  }}
                >
                  <div className="item-main-info">
                    <IonIcon icon={lockOpen} />
                    <div className="item-start">
                      <div className="main-row">Set new pin</div>
                      <IonText className="description">
                        Change the secure PIN using to encrypt your wallet's
                        seed.
                      </IonText>
                    </div>
                    <IonIcon icon={chevronForwardOutline} />
                  </div>
                </IonItem>
                {showChangePinModal && (
                  <ChangePinModals
                    open={showChangePinModal}
                    onClose={() => setShowChangePinModal(false)}
                    onDeleted={() => {
                      setShowChangePinModal(false);
                      history.push('/homescreen');
                    }}
                  />
                )}

                {/* Delete Mnemonic */}
                <IonItem
                  className="list-item"
                  onClick={() => {
                    setPinModalOpen(true);
                    setRouteToGo('/settings/delete-mnemonic');
                  }}
                >
                  <div className="item-main-info">
                    <IonIcon icon={trashOutline} />
                    <div className="item-start">
                      <div className="main-row">Delete Mnemonic</div>
                      <IonText className="description">
                        Definitively removes your seed from this device. Be
                        extremely careful, after deletion it will be impossible
                        to retrieve your key from tdex-app.
                      </IonText>
                    </div>
                    <IonIcon icon={chevronForwardOutline} />
                  </div>
                </IonItem>
              </IonList>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonContent>
    </IonPage>
  );
};

export default withRouter(Account);
