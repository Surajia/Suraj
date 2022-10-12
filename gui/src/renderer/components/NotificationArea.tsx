import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import log from '../../shared/logging';
import {
  BlockWhenDisconnectedNotificationProvider,
  CloseToAccountExpiryNotificationProvider,
  ConnectingNotificationProvider,
  ErrorNotificationProvider,
  InAppNotificationProvider,
  InconsistentVersionNotificationProvider,
  NotificationAction,
  ReconnectingNotificationProvider,
  UnsupportedVersionNotificationProvider,
  UpdateAvailableNotificationProvider,
} from '../../shared/notifications/notification';
import { useAppContext } from '../context';
import { IReduxState } from '../redux/store';
import {
  NotificationActions,
  NotificationBanner,
  NotificationContent,
  NotificationIndicator,
  NotificationOpenLinkAction,
  NotificationSubtitle,
  NotificationTitle,
} from './NotificationBanner';

interface IProps {
  className?: string;
}

export default function NotificationArea(props: IProps) {
  const accountExpiry = useSelector((state: IReduxState) => state.account.expiry);
  const locale = useSelector((state: IReduxState) => state.userInterface.locale);
  const tunnelState = useSelector((state: IReduxState) => state.connection.status);
  const version = useSelector((state: IReduxState) => state.version);
  const blockWhenDisconnected = useSelector(
    (state: IReduxState) => state.settings.blockWhenDisconnected,
  );
  const hasExcludedApps = useSelector(
    (state: IReduxState) =>
      state.settings.splitTunneling && state.settings.splitTunnelingApplications.length > 0,
  );

  const notificationProviders: InAppNotificationProvider[] = [
    new ConnectingNotificationProvider({ tunnelState }),
    new ReconnectingNotificationProvider(tunnelState),
    new BlockWhenDisconnectedNotificationProvider({
      tunnelState,
      blockWhenDisconnected,
      hasExcludedApps,
    }),
    new ErrorNotificationProvider({ tunnelState, accountExpiry, hasExcludedApps }),
    new InconsistentVersionNotificationProvider({ consistent: version.consistent }),
    new UnsupportedVersionNotificationProvider(version),
  ];

  if (accountExpiry) {
    notificationProviders.push(
      new CloseToAccountExpiryNotificationProvider({ accountExpiry, locale }),
    );
  }

  notificationProviders.push(new UpdateAvailableNotificationProvider(version));

  const notificationProvider = notificationProviders.find((notification) =>
    notification.mayDisplay(),
  );

  if (notificationProvider) {
    const notification = notificationProvider.getInAppNotification();

    if (notification) {
      return (
        <NotificationBanner className={props.className} data-test-id="notificationBanner">
          <NotificationIndicator
            type={notification.indicator}
            data-test-id="notificationIndicator"
          />
          <NotificationContent role="status" aria-live="polite">
            <NotificationTitle data-test-id="notificationTitle">
              {notification.title}
            </NotificationTitle>
            <NotificationSubtitle data-test-id="notificationSubTitle">
              {notification.subtitle}
            </NotificationSubtitle>
          </NotificationContent>
          {notification.action && <NotificationActionWrapper action={notification.action} />}
        </NotificationBanner>
      );
    } else {
      log.error(
        `Notification providers mayDisplay() returned true but getInAppNotification() returned undefined for ${notificationProvider.constructor.name}`,
      );
    }
  }

  return <NotificationBanner className={props.className} aria-hidden={true} />;
}

interface INotificationActionWrapperProps {
  action: NotificationAction;
}

function NotificationActionWrapper(props: INotificationActionWrapperProps) {
  const { openLinkWithAuth, openUrl } = useAppContext();

  const handleClick = useCallback(() => {
    if (props.action.withAuth) {
      return openLinkWithAuth(props.action.url);
    } else {
      return openUrl(props.action.url);
    }
  }, []);

  return (
    <NotificationActions>
      <NotificationOpenLinkAction onClick={handleClick} />
    </NotificationActions>
  );
}
