'use strict';
'require ui';
'require rpc';
'require uci';
'require firewall';

const NetPortsMode = { H: 0, V: 1 };
const NetPortsVersion = "2.3-flap";

const callNetPortsGetEvents = rpc.declare({
	object: 'netports',
	method: 'getPortEvents',
	params: [ 'ifname', 'limit' ],
	expect: { '': {} }
});

const callNetPortsResetStats = rpc.declare({
	object: 'netports',
	method: 'resetStats',
	params: [ 'scope' ],
	expect: { '': {} }
});

const callNetPortsGetInfoLib = rpc.declare({
	object: 'netports',
	method: 'getPortsInfo',
	expect: { '': {} }
});

const svgModeSwitch = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 512">'
	+ '<path d="M629.657 343.598L528.971 444.284c-9.373 9.372-24.568 '
	+ '9.372-33.941 0L394.343 343.598c-9.373-9.373-9.373-24.569 '
	+ '0-33.941l10.823-10.823c9.562-9.562 25.133-9.34 34.419.492L480 '
	+ '342.118V160H292.451a24.005 24.005 0 0 1-16.971-7.029l-16-16C244.361 '
	+ '121.851 255.069 96 276.451 96H520c13.255 0 24 10.745 24 '
	+ '24v222.118l40.416-42.792c9.285-9.831 24.856-10.054 34.419-.492l10.823 '
	+ '10.823c9.372 9.372 9.372 24.569-.001 33.941zm-265.138 15.431A23.999 '
	+ '23.999 0 0 0 347.548 352H160V169.881l40.416 42.792c9.286 9.831 24.856 '
	+ '10.054 34.419.491l10.822-10.822c9.373-9.373 9.373-24.569 '
	+ '0-33.941L144.971 67.716c-9.373-9.373-24.569-9.373-33.941 0L10.343 '
	+ '168.402c-9.373 9.373-9.373 24.569 0 33.941l10.822 10.822c9.562 9.562 '
	+ '25.133 9.34 34.419-.491L96 169.881V392c0 13.255 10.745 24 24 '
	+ '24h243.549c21.382 0 32.09-25.851 16.971-40.971l-16.001-16z"/></svg>';

const svgExpand = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">'
	+ '<path d="M143 352.3L7 216.3c-9.4-9.4-9.4-24.6 0-33.9l22.6-22.6c9.4-9.4 '
	+ '24.6-9.4 33.9 0l96.4 96.4 96.4-96.4c9.4-9.4 24.6-9.4 33.9 0l22.6 '
	+ '22.6c9.4 9.4 9.4 24.6 0 33.9l-136 136c-9.2 9.4-24.4 9.4-33.8 0z"/></svg>';

const svgCollapse = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512">'
	+ '<path d="M177 159.7l136 136c9.4 9.4 9.4 24.6 0 33.9l-22.6 22.6c-9.4 '
	+ '9.4-24.6 9.4-33.9 0L160 255.9l-96.4 96.4c-9.4 9.4-24.6 9.4-33.9 0L7 '
	+ '329.7c-9.4-9.4-9.4-24.6 0-33.9l136-136c9.4-9.5 24.6-9.5 34-.1z"/></svg>';

/* Reset (counterclockwise arrow) */
const svgReset = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">'
	+ '<path d="M370.72 133.28C339.458 104.008 298.888 87.962 255.848 88c-77.458.068-144.328 53.178-162.791'
	+ ' 126.85-1.344 5.363-6.122 9.15-11.651 9.15H24.103c-7.498 0-13.194-6.807-11.807-14.176C33.933'
	+ ' 94.924 134.813 8 256 8c66.448 0 126.791 26.136 171.315 68.685L463.03 41.03C478.149 25.911 504'
	+ ' 36.621 504 57.941V192c0 13.255-10.745 24-24 24H345.941c-21.319 0-32.03-25.851-16.91-40.971l41.689-41.749zM32'
	+ ' 296h134.059c21.319 0 32.03 25.851 16.91 40.971l-41.689 41.749c31.262 29.273 71.835 45.319 114.876'
	+ ' 45.28 77.418-.07 144.315-53.144 162.787-126.849 1.344-5.363 6.122-9.15 11.651-9.15h57.304c7.498'
	+ ' 0 13.194 6.807 11.807 14.176C478.067 417.076 377.187 504 256 504c-66.448'
	+ ' 0-126.791-26.136-171.315-68.685L48.97 470.97C33.851 486.089 8 475.379 8 454.059V320c0-13.255'
	+ ' 10.745-24 24-24z"/></svg>';

/* ---------- helpers ---------- */
function pad2(n) { return (n < 10 ? '0' : '') + n; }

function fmtTime(ts) {
	if (!ts) return '—';
	var d = new Date(ts * 1000);
	return pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}

function fmtDateTime(ts) {
	if (!ts) return '—';
	var d = new Date(ts * 1000);
	return pad2(d.getDate()) + '.' + pad2(d.getMonth()+1) + '. '
		+ pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds());
}

/* RX/TX field grouping
   - critical: skutečné HW/SW problémy, vždy v hlavní tabulce
   - info:     management traffic / běžné jevy, jen v detail modalu      */
