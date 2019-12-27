odoo.define('web.FilterMenu', function (require) {
    "use strict";

    const SearchMenu = require('web.SearchMenu');
    const FilterMenuGenerator = require('web.FilterMenuGenerator');

    class FilterMenu extends SearchMenu {
        constructor() {
            super(...arguments);
            this.category = 'filter';
            this.title = this.env._t("Filters");
            this.icon = 'fa fa-filter';
        }
    }

    FilterMenu.components = Object.assign({ FilterMenuGenerator }, SearchMenu.components);
    FilterMenu.template = 'FilterMenu';

    return FilterMenu;
});
