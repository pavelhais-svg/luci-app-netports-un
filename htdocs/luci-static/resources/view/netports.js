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
			_('Display additional information in horizontal view mode by default'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'default_h_mode',
			_('Use horizontal view mode by default'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'hv_mode_switch_button',
			_('Show button for manual switching between horizontal/vertical view modes'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'show_errors',
			_('Show error counters for RX/TX columns'));
		o.default = o.enabled;
		o.rmempty = false;

		o = s.option(form.Value, 'flap_threshold_5m',
			_('Instability threshold (flap count per 5 minutes)'),
			_('When this value is exceeded the port is marked as UNSTABLE.'));
		o.datatype = 'uinteger';
		o.placeholder = '3';
		o.default = '3';
		o.rmempty = false;

		s = m.section(form.GridSection, 'port', _('Port List'));
		s.sortable = true;
		s.anonymous = true;
		s.addremove = true;

		o = s.option(widgets.DeviceSelect, 'ifname', _('interface'));
		o.multiple = false;
		o.noaliases = true;
		o.nobridges = true;
		o.nocreate = true;
		o.rmempty = false;

		o = s.option(form.Value, 'name', _('Nick name'));
		o.rmempty = true;

		o = s.option(form.ListValue, 'type', _('Port type'));
		o.value('auto',      _('Auto detect'));
		o.value('copper',    _('RJ45'));
		o.value('sfp',       _('SFP'));
		o.value('fixed',     _('Intercircuit fixed link'));
		o.value('wifi',      _('Wireless'));
		o.value('usb_wifi',  _('USB Wireless'));
		o.value('usb_rndis', _('USB RNDIS'));
		o.value('usb_stick', _('USB modem'));
		o.value('usb_2g',    _('USB 2G modem'));
		o.value('usb_3g',    _('USB 3G modem'));
		o.value('usb_4g',    _('USB 4G modem'));
		o.value('gprs',      _('GPRS'));
		o.value('vpn',       _('VPN'));
		o.value('tunnel',    _('Tunnel'));
		o.value('ppp',       _('PPP'));
		o.default = 'auto';
		o.rmempty = true;

		o = s.option(form.Flag, 'disable', _('Hidden'));
		o.default = o.disabled;
		o.editable = true;
		o.rmempty = true;

		return m.render();
	}
});