const rxFieldsCritical = [
	{ key: 'rx_errors',       label: 'rx_errors',
	  desc: _('Souhrn všech RX chyb (CRC, frame, fifo, length, …). Pokud roste, je problém na HW/kabeláži.') },
	{ key: 'rx_crc_errors',   label: 'rx_crc',
	  desc: _('Vadný kontrolní součet rámce. Typicky špatný kabel, rušení (EMI), vadný konektor nebo NIC.') },
	{ key: 'rx_frame_errors', label: 'rx_frame',
	  desc: _('Rámec nemá správné zarovnání. Obvykle špatný kabel, vadná NIC nebo duplex-mismatch.') },
	{ key: 'rx_fifo_errors',  label: 'rx_fifo',
	  desc: _('Přeplnění FIFO bufferu NIC. CPU nebo sběrnice nestíhá zpracovávat příchozí provoz.') },
	{ key: 'rx_over_errors',  label: 'rx_over',
	  desc: _('Přetečení RX kruhového bufferu v ovladači. Stejná příčina jako rx_fifo, jiná vrstva.') }
];

const rxFieldsInfo = [
	{ key: 'rx_dropped',      label: 'rx_drop',
	  desc: _('Paket přijat fyzicky, ale Linux kernel ho zahodil před předáním do síťového stacku (chybí registrovaný handler protokolu).')
	      + '\n' + _('Nejčastější příčiny:')
	      + '\n• ' + _('LLDP (0x88CC) od managed switche – každých 30 s')
	      + '\n• ' + _('Cisco CDP / HP FDP / ExtremeNetworks EDP / Nortel SONMP')
	      + '\n• ' + _('MikroTik MNDP (UDP/5678 broadcast)')
	      + '\n• ' + _('STP/RSTP BPDU od přepínače')
	      + '\n• ' + _('IPv6 ND/RA bez aktivního IPv6 listeneru')
	      + '\n• ' + _('Pakety s VLAN tagem, který rozhraní neumí dekódovat')
	      + '\n' + _('Pomalý růst (1–5/min) na portu připojeném k managed switchi je NORMÁLNÍ. Akce zvážit teprve při růstu > 50/min nebo náhlém skoku.') }
];

const txFieldsCritical = [
	{ key: 'tx_errors',         label: 'tx_errors',
	  desc: _('Souhrn všech TX chyb. Pokud roste, je problém na lince nebo NIC.') },
	{ key: 'tx_carrier_errors', label: 'tx_carrier',
	  desc: _('Ztráta linky během vysílání. Vadný kabel, špatný spoj nebo náhlé výpadky linky.') },
	{ key: 'tx_aborted_errors', label: 'tx_aborted',
	  desc: _('Vysílání zrušeno – obvykle po dosažení limitu opakovaných kolizí. Indikuje přetížený nebo half-duplex segment.') },
	{ key: 'tx_fifo_errors',    label: 'tx_fifo',
	  desc: _('Přeplnění TX FIFO bufferu NIC.') },
	{ key: 'collisions',        label: 'collisions',
	  desc: _('Kolize na lince. Na half-duplex je to normální. Na full-duplex znamená duplex-mismatch a vážný problém.') }
];

const txFieldsInfo = [
	{ key: 'tx_dropped',        label: 'tx_drop',
	  desc: _('Odchozí paket nebyl odeslán a kernel ho zahodil ještě před NIC.')
	      + '\n' + _('Nejčastější příčiny:')
	      + '\n• ' + _('Plná odchozí fronta při shaper / QoS (htb, tbf, cake)')
	      + '\n• ' + _('Žádná cesta – chybí route k cíli')
	      + '\n• ' + _('Rozhraní v admin down během vysílání')
	      + '\n• ' + _('Limit traffic shaping nebo rate-limit na NIC')
	      + '\n• ' + _('Odeslaný multicast bez registrovaných posluchačů')
	      + '\n' + _('Při normálním provozu by hodnota měla zůstat 0 nebo růst velmi pomalu. Náhlý skok znamená přetížení nebo chybnou QoS konfiguraci.') }
];

