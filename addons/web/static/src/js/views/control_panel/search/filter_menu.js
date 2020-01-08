odoo.define('web.FilterMenu', function (require) {
    "use strict";

    const DropdownMenu = require('web.DropdownMenu');
    const FilterMenuGenerator = require('web.FilterMenuGenerator');

    class FilterMenu extends DropdownMenu {
        constructor() {
            super(...arguments);

            this.icon = 'fa fa-filter';
            this.title = this.env._t("Filters");
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        get items() {
            return this.getters.getFiltersOfType('filter');
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         * @param {OwlEvent} ev
         */
        _onCreateNewFilters(ev) {
            this.dispatch('createNewFilters', ev.detail);
        }
    }

    FilterMenu.components = Object.assign({}, DropdownMenu.components, {
        FilterMenuGenerator,
    });
    FilterMenu.props = {
        fields: Object,
    };
    FilterMenu.template = 'FilterMenu';

    return FilterMenu;
});
