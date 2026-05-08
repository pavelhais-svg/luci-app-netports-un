'use strict';
'require view';
'require uci';
'require form';
'require tools.widgets as widgets';

return view.extend({
	load: function() {
		return Promise.all([uci.load('luci_netports')]);
	},

	render: function(data) {
		let m, s, o;

		m = new form.Map('luci_netports', _('Network Interfaces Ports Status'));

		s = m.section(form.NamedSection, 'global', 'global');
		s.anonymous = true;

		o = s.option(form.Flag, 'default_additional_info',
			_('Ve vodorovném režimu zobrazit ve výchozím stavu i další informace'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'default_h_mode',
			_('Použít vodorovné zobrazení jako výchozí'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'hv_mode_switch_button',
			_('Zobrazit tlačítko pro ruční přepnutí svisle/vodorovně'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'show_errors',
			_('Zobrazovat chybové čítače u RX/TX sloupců'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.Value, 'flap_threshold_5m',
			_('Práh nestability (počet flapů za 5 minut)'),
			_('Při překročení této hodnoty se port označí jako NESTABILNÍ.'));
		o.datatype = 'uinteger';
		o.placeholder = '3';
		o.default = '3';
		o.rmempty = false;

		s = m.section(form.GridSection, 'port', _('Seznam portů'));
		s.sortable = true;
		s.anonymous = true;
		s.addremove = true;

		o = s.option(widgets.DeviceSelect, 'ifname', _('rozhraní'));
		o.multiple = false;
		o.noaliases = true;
		o.nobridges = true;
		o.nocreate = true;
		o.rmempty = false;

		o = s.option(form.Value, 'name', _('Pojmenování'));
		o.rmempty = true;

		o = s.option(form.ListValue, 'type', _('Typ portu'));
		o.value('auto',      _('Auto-detekce'));
		o.value('copper',    _('RJ45 (metalické)'));
		o.value('sfp',       _('SFP'));
		o.value('fixed',     _('Pevný spoj'));
		o.value('wifi',      _('Bezdrátové'));
		o.value('usb_wifi',  _('USB bezdrátové'));
		o.value('usb_rndis', _('USB RNDIS'));
		o.value('usb_stick', _('USB modem'));
		o.value('usb_2g',    _('USB 2G modem'));
		o.value('usb_3g',    _('USB 3G modem'));
		o.value('usb_4g',    _('USB 4G modem'));
		o.value('gprs',      _('GPRS'));
		o.value('vpn',       _('VPN'));
		o.value('tunnel',    _('Tunel'));
		o.value('ppp',       _('PPP'));
		o.default = 'auto';
		o.rmempty = true;

		o = s.option(form.Flag, 'disable', _('Skrytý'));
		o.default = o.disabled;
		o.editable = true;
		o.rmempty = true;

		return m.render();
	}
});