var NetPorts = L.Class.extend({

	NetPorts: function(inputConfig) {
		var config = {
			targetElement: null,
			tblCellClasses: 'top left',
			mode: NetPortsMode.V,
			modeSwitchButton: false,
			autoSwitchHtoV: true,
			autoSwitchHtoVThreshold: 6,
			hModeFirstColWidth: 20,
			hModeExpanded: false,
			flapThreshold5m: 3,
			showErrors: true
		};

		var self = this;
		var fullUpdate = true;
		var targetElement = null;
		var tableElement = null;
		var resetInfoElement = null;
		var currentData = null;
		var lastErrorsByIf = {};   /* per-ifname snapshot for delta-since-last-refresh */

		/* ---------- formatters ---------- */

		var fmtNameAndMAC = function(portData) {
			var elements = [E('strong', {}, portData.name)];
			if (portData.hwaddr) {
				elements.push(E('br', {}));
				elements.push(fmtMAC(portData));
			}
			return elements;
		};

		var fmtMAC = function(portData) {
			return portData.hwaddr ? portData.hwaddr.toUpperCase() : ' ';
		};

		var isFlapping = function(portData) {
			return portData.flaps
				&& (portData.flaps.count_5m || 0) >= config.flapThreshold5m;
		};

		/* Map link speed (Mbit/s) to a CSS class */
		var getSpeedClass = function(speed) {
			if (speed >= 1000) return 'netports-speed netports-speed-1000';
			if (speed >= 100)  return 'netports-speed netports-speed-100';
			if (speed >= 10)   return 'netports-speed netports-speed-10';
			if (speed > 0)     return 'netports-speed netports-speed-other';
			return 'netports-speed netports-speed-other';
		};

		/* Format relative age "před X" in Czech */
		var fmtAge = function(secs) {
			if (secs < 60)    return _('před') + ' ' + secs + ' ' + _('s');
			if (secs < 3600)  return _('před') + ' ' + Math.floor(secs/60) + ' ' + _('min');
			if (secs < 86400) return _('před') + ' ' + Math.floor(secs/3600) + ' ' + _('h');
			return _('před') + ' ' + Math.floor(secs/86400) + ' ' + _('d');
		};

		/* Decide context-aware stability label.
		   Returns { text, cls } describing meaningful state of the port. */
		var getStabilityState = function(portData) {
			var f = portData.flaps || { count_5m: 0, count_1h: 0, count_24h: 0 };
			var phyup   = parseInt(portData.carrier) === 1;
			var adminup = portData.adminstate === 'up';

			/* Aktivně flapuje */
			if (f.count_5m >= config.flapThreshold5m)
				return { text: _('NESTABILNÍ') + ' (' + f.count_5m + '/5 min)', cls: 'bad' };

			/* Admin down – stav je už v hlavním badge "Vypnuto" */
			if (!adminup)
				return { text: _('bez výpadků v záznamu'), cls: 'off' };

			/* Admin up, ale bez signálu */
			if (!phyup) {
				if (f.count_1h > 0)
					return { text: _('nedávno odpojeno') + ' (' + f.count_1h + '/h)', cls: 'warn' };
				/* Nestop duplikovat „bez signálu", to už je v hlavním badge "Odpojeno". */
				return { text: _('bez nedávných incidentů'), cls: 'off' };
			}

			/* Aktivní spojení s občasnými výpadky */
			if (f.count_5m > 0)
				return { text: f.count_5m + ' ' + _('výpadek/5 min'), cls: 'warn' };
			if (f.count_1h > 0)
				return { text: _('občasné výpadky') + ' (' + f.count_1h + '/h)', cls: 'warn' };

			/* Plně aktivní bez incidentů */
			return { text: _('spojení stabilní'), cls: 'ok' };
		};

		/* Flap badge to display under the link-status icon */
		var renderFlapBadge = function(portData) {
			var f = portData.flaps || { count_5m: 0, count_1h: 0, count_24h: 0, last_ts: 0 };
			var st = getStabilityState(portData);

			var dotCls = 'netports-flap-dot netports-flap-dot-' + st.cls;
			var txtCls = 'netports-flap-' + st.cls;

			var wrap = E('span', { class: 'netports-flap' }, [
				E('span', { class: dotCls }),
				E('span', { class: txtCls }, st.text)
			]);

			/* doplnit krátký detail historie, pokud je co říct */
			if (f.count_24h > 0 && st.cls !== 'bad') {
				wrap.appendChild(E('span', { class: 'netports-flap-detail' },
					_('za 24 h') + ': ' + f.count_24h
					+ ' · ' + _('poslední') + ': '
					+ (f.last_ev || '?') + ' ' + fmtTime(f.last_ts)));
			}

			/* link to details modal */
			var link = E('span', { class: 'netports-flap-link' });
			var a = E('a', { 'data-port': portData.ifname }, _('Detail / historie ›'));
			a.addEventListener('click', function(ev) {
				ev.preventDefault();
				ev.stopPropagation();
				openDetailModal(portData);
			});
			link.appendChild(a);
			wrap.appendChild(link);

			return wrap;
		};

		var fmtStatus = function(portData) {
			var icon = '';
			var phyup = parseInt(portData.carrier);
			var adminup = (portData.adminstate === 'up') ? 1 : 0;

			if (adminup)
				icon = portData.type + (phyup ? '_up.svg' : '_down.svg');
			else
				icon = portData.type + '_disabled.svg';

			var status = E('div', {
				class: 'netports-linkstatus-icon-container netports-linkstatus-icon-container-'
					+ ((config.mode === NetPortsMode.H) ? 'h' : 'v')
			});

			var iconClass = 'netports-linkstatus-icon';
			if (isFlapping(portData))
				iconClass += ' netports-linkstatus-icon-flapping';

			status.appendChild(E('img', {
				class: iconClass,
				src: L.resource('netports/icons/' + icon),
				title: isFlapping(portData)
					? _('Port je nestabilní (flapuje)') + ': ' + portData.flaps.count_5m + ' / 5 min'
					: (!adminup ? _('Port je administrativně vypnutý')
					: (!phyup  ? _('Port je odpojený – kabel není zapojený nebo druhá strana down')
					: _('Port je aktivní')))
			}));

			var statusText = E('div', { class: 'netports-linkstatus-text' });

			if (adminup) {
				if (phyup) {
					var speed = parseInt(portData.speed);
					if (speed > 0) {
						statusText.appendChild(E('span',
							{ class: getSpeedClass(speed) },
							speed + ' Mbit/s'));
					} else {
						statusText.appendChild(E('span',
							{ class: 'netports-state-up' },
							_('Připojeno')));
					}
					if (portData.duplex === 'full')
						statusText.appendChild(E('span',
							{ class: 'netports-duplex' },
							_('plný duplex')));
					else if (portData.duplex === 'half')
						statusText.appendChild(E('span',
							{ class: 'netports-duplex' },
							_('poloviční duplex')));
				} else {
					statusText.appendChild(E('span',
						{ class: 'netports-statebox netports-statebox-bad' },
						_('Odpojeno')));
					var f0 = portData.flaps || {};
					if (f0.last_ts > 0 && f0.last_ev === 'down') {
						var age = Math.max(0, Math.floor(Date.now()/1000) - f0.last_ts);
						statusText.appendChild(E('span',
							{ class: 'netports-state-since' },
							fmtAge(age) + ' (' + fmtTime(f0.last_ts) + ')'));
					}
				}
			} else {
				statusText.appendChild(E('span',
					{ class: 'netports-statebox netports-statebox-off' },
					_('Vypnuto')));
			}

			statusText.appendChild(renderFlapBadge(portData));

			return [status, statusText];
		};

		var fmtNetIf = function(portData) {
			var v = portData.ifname;
			if (portData.ntm && (portData.ntm.netname || portData.ntm.wifiname)) {
				if (portData.ntm.netname) {
					v += ' (<a href="/cgi-bin/luci/admin/network/network">'
						+ portData.ntm.netname.toUpperCase() + '</a>)';
				}
				if (portData.ntm.wifiname) {
					v += '<br />[<a href="/cgi-bin/luci/admin/network/wireless">'
						+ portData.ntm.wifiname + '</a>]';
				}
			}
			return v;
		};

		var fmtBridgeIf = function(portData) {
			if (portData.bridge) {
				var v = portData.bridge.ifname;
				if (portData.ntm_bridge && portData.ntm_bridge.netname)
					v += ' (<a href="/cgi-bin/luci/admin/network/network">'
						+ portData.ntm_bridge.netname.toUpperCase() + '</a>)';
				v += ',<br />' + _('port&#160;%d').format(portData.bridge.port);
				return v;
			}
			return '&ndash;';
		};

		var fmtFwZones = function(portData) {
			var z = '';
			var ntm = [];
			var out_ifname = false;
			if (portData.ntm && portData.ntm.fwzone) ntm.push(portData.ntm);
			if (portData.ntm_bridge && portData.ntm_bridge.fwzone) ntm.push(portData.ntm_bridge);
			if (ntm.length == 0) return '&ndash;';
			out_ifname = ntm.length > 1;
			ntm.forEach(function(n) {
				var ifname = '';
				z += '<div class="ifacebox netports-ifacebox">';
				z += '<div class="ifacebox-head netports-ifacebox-head" style="background-color: '
					+ firewall.getColorForName(n.fwzone) + ';">';
				if (out_ifname) ifname = n.netname.toUpperCase() + ': ';
				z += n.fwzone
					? '<strong><a href="/cgi-bin/luci/admin/network/firewall/zones">'
						+ ifname + n.fwzone + '</a></strong>'
					: '<em>' + _('žádná') + '</em>';
				z += '</div></div>';
			});
			return z;
		};

		/* Build error sub-block embedded inside RX/TX cell.
		   Only CRITICAL counters appear in the main table.
		   Info counters (rx_dropped/tx_dropped) are visible only in the detail modal. */
		var buildErrorsBlock = function(portData, fields) {
			if (!config.showErrors) return null;
			var errs = portData.errors || {};
			var prev = lastErrorsByIf[portData.ifname] || {};
			var anyNonZero = false;
			var rows = [];

			fields.forEach(function(f) {
				var v = parseInt(errs[f.key] || 0);
				var pv = parseInt(prev[f.key] || 0);
				var d = v - pv;
				if (v === 0 && d <= 0) return;
				anyNonZero = true;
				var row = E('span', {
					class: 'netports-errblock-row',
					title: f.desc
				}, [
					E('span', { class: 'netports-errblock-name' }, f.label + ':'),
					E('span', { class: 'netports-errblock-val' }, String(v))
				]);
				if (d > 0) {
					row.appendChild(E('span', { class: 'netports-errblock-delta' }, '+' + d));
				}
				rows.push(row);
			});

			if (!anyNonZero) {
				return E('span', { class: 'netports-errblock-ok' }, _('bez kritických chyb'));
			}
			return E('span', { class: 'netports-errblock' }, rows);
		};

		var fmtTx = function(portData) {
			var elements = [];
			if (portData.stats.tx_bytes) {
				elements.push(_('%1024.2mB').format(portData.stats.tx_bytes));
				elements.push(E('br', {}));
				elements.push('(%d %s)'.format(portData.stats.tx_packets, _('paketů')));
			} else {
				elements.push(document.createTextNode('—'));
			}
			var errBlock = buildErrorsBlock(portData, txFieldsCritical);
			if (errBlock) elements.push(errBlock);
			return elements;
		};

		var fmtRx = function(portData) {
			var elements = [];
			if (portData.stats.rx_bytes) {
				elements.push(_('%1024.2mB').format(portData.stats.rx_bytes));
				elements.push(E('br', {}));
				elements.push('(%d %s)'.format(portData.stats.rx_packets, _('paketů')));
			} else {
				elements.push(document.createTextNode('—'));
			}
			var errBlock = buildErrorsBlock(portData, rxFieldsCritical);
			if (errBlock) elements.push(errBlock);
			return elements;
		};

		/* Update lastErrorsByIf snapshot - called once per refresh AFTER all formatters */
		var captureErrorSnapshot = function(data) {
			data.forEach(function(p) {
				lastErrorsByIf[p.ifname] = Object.assign({}, p.errors || {});
			});
		};

		/* ---------- columns ---------- */
		var dataTitles = [
			{ title: _('Název a MAC'),       vModeMinWidth: '110px',
			  cellClass: 'netports-cell-name',
			  fmtFunc: fmtNameAndMAC,         hModeDisable: true },
			{ title: _('Stav linky'),        vModeMinWidth: '170px',
			  cellClass: 'netports-cell-status',
			  fmtFunc: fmtStatus },
			{ title: _('Rozhraní'),
			  cellClass: 'netports-cell-netif',
			  fmtFunc: fmtNetIf,    hModeExtra: true },
			{ title: _('Bridge'),
			  cellClass: 'netports-cell-bridge',
			  fmtFunc: fmtBridgeIf, hModeExtra: true },
			{ title: _('Firewall zóny'),
			  cellClass: 'netports-cell-fw',
			  fmtFunc: fmtFwZones },
			{ title: _('Příjem RX'),  subtitle: _('(příchozí pakety)'),
			  cellClass: 'netports-cell-rx',
			  vModeMinWidth: '160px',         fmtFunc: fmtRx,       hModeExtra: true },
			{ title: _('Odeslání TX'), subtitle: _('(odchozí pakety)'),
			  cellClass: 'netports-cell-tx',
			  vModeMinWidth: '160px',         fmtFunc: fmtTx,       hModeExtra: true },
			{ title: _('MAC adresa'),
			  cellClass: 'netports-cell-mac',
			  fmtFunc: fmtMAC,
			  vModeDisable: true,             hModeExtra: true }
		];

		/* Build a fresh header cell content (string or node-with-subtitle) */
		var renderTitle = function(t) {
			if (!t.subtitle) return t.title;
			return E('span', {}, [
				document.createTextNode(t.title),
				E('br', {}),
				E('span', { class: 'netports-th-sub' }, t.subtitle)
			]);
		};

		/* ---------- DOM helpers ---------- */
		var clear = function() {
			while (targetElement.firstChild)
				targetElement.removeChild(targetElement.firstChild);
		};
		var clearTbl = function() {
			while (tableElement.firstChild)
				tableElement.removeChild(tableElement.firstChild);
		};

		/* ---------- buttons ---------- */
		var btnModeSwitch = null;
		var btnExpand = null;
		var btnReset = null;
		var buttons = [];

		var setMode = function(m) {
			if (config.mode == m) return;
			if (m !== NetPortsMode.V && m !== NetPortsMode.H) return;
			config.mode = m;
			fullUpdate = true;
			updateData(currentData);
			updateButtons();
		};

		var setHModeExpanded = function(expanded) {
			if (config.hModeExpanded == expanded) return;
			config.hModeExpanded = expanded;
			var rows = tableElement.querySelectorAll('.tr.netports-extra');
			rows.forEach(function(row) {
				row.style.display = config.hModeExpanded ? 'table-row' : 'none';
			});
			updateButtons();
		};

		var doReset = function() {
			ui.showModal(_('Reset čítačů a historie'), [
				E('p', {}, _('Tato akce smaže historii flapů a uloží aktuální stav chybových čítačů jako nový základ. Hodnoty se začnou počítat od nuly.')),
				E('p', {}, _('Pokračovat?')),
				E('div', { class: 'right' }, [
					E('button', {
						class: 'cbi-button',
						click: ui.hideModal
					}, _('Zrušit')),
					' ',
					E('button', {
						class: 'cbi-button cbi-button-negative',
						click: function() {
							callNetPortsResetStats('all').then(function(r) {
								/* Drop client-side delta cache so first refresh after
								   reset doesn't show negative deltas. */
								lastErrorsByIf = {};
								ui.hideModal();
								/* Force immediate refresh of the table so user sees
								   zeroed counters without waiting for the auto-poll tick. */
								return callNetPortsGetInfoLib().then(function(d) {
									updateData(d);
									ui.addNotification(null,
										E('p', {}, _('Čítače byly resetovány. Tabulka byla obnovena.')),
										'info');
								});
							}).catch(function(err) {
								ui.hideModal();
								ui.addNotification(null,
									E('p', {}, _('Reset selhal') + ': ' + String(err)),
									'danger');
							});
						}
					}, _('Resetovat'))
				])
			]);
		};

		var createButtons = function() {
			btnExpand = E('button',
				{ class: 'cbi-button', title: _('Zobrazit / skrýt další informace') },
				svgExpand);
			btnExpand.addEventListener('click', function() {
				setHModeExpanded(!config.hModeExpanded);
			});
			buttons.push(btnExpand);

			btnReset = E('button',
				{ class: 'cbi-button', title: _('Resetovat čítače chyb a historii flapů') },
				svgReset);
			btnReset.addEventListener('click', doReset);
			buttons.push(btnReset);

			if (config.modeSwitchButton) {
				btnModeSwitch = E('button',
					{ class: 'cbi-button', title: _('Přepnout zobrazení svisle/vodorovně') },
					svgModeSwitch);
				btnModeSwitch.addEventListener('click', function() {
					setMode(config.mode == NetPortsMode.V ? NetPortsMode.H : NetPortsMode.V);
				});
				buttons.push(btnModeSwitch);
			}
		};

		var updateButtons = function() {
			if (config.mode == NetPortsMode.H) {
				btnExpand.innerHTML = config.hModeExpanded ? svgCollapse : svgExpand;
			}
			btnExpand.style.display = (config.mode == NetPortsMode.H) ? '' : 'none';
		};

		var updateResetInfo = function(data) {
			if (!resetInfoElement) return;
			if (data && data.reset_ts && data.reset_ts > 0) {
				resetInfoElement.innerHTML = _('Resetováno') + ': ' + fmtDateTime(data.reset_ts);
				resetInfoElement.style.display = '';
			} else {
				resetInfoElement.style.display = 'none';
			}
		};

		/* ---------- detail modal ---------- */
		var renderEventTimeline = function(events) {
			if (!events || events.length === 0) {
				return E('div', { class: 'netports-modal-empty' },
					_('Zatím žádné události (po restartu se historie maže).'));
			}
			var box = E('div', { class: 'netports-modal-timeline' });
			var rev = events.slice().reverse();
			rev.forEach(function(e) {
				var line = E('div', {});
				line.appendChild(document.createTextNode(fmtDateTime(e.ts) + '  '));
				line.appendChild(E('span',
					{ class: e.ev === 'up' ? 'ev-up' : 'ev-down' },
					(e.ev === 'up' ? '▲ ' + _('AKTIVNÍ') + ' ' : '▼ ' + _('VYPNUTÝ') + ' ')));
				if (e.speed)
					line.appendChild(document.createTextNode(' ' + e.speed + ' Mb/s '));
				if (e.duplex)
					line.appendChild(document.createTextNode(e.duplex + ' '));
				line.appendChild(E('span', { class: 'ev-src' }, '[' + (e.src || '?') + ']'));
				box.appendChild(line);
			});
			return box;
		};

		var renderErrorSection = function(portData, fields, sectionClass) {
			var errs = portData.errors || {};
			var prev = lastErrorsByIf[portData.ifname] || {};

			var head = E('tr', {}, [
				E('th', { style: 'width:9em'   }, _('Čítač')),
				E('th', { style: 'width:6em'   }, _('Celkem')),
				E('th', { style: 'width:5em'   }, _('Δ refresh')),
				E('th', {}, _('Význam'))
			]);
			var rows = [head];
			fields.forEach(function(f) {
				var v = parseInt(errs[f.key] || 0);
				var d = v - parseInt(prev[f.key] || 0);
				var rowAttrs = (v > 0) ? { class: 'has-errors' } : {};
				rows.push(E('tr', rowAttrs, [
					E('td', { class: 'mono' }, f.label),
					E('td', { class: 'num' }, String(v)),
					E('td', { class: 'num' + (d > 0 ? ' netports-errblock-delta' : '') },
						d > 0 ? '+' + d : String(d)),
					E('td', { class: 'desc' }, f.desc)
				]));
			});
			return E('table', { class: 'netports-modal-errtable ' + (sectionClass || '') }, rows);
		};

		var openDetailModal = function(portData) {
			var f = portData.flaps || {};
			var phyup   = parseInt(portData.carrier) === 1;
			var adminup = portData.adminstate === 'up';
			var speed   = parseInt(portData.speed) || 0;

			/* Stav linky - smysluplný popisek + barva */
			var linkState, linkCls;
			if (!adminup)      { linkState = _('vypnuto');      linkCls = 'off'; }
			else if (!phyup)   { linkState = _('odpojeno');     linkCls = 'bad'; }
			else if (speed > 0){ linkState = speed + ' Mbit/s'; linkCls = 'ok'; }
			else               { linkState = _('aktivní');      linkCls = 'ok'; }

			/* Stabilita - kontextově (stejný text jako v hlavní tabulce) */
			var stab = getStabilityState(portData);

			/* Flap statistika - kompaktně na jednom řádku */
			var flapTriplet = (f.count_5m || 0) + ' / '
				+ (f.count_1h || 0) + ' / '
				+ (f.count_24h || 0);

			var lastEvent = f.last_ts
				? ((f.last_ev === 'up' ? '▲ ' + _('AKTIVNÍ') : '▼ ' + _('VYPNUTÝ'))
					+ ' · ' + fmtDateTime(f.last_ts))
				: _('zatím žádná');

			var summary = E('div', { class: 'netports-modal-summary' }, [
				E('div', { class: 'netports-statcard' }, [
					E('span', { class: 'label' }, _('Rozhraní')),
					E('span', { class: 'value mono' }, portData.ifname)
				]),
				E('div', { class: 'netports-statcard netports-statcard-' + linkCls }, [
					E('span', { class: 'label' }, _('Stav linky')),
					E('span', { class: 'value' }, linkState)
				]),
				E('div', { class: 'netports-statcard netports-statcard-' + stab.cls }, [
					E('span', { class: 'label' }, _('Stabilita')),
					E('span', { class: 'value' }, stab.text)
				]),
				E('div', { class: 'netports-statcard' }, [
					E('span', { class: 'label' },
						_('Flapy') + ' (5 m / 1 h / 24 h)'),
					E('span', { class: 'value mono' }, flapTriplet)
				]),
				E('div', { class: 'netports-statcard netports-statcard-wide' }, [
					E('span', { class: 'label' }, _('Poslední událost')),
					E('span', { class: 'value' }, lastEvent)
				])
			]);

			var timelineSlot = E('div', {}, _('Načítání…'));
			var content = E('div', { class: 'netports-modal' }, [
				summary,
				E('h4', {}, _('Historie událostí')),
				timelineSlot,

				E('h4', { class: 'netports-modal-h-critical' },
					_('Kritické čítače chyb (RX)')),
				renderErrorSection(portData, rxFieldsCritical, 'critical'),

				E('h4', { class: 'netports-modal-h-critical' },
					_('Kritické čítače chyb (TX)')),
				renderErrorSection(portData, txFieldsCritical, 'critical'),

				E('h4', { class: 'netports-modal-h-info' },
					_('Informativní čítače')),
				E('p', { class: 'netports-modal-note' },
					_('Tyto čítače obvykle rostou i bez problému – typicky LLDP/CDP/IPv6 ND. Pro hodnocení stavu portu je nepoužívejte.')),
				renderErrorSection(portData, rxFieldsInfo.concat(txFieldsInfo), 'info'),

				E('div', { style: 'text-align:right;margin-top:12px' },
					E('button', {
						class: 'cbi-button',
						click: ui.hideModal
					}, _('Zavřít'))
				)
			]);

			ui.showModal(_('Diagnostika portu') + ' — ' + portData.ifname, content);

			callNetPortsGetEvents(portData.ifname, 200).then(function(res) {
				var ev = (res && res.events) ? res.events : [];
				var tl = renderEventTimeline(ev);
				timelineSlot.parentNode.replaceChild(tl, timelineSlot);
			}).catch(function(err) {
				timelineSlot.innerHTML = '<em>' + _('Nepodařilo se načíst události') + ': ' + String(err) + '</em>';
			});
		};

		/* ---------- base layout ---------- */
		var createBase = function() {
			clear();
			createButtons();
			updateButtons();

			resetInfoElement = E('span', { class: 'netports-resetinfo' });
			resetInfoElement.style.display = 'none';

			var title = E('div', { class: 'netports-title' }, [
				E('div', { class: 'netports-copyright' },
					E('a', { href: 'https://github.com/tano-systems/luci-app-netports-un' },
						'luci-app-netports-un ' + NetPortsVersion)),
				E('div', { class: 'netports-buttons' }, [resetInfoElement].concat(buttons))
			]);
			var table = E('table', { class: 'table netports-table' }, [
				E('tr', { class: 'tr table-titles' },
					E('th', { class: 'th top center' }, '...')),
				E('tr', { class: 'tr placeholder' },
					E('td', { class: 'td' },
						E('em', { class: 'spinning' }, _('Načítám data…'))))
			]);
			var tableWrapper = E('div', { class: 'table-wrapper netports-tablewrap' }, table);
			targetElement.appendChild(title);
			targetElement.appendChild(tableWrapper);
			tableElement = table;
		};

		var init = function(inputConfig) {
			config.targetElement = inputConfig.target;
			if (inputConfig.mode !== undefined)
				config.mode = Number(inputConfig.mode);
			if (inputConfig.modeSwitchButton !== undefined)
				config.modeSwitchButton = inputConfig.modeSwitchButton;
			if (inputConfig.hModeExpanded !== undefined)
				config.hModeExpanded = inputConfig.hModeExpanded;
			if (inputConfig.hModeFirstColWidth !== undefined)
				config.hModeFirstColWidth = inputConfig.hModeFirstColWidth;
			if (inputConfig.autoSwitchHtoV !== undefined)
				config.autoSwitchHtoV = inputConfig.autoSwitchHtoV;
			if (inputConfig.autoSwitchHtoVThreshold !== undefined)
				config.autoSwitchHtoVThreshold = inputConfig.autoSwitchHtoVThreshold;
			if (inputConfig.flapThreshold5m !== undefined)
				config.flapThreshold5m = parseInt(inputConfig.flapThreshold5m) || 3;
			if (inputConfig.showErrors !== undefined)
				config.showErrors = !!inputConfig.showErrors;

			targetElement = config.targetElement;
			createBase();
		};

		var updateData = function(data) {
			if (!data || !data.data) {
				data = { data: [], count: 0 };
			}

			if ((config.mode == NetPortsMode.H) && config.autoSwitchHtoV) {
				if (data.data.length > config.autoSwitchHtoVThreshold) {
					if (config.mode !== NetPortsMode.V) {
						config.mode = NetPortsMode.V;
						fullUpdate = true;
						if (btnModeSwitch) {
							btnModeSwitch.setAttribute('disabled', true);
							btnModeSwitch.setAttribute('title',
								_('Příliš mnoho portů pro vodorovné zobrazení'));
						}
						updateButtons();
					}
				} else if (btnModeSwitch) {
					btnModeSwitch.removeAttribute('disabled');
					btnModeSwitch.setAttribute('title',
						_('Přepnout zobrazení svisle/vodorovně'));
				}
			}

			if (fullUpdate || !currentData) {
				clearTbl();
				if (config.mode == NetPortsMode.V)
					updateTblHeader(data.data);
				fullUpdate = false;
			}
			if (config.mode == NetPortsMode.H)
				updateTblHeader(data.data);

			updateTbl(data.data);
			updateResetInfo(data);

			/* Capture snapshot for next-refresh delta */
			captureErrorSnapshot(data.data);

			currentData = data;
		};

		var updateTblHeader = function(data) {
			if (config.mode == NetPortsMode.V) {
				var titles = [];
				dataTitles.forEach(function(t) {
					if (t.vModeDisable) return;
					titles.push(E('th', {
						class: 'th ' + config.tblCellClasses,
						style: t.vModeMinWidth ? 'min-width: ' + t.vModeMinWidth + ';' : ''
					}, renderTitle(t)));
				});
				tableElement.appendChild(E('tr', { class: 'tr table-titles' }, titles));
			} else {
				var row = [];
				var len = data.length;
				if (len == 0) {
					row.push(E('th', { class: 'th top center' }, '...'));
				} else {
					row.push(E('th', {
						class: 'th ' + config.tblCellClasses,
						style: 'width: ' + config.hModeFirstColWidth + '%;'
					}));
					var col_width = (100 - config.hModeFirstColWidth) / len;
					for (let p = 0; p < len; p++) {
						row.push(E('th', {
							class: 'th ' + config.tblCellClasses,
							style: 'width: ' + col_width + '%;'
						}, data[p].name));
					}
				}
				var thead = tableElement.querySelectorAll('.tr.table-titles');
				var trow = E('tr', { class: 'tr table-titles' }, row);
				if (thead.length) {
					if (trow.innerHTML !== thead[0].innerHTML)
						tableElement.replaceChild(trow, thead[0]);
				} else {
					tableElement.appendChild(trow);
				}
			}
		};

		var updateTbl = function(data) {
			if (!Array.isArray(data)) return;

			if (config.mode == NetPortsMode.V) {
				/* Full re-render keeps flap-link click handlers bound to fresh data
				   and avoids stale-NodeList issues after replaceChild. */
				clearTbl();
				updateTblHeader(data);
				var n = 0;
				data.forEach(function(port) {
					var tcells = [];
					dataTitles.forEach(function(t) {
						if (t.vModeDisable) return;
						/* data-label = popisek sloupce, použito pro mobile
						   stacked layout (CSS @media ≤720px). cellClass dává
						   sémantickou třídu pro responsive layout. */
						var dataLabel = t.title +
							(t.subtitle ? ' ' + t.subtitle : '');
						tcells.push(E('td', {
							'class': 'td ' + config.tblCellClasses
								+ (t.cellClass ? ' ' + t.cellClass : ''),
							'data-label': dataLabel
						}, t.fmtFunc(port)));
					});
					var trow = E('tr', { 'class': 'tr' }, tcells);
					trow.classList.add('cbi-rowstyle-%d'.format((n++ % 2) ? 2 : 1));
					tableElement.appendChild(trow);
				});
				if (data.length === 0) {
					tableElement.appendChild(E('tr', { 'class': 'tr placeholder' },
						E('td', { 'class': 'td top center' },
							_('Žádná data k zobrazení'))));
				}
				return;
			}

			/* H-mode: cell-level update (original behaviour) */
			var rows = tableElement.querySelectorAll('.tr');
			var n = 0;
			if (data.length) {
				dataTitles.forEach(function(t) {
					if (t.hModeDisable) return;
					var tcells = [];
					tcells.push(E('td',
						{ 'class': 'td ' + config.tblCellClasses }, renderTitle(t)));
					data.forEach(function(port) {
						tcells.push(E('td',
							{ 'class': 'td ' + config.tblCellClasses },
							t.fmtFunc(port)));
					});
					var trow = E('tr', { 'class': 'tr' }, tcells);
					trow.classList.add('cbi-rowstyle-%d'.format((n++ % 2) ? 2 : 1));
					if (t.hModeExtra) {
						trow.classList.add('netports-extra');
						trow.style.display = config.hModeExpanded ? 'table-row' : 'none';
					}
					if (rows[n]) {
						var cells_orig = rows[n].querySelectorAll('.td');
						if (cells_orig.length != tcells.length) {
							tableElement.replaceChild(trow, rows[n]);
						} else {
							for (let cn = 0; cn < cells_orig.length; cn++) {
								if (cells_orig[cn].innerHTML !== tcells[cn].innerHTML) {
									rows[n].replaceChild(tcells[cn], cells_orig[cn]);
								}
							}
						}
					} else {
						tableElement.appendChild(trow);
					}
				});
			}
			/* Trim trailing rows from previous render (NodeList is static -
			   nodes here are still attached because we never replaced beyond n). */
			var lastIdx = n;
			while (rows[++n]) {
				if (rows[n].parentNode === tableElement)
					tableElement.removeChild(rows[n]);
			}

			if (tableElement.firstElementChild === tableElement.lastElementChild) {
				tableElement.appendChild(E('tr', { 'class': 'tr placeholder' },
					E('td', { 'class': 'td top center' },
						_('Žádná data k zobrazení'))));
			}
		};

		this.init = init;
		this.updateData = updateData;
		init(inputConfig);
	}
});

return NetPorts;
