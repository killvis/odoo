odoo.define('web.TimeRangeMenu', function (require) {
"use strict";

const { COMPARISON_TIME_RANGE_OPTIONS, DEFAULT_TIMERANGE, DEFAULT_COMPARISON_TIME_RANGE, TIME_RANGE_OPTIONS } = require('web.controlPanelParameters');
const SearchMenu = require('web.SearchMenu');

const { useDispatch, useState } = owl.hooks;
let timeRangeMenuId = 0;

class TimeRangeMenu extends SearchMenu {
    constructor() {
        super(...arguments);

        this.category = 'timeRange';
        this.icon = 'fa fa-calendar';
        this.title = this.env._t("Time Ranges");

        this.id = timeRangeMenuId ++;
        this.dispatch = useDispatch(this.env.controlPanelStore);

        this.fields = Object.keys(this.props.fields).reduce((acc, fieldName) => {
            const field = this.props.fields[fieldName];
            if (['date', 'datetime'].includes(field.type) && field.sortable && !acc.find(f => f.name === fieldName)) {
                acc.push({
                    name: fieldName,
                    description: field.string || fieldName,
                });
            }
            return acc;
        }, []);
        this.periodOptions = TIME_RANGE_OPTIONS;
        this.comparisonTimeRangeOptions = COMPARISON_TIME_RANGE_OPTIONS;
        this.periodGroups = Object.values(this.periodOptions).reduce((acc, o) => {
            if (!acc.includes(o.groupNumber)) {
                acc.push(o.groupNumber);
            }
            return acc;
        }, []);

        const { comparisonRangeId, fieldName, rangeId } = this.items.find(timeRange => timeRange.isActive) ||
                                                        { rangeId: DEFAULT_TIMERANGE, comparisonRangeId: false, fieldName: this.fields[0].name };
        this.state = useState({
            isComparing: Boolean(comparisonRangeId),
            fieldName,
            comparisonRangeId,
            rangeId,
        });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _onApply() {
        this.dispatch('activateTimeRange',
            this.state.fieldName, // Field name
            this.state.rangeId, // Time range option id
            this.state.isComparing ? (this.state.comparisonRangeId || DEFAULT_COMPARISON_TIME_RANGE) : undefined // Comparison time range id
        );
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onComparisonRangeChanged(ev) {
        this.state.comparisonRangeId = ev.target.value;
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onFieldNameChanged(ev) {
        this.state.fieldName = ev.target.value;
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onRangeChanged(ev) {
        this.state.rangeId = ev.target.value;
    }
}

TimeRangeMenu.template = 'TimeRangeMenu';

return TimeRangeMenu;

});
