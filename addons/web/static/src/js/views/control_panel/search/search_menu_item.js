odoo.define('web.SearchMenuItem', function (require) {
    "use strict";

    const { Component, useState, hooks } = owl;
    const { useDispatch, useRef } = hooks;

    class SearchMenuItem extends Component {
        constructor() {
            super(...arguments);

            if (this.env.controlPanelStore) {
                this.dispatch = useDispatch(this.env.controlPanelStore);
            }
            this.fallbackFocusRef = useRef('fallback-focus');
            this.interactive = Boolean(this.props.options && this.props.options.length);
            this.state = useState({ open: false });
        }

        mounted() {
            this.el.addEventListener('keydown', this._onKeydown.bind(this));
        }

        //--------------------------------------------------------------------------
        // Properties
        //--------------------------------------------------------------------------

        get hasActiveOption() {
            return this.props.options.find(o => o.active);
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        _onKeydown(ev) {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
                return;
            }
            switch (ev.key) {
                case 'ArrowLeft':
                    if (this.interactive && this.state.open) {
                        ev.preventDefault();
                        this.fallbackFocusRef.el.focus();
                        this.state.open = false;
                    }
                    break;
                case 'ArrowRight':
                    if (this.interactive && !this.state.open) {
                        ev.preventDefault();
                        this.state.open = true;
                    }
                    break;
                case 'Escape':
                    ev.target.blur();
                    if (this.interactive && this.state.open) {
                        ev.preventDefault();
                        ev.stopPropagation();
                        this.fallbackFocusRef.el.focus();
                        this.state.open = false;
                    }
            }
        }
    }

    SearchMenuItem.components = { SearchMenuItem };
    SearchMenuItem.defaultProps = {};
    // SearchMenuItem.props = {};
    SearchMenuItem.template = 'SearchMenuItem';

    return SearchMenuItem;
});
