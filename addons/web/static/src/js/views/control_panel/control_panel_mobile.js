odoo.define('web.ControlPanelMobile', function (require) {
    "use strict";

    const config = require('web.config');
    const ControlPanel = require('web.ControlPanel');
    const utils = require('web.utils');

    if (!config.device.isMobile) {
        return;
    }

    // Switch to a more appropriate template.
    ControlPanel.template = 'ControlPanelMobile';

    utils.patch(ControlPanel, 'web_mobile.ControlPanel', {

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        get initialState() {
            return Object.assign(this._super(), {
                isSearching: false,
                viewSwitcherOpen: false,
            });
        },
    });
});
