package net.mullvad.mullvadvpn.ui.notification

import android.content.res.Resources
import net.mullvad.mullvadvpn.R
import net.mullvad.mullvadvpn.util.TimeLeftFormatter
import org.joda.time.DateTime

class AccountExpiryNotification(
    val resources: Resources,
) : InAppNotification() {
    private val timeLeftFormatter = TimeLeftFormatter(resources)

    init {
        status = StatusLevel.Error
        title = resources.getString(R.string.account_credit_expires_soon)
    }

    fun updateAccountExpiry(expiry: DateTime?) {
        val threeDaysFromNow = DateTime.now().plusDays(3)

        if (expiry != null && expiry.isBefore(threeDaysFromNow)) {
            message = timeLeftFormatter.format(expiry)
            shouldShow = true
        } else {
            shouldShow = false
        }

        update()
    }
}
