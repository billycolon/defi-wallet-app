import { isElectron, ipcRendererFunc } from '../utils/isElectron';
import HttpStatus from 'http-status-codes';
import RpcClient from '../utils/rpc-client';
import showNotification from '../utils/notifications';
import * as log from '../utils/electronLogger';
import { I18n } from 'react-redux-i18n';
import { isBlockchainStarted } from '../containers/RpcConfiguration/service';
import { eventChannel } from 'redux-saga';
import {
  fetchInstantBalanceRequest,
  fetchInstantPendingBalanceRequest,
  fetchWalletMapRequest,
  fetchWalletMapSuccess,
} from '../containers/WalletPage/reducer';
import store from '../app/rootStore';
import {
  BACKUP_WALLET,
  DUMP_WALLET,
  IMPORT_WALLET,
} from '@defi_types/rpcMethods';
import {
  startUpdateApp,
  updateApp,
  updateCompleted,
  updateError,
  showUpdateAvailableBadge,
  closeUpdateAvailable,
  closePostUpdate,
  closeUpdateApp,
  openReIndexModal,
  openWalletDatBackupModal,
  closeWalletDatBackupModal,
  openResetWalletDatModal,
} from '../containers/PopOver/reducer';
import { backupWallet as backupWalletIpcRenderer } from './update.ipcRenderer';
import {
  APP_INIT,
  BACKUP_WALLET_DAT,
  GET_CONFIG_DETAILS,
  ON_WALLET_MAP_REPLACE,
  ON_WALLET_MAP_REQUEST,
  REPLACE_WALLET_DAT,
  START_DEFI_CHAIN,
  START_DEFI_CHAIN_REPLY,
  STOP_DEFI_CHAIN,
} from '@defi_types/ipcEvents';
import { getNetworkType } from '../utils/utility';

export const getRpcConfig = () => {
  if (isElectron()) {
    const ipcRenderer = ipcRendererFunc();
    return ipcRenderer.sendSync(GET_CONFIG_DETAILS, {});
  }
  // For webapp
  return { success: true, data: {} };
};

export function startAppInit() {
  if (isElectron()) {
    store.dispatch(fetchWalletMapRequest());
    const ipcRenderer = ipcRendererFunc();
    return ipcRenderer.send(APP_INIT, {});
  }
  // For webapp
  return { success: true, data: {} };
}

export function startBinary(config: any) {
  return eventChannel((emit) => {
    const ipcRenderer = ipcRendererFunc();
    ipcRenderer.send(START_DEFI_CHAIN, config);
    ipcRenderer.on(START_DEFI_CHAIN_REPLY, async (_e: any, res: any) => {
      if (res.success) {
        isBlockchainStarted(emit, res);
      } else {
        if (res.isReindexReq) {
          store.dispatch(openReIndexModal());
        }
        log.error(res?.message ?? res, 'startBinary');
        emit(res);
      }
    });
    return () => {
      log.info('Unsubscribe startBinary');
    };
  });
}

export const stopBinary = () => {
  if (isElectron()) {
    const ipcRenderer = ipcRendererFunc();
    return ipcRenderer.sendSync(STOP_DEFI_CHAIN, {});
  }
  // For webapp
  return { success: true, data: {} };
};

export const backupWalletDat = async () => {
  const ipcRenderer = ipcRendererFunc();
  const resp = ipcRenderer.sendSync(BACKUP_WALLET_DAT);
  if (resp.success) {
    store.dispatch(closeWalletDatBackupModal());
    return showNotification(
      I18n.t('alerts.success'),
      I18n.t('alerts.backupSuccess')
    );
  }
  log.error(resp?.data?.error, 'backupWalletDat');
  return showNotification(I18n.t('alerts.errorOccurred'), resp.message);
};

export const replaceWalletDat = async () => {
  const ipcRenderer = ipcRendererFunc();
  return ipcRenderer.sendSync(REPLACE_WALLET_DAT, getNetworkType());
};

