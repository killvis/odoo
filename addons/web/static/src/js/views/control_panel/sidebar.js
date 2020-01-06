odoo.define('web.Sidebar', function (require) {
    "use strict";

    const Context = require('web.Context');
    const CustomFileInput = require('web.CustomFileInput');
    const pyUtils = require('web.py_utils');
    const SearchMenu = require('web.SearchMenu');

    const { Component } = owl;

    class SidebarSearchMenu extends SearchMenu {

        /**
         * Method triggered when the user clicks on a toolbar dropdown
         * @private
         * @param {Object} item
         * @param {MouseEvent} ev
         */
        _onItemClick(item, ev) {
            if (item.callback) {
                item.callback([item]);
            } else if (item.action) {
                this.trigger('execute_action', item.action);
            } else if (item.url) {
                return;
            }
            ev.preventDefault();
        }

        /**
         * @private
         * @param {KeyboardEvent} ev
         */
        _onKeydown(ev) {
            if (ev.key === 'Escape') {
                ev.target.blur();
            }
        }
    }

    SidebarSearchMenu.components = Object.assign({}, SearchMenu.components, { CustomFileInput });
    SidebarSearchMenu.props = Object.assign({}, SearchMenu.props, {
        activeIds: Array,
        editable: Boolean,
        items: Object,
        model: String,
        section: Object,
    });
    SidebarSearchMenu.template = 'Sidebar.SearchMenu';

    class Sidebar extends Component {

        mounted() {
            this._addTooltips();
        }

        patched() {
            this._addTooltips();
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        get items() {
            const items = { print: [], other: [] };
            for (const section in this.props.items) {
                items[section] = Object.assign([], this.props.items[section]);
            }
            for (const type in this.props.actions) {
                switch (type) {
                    case 'action':
                    case 'print':
                    case 'relate':
                        const section = type === 'print' ? 'print' : 'other';
                        const newItems = this.props.actions[type].map(action => {
                            return { action, label: action.name };
                        });
                        items[section].unshift(...newItems);
                        break;
                    case 'other':
                        items.other.unshift(...this.props.actions.other);
                        break;
                }
            }
            return items;
        }

        get sections() {
            const items = this.items;
            return this.props.sections.filter(
                s => items[s.name].length || (s.name === 'files' && this.props.editable)
            );
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * Add teh tooltips to the items
         * @private
         */
        _addTooltips() {
            $(this.el.querySelectorAll('[title]')).tooltip({
                delay: { show: 500, hide: 0 }
            });
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * Perform the action for the item clicked after getting the data
         * necessary with a trigger.
         * @private
         * @param {OwlEvent} ev
         */
        async _onExecuteAction(ev) {
            const action = ev.detail;
            const activeIdsContext = {
                active_id: this.props.activeIds[0],
                active_ids: this.props.activeIds,
                active_model: this.props.model,
            };
            if (this.props.domain) {
                activeIdsContext.active_domain = this.props.domain;
            }

            const context = pyUtils.eval('context', new Context(this.props.context, activeIdsContext));
            const result = await this.rpc({
                route: '/web/action/load',
                params: {
                    action_id: action.id,
                    context: context,
                },
            });
            result.context = new Context(result.context || {}, activeIdsContext)
                .set_eval_context(context);
            result.flags = result.flags || {};
            result.flags.new_window = true;
            this.trigger('do_action', { action: result });
        }
    }

    Sidebar.components = { SidebarSearchMenu };
    Sidebar.defaultProps = {
        actions: {},
        editable: true,
        items: {
            print: [],
            other: [],
        },
        sections: [
            { name: 'print', label: "Print" },
            { name: 'other', label: "Action" },
        ],
    };
    Sidebar.props = null;
    Sidebar.template = 'Sidebar';

    return Sidebar;
});
