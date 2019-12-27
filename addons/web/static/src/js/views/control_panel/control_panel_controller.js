odoo.define('web.ControlPanelController', function (require) {
"use strict";

const { Controller } = require('web.mvc');
return Controller.extend({
    init() {
        throw new Error(`Woops! You tried to instanciate a "ControlPanelController"!`);
    }
});

var ControlPanelController = Controller.extend({
    className: 'o_cp_controller',
    custom_events: {
        facet_removed: '_onFacetRemoved',
        get_search_query: '_onGetSearchQuery',
        item_option_clicked: '_onItemOptionClicked',
        item_trashed: '_onItemTrashed',
        menu_item_clicked: '_onMenuItemClicked',
        new_favorite: '_onNewFavorite',
        new_filters: '_onNewFilters',
        new_groupBy: '_onNewGroupBy',
        activate_time_range: '_onActivateTimeRange',
        autocompletion_filter: '_onAutoCompletionFilter',
        reload: '_onReload',
        reset: '_onReset',
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * @see ControlPanelModel (exportState)
     * @returns {Object}
     */
    exportState: function () {
        return this.model.exportState();
    },
    /**
     * Called by the abstract controller to give focus to the searchbar
     */
    focusSearchBar: function () {
        if (this.renderer.searchBar) {
            this.renderer.searchBar.focus();
        }
    },

    /**
     * Called at each switch view. This is required until the control panel is
     * shared between controllers of an action.
     *
     * @param {string} controllerID
     */
    setControllerID: function (controllerID) {
        this.controllerID = controllerID;
    },
    /**
     * Update the content and displays the ControlPanel.
     *
     * @see  ControlPanelRenderer (updateContents)
     * @param {Object} status
     * @param {Object} [options]
     */
    updateContents: function (status, options) {
        this.renderer.updateContents(status, options);
    },


    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     * @returns {jQuery}
     */
    _getSubMenus: function () {
        return this.renderer.$subMenus;
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {OdooEvent} ev
     */
    _onReload: function (ev) {
        ev.stopPropagation();
        this.trigger_up('search', this.model.getQuery());
    },
    /**
     * @private
     * @param {OdooEvent} ev
     */
    _onReset: function (ev) {
        ev.stopPropagation();
        var state = this.model.get();
        this.renderer.updateState(state);
    },
});

return ControlPanelController;

});