export const dumpWallet = async (paths: string) => {
  const rpcClient = new RpcClient();
  const res = await rpcClient.call('', DUMP_WALLET, [paths]);

  if (res.status === HttpStatus.OK) {
    return showNotification(
      I18n.t('alerts.success'),
      I18n.t('alerts.backupSuccess')
    );
  }
  log.error(res?.data?.error, 'dumpWallet');
  return showNotification(I18n.t('alerts.errorOccurred'), res.data.error);
};

export const updateWalletMap = (path: string, isRemove?: boolean): void => {
  try {
    const filterPath = (v: string) => v !== path;
    const { wallet } = store.getState();
    const ipcRenderer = ipcRendererFunc();
    const walletMap = wallet.walletMap;
    const tempWalletMap = { ...walletMap };
    const walletMapPaths = [...walletMap.paths].filter(filterPath);
    tempWalletMap.paths = [path, ...walletMapPaths];
    if (isRemove) {
      tempWalletMap.paths = tempWalletMap.paths.filter(filterPath);
    }
    store.dispatch(fetchWalletMapSuccess(tempWalletMap));
    ipcRenderer.send(ON_WALLET_MAP_REPLACE, tempWalletMap);
  } catch (error) {
    log.error(error, 'updateWalletMap');
  }
};

export const backupWallet = async (path: string) => {
  try {
    const rpcClient = new RpcClient();
    const res = await rpcClient.call('', BACKUP_WALLET, [path]);
    if (res.status === HttpStatus.OK) {
      updateWalletMap(path);
      return showNotification(
        I18n.t('alerts.success'),
        I18n.t('alerts.backupSuccess')
      );
    }
    log.error(res?.data?.error, 'backupWallet');
    return showNotification(I18n.t('alerts.errorOccurred'), res.data.error);
  } catch (error) {
    log.error(error, 'backupWallet');
  }
};

export const importWallet = async (paths: string[]) => {
  const rpcClient = new RpcClient();
  const res = await rpcClient.call('', IMPORT_WALLET, paths);
  if (res.status === HttpStatus.OK) {
    store.dispatch(fetchInstantBalanceRequest()); // Check for new Balance;
    store.dispatch(fetchInstantPendingBalanceRequest()); // Check for new Pending Balance;

    return showNotification(
      I18n.t('alerts.success'),
      I18n.t('alerts.importSuccess')
    );
  }
  log.error(res?.data?.error, 'importWallet');
  return showNotification(I18n.t('alerts.errorOccurred'), res.data.error);
};

const openUpdateModal = () => {
  const { popover } = store.getState();
  if (!popover.isUpdateModalOpen) {
    store.dispatch(startUpdateApp());
  }
};

const isRunning = () => {
  const {
    app: { isRunning },
  } = store.getState();
  return isRunning;
};

export const updateProgress = (args) => {
  const {
    popover: { isMinimized },
  } = store.getState();
  if (!isMinimized) {
    openUpdateModal();
  }
  return store.dispatch(updateApp(args));
};

export const updateComplete = () => {
  openUpdateModal();
  return store.dispatch(updateCompleted());
};

export const handleUpdateError = (args?: any) => {
  openUpdateModal();
  return store.dispatch(updateError(args));
};

export const handleShowUpdateAvailableBadge = () => {
  return store.dispatch(showUpdateAvailableBadge());
};

export const handleCloseUpdateAvailable = () =>
  store.dispatch(closeUpdateAvailable());

export const handleClosePostUpdate = () => store.dispatch(closePostUpdate());

export const handleCloseUpdateApp = () => store.dispatch(closeUpdateApp());

export const openBackupWalletDat = () => {
  return store.dispatch(openWalletDatBackupModal());
};

export const startBackupModal = () => {
  if (isRunning()) return backupWalletIpcRenderer();
  return openBackupWalletDat();
};

export const resetBackupModal = () => {
  return store.dispatch(openResetWalletDatModal());
};

export const showErrorNotification = (res) =>
  showNotification(I18n.t('alerts.errorOccurred'), res.message);

export const getWalletMap = async (): Promise<void> => {
  try {
    const ipcRenderer = ipcRendererFunc();
    const resp = ipcRenderer.sendSync(ON_WALLET_MAP_REQUEST);
    if (resp?.success) {
      return JSON.parse(resp?.data);
    }
  } catch (error) {
    log.error(error, 'getWalletMap');
  }
};
