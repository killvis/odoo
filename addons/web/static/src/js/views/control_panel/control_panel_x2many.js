odoo.define('web.ControlPanelX2Many', function (require) {

    const ControlPanel = require('web.ControlPanel');

    class ControlPanelX2Many extends ControlPanel {

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        _loadStore() { }
    }

    ControlPanelX2Many.template = 'ControlPanelX2Many';

    return ControlPanelX2Many;
});
