odoo.define('web.GroupByMenu', function (require) {
    "use strict";

    const DropdownMenu = require('web.DropdownMenu');
    const GroupByMenuGenerator = require('web.GroupByMenuGenerator');

    class GroupByMenu extends DropdownMenu {
        constructor() {
            super(...arguments);

            this.icon = 'fa fa-bars';
            this.title = this.env._t("Group By");
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        get items() {
            return this.getters.getFiltersOfType('groupBy');
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        _onCreateNewGroupBy(ev) {
            this.dispatch('createNewGroupBy', ev.detail);
        }
    }

    GroupByMenu.components = Object.assign({ GroupByMenuGenerator }, DropdownMenu.components);
    GroupByMenu.props = {
        fields: Object,
    };
    GroupByMenu.template = 'GroupByMenu';

    return GroupByMenu;
});
