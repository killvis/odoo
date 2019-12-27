odoo.define('web.ControllerAdapter', function (require) {
"use strict";

var AbstractController = require('web.AbstractController');

var ControllerAdapter = AbstractController.extend({
    on_attach_callback: function () {
        this.renderer.__callMounted();
        if (this._controlPanel) {
            this._controlPanel.mount(this.el, { position: 'first-child' });
        }
        if (this._controlPanelStore) {
            this._controlPanelStore.on('get_controller_query_params', this, this._onGetOwnedQueryParams);
        }
    },
    on_detach_callback: function () {
        this.renderer.__callWillUnmount();
        if (this._controlPanel) {
            this._controlPanel.unmount();
        }
        if (this._controlPanelStore) {
            this._controlPanelStore.off('get_controller_query_params', this);
        }
    },

    /**
     * @override
     * */
    updateRendererState: async function (props) {
        let prom;
        this.renderer.updateProps(props);
        if (this.renderer.__owl__.isMounted) {
            prom = this.renderer.render();
        } else {
            prom = this.renderer.mount(this.$('.o_content')[0], true);
        }
        return prom;
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------
    /**
     * @override
     * @private
     */
    _startRenderer: async function () {
        return this.renderer.mount(this.$('.o_content')[0]);
    },
});

return ControllerAdapter;

});
