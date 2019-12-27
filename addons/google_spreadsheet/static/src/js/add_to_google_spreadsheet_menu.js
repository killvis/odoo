odoo.define('board.AddToGoogleSpreadsheetMenu', function (require) {
    "use strict";

    const ActionManager = require('web.ActionManager');
    const { DataSet } = require('web.data');
    const Domain = require('web.Domain');
    const FavoriteMenu = require('web.FavoriteMenu');
    const pyUtils = require('web.py_utils');
    const SearchMenuItem = require('web.SearchMenuItem');

    class AddToGoogleSpreadsheetMenu extends SearchMenuItem {

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         */
        async _onAddToSpreadsheet() {
            // AAB: trigger_up an event that will be intercepted by the controller,
            // as soon as the controller is the parent of the control panel
            const actionManager = this.findAncestor(function (ancestor) {
                return ancestor instanceof ActionManager;
            });
            const controller = actionManager.getCurrentController();
            let searchQuery;
            // TO DO: for now the domains in query are evaluated.
            // This should be changed I think.
            this.trigger('get_search_query', {
                callback(query) {
                    searchQuery = query;
                },
            });
            const modelName = this.props.action.res_model;
            const listView = controller.widget.actionViews.find(view => view.type === 'list');
            const listViewId = listView ? listView.viewID : false;
            const domain = searchQuery.domain;
            const groupBys = pyUtils.eval('groupbys', searchQuery.groupBys).join(" ");
            const dataset = new DataSet(this, 'google.drive.config');

            const result = await dataset.call('set_spreadsheet', [modelName, Domain.prototype.arrayToString(domain), groupBys, listViewId])
            if (result.url) {
                window.open(result.url, '_blank');
            }
        }
    }

    AddToGoogleSpreadsheetMenu.template = 'AddToGoogleSpreadsheetMenu';

    // Add to the FavoriteMenu components object.
    FavoriteMenu.components.AddToGoogleSpreadsheetMenu = AddToGoogleSpreadsheetMenu;

    return AddToGoogleSpreadsheetMenu;
});
