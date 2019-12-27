odoo.define('web.GroupByMenuGenerator', function (require) {
    "use strict";

    const { GROUPABLE_TYPES } = require('web.controlPanelParameters');
    const SearchMenuItem = require('web.SearchMenuItem');

    const { useState } = owl.hooks;

    class GroupByMenuGenerator extends SearchMenuItem {
        constructor() {
            super(...arguments);

            this.fieldIndex = 0;
            this.fields = Object.keys(this.props.fields)
                .map(k => Object.assign({}, this.props.fields[k], { name: k }))
                .filter(f => f.sortable && f.name !== "id" && GROUPABLE_TYPES.includes(f.type))
                .sort((a, b) => a.string > b.string ? 1 : a.string < b.string ? -1 : 0);
            this.interactive = true;
            this.state = useState({ open: false });
        }

        _onApply() {
            const field = this.fields[this.fieldIndex];
            this.trigger('create_new_groupby', field);
            this.state.open = false;
        }

        _onFieldSelected(ev) {
            this.fieldIndex = ev.target.selectedIndex;
        }
    }

    GroupByMenuGenerator.template = 'GroupByMenuGenerator';

    return GroupByMenuGenerator;
});
