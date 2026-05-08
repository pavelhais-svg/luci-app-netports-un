# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

All dates in this document are in `DD.MM.YYYY` format.

## [Version 2.3-flap-un1] (08.05.2026)

Vznik samostatného UN modulu **`luci-app-netports-un`** odvozeného z
[tano-systems/luci-app-tn-netports](https://github.com/tano-systems/luci-app-tn-netports)
v2.2 (MIT, autorské právo zachováno v `LICENSE` a hlavičkách souborů).

### Added — Detekce flapování
- Nový hotplug skript `/etc/hotplug.d/net/30-netports-flap` zachytí
  `add` / `remove` / `ifup` / `ifdown` události a zapíše je jako JSON-line
  do kruhového logu `/tmp/netports-events.json` (limit ~256 KB, automatická
  rotace).
- Edge-detekce v `getPortsInfo` (Lua RPC) porovnává aktuální carrier
  s posledním viděným stavem v `/tmp/netports-state.json` a doplní log
  o události zachycené mezi pollingy UI (značí `src:"poll"`).
- Vše v tmpfs (`/tmp`) — po rebootu čistý start, **žádný daemon**.

### Added — Kontextový stav stability
Pod ikonou portu se zobrazí jeden ze stavů podle skutečného carrier
+ admin state + flap historie:

| Situace | Hláška |
|---|---|
| Aktivní + 0 flapů | „● spojení stabilní" |
| Aktivní + 1–2 flapy/5 min | „● 2 výpadek/5 min" |
| Aktivní + flap v 1 h | „● občasné výpadky (3/h)" |
| Aktivně flapuje (≥ threshold) | „● NESTABILNÍ (5/5 min)" pulzuje |
| Odpojený + nedávný flap | „● nedávno odpojeno (3/h)" |
| Odpojený + bez flapů | „● bez nedávných incidentů" |
| Vypnutý (admin down) | „● bez výpadků v záznamu" |

### Added — Kritické vs informativní chybové čítače
- V hlavní tabulce se ve sloupcích RX/TX zobrazují pouze nenulové
  **kritické čítače** (rx_errors, rx_crc, rx_frame, rx_fifo, rx_over,
  tx_errors, tx_carrier, tx_aborted, tx_fifo, collisions) s deltou
  od posledního obnovení.
- **Informativní čítače** (rx_dropped, tx_dropped) jsou viditelné jen
  v detail modalu, s vysvětlením: typicky LLDP / CDP / IPv6 ND, ne
  problém. Pomalý růst je u uplink portu normální.

### Added — Reset baseline
- Tlačítko v hlavičce widgetu zachytí aktuální čítače jako baseline
  (`/tmp/netports-baseline.json`) a vyčistí flap log + state.
- Hodnoty zobrazené v UI pak začnou počítat od nuly. Sysfs čítače
  kernelu zůstanou nedotčené.
- Hlavička widgetu zobrazí čas posledního resetu.
- Nová ubus metoda `netports.resetStats` (write ACL).

### Added — Nová ubus metoda `getPortEvents`
- Vrací seznam zaznamenaných flap událostí (volitelně filtrovaných
  podle ifname) pro detail modal.
- Dostupná pod read ACL (`luci-app-netports-un` access-group).

### Added — Detail modal v UN dashboard stylu
- Kompaktní statcards (Rozhraní, Stav linky, Stabilita, Flapy 5m/1h/24h,
  Poslední událost) s barevným levým proužkem podle stavu.
- Časová osa událostí (▲ AKTIVNÍ / ▼ VYPNUTÝ + zdroj `[hotplug]`/`[poll]`).
- Tabulka kritických čítačů RX i TX se sloupcem **Význam** (česky).
- Sekce informativních čítačů s vysvětlením LLDP / CDP / ND.
- Empty state s ikonou hodin pro „Zatím žádné události".
- Vše stylováno přes UN brand CSS proměnné z bootstrap themu
  (`--brand-accent`, `--error-color-medium`, `--radius-lg`, …).

### Added — Barevné rozlišení rychlosti linky
- 1000+ Mbit/s — zelený badge (`var(--brand-accent)` = #b3d236)
- 100 Mbit/s — žlutý
- 10 Mbit/s — oranžový
- Odpojený port — červený badge „Odpojeno"
- Vypnutý port — šedý badge „Vypnuto"

Všechny stavy používají stejný vizuální typ badge — vizuální
konzistence napříč celou tabulkou.

### Added — Lokalizace
- Kompletní přepis UI textů do češtiny (přímo v JS souborech).
- Anglický fallback přes `_()` pro budoucí PO překlady.

### Changed
- Název balíčku `luci-app-tn-netports` → `luci-app-netports-un`.
- ACL group `luci-app-tn-netports` → `luci-app-netports-un`.
- UCI config soubor `/etc/config/luci_netports` zachován pro zpětnou
  kompatibilitu.
- Maintainer: United Networks SE.
- Závislost přidána: `+luci-compat` (kvůli RPC view).

## [Version 2.2] — Pavel Hais base (před UN flap edition)

Předchozí stav balíčku ze kterého UN edice vychází.

## [Version 2.0.3] — upstream tano-systems

### Changed
- Added translation contexts for some strings.
- Use prefixes to indicate binary multiples for Rx and Tx bytes
  from IEEE 1541-2002.

### Fixed
- Do not show the table on insufficient permissions.
- Synchronized colors of the firewall zones with colors from the
  network/firewall settings.
- Fixed nbsp entity output for XML (luci-theme-openwrt).
- Fixed markup for interfaces without MAC address (e.g. PPP connections).
- Fixed IE11 compatibility.

## [Unreleased — upstream tano-systems]

### Fixed
- Proper handle aliases when searching network name for bridges

### Added
- Added 'sfp' port type with icon

## [Version 2.0.3]

### Changed
- Added translation contexts for some strings.
- Use prefixes to indicate binary multiples for Rx and Tx bytes
  from IEEE 1541-2002.

### Fixed
- Do not show the table on insufficient permissions.
- Synchronized colors of the firewall zones with colors from the
  network/firewall settings.
- Fixed nbsp entity output for XML (luci-theme-openwrt).
- Fixed markup for interfaces without MAC address (e.g. PPP connections).
- Fixed IE11 compatibility.

## [Version 2.0.2] (20.01.2020)

### Fixed
- Fixed handling of negative speed values in sysfs.

## [Version 2.0.1] (13.01.2020)

### Fixed
- Fixed links to network interfaces page.

## [Version 2.0.0] (04.11.2019)

### Changed
- Added support for client side view introduced in the latest changes
  in the master branch of the LuCI.

## [Version 1.1.1] (26.10.2019)

### Fixed
- Fixed display of the icon for 'vpn' port type.
- Fixed displaying of an empty MAC address.

## [Version 1.1.0] (06.10.2019)

### Added
- This CHANGELOG file.
- Handling cases when the firewall zones are assigned to both the network
  interface and the bridge of which the interface is a member. In this case,
  information about both firewall zones is displayed.
- Added vertical table view mode. By default used new vertical mode. This may
  changed by the `global.default_h_mode` option in `/etc/config/luci_netports`
  configuration file. If used horizontal mode then view mode is automatically
  switched to vertical mode in case the number of interfaces is more than 6.
- Added "Switch to vertical/horizontal mode" button. By default this button
  is disabled (not shown). Button may be enabled by the `global.hv_mode_switch_button`
  option in `/etc/config/luci_netports` configuration file.
- Added example screenshots.
- Added `usb_stick`, `usb_2g`, `usb_3g`, `usb_4g`, `tunnel`, `gprs`, `ppp`
  and `usb_wifi` new types and icons.
- Added `auto` port type for automatically detect type by interface name.
- Added link to the wireless interface configuration.
- Added spinner for messages about waiting for data.
- Added rpcd ubus script for data gathering

### Changed
- Updated README.md file.
- Renamed application section title from "Ports Status" to "Network Interfaces Ports Status"
- Icons moved to `icons` subdirectory.
- Place application on the "Overview" page after "Memory" section.
  This became possible after applying patch to LuCI from pull request
  [2364](https://github.com/openwrt/luci/pull/2364).
- Moved part of the JavaScript code to LuCI resources directory.
- Renamed "Network interface" parameter to "Interface" in the table.
- Renamed configuration parameter `global.hide_additional_info`
  to `global.default_additional_info`.
- Renamed old type `usb` to `usb_rndis`. Old type name `usb` is supported but deprecated.
- Changed icons for disabled state.
- Use luabitop for bitwise operations.
- Use polling interval from LuCI configuration (luci.main.pollinterval).
- Totally rework JavaScript code.

### Deprecated
- Use type `usb_rndis` instead of `usb`.

### Fixed
- Output dash if no assigned firewall zones.
- Fix administrative down state detection.
- Fix port link status icon display in IE.
- Fix Russian translations for "Connected", "Disconnected" and "Disabled".
- Properly handling of the operative interface state from
  `/sys/class/net/<if>/operstate` sysfs file.
- Fix ports type icons flickering on updates.

## [Version 1.0.0] (07.12.2018)

Initial release

[Unreleased]: https://github.com/tano-systems/luci-app-netports/tree/master
[Version 2.0.3]: https://github.com/tano-systems/luci-app-netports/releases/tag/v2.0.3
[Version 2.0.2]: https://github.com/tano-systems/luci-app-netports/releases/tag/v2.0.2
[Version 2.0.1]: https://github.com/tano-systems/luci-app-netports/releases/tag/v2.0.1
[Version 2.0.0]: https://github.com/tano-systems/luci-app-netports/releases/tag/v2.0.0
[Version 1.1.1]: https://github.com/tano-systems/luci-app-netports/releases/tag/v1.1.1
[Version 1.1.0]: https://github.com/tano-systems/luci-app-netports/releases/tag/v1.1.0
[Version 1.0.0]: https://github.com/tano-systems/luci-app-netports/releases/tag/v1.0.0
