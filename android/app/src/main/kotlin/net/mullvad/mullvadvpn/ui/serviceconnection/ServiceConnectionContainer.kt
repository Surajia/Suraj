package net.mullvad.mullvadvpn.ui.serviceconnection

import android.os.Looper
import android.os.Messenger
import android.os.RemoteException
import android.util.Log
import net.mullvad.mullvadvpn.di.SERVICE_CONNECTION_SCOPE
import net.mullvad.mullvadvpn.ipc.DispatchingHandler
import net.mullvad.mullvadvpn.ipc.Event
import net.mullvad.mullvadvpn.ipc.Request
import org.koin.core.component.KoinApiExtension
import org.koin.core.parameter.parametersOf
import org.koin.core.qualifier.named
import org.koin.core.scope.KoinScopeComponent
import org.koin.core.scope.get

// Container of classes that communicate with the service through an active connection
//
// The properties of this class can be used to send events to the service, to listen for events from
// the service and to get values received from events.
@OptIn(KoinApiExtension::class)
class ServiceConnectionContainer(
    val connection: Messenger,
    onServiceReady: (ServiceConnectionContainer) -> Unit,
    onVpnPermissionRequest: () -> Unit
) : KoinScopeComponent {
    private val dispatcher = DispatchingHandler(Looper.getMainLooper()) { message ->
        Event.fromMessage(message)
    }

    override val scope = getKoin().getOrCreateScope(
        SERVICE_CONNECTION_SCOPE,
        named(SERVICE_CONNECTION_SCOPE), this
    )

    val accountDataSource = ServiceConnectionAccountDataSource(connection, dispatcher)
    val authTokenCache = AuthTokenCache(connection, dispatcher)
    val connectionProxy = ConnectionProxy(connection, dispatcher)
    val deviceDataSource = ServiceConnectionDeviceDataSource(connection, dispatcher)
    val locationInfoCache = LocationInfoCache(dispatcher)
    val settingsListener = SettingsListener(connection, dispatcher)

    // NOTE: `org.koin.core.scope.get` must be used here rather than `org.koin.core.component.get`.
    val splitTunneling = get<SplitTunneling>(parameters = { parametersOf(connection, dispatcher) })
    val voucherRedeemer = VoucherRedeemer(connection, dispatcher)
    val vpnPermission = VpnPermission(connection, dispatcher)

    val appVersionInfoCache = AppVersionInfoCache(dispatcher, settingsListener)
    val customDns = CustomDns(connection, settingsListener)
    var relayListListener = RelayListListener(connection, dispatcher, settingsListener)
    var obfuscationSettingsListener = ObfuscationSettingsListener(connection, settingsListener)

    private var listenerId: Int? = null

    init {
        vpnPermission.onRequest = onVpnPermissionRequest

        dispatcher.registerHandler(Event.ListenerReady::class) { event ->
            listenerId = event.listenerId
            onServiceReady.invoke(this@ServiceConnectionContainer)
        }

        registerListener(connection)
    }

    fun onDestroy() {
        unregisterListener()
        closeScope()

        dispatcher.onDestroy()

        authTokenCache.onDestroy()
        connectionProxy.onDestroy()
        locationInfoCache.onDestroy()
        settingsListener.onDestroy()
        voucherRedeemer.onDestroy()

        appVersionInfoCache.onDestroy()
        customDns.onDestroy()
        relayListListener.onDestroy()
        obfuscationSettingsListener.onDestroy()
    }

    private fun registerListener(connection: Messenger) {
        val listener = Messenger(dispatcher)
        val request = Request.RegisterListener(listener)

        try {
            connection.send(request.message)
        } catch (exception: RemoteException) {
            Log.e("mullvad", "Failed to register listener for service events", exception)
        }
    }

    private fun unregisterListener() {
        listenerId?.let { id ->
            try {
                connection.send(Request.UnregisterListener(id).message)
            } catch (exception: RemoteException) {
                Log.e("mullvad", "Failed to unregister listener for service events", exception)
            }
        }
    }
}
