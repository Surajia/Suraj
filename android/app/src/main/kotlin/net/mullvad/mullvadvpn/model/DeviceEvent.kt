package net.mullvad.mullvadvpn.model

import android.os.Parcelable
import kotlinx.parcelize.Parcelize

@Parcelize
data class DeviceEvent(
    val device: DeviceConfig?,
    val remote: Boolean
) : Parcelable