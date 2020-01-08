odoo.define('web.ControllerAdapterMixin', function (require) {
"use strict";

const AbstractController = require('web.AbstractController');
const BasicController = require('web.BasicController');

const ControllerAdapterMixin = {
    on_attach_callback: function () {
        if (this._controlPanel) {
            this._controlPanel.on_attach_callback();
        }
        if (this._searchPanel) {
            this._searchPanel.on_attach_callback();
        }
        function attachMounted(elm) {
            for (const child of Object.values(elm.__owl__.children)) {
                attachMounted(child);
            }
            elm.__callMounted();
        }
        attachMounted(this.renderer);
    },
    on_detach_callback: function () {
        if (this._controlPanel) {
            this._controlPanel.on_detach_callback();
        }
        this.renderer.__callWillUnmount();
    },
    /**
     * @override
     */
    init(parent) {
        // This should add dom event listener based on odoo custom_events of the
        // widget and its parents. It works in db but not in test mode because
        // the controller has no parent in test mode so we need to manually add
        // the listeners from parents (web client and action manager).
        //
        // let widget = this;
        // while (widget) {
        //     for (const evType of Object.keys(widget.custom_events)) {
        //         this.events[evType.replace(/_/g, '-')] = ev => {
        //             this.trigger_up(evType, ev.detail);
        //         }
        //     }
        //     if (widget === this) {
        //         widget = parent;
        //     } else {
        //         widget = widget.getParent();
        //     }
        // }
        
        const evTypes = [
            //  custome_events from ActionManager
            'breadcrumb_clicked', 'execute_action', 'history_back',
            'push_state', 'redirect', 'switch_view', 'reload_action',
            // custom_events from web client
            'clear_uncommitted_changes', 'toggle_fullscreen',
            'current_action_updated', 'warning', 'load_action', 'load_views',
            'load_filters', 'create_filter', 'delete_filter', 'push_state',
            'show_effect', 'get_session', 'do_action', 'getScrollPosition',
            'scrollTo', 'set_title_part', 'with_client', 'app_clicked',
            'menu_clicked', 'show_home_menu', 'hide_home_menu'
        ];
        // Add custom_events from the controller
        for (const evType of Object.keys(this.custom_events)) {
            evTypes.push(evType);
        }
        for (const evType of evTypes) {
            this.events[evType.replace(/_/g, '-')] = ev => {
                this.trigger_up(evType, ev.detail);
            };
        }
        this._super.apply(this, arguments);
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
};

const AbstractControllerAdapter = AbstractController.extend(ControllerAdapterMixin);
const BasicControllerAdapter = BasicController.extend(ControllerAdapterMixin);

return {
    AbstractControllerAdapter,
    BasicControllerAdapter,
    ControllerAdapterMixin,
};

});
