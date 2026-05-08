# luci-app-netports-un

LuCI aplikace **United Networks** pro přehled stavu síťových portů s
detekcí flapování a chybové diagnostiky.

Vychází z původního
[`tano-systems/luci-app-tn-netports`](https://github.com/tano-systems/luci-app-tn-netports)
v2.2 (MIT). Zde už ale jde o **samostatný UN modul** s vlastním názvem,
ACL skupinou, vlastním vývojem a UI v UN brand stylu — není zamýšlený jako
fork ani upstream contribution.

## Co dělá

Zobrazuje na *Status* stránce LuCI **přehledovou tabulku síťových portů**
s ikonou, rychlostí linky, duplexem, výpočetně podle stavu vybarveným
badge, RX/TX provozem a — to je nové — **detekcí flapování** a barevným
rozlišením kritických / informativních chybových čítačů.

Klik na *„Detail / historie ›"* otevře dashboard modal s časovou osou
zachycených up/down událostí a kompletní tabulkou všech čítačů
s vysvětlením v češtině.

### Hlavní funkce UN edice

- **Detekce flapování** přes hotplug + edge-detekci v RPC; data se
  drží v `/tmp` (tmpfs) — žádný daemon, čistý start po rebootu.
- **Kontextový stav** pod ikonou („spojení stabilní", „NESTABILNÍ",
  „bez signálu", „bez nedávných incidentů" …) podle skutečného
  carrier + admin state + flap historie.
- **Kritické vs informativní** chybové čítače RX/TX. Šum z LLDP/CDP
  (rx_dropped) zůstane viditelný jen v detail modalu s vysvětlením.
- **Reset baseline** — tlačítko v hlavičce widgetu uloží aktuální
  čítače jako referenční bod a vyčistí flap log.
- **Detail modal** v UN dashboard stylu (statcards, timeline,
  zaoblené tabulky) — využívá CSS proměnné UN bootstrap themu, automaticky
  ladí s tmavým režimem.
- **Barevný badge rychlosti**: 1000+ Mbit/s zelený akcent, 100 žlutý,
  10 oranžový. Odpojený port červený badge „Odpojeno", vypnutý šedý
  „Vypnuto" — vše stejným vizuálním typem.
- **Lokalizace do češtiny** přímo v UI textech.

Detailní seznam změn proti upstream je v [`CHANGELOG.md`](CHANGELOG.md).

## Závislosti

- `luci-base`
- `luabitop`
- `luci-compat`
- LuCI bootstrap theme (UN brand cascade.css je doporučená — modul
  ale funguje i bez něj, fallback barvy jsou v každém pravidle).

## UCI konfigurace

UCI config zůstává v `/etc/config/luci_netports`
(zachováno pro zpětnou kompatibilitu s `luci-app-tn-netports v2.2`).

```
config global 'global'
    option default_h_mode '1'
    option default_additional_info '1'
    option hv_mode_switch_button '1'
    option show_errors '1'
    option flap_threshold_5m '3'
```

Volby přidané UN edicí:

| Volba | Default | Popis |
|---|---|---|
| `show_errors` | `1` | Zobrazit kritické chybové čítače pod RX/TX provozem |
| `flap_threshold_5m` | `3` | Práh nestability — kolik flapů za 5 min spustí stav „NESTABILNÍ" |

Sekce `port` zůstávají kompatibilní s upstreamem (volby `ifname`,
`name`, `type`, `disable`).

## Stavová data v `/tmp`

| Soubor | Účel | Životnost |
|---|---|---|
| `/tmp/netports-events.json` | JSON-line log flap událostí | tmpfs — reboot vyčistí |
| `/tmp/netports-state.json` | Poslední viděný carrier per ifname (pro edge-detekci) | tmpfs |
| `/tmp/netports-baseline.json` | Snímek čítačů zachycený při Reset | tmpfs |
| `/tmp/netports-baseline.json.meta` | Timestamp posledního Reset | tmpfs |

Soubory jsou specifické pro tento balíček — nečtou je / nezapisují
jiné komponenty. Velikost event logu je omezená na ~256 KB, RPC handler
ho automaticky rotuje.

## Build

Standardní OpenWrt feed postup. Repozitář je primárně určený pro UN feed:

```sh
# uvnitř OpenWrt build tree, s nakopírovaným balíčkem v package/<feed>/
make package/luci-app-netports-un/{clean,compile} V=s
```

ipk balíček bude vytvořen v `bin/packages/<arch>/<feed>/luci-app-netports-un_*.ipk`.

## ubus API

| Metoda | ACL | Popis |
|---|---|---|
| `netports.getPortsInfo` | read | Aktuální stav všech portů + chyby + flap statistiky |
| `netports.getPortEvents { ifname, limit }` | read | Historie flap událostí |
| `netports.resetStats { scope }` | write | Reset baseline a flap logu |

## Licence

MIT — viz [`LICENSE`](LICENSE).

Copyright © 2018–2019 Tano Systems (původní `luci-app-tn-netports`).
Modifikace a UN edice © 2026 United Networks SE.
