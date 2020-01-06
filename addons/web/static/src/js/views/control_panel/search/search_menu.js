odoo.define('web.SearchMenu', function (require) {
    "use strict";

    const SearchMenuItem = require('web.SearchMenuItem');
    const { useExternalListener } = require('web.custom_hooks');

    const { Component, hooks } = owl;
    const { useDispatch, useGetters, useRef, useState } = hooks;

    class SearchMenu extends Component {
        constructor() {
            super(...arguments);

            this.dropdownMenu = useRef('dropdown');
            if ('controlPanelStore' in this.env) {
                this.dispatch = useDispatch(this.env.controlPanelStore);
                this.getters = useGetters(this.env.controlPanelStore);
            }
            this.state = useState({ open: false });
            useExternalListener(window, 'click', this._onWindowClick, true);
            useExternalListener(window, 'keydown', this._onWindowKeydown);

            this.symbol = this.env.device.isMobile ? 'fa fa-chevron-right float-right mt4' : false;
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        get items() {
            return [];
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        _onButtonKeydown(ev) {
            switch (ev.key) {
                case 'ArrowLeft':
                case 'ArrowRight':
                case 'ArrowUp':
                case 'ArrowDown':
                    const firstItem = this.el.querySelector('.dropdown-item');
                    if (firstItem) {
                        ev.preventDefault();
                        firstItem.focus();
                    }
            }
        }

        _onItemClick(ev) {
            const { itemId, optionId } = ev.detail;
            if (optionId) {
                this.dispatch('toggleFilterWithOptions', itemId, optionId);
            } else {
                this.dispatch('toggleFilter', itemId);
            }
        }

        /**
         * @private
         * @param {Event} ev
         */
        _onWindowClick(ev) {
            if (this.state.open && !this.el.contains(ev.target)) {
                this.state.open = false;
            }
        }

        /**
         * @private
         * @param {KeyboardEvent} ev
         */
        _onWindowKeydown(ev) {
            if (this.state.open && ev.key === 'Escape') {
                this.state.open = false;
            }
        }
    }

    SearchMenu.components = { SearchMenuItem };
    SearchMenu.defaultProps = {
        action: {},
        fields: {},
    };
    SearchMenu.props = {
        action: { type: Object, optional: 1 },
        fields: { type: Object, optional: 1 },
    };
    SearchMenu.template = 'SearchMenu';

    return SearchMenu;
});
