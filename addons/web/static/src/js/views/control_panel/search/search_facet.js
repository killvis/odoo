odoo.define('web.SearchFacet', function (require) {
"use strict";

const { COMPARISON_TIME_RANGE_OPTIONS, TIME_RANGE_OPTIONS} = require('web.controlPanelParameters');
const Tooltip = require('web.Tooltip');

const { Component, hooks } = owl;
const { useDispatch, useState } = hooks;

class SearchFacet extends Component {
    constructor() {
        super(...arguments);

        this.dispatch = useDispatch(this.env.controlPanelStore);
        this.state = useState({ displayTooltip: false });
        this._isComposing = false;
    }

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    get domains() {
        return this.props.filters.map(f => f.domain).join(' ');
    }

    /**
     * @returns {string}
     */
    get icon() {
        switch (this.props.group.type) {
            case 'filter':
                return 'fa-filter';
            case 'groupBy':
                return 'fa-bars';
            case 'favorite':
                return 'fa-star';
            case 'timeRange':
                return 'fa-calendar';
        }
    }

    /**
     * @returns {string}
     */
    get separator() {
        switch (this.props.group.type) {
            case 'field':
            case 'filter':
                return this.env._t('or');
            case 'groupBy':
                return '>';
        }
    }

    /**
     * @returns {string[]}
     */
    get values() {
        return Object.values(this.props.filters).map(this._getFilterDescription.bind(this));
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Get the correct description according to filter.
     *
     * @private
     * @returns {string}
     */
    _getFilterDescription(filter) {
        if (filter.type === 'field') {
            return filter.autoCompleteValues.map(f => f.label).join(this.env._t(" or "));
        }
        if (filter.type === 'timeRange') {
            let description = `${filter.fieldDescription}: ${filter.rangeDescription}`;
            if (filter.comparisonRangeDescription) {
                description += ` / ${filter.comparisonRangeDescription}`;
            }
            return description;
        }
        const description = [];
        if (filter.hasOptions) {
            const getOption = id => filter.options.find(o => o.optionId === id);
            if (filter.type === 'filter') {
                const optionDescription = [];
                const unsortedYearIds = [];
                const unsortedOtherOptionIds = [];
                filter.currentOptionIds.forEach(optionId => {
                    if (getOption(optionId).groupNumber === 2) {
                        unsortedYearIds.push(optionId);
                    } else {
                        unsortedOtherOptionIds.push(optionId);
                    }
                });
                const sortOptions = (a, b) =>
                    filter.options.findIndex(({ optionId }) => optionId === a) -
                    filter.options.findIndex(({ optionId }) => optionId === b);
                const yearIds = unsortedYearIds.sort(sortOptions);
                const otherOptionIds = unsortedOtherOptionIds.sort(sortOptions);

                if (otherOptionIds.length) {
                    otherOptionIds.forEach(optionId => {
                        yearIds.forEach(yearId => {
                            optionDescription.push(filter.basicDomains[`${yearId}__${optionId}`].description);
                        });
                    });
                } else {
                    yearIds.forEach(yearId => {
                        optionDescription.push(filter.basicDomains[yearId].description);
                    });
                }
                description.push(optionDescription);
            } else {
                description.push(...filter.currentOptionIds.map(optionId => getOption(optionId).description));
            }
        }
        return description.length ?
            `${filter.description}: ${description.join(" / ")}` :
            filter.description;
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {KeyboardEvent} ev
     */
    _onKeydown(ev) {
        if (this._isComposing) {
            return;
        }
        switch (ev.key) {
            case 'ArrowLeft':
                this.trigger('navigation_move', { direction: 'left' });
                break;
            case 'ArrowRight':
                this.trigger('navigation_move', { direction: 'right' });
                break;
            case 'Backspace':
                this.dispatch('deactivateGroup', this.props.group.id);
                break;
        }
    }
}

SearchFacet.components = { Tooltip };
SearchFacet.props = {
    filters: Object,
    group: Object,
};
SearchFacet.template = 'SearchFacet';

return SearchFacet;
});
