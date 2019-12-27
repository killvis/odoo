odoo.define('web.FilterMenuGenerator', function (require) {
    "use strict";

    const { DatePicker, DateTimePicker } = require('web.datepicker_owl');
    const Domain = require('web.Domain');
    const { parse } = require('web.field_utils');
    const SearchMenuItem = require('web.SearchMenuItem');

    const { useDispatch, useState } = owl.hooks;

    const FIELDTYPES = {
        boolean: 'boolean',
        char: 'char',
        date: 'date',
        datetime: 'datetime',
        float: 'number',
        id: 'id',
        integer: 'number',
        many2many: 'char',
        many2one: 'char',
        monetary: 'number',
        one2many: 'char',
        text: 'char',
        selection: 'selection',
    };

    class FilterMenuGenerator extends SearchMenuItem {
        constructor() {
            super(...arguments);

            this.dispatch = useDispatch(this.env.controlPanelStore);
            this.fields = Object.keys(this.props.fields)
                .map(k => Object.assign({}, this.props.fields[k], { name: k }))
                .filter(f => !f.deprecated && f.searchable)
                .sort((a, b) => a.string > b.string ? 1 : a.string < b.string ? -1 : 0);
            this.interactive = true;
            this.state = useState({
                conditions: [],
                open: false,
            });

            this._addCondition();

            this.OPERATORS = {
                boolean: [
                    { symbol: "=", text: this.env._lt("is true"), value: [true] },
                    { symbol: "!=", text: this.env._lt("is false"), value: [true] },
                ],
                char: [
                    { symbol: "ilike", text: this.env._lt("contains"), value: 1 },
                    { symbol: "not ilike", text: this.env._lt("doesn't contain"), value: 1 },
                    { symbol: "=", text: this.env._lt("is equal to"), value: 1 },
                    { symbol: "!=", text: this.env._lt("is not equal to"), value: 1 },
                    { symbol: "!=", text: this.env._lt("is set"), value: [false] },
                    { symbol: "=", text: this.env._lt("is not set"), value: [false] },
                ],
                date: [
                    { symbol: "=", text: this.env._lt("is equal to"), value: 1 },
                    { symbol: "!=", text: this.env._lt("is not equal to"), value: 1 },
                    { symbol: ">", text: this.env._lt("is after"), value: 1 },
                    { symbol: "<", text: this.env._lt("is before"), value: 1 },
                    { symbol: ">=", text: this.env._lt("is after or equal to"), value: 1 },
                    { symbol: "<=", text: this.env._lt("is before or equal to"), value: 1 },
                    { symbol: "between", text: this.env._lt("is between"), value: 2 },
                    { symbol: "!=", text: this.env._lt("is set"), value: [false] },
                    { symbol: "=", text: this.env._lt("is not set"), value: [false] },
                ],
                datetime: [
                    { symbol: "between", text: this.env._lt("is between"), value: 2 },
                    { symbol: "=", text: this.env._lt("is equal to"), value: 1 },
                    { symbol: "!=", text: this.env._lt("is not equal to"), value: 1 },
                    { symbol: ">", text: this.env._lt("is after"), value: 1 },
                    { symbol: "<", text: this.env._lt("is before"), value: 1 },
                    { symbol: ">=", text: this.env._lt("is after or equal to"), value: 1 },
                    { symbol: "<=", text: this.env._lt("is before or equal to"), value: 1 },
                    { symbol: "!=", text: this.env._lt("is set"), value: [false] },
                    { symbol: "=", text: this.env._lt("is not set"), value: [false] },
                ],
                number: [
                    { symbol: "=", text: this.env._lt("is equal to"), value: 1 },
                    { symbol: "!=", text: this.env._lt("is not equal to"), value: 1 },
                    { symbol: ">", text: this.env._lt("greater than"), value: 1 },
                    { symbol: "<", text: this.env._lt("less than"), value: 1 },
                    { symbol: ">=", text: this.env._lt("greater than or equal to"), value: 1 },
                    { symbol: "<=", text: this.env._lt("less than or equal to"), value: 1 },
                    { symbol: "!=", text: this.env._lt("is set"), value: [false] },
                    { symbol: "=", text: this.env._lt("is not set"), value: [false] },
                ],
                id: [
                    { symbol: "=", text: this.env._lt("is"), value: 1 },
                ],
                selection: [
                    { symbol: "=", text: this.env._lt("is"), value: 1 },
                    { symbol: "!=", text: this.env._lt("is not"), value: 1 },
                    { symbol: "!=", text: this.env._lt("is set"), value: [false] },
                    { symbol: "=", text: this.env._lt("is not set"), value: [false] },
                ],
            };
        }

        //--------------------------------------------------------------------------
        // Properties
        //--------------------------------------------------------------------------

        get decimalPoint() {
            return this.env._t.database.parameters.decimal_point;
        }

        get FIELDTYPES() {
            return FIELDTYPES;
        }

        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        _addCondition() {
            const condition = {
                field: 0,
                operator: 0,
                value: [],
            };
            this.state.conditions.push(condition);
        }

        _range(size) {
            return parseInt(size, 10) === size ? new Array(size).fill().map((_, i) => i) : [];
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * Convert all conditions to prefilters.
         */
        _onApply() {
            const preFilters = this.state.conditions.map(condition => {
                const field = this.fields[condition.field];
                const type = this.FIELDTYPES[field.type];
                const operator = this.OPERATORS[type][condition.operator];
                const preDescription = [];
                const preDomain = [];
                let values;
                // Field type specifics
                if (Array.isArray(operator.value)) {
                    values = operator.value;
                } else if (['date', 'datetime'].includes(field.type)) {
                    values = condition.value.map(val =>
                        val._isAMomentObject ? val.locale('en').format(
                            field.type === 'date' ?
                                'YYYY-MM-DD' :
                                'YYYY-MM-DD HH:mm:ss'
                        ) : val
                    );
                } else {
                    values = condition.value;
                }
                // Operator specifics
                if (operator.symbol === 'between') {
                    preDomain.push(
                        [field.name, '>=', values[0]],
                        [field.name, '<=', values[1]]
                    );
                } else {
                    preDomain.push([field.name, operator.symbol, values[0]]);
                }
                preDescription.push(field.string, operator.text);
                if (!Array.isArray(operator.value)) {
                    let value = values.join(` ${this.env._lt("and")} `);
                    if (this.FIELDTYPES[field.type] === 'char') {
                        value = `"${value}"`;
                    }
                    preDescription.push(value);
                }
                const preFilter = {
                    description: preDescription.join(" "),
                    domain: Domain.prototype.arrayToString(preDomain),
                    type: 'filter',
                };
                return preFilter;
            });

            this.dispatch('createNewFilters', preFilters);

            // Reset state
            this.state.open = false;
            this.state.conditions = [];
            this._addCondition();
        }

        _onDateChanged(condition, valueIndex, ev) {
            condition.value[valueIndex] = ev.detail;
        }

        _onFieldSelected(condition, ev) {
            Object.assign(condition, {
                field: ev.target.selectedIndex,
                operator: 0,
                value: [],
            });
        }

        _onOperatorSelected(condition, ev) {
            condition.operator = ev.target.selectedIndex;
        }

        _onRemoveCondition(conditionIndex) {
            this.state.conditions.splice(conditionIndex, 1);
        }

        _onValueInput(condition, valueIndex, ev) {
            const type = this.fields[condition.field].type;
            if (['float', 'integer'].includes(type)) {
                const previousValue = condition.value[valueIndex];
                const defaultValue = type === 'float' ? '0.0' : '0';
                try {
                    const parsed = parse[type](ev.target.value || defaultValue);
                    // Force parsed value in the input.
                    ev.target.value = condition.value[valueIndex] = (parsed || defaultValue);
                } catch (err) {
                    // Force previous value if non-parseable.
                    ev.target.value = previousValue || defaultValue;
                }
            } else {
                condition.value[valueIndex] = ev.target.value || "";
            }
        }
    }

    FilterMenuGenerator.components = { DatePicker, DateTimePicker };
    FilterMenuGenerator.template = 'FilterMenuGenerator';

    return FilterMenuGenerator;
});
