# SPDX-License-Identifier: MIT
#
# Copyright (C) 2022-2024 muink <https://github.com/muink>
# Copyright (C) 2021 Tano Systems <https://github.com/tano-systems>
# Copyright (C) 2026 United Networks SE <develop@u-n.cz>

include $(TOPDIR)/rules.mk

LUCI_NAME:=luci-app-netports-un
PKG_VERSION:=2.3-flap
PKG_RELEASE:=un1

LUCI_TITLE:=Network Interfaces Ports Status (UN flap edition)
LUCI_PKGARCH:=all
LUCI_DEPENDS:=+luabitop +luci-compat

LUCI_DESCRIPTION:=Network ports status LuCI application with flap detection, \
critical/informational error counter split, link-speed colored badges, \
contextual stability label, reset baseline button and Czech localization. \
UI dashboard ladí s UN brand bootstrap themem.

PKG_MAINTAINER:=United Networks SE <develop@u-n.cz>
PKG_LICENSE:=MIT

define Package/$(LUCI_NAME)/conffiles
/etc/config/luci_netports
endef

define Package/$(LUCI_NAME)/postinst
endef

define Package/$(LUCI_NAME)/prerm
endef

include $(TOPDIR)/feeds/luci/luci.mk

# call BuildPackage - OpenWrt buildroot signature
