odoo.define('web.ControlPanel', function (require) {
    "use strict";

    const Pager = require('web.Pager');
    const SearchBar = require('web.SearchBar');
    const Sidebar = require('web.Sidebar');
    const FilterMenu = require('web.FilterMenu');
    const TimeRangeMenu = require('web.TimeRangeMenu');
    const GroupByMenu = require('web.GroupByMenu');
    const FavoriteMenu = require('web.FavoriteMenu');

    const { Component, hooks } = owl;
    const { useDispatch, useRef, useState, useSubEnv, useStore, useGetters } = hooks;

    class ControlPanel extends Component {
        constructor() {
            super(...arguments);

            if (this.props.controlPanelStore) {
                useSubEnv({
                    controlPanelStore: this.props.controlPanelStore,
                });
                this.dispatch = useDispatch(this.props.controlPanelStore);
            }
            this.state = useState(this.initialState);

            this._loadStore();

            this.cp_content = {
                buttons: useRef('buttons'),
                searchView: useRef('searchView'),
                searchViewButtons: useRef('searchViewButtons'),
            };
            window.top.cp = this;
        }

        mounted() {
            this._appendCPContent();
        }

        patched() {
            this._appendCPContent();
        }

        async willUpdateProps(nextProps) {
            console.log("CP: update", nextProps);
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        get initialState() {
            return {
                displayDropdowns: true,
                openedMenu: null,
            };
        }

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        async updateProps(newProps = {}) {
            if (!Object.keys(newProps).length) {
                return;
            }
            await this.willUpdateProps(newProps);
            Object.assign(this.props, newProps);
            if (this.__owl__.isMounted) {
                this.render(true);
            }
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        _appendCPContent() {
            for (const key in this.props.cp_content) {
                if (this.cp_content[key].el && this.props.cp_content[key]) {
                    this.cp_content[key].el.innerHTML = "";
                    this.cp_content[key].el.append(...this.props.cp_content[key]);
                }
            }
        }

        _loadStore() {
            this.getters = useGetters(this.env.controlPanelStore);
            useStore(state => state, {
                store: this.env.controlPanelStore,
                onUpdate: () => this.trigger('search', this.env.controlPanelStore.getQuery()),
            });
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        _onUpdateQuery() {
            console.log('Query updated', ...arguments);
        }
    }

    ControlPanel.components = { Pager, SearchBar, Sidebar, FilterMenu, TimeRangeMenu, GroupByMenu, FavoriteMenu };
    ControlPanel.defaultProps = {
        breadcrumbs: [],
        cp_content: {},
        views: [],
        withBreadcrumbs: true,
        withSearchBar: true,
    };
    // ControlPanel.props = {};
    ControlPanel.template = 'ControlPanel';

    return ControlPanel;
});
