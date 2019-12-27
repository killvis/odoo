odoo.define('web.controlPanelParameters', function (require) {
    "use strict";

    var core = require('web.core');

    var _lt = core._lt;

    // for FilterMenu
    const DEFAULT_PERIOD = 'this_month';
    // TODO check if _lt still usefull. owl translates things no? -> No
    const PERIOD_OPTIONS = [
        { description: _lt('Last 7 Days'), optionId: 'last_7_days', groupNumber: 1 },
        { description: _lt('Last 30 Days'), optionId: 'last_30_days', groupNumber: 1 },
        { description: _lt('Last 365 Days'), optionId: 'last_365_days', groupNumber: 1 },
        { description: _lt('Last 5 Years'), optionId: 'last_5_years', groupNumber: 1 },
        { description: _lt('Today'), optionId: 'today', groupNumber: 2 },
        { description: _lt('This Week'), optionId: 'this_week', groupNumber: 2 },
        { description: _lt('This Month'), optionId: 'this_month', groupNumber: 2 },
        { description: _lt('This Quarter'), optionId: 'this_quarter', groupNumber: 2 },
        { description: _lt('This Year'), optionId: 'this_year', groupNumber: 2 },
        { description: _lt('Yesterday'), optionId: 'yesterday', groupNumber: 3 },
        { description: _lt('Last Week'), optionId: 'last_week', groupNumber: 3 },
        { description: _lt('Last Month'), optionId: 'last_month', groupNumber: 3 },
        { description: _lt('Last Quarter'), optionId: 'last_quarter', groupNumber: 3 },
        { description: _lt('Last Year'), optionId: 'last_year', groupNumber: 3 },
    ];
    const MONTH_OPTIONS = {
        this_month: { optionId: 'this_month', groupNumber: 1, format: 'MMMM', addParam: {}, setParam: {}, granularity: 'month' },
        last_month: { optionId: 'last_month', groupNumber: 1, format: 'MMMM', addParam: { months: -1 }, setParam: {}, granularity: 'month' },
        antepenultimate_month: { optionId: 'antepenultimate_month', groupNumber: 1, format: 'MMMM', addParam: { months: -2 }, setParam: {}, granularity: 'month' }
    }
    const QUARTER_OPTIONS = {
        fourth_quarter: { optionId: 'fourth_quarter', groupNumber: 1, description: "Q4", addParam: {}, setParam: { quarter: 4 }, granularity: 'quarter' },
        third_quarter: { optionId: 'third_quarter', groupNumber: 1, description: "Q3", addParam: {}, setParam: { quarter: 3 }, granularity: 'quarter' },
        second_quarter: { optionId: 'second_quarter', groupNumber: 1, description: "Q2", addParam: {}, setParam: { quarter: 2 }, granularity: 'quarter' },
        first_quarter: { optionId: 'first_quarter', groupNumber: 1, description: "Q1", addParam: {}, setParam: { quarter: 1 }, granularity: 'quarter' }
    }
    const YEAR_OPTIONS = {
        this_year: { optionId: 'this_year', groupNumber: 2, format: 'YYYY', addParam: {}, setParam: {}, granularity: 'year' },
        last_year: { optionId: 'last_year', groupNumber: 2, format: 'YYYY', addParam: { years: -1 }, setParam: {}, granularity: 'year' },
        antepenultimate_year: { optionId: 'antepenultimate_year', groupNumber: 2, format: 'YYYY', addParam: { years: -2 }, setParam: {}, granularity: 'year' },
    };
    const OPTION_GENERATORS = Object.assign({}, MONTH_OPTIONS, QUARTER_OPTIONS, YEAR_OPTIONS);
    const DEFAULT_YEAR = 'this_year';

    // for GroupBy menu
    const GROUPABLE_TYPES = ['many2one', 'char', 'boolean', 'selection', 'date', 'datetime', 'integer'];
    const DEFAULT_INTERVAL = 'month';
    const INTERVAL_OPTIONS = [
        { description: _lt('Year'), optionId: 'year', groupNumber: 1 },
        { description: _lt('Quarter'), optionId: 'quarter', groupNumber: 1 },
        { description: _lt('Month'), optionId: 'month', groupNumber: 1 },
        { description: _lt('Week'), optionId: 'week', groupNumber: 1 },
        { description: _lt('Day'), optionId: 'day', groupNumber: 1 },
    ];

    // for TimeRangeMenu
    const DEFAULT_TIMERANGE = DEFAULT_PERIOD;
    const TIME_RANGE_OPTIONS = {
        last_7_days: { description: 'Last 7 Days', id: 'last_7_days', groupNumber: 1 },
        last_30_days: { description: 'Last 30 Days', id: 'last_30_days', groupNumber: 1 },
        last_365_days: { description: 'Last 365 Days', id: 'last_365_days', groupNumber: 1 },
        last_5_years: { description: 'Last 5 Years', id: 'last_5_years', groupNumber: 1 },
        today: { description: 'Today', id: 'today', groupNumber: 2 },
        this_week: { description: 'This Week', id: 'this_week', groupNumber: 2 },
        this_month: { description: 'This Month', id: 'this_month', groupNumber: 2 },
        this_quarter: { description: 'This Quarter', id: 'this_quarter', groupNumber: 2 },
        this_year: { description: 'This Year', id: 'this_year', groupNumber: 2 },
        yesterday: { description: 'Yesterday', id: 'yesterday', groupNumber: 3 },
        last_week: { description: 'Last Week', id: 'last_week', groupNumber: 3 },
        last_month: { description: 'Last Month', id: 'last_month', groupNumber: 3 },
        last_quarter: { description: 'Last Quarter', id: 'last_quarter', groupNumber: 3 },
        last_year: { description: 'Last Year', id: 'last_year', groupNumber: 3 },
    };
    const DEFAULT_COMPARISON_TIME_RANGE = 'previous_period';
    const COMPARISON_TIME_RANGE_OPTIONS = {
        previous_period: { description: 'Previous Period', id: 'previous_period' },
        previous_year: { description: 'Previous Year', id: 'previous_year' }
    };

    return {
        COMPARISON_TIME_RANGE_OPTIONS: COMPARISON_TIME_RANGE_OPTIONS,
        DEFAULT_INTERVAL: DEFAULT_INTERVAL,
        DEFAULT_PERIOD: DEFAULT_PERIOD,
        DEFAULT_TIMERANGE: DEFAULT_TIMERANGE,
        DEFAULT_COMPARISON_TIME_RANGE: DEFAULT_COMPARISON_TIME_RANGE,
        DEFAULT_YEAR: DEFAULT_YEAR,
        GROUPABLE_TYPES: GROUPABLE_TYPES,
        INTERVAL_OPTIONS: INTERVAL_OPTIONS,
        OPTION_GENERATORS: OPTION_GENERATORS,
        PERIOD_OPTIONS: PERIOD_OPTIONS,
        TIME_RANGE_OPTIONS: TIME_RANGE_OPTIONS,
        YEAR_OPTIONS: YEAR_OPTIONS,
    };

});