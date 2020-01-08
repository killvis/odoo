odoo.define('web.ControlPanelStore', function (require) {
    "use strict";

    /**
     * DATA STRUCTURES
     *
     * 1. FILTER
     * ---------
     *
     * A filter is an object defining a specific domain. Each filter is defined
     * at least by :
     * @param {number} id unique identifier, also the filter's corresponding key
     * @param {string} description the description of the filter
     * @param {string} type either: (filter | groupBy | timeRange | favorite)
     *
     *  a. Filter
     *
     * @param {*} domain
     * @param {*} groupId
     * @param {*} groupNumber
     *
     *  b. GroupBy
     *
     * @param {*} fieldName
     * @param {*} fieldType
     * @param {*} groupId
     * @param {*} groupNumber
     *
     *  c. TimeRange
     *
     * @param {*} comparisonTimeRangeId
     * @param {*} fieldName
     * @param {*} fieldType
     * @param {*} timeRangeId
     *
     *  d. Favorite
     *
     * @param {*} context
     * @param {*} domain
     * @param {*} groupBys
     * @param {*} groupNumber
     * @param {*} isDefault
     * @param {*} removable
     * @param {*} editable
     * @param {*} orderedBy
     * @param {*} serverSideId
     * @param {*} userId
     *
     * 2. GROUP
     * --------
     *
     * A filter group is an object used to aggregate multiple filters in a unique
     * group. It defines a list of active filters composing the group.
     * @param {number[]} activeFilterIds
     * @param {number} id
     * @param {string} type
     *
     * 3. QUERY
     * --------
     */

    const dataManager = require('web.data_manager');
    const Domain = require('web.Domain');
    const pyUtils = require('web.py_utils');

    const { parseArch } = require('web.viewUtils');
    const { Store } = owl;
    const { COMPARISON_TIME_RANGE_OPTIONS,
        DEFAULT_INTERVAL, DEFAULT_PERIOD, DEFAULT_YEAR,
        INTERVAL_OPTIONS, OPTION_GENERATORS,
        TIME_RANGE_OPTIONS, YEAR_OPTIONS } = require('web.controlPanelParameters');

    let filterId = 0;
    let groupId = 0;
    let groupNumber = 0;

    // 'prototype'
    function dateFilterPrototype(type) {
        if (type === 'groupBy') {
            return {
                hasOptions: true,
                options: INTERVAL_OPTIONS.map(o =>
                    Object.create(o, { description: { value: o.description.toString() } })
                ),
                defaultOptionId: DEFAULT_INTERVAL,
                currentOptionIds: [],
            };
        }
    }

    //-----------------------------------------------------------------------------------------------
    // ControlPanelStore
    //-----------------------------------------------------------------------------------------------

    class ControlPanelStore extends Store {
        constructor(config) {
            super({
                actions: {},
                env: config.env,
                getters: {},
                state: {
                    actionProps: {
                        cp_content: {},
                        pager: null,
                        sidebar: null,
                        title: "",
                    },
                },
            });

            this.withSearchBar = 'withSearchBar' in config ? config.withSearchBar : true;

            this._defineActions();

            if (this.withSearchBar) {

                this._defineGetters();

                this._setProperties(config);

                if (config.importedState) {
                    this.importState(config.importedState);
                } else {
                    this._prepareInitialState();
                }
            }
        }

        //-----------------------------------------------------------------------------------------------
        // Actions
        //-----------------------------------------------------------------------------------------------

        /**
         * Activate a filter of type 'timeRange' with provided fieldName, rangeId, and comparisonRangeId.
         * If that filter does not exist it is created on the fly.
         *
         * @param {string} fieldName
         * @param {string} rangeId
         * @param {string} [comparisonRangeId]
         */
        activateTimeRange({ state, dispatch }, fieldName, rangeId, comparisonRangeId) {
            const groupId = this._getGroupIdOfType('timeRange');
            let timeRange = Object.values(state.filters).find(f => {
                return f.type === 'timeRange' &&
                    f.fieldName === fieldName &&
                    f.rangeId === rangeId &&
                    f.comparisonRangeId === comparisonRangeId;
            });
            let timeRangeId;
            if (timeRange) {
                timeRangeId = timeRange.id;
            } else {
                timeRangeId = filterId++;
                const field = this.fields[fieldName];
                timeRange = Object.assign(this._extractTimeRange(fieldName, rangeId, comparisonRangeId), {
                    type: 'timeRange',
                    groupId,
                    id: timeRangeId,
                    fieldDescription: field.string || fieldName,
                });
                state.filters[timeRangeId] = timeRange;
            }
            const group = state.groups[groupId];
            const groupActive = group.activeFilterIds.length;
            if (groupActive) {
                group.activeFilterIds = [{ filterId: timeRangeId }];
            } else {
                dispatch('toggleFilter', timeRangeId);
            }
        }

        /**
         * Remove all the items from query.
         */
        clearQuery({ state }) {
            state.query.forEach(groupId => {
                const group = state.groups[groupId];
                group.activeFilterIds.forEach(({ filterId }) => {
                    const filter = state.filters[filterId];
                    if (filter.autoCompleteValues) {
                        filter.autoCompleteValues = [];
                    }
                    if (filter.hasOptions) {
                        f.currentOptionIds = [];
                    }
                });
                group.activeFilterIds = [];
            });
            state.query = [];
        }

        /**
         * Create a new filter of type 'favorite' and toggle it.
         * It belongs to the unique group of favorites.
         *
         * @param {Object} preFilter
         */
        async createNewFavorite({ state, dispatch }, preFilter) {
            const preFavorite = await this._saveQuery(preFilter);
            dispatch('clearQuery');
            const group = {
                activeFilterIds: [],
                id: groupId++,
                type: 'favorite',
            };
            state.groups[group.id] = group;
            state.query.push(group.id);
            const filter = Object.assign(preFavorite, {
                groupId: group.id,
                id: filterId++,
                type: 'favorite',
            });
            state.filters[filter.id] = filter;
            group.activeFilterIds.push({ filterId: filter.id });
        }

        /**
         * @param {Object[]} filters
         */
        createNewFilters({ state }, prefilters) {
            if (!prefilters.length) {
                return;
            }
            const group = {
                activeFilterIds: [],
                id: groupId++,
                type: 'filter',
            };
            state.groups[group.id] = group;
            state.query.push(group.id);

            prefilters.forEach(preFilter => {
                const filter = Object.assign(preFilter, {
                    groupId: group.id,
                    groupNumber: groupNumber,
                    id: filterId++,
                    type: 'filter',
                });
                state.filters[filter.id] = filter;
                group.activeFilterIds.push({ filterId: filter.id });
            });
            groupNumber++;
        }

        /**
         * @param {Object} field
         */
        createNewGroupBy({ state, dispatch }, field) {
            const groupId = this._getGroupIdOfType('groupBy');
            const filter = {
                description: field.string || field.name,
                fieldName: field.name,
                fieldType: field.type,
                groupId: groupId,
                groupNumber: groupNumber++,
                id: filterId++,
                type: 'groupBy',
            };
            state.filters[filter.id] = filter;

            if (['date', 'datetime'].includes(field.type)) {
                Object.assign(filter, dateFilterPrototype('groupBy'));
                dispatch('toggleFilterWithOptions', filter.id);
            } else {
                dispatch('toggleFilter', filter.id);
            }
        }

        /**
         * Deactivate a group with provided groupId
         *
         * @param {number} groupId
         */
        deactivateGroup({ state }, groupId) {
            const group = state.groups[groupId];
            if (group.activeFilterIds.length) {
                for (const activeFilter of group.activeFilterIds) {
                    const filter = state.filters[activeFilter.filterId];
                    if (filter.autoCompleteValues) {
                        filter.autoCompleteValues = [];
                    }
                    if (filter.hasOptions) {
                        filter.currentOptionIds = [];
                    }
                }
                group.activeFilterIds = [];
                const groupIndex = state.query.indexOf(groupId);
                state.query.splice(groupIndex, 1);
            }
        }

        /**
         * Delete a filter of type 'favorite' with given filterId server side and
         * in control panel store. Of course the filter is also removed
         * from the search query.
         *
         * @param {string} filterId
         */
        async deleteFavorite({ state, dispatch }, filterId) {
            const { groupId, serverSideId } = state.filters[filterId];
            await dataManager.delete_filter(serverSideId);

            const group = state.groups[groupId];
            const isActive = Boolean(group.activeFilterIds.length);
            if (isActive) {
                dispatch('toggleFilter', filterId);
            }
            delete state.groups[groupId];
            delete state.filters[filterId];
        }

        /**
         * Activate a filter of type 'field' and compute its domain from its auto-completion
         * values.
         */
        toggleAutoCompletionFilter({ state }, { filterId, label, value, type }) {
            const filter = state.filters[filterId];
            filter.autoCompleteValues.push({ label, value });
            // the autocompletion filter is dynamic
            filter.domain = this._getAutoCompletionFilterDomain(filter, type);
            // active the filter
            const group = state.groups[filter.groupId];
            if (!group.activeFilterIds.some(active => active.filterId === filter.id)) {
                group.activeFilterIds.push({ filterId: filter.id });
            }
            if (state.query.indexOf(group.id) === -1) {
                state.query.push(group.id);
            }
        }

        /**
         * Activate or deactivate a filter from the query.
         * @param {string} filterId
         */
        toggleFilter({ state }, filterId) {
            const filter = state.filters[filterId];
            const group = state.groups[filter.groupId];
            const filterIndex = group.activeFilterIds.findIndex(o => o.filterId === filterId);
            if (filterIndex === -1) {
                group.activeFilterIds.push({ filterId: filterId });
                if (!state.query.includes(group.id)) {
                    state.query.push(group.id);
                }
            } else {
                group.activeFilterIds.splice(filterIndex, 1);
                if (group.activeFilterIds.length === 0) {
                    const groupIndex = state.query.indexOf(group.id);
                    state.query.splice(groupIndex, 1);
                }
            }
        }

        /**
         * Used to toggle a given filter(Id) that has options with a given option(Id).
         * @param {string} filterId
         * @param {string} [optionId]
         */
        toggleFilterWithOptions({ state, dispatch }, filterId, optionId) {
            const filter = state.filters[filterId];
            optionId = optionId || filter.defaultOptionId;
            const group = state.groups[filter.groupId];

            const selectedYears = () => filter.currentOptionIds.reduce(
                (acc, optionId) => {
                    if (YEAR_OPTIONS[optionId]) {
                        acc.push(YEAR_OPTIONS[optionId]);
                    }
                    return acc;
                },
                []
            );

            if (filter.type === 'filter') {
                const alreadyActive = group.activeFilterIds.some(o => o.filterId === filterId);
                if (alreadyActive) {
                    const optionIndex = filter.currentOptionIds.indexOf(optionId);
                    if (optionIndex > -1) {
                        filter.currentOptionIds.splice(optionIndex, 1);
                        if (!selectedYears().length) {
                            // This is the case where optionId was the last option
                            // of type 'year' to be there before being removed above.
                            // Since other options of type 'month' or 'quarter' do
                            // not make sense without a year we deactivate all options.
                            filter.currentOptionIds = [];
                        }
                        if (!filter.currentOptionIds.length) {
                            // Here no option is selected so that the filter becomes inactive.
                            dispatch('toggleFilter', filterId);
                        }
                    } else {
                        filter.currentOptionIds.push(optionId);
                    }
                } else {
                    dispatch('toggleFilter', filterId);
                    filter.currentOptionIds.push(optionId);
                    if (!selectedYears().length) {
                        // Here we add 'this_year' as options if no option of type year is already selected.
                        filter.currentOptionIds.push(DEFAULT_YEAR);
                    }
                }
            } else if (filter.type === 'groupBy') {
                const isCombination = o => o.filterId === filterId && o.optionId === optionId;
                const initiaLength = group.activeFilterIds.length;
                const index = group.activeFilterIds.findIndex(o => isCombination(o));
                if (index === -1) {
                    group.activeFilterIds.push({
                        filterId: filterId,
                        optionId: optionId,
                    });
                    filter.currentOptionIds.push(optionId);
                    if (initiaLength === 0) {
                        state.query.push(group.id);
                    }
                } else {
                    group.activeFilterIds.splice(index, 1);
                    const optionIndex = filter.currentOptionIds.indexOf(optionId);
                    filter.currentOptionIds.splice(optionIndex, 1);
                    if (initiaLength === 1) {
                        const groupIndex = state.query.indexOf(group.id);
                        state.query.splice(groupIndex, 1);
                    }
                }
            }
        }

        /**
         * @todo the way it is done could be improved, but the actual state of the
         * searchView doesn't allow to do much better.
         *
         * Update the domain of the search view by adding and/or removing filters.
         * @param {Object[]} newFilters list of filters to add, described by
         *   objects with keys domain (the domain as an Array), description (the text
         *   to display in the facet) and type with value 'filter'.
         * @param {string[]} filtersToRemove list of filter ids to remove
         *   (previously added ones)
         * @returns {string[]} list of added filters (to pass as filtersToRemove
         *   for a further call to this function)
         */
        updateFilters({ state, dispatch }, newFilters, filtersToRemove) {
            const newFilterIDS = dispatch('createNewFilters', newFilters);
            filtersToRemove.forEach(filterId => {
                const filter = state.filters[filterId];
                const group = state.groups[filter.groupId];
                if (group.activeFilterIds.some(({ id }) => id === filterId)) {
                    dispatch('toggleFilter', filterId);
                }
            });
            return newFilterIDS;
        }

        updateActionProps({ state }, newProps) {
            if ('cp_content' in newProps) {
                // We need to wrap the htmls elements in a function since the actionProps
                // object is a Proxy.
                for (const key in newProps.cp_content) {
                    const content = newProps.cp_content[key];
                    state.actionProps.cp_content[key] = () => content;
                }
                delete newProps.cp_content;
            }
            Object.assign(state.actionProps, newProps);
        }

        //-----------------------------------------------------------------------------------------------
        // Getters
        //-----------------------------------------------------------------------------------------------

        /**
         * Return an array containing copies of the filter of the provided type.
         * @param {string} type
         * @returns {Object[]}
         */
        getFiltersOfType({ state }, type) {
            const fs = [];
            Object.values(state.filters).forEach(filter => {
                if (filter.type === type && !filter.invisible) {
                    const group = state.groups[filter.groupId];
                    const isActive = group.activeFilterIds.some(o => o.filterId === filter.id);
                    const f = Object.assign({ isActive }, filter);
                    if (f.hasOptions) {
                        f.options = f.options.map(o => {
                            const { description, optionId, groupNumber } = o;
                            const isActive = f.currentOptionIds.includes(o.optionId);
                            return { description, optionId, groupNumber, isActive };
                        });
                    }
                    fs.push(f);
                }
            });
            if (type === 'favorite') {
                fs.sort((f1, f2) => f1.groupNumber - f2.groupNumber);
            }
            return fs;
        }

        //-----------------------------------------------------------------------------------------------
        // Public
        //-----------------------------------------------------------------------------------------------

        /**
         * Return the state of the control panel store (the filters, groups and the
         * current query). This state can then be used in an other control panel
         * model (with same key modelName). See importedState
         * @returns {Object}
         */
        exportState() {
            return {
                actionProps: this.state.actionProps,
                filters: this.state.filters,
                groups: this.state.groups,
                query: this.state.query,
            };
        }

        /**
         * @returns {Object} An object called search query with keys domain, groupBy,
         *      context, orderedBy.
         */
        getQuery() {
            if (!this.withSearchBar) {
                return {
                    context: {},
                    domain: [],
                    groupBy: [],
                    timeRanges: {},
                };
            }
            const requireEvaluation = true;
            return {
                context: this._getContext(),
                domain: this._getDomain(requireEvaluation),
                groupBy: this._getGroupBy(),
                orderedBy: this._getOrderedBy(),
                timeRanges: this._getTimeRanges(requireEvaluation),
            };
        }

        /**
         * @param {Object} state
         */
        importState(state) {
            Object.assign(this.state, state);
        }

        //-----------------------------------------------------------------------------------------------
        // Private
        //-----------------------------------------------------------------------------------------------

        /**
         * @private
         */
        _activateDefaultTimeRanges() {
            const { field, range, comparisonRange } = this.actionContext.time_ranges;
            this.dispatch('activateTimeRange', field, range, comparisonRange);
        }

        /**
         * @private
         */
        _activateFilters() {
            const defaultFavorite = Object.values(this.state.filters).find(
                f => f.type === 'favorite' && f.isDefault
            );
            if (defaultFavorite && this.activateDefaultFavorite) {
                this.dispatch('toggleFilter', defaultFavorite.id);
            } else {
                Object.values(this.state.filters)
                    .filter(f => f.isDefault && f.type !== 'favorite')
                    .sort((f1, f2) => (f1.defaultRank || 100) - (f2.defaultRank || 100))
                    .forEach(f => {
                        if (f.hasOptions) {
                            this.dispatch('toggleFilterWithOptions', f.id);
                        } else {
                            this.dispatch('toggleFilter', f.id);
                        }
                    });
                if (this.actionContext.time_ranges) {
                    this._activateDefaultTimeRanges();
                }
            }
        }

        /**
         * @private
         */
        _addFilters() {
            this._createGroupOfFiltersFromArch();
            this._createGroupOfDynamicFilters();
            this._createGroupOfFavorites();
            this._createGroupOfTimeRanges();
        }

        /**
         * @private
         */
        _createGroupOfDynamicFilters() {
            const pregroup = this.dynamicFilters.map(filter => {
                return {
                    description: filter.description,
                    domain: JSON.stringify(filter.domain),
                    isDefault: true,
                    type: 'filter',
                };
            });
            this._createGroupOfFilters(pregroup, 'filter');
        }

        /**
         * @private
         */
        _createGroupOfFavorites() {
            this.favoriteFilters.forEach(favorite => {
                const userId = favorite.user_id ? favorite.user_id[0] : false;
                const groupNumber = userId ? 1 : 2;
                const context = pyUtils.eval('context', favorite.context, this.env.session.user_context);
                let groupBys = [];
                if (context.group_by) {
                    groupBys = context.group_by;
                    delete context.group_by;
                }
                let timeRanges = {};
                if (context.time_ranges) {
                    const { field, range, comparisonRange } = context.time_ranges;
                    timeRanges = this._extractTimeRange(field, range, comparisonRange);
                    delete context.time_ranges;
                }
                const sort = JSON.parse(favorite.sort);
                const orderedBy = sort.map(order => {
                    let fieldName;
                    let asc;
                    const sqlNotation = order.split(' ');
                    if (sqlNotation.length > 1) {
                        // regex: \fieldName (asc|desc)?\
                        fieldName = sqlNotation[0];
                        asc = sqlNotation[1] === 'asc';
                    } else {
                        // legacy notation -- regex: \-?fieldName\
                        fieldName = order[0] === '-' ? order.slice(1) : order;
                        asc = order[0] === '-' ? false : true;
                    }
                    return {
                        asc: asc,
                        name: fieldName,
                    };
                });
                const pregroup = [{
                    context: favorite.context,
                    description: favorite.name,
                    domain: favorite.domain,
                    groupBys,
                    groupNumber,
                    isDefault: favorite.is_default,
                    removable: true,
                    editable: true,
                    orderedBy,
                    serverSideId: favorite.id,
                    timeRanges,
                    userId,
                    type: 'favorite',
                }];
                this._createGroupOfFilters(pregroup, 'favorite');
            });
        }

        /**
         * Using a list (a 'pregroup') of 'prefilters', create a new group in state.groups
         * and a new filter in state.filters for each prefilter. The new filters
         * are part of the new group.
         * @param {Object[]} pregroup, list of 'prefilters'
         * @param {string} type
         */
        _createGroupOfFilters(pregroup, type) {
            const group = {
                activeFilterIds: [],
                id: groupId++,
                type,
            };
            this.state.groups[group.id] = group;
            pregroup.forEach(preFilter => {
                const filter = Object.assign(preFilter, {
                    groupId: group.id,
                    id: filterId++,
                });
                this.state.filters[filter.id] = filter;
            });
        }

        /**
         * Parse the arch of a 'search' view and create corresponding filters and groups.
         *
         * A searchview arch may contain a 'searchpanel' node, but this isn't
         * the concern of the ControlPanelView (the SearchPanel will handle it).
         * Ideally, this code should whitelist the tags to take into account
         * instead of blacklisting the others, but with the current (messy)
         * structure of a searchview arch, it's way simpler to do it that way.
         * @private
         */
        _createGroupOfFiltersFromArch() {
            // get prefilters
            const children = this.parsedArch.children.filter(child => child.tag !== 'searchpanel');
            const preFilters = children.reduce(
                (acc, child) => {
                    if (child.tag === 'group') {
                        return acc.concat(child.children.map(this._evalArchChild));
                    } else {
                        return [...acc, this._evalArchChild(child)];
                    }
                },
                []
            );
            preFilters.push({ tag: 'separator' });

            // create groups and filters
            let currentTag;
            let currentGroup = [];
            let groupOfGroupBys = [];

            preFilters.forEach(preFilter => {
                if (preFilter.tag !== currentTag || ['separator', 'field'].includes(preFilter.tag)) {
                    if (currentGroup.length) {
                        if (currentTag === 'groupBy') {
                            groupOfGroupBys = groupOfGroupBys.concat(currentGroup);
                        } else {
                            this._createGroupOfFilters(currentGroup, currentTag);
                        }
                    }
                    currentTag = preFilter.tag;
                    currentGroup = [];
                    groupNumber++;
                }
                if (preFilter.tag !== 'separator') {
                    const filter = {
                        type: preFilter.tag,
                        // we need to codify here what we want to keep from attrs
                        // and how, for now I put everything.
                        // In some sence, some filter are active (totally determined, given)
                        // and others are passive (require input(s) to become determined)
                        // What is the right place to process the attrs?
                    };
                    if (filter.type === 'filter' || filter.type === 'groupBy') {
                        filter.groupNumber = groupNumber;
                    }
                    this._extractAttributes(filter, preFilter.attrs);
                    currentGroup.push(filter);
                }
            });

            if (groupOfGroupBys.length) {
                this._createGroupOfFilters(groupOfGroupBys, 'groupBy');
            }
        }

        /**
         * Add a group of type 'timeRange' in state.groups and generate a filter
         * of the same type for each suitable field in fields. The new filters
         * are put in the new group.
         * @private
         */
        _createGroupOfTimeRanges() {
            const pregroup = [];
            this._createGroupOfFilters(pregroup, 'timeRange');
        }

        /**
         * Bind the store actions to the `actions` key.
         * @private
         */
        _defineActions() {
            // default actions
            const actions = ['updateActionProps'];
            if (this.withSearchBar) {
                // search related actions
                actions.push(
                    'createNewFavorite', 'createNewFilters', 'createNewGroupBy',
                    'activateTimeRange',
                    'clearQuery', 'deactivateGroup',
                    'deleteFavorite',
                    'toggleAutoCompletionFilter', 'toggleFilter', 'toggleFilterWithOptions',
                    'updateFilters'
                );
            }
            actions.forEach(action => this.actions[action] = this[action].bind(this));
        }

        /**
         * Bind the store getters to the `getters` key.
         * @private
         */
        _defineGetters() {
            const getters = ['getFiltersOfType'];
            const getterProps = {
                getters: this.getters,
                state: this.state,
            };
            getters.forEach(getter => this.getters[getter] = this[getter].bind(this, getterProps));
        }

        /**
         * @private
         * @param {Object} child parsed arch node
         * @returns {Object}
         */
        _evalArchChild(child) {
            if (child.attrs.context) {
                try {
                    const context = pyUtils.eval('context', child.attrs.context);
                    if (context.group_by) {
                        // let us extract basic data since we just evaluated context
                        // and use a correct tag!
                        child.attrs.fieldName = context.group_by.split(':')[0];
                        child.attrs.defaultInterval = context.group_by.split(':')[1];
                        child.tag = 'groupBy';
                    }
                } catch (e) { }
            }
            return child;
        }

        /**
         * @private
         * @param {Object} filter
         * @param {Object} attrs
         */
        _extractAttributes(filter, attrs) {
            filter.isDefault = this.searchDefaults[attrs.name] ? true : false;
            filter.description = attrs.string ||
                attrs.help ||
                attrs.name ||
                attrs.domain ||
                'Ω';
            if (attrs.invisible) {
                filter.invisible = true;
            }
            if (filter.type === 'filter') {
                if (filter.isDefault) {
                    filter.defaultRank = -5;
                }
                filter.domain = attrs.domain;
                filter.context = pyUtils.eval('context', attrs.context);
                if (attrs.date) {
                    filter.fieldName = attrs.date;
                    filter.fieldType = this.fields[attrs.date].type;
                    filter.hasOptions = true;
                    filter.options = this.optionGenerators;
                    filter.defaultOptionId = attrs.default_period ||
                        DEFAULT_PERIOD;
                    filter.currentOptionIds = [];
                    filter.basicDomains = this._getDateFilterBasicDomains(filter);
                }
            } else if (filter.type === 'groupBy') {
                if (filter.isDefault) {
                    const val = this.searchDefaults[attrs.name];
                    filter.defaultRank = typeof val === 'number' ? val : 100;
                }
                filter.fieldName = attrs.fieldName;
                filter.fieldType = this.fields[attrs.fieldName].type;
                if (['date', 'datetime'].includes(filter.fieldType)) {
                    Object.assign(filter, dateFilterPrototype('groupBy'));
                }
            } else if (filter.type === 'field') {
                if (filter.isDefault) {
                    filter.defaultRank = -10;
                }
                const field = this.fields[attrs.name];
                filter.attrs = attrs;
                filter.autoCompleteValues = [];
                if (filter.isDefault) {
                    // on field, default can be used with a value
                    filter.defaultValue = this.searchDefaults[attrs.name];
                    // TODO
                    this._processFieldFilter(filter, field);
                }
                if (!attrs.string) {
                    attrs.string = field.string;
                }
            }
        }

        /**
         * @private
         * @param {string} fieldName
         * @param {number} rangeId
         * @param {number} comparisonRangeId
         */
        _extractTimeRange(fieldName, rangeId, comparisonRangeId) {
            const field = this.fields[fieldName];
            const timeRange = {
                fieldName: fieldName,
                rangeId,
                range: Domain.prototype.constructDomain(fieldName, rangeId, field.type),
                rangeDescription: this.env._t(TIME_RANGE_OPTIONS[rangeId].description),
            };
            if (comparisonRangeId) {
                timeRange.comparisonRangeId = comparisonRangeId;
                timeRange.comparisonRange = Domain.prototype.constructDomain(fieldName, rangeId, field.type, comparisonRangeId);
                timeRange.comparisonRangeDescription = this.env._t(COMPARISON_TIME_RANGE_OPTIONS[comparisonRangeId].description);
            }
            return timeRange;
        }

        /**
         * Return the domain resulting from the combination of the auto-completion
         * values of a field filter.
         * @private
         * @param {Object} filter
         * @param {string} type field type
         * @returns {string}
         */
        _getAutoCompletionFilterDomain(filter, type) {
            const domains = filter.autoCompleteValues.map(({ label, value }) => {
                let domain;
                if (value) {
                    domain = [[filter.attrs.name, '=', value]];
                } else if (filter.attrs.filter_domain) {
                    domain = Domain.prototype.stringToArray(
                        filter.attrs.filter_domain,
                        {
                            self: label,
                            raw_value: label,
                        }
                    );
                } else {
                    // Create new domain
                    let operator = '=';
                    if (filter.attrs.operator) {
                        operator = filter.attrs.operator;
                    } else if (['char', 'text', 'many2many', 'one2many', 'html'].includes(type)) {
                        operator = 'ilike';
                    }
                    domain = [[filter.attrs.name, operator, label]];
                }
                return Domain.prototype.arrayToString(domain);
            });
            return pyUtils.assembleDomains(domains, 'OR');
        }

        /**
         * @private
         * @returns {Object}
         */
        _getContext() {
            const types = ['filter', 'favorite', 'field'];
            const filterContexts = this.state.query.reduce((acc, groupId) => {
                const group = this.state.groups[groupId];
                if (types.includes(group.type)) {
                    acc.concat(this._getGroupContexts(group));
                }
                return acc;
            }, []);

            const userContext = this.env.session.user_context;
            try {
                return pyUtils.eval('contexts', [this.actionContext, ...filterContexts], userContext);
            } catch (err) {
                throw new Error(
                    this.env._t("Failed to evaluate search context") + ":\n" +
                    JSON.stringify(err)
                );
            }
        }

        /**
         * Construct an object containing constious domains based on this.referenceMoment and
         * the field associated with the provided date filter.
         * @private
         * @param {Object} filter
         * @returns {Object}
         */
        _getDateFilterBasicDomains({ fieldName, fieldType }) {

            const _constructBasicDomain = (y, o) => {
                const addParam = Object.assign({}, y.addParam, o ? o.addParam : {});
                const setParam = Object.assign({}, y.setParam, o ? o.setParam : {});
                const granularity = o ? o.granularity : y.granularity;
                const date = this.referenceMoment.clone().set(setParam).add(addParam);
                let leftBound = date.clone().startOf(granularity);
                let rightBound = date.clone().endOf(granularity);

                if (fieldType === 'date') {
                    leftBound = leftBound.format("YYYY-MM-DD");
                    rightBound = rightBound.format("YYYY-MM-DD");
                } else {
                    leftBound = leftBound.utc().format("YYYY-MM-DD HH:mm:ss");
                    rightBound = rightBound.utc().format("YYYY-MM-DD HH:mm:ss");
                }
                const domain = Domain.prototype.arrayToString([
                    '&',
                    [fieldName, ">=", leftBound],
                    [fieldName, "<=", rightBound]
                ]);
                const description = o ? o.description + " " + y.description : y.description;

                return { domain, description };
            };

            const domains = {};
            this.optionGenerators.filter(y => y.groupNumber === 2).forEach(y => {
                domains[y.optionId] = _constructBasicDomain(y);
                this.optionGenerators.filter(y => y.groupNumber === 1).forEach(o => {
                    domains[y.optionId + "__" + o.optionId] = _constructBasicDomain(y, o);
                });
            });
            return domains;
        }

        /**
         * Compute the string representation of the current domain associated to a date filter
         * starting from its currentOptionIds.
         * @private
         * @param {Object} filter
         * @returns {string}
         */
        _getDateFilterDomain(filter) {
            const domains = [];
            const yearIds = [];
            const otherOptionIds = [];
            filter.currentOptionIds.forEach(optionId => {
                if (YEAR_OPTIONS[optionId]) {
                    yearIds.push(optionId);
                } else {
                    otherOptionIds.push(optionId);
                }
            });
            // the following case corresponds to years selected only
            if (otherOptionIds.length === 0) {
                yearIds.forEach(yearId => {
                    const d = filter.basicDomains[yearId];
                    domains.push(d.domain);
                });
            } else {
                otherOptionIds.forEach(optionId => {
                    yearIds.forEach(yearId => {
                        const d = filter.basicDomains[`${yearId}__${optionId}`];
                        domains.push(d.domain);
                    });
                });
            }
            return pyUtils.assembleDomains(domains, 'OR');
        }

        /**
         * Return the string or array representation of a domain created by combining
         * appropriately (with an 'AND') the domains coming from the active groups.
         * @private
         * @param {boolean} [evaluation=true]
         * @returns {string} the string representation of a domain
         */
        _getDomain(evaluation = true) {
            const types = ['filter', 'favorite', 'field'];
            const domains = this.state.query.reduce((acc, groupId) => {
                const group = this.state.groups[groupId];
                if (types.includes(group.type)) {
                    acc.push(this._getGroupDomain(group));
                }
                return acc;
            }, []);
            let filterDomain = pyUtils.assembleDomains(domains, 'AND');

            if (evaluation) {
                const userContext = this.env.session.user_context;
                try {
                    return pyUtils.eval('domains', [this.actionDomain, filterDomain], userContext);
                } catch (err) {
                    throw new Error(
                        this.env._t("Failed to evaluate search domain") + ":\n" +
                        JSON.stringify(err)
                    );
                }
            } else {
                // TODO check if we don't need the action domain!
                return filterDomain;
            }
        }

        /**
        * Return the context of the provided filter.
        * @private
        * @param {Object} filter
        * @returns {Object} context
        */
        _getFilterContext(filterId) {
            const filter = this.state.filters[filterId];
            let context = filter.context || {};
            // for <field> nodes, a dynamic context (like context="{'field1': self}")
            // should set {'field1': [value1, value2]} in the context
            if (filter.type === 'field' && filter.attrs.context) {
                context = pyUtils.eval('context',
                    filter.attrs.context,
                    {
                        self: filter.autoCompleteValues.map(autoCompleteValue => autoCompleteValue.value)
                    },
                );
            }
            // the following code aims to restore this:
            // https://github.com/odoo/odoo/blob/12.0/addons/web/static/src/js/views/search/search_inputs.js#L498
            // this is required for the helpdesk tour to pass
            // this seems weird to only do that for m2o fields, but a test fails if
            // we do it for other fields (my guess being that the test should simply
            // be adapted)
            if (filter.type === 'field' && filter.isDefault) {
                if (this.fields[filter.attrs.name].type === 'many2one') {
                    let value = filter.defaultValue;
                    // the following if required to make the main_flow_tour pass (see
                    // https://github.com/odoo/odoo/blob/12.0/addons/web/static/src/js/views/search/search_inputs.js#L461)
                    if (filter.defaultValue instanceof Array) {
                        value = filter.defaultValue[0];
                    }
                    context[`default_${filter.attrs.name}`] = value;
                }
            }
            return context;
        }

        /**
         * Compute (if possible) the domain of the provided filter.
         * @private
         * @param {Object} filter
         * @returns {string} domain, string representation of a domain
         */
        _getFilterDomain(filter) {
            if (filter.type === 'filter' && filter.hasOptions) {
                return this._getDateFilterDomain(filter);
            }
            return filter.domain;
        }

        /**
         * Compute the groupBys (if possible) of the provided filter.
         * @private
         * @param {Array} filterId
         * @param {Array} [optionId]
         * @returns {string[]} groupBys
         */
        _getFilterGroupBys(filterId, optionId) {
            const filter = this.state.filters[filterId];
            if (filter.type === 'groupBy') {
                let groupBy = filter.fieldName;
                if (optionId) {
                    groupBy = `${groupBy}:${optionId}`;
                }
                return [groupBy];
            } else {
                return filter.groupBys;
            }
        }

        /**
         * Return the concatenation of groupBys comming from the active filters.
         * The array state.query encoding the order in which the groups have been
         * activated, the results respect the appropriate logic: the groupBys
         * coming from an active favorite (if any) come first, then come the
         * groupBys comming from the active filters of type 'groupBy'.
         * @private
         * @returns {string[]}
         */
        _getGroupBy() {
            const groupBys = this.state.query.reduce(
                (acc, groupId) => {
                    const group = this.state.groups[groupId];
                    if (['groupBy', 'favorite'].includes(group.type)) {
                        acc = acc.concat(this._getGroupGroupBys(group));
                    }
                    return acc;
                },
                []
            );
            const groupBy = groupBys.length ? groupBys : (this.actionContext.group_by || []);
            return typeof groupBy === 'string' ? [groupBy] : groupBy;
        }


        /**
         * Return the list of the contexts of the filters acitve in the given
         * group.
         * @private
         * @param {Object} group
         * @returns {Object[]}
         */
        _getGroupContexts(group) {
            const contexts = group.activeFilterIds.reduce((acc, { filterId }) => {
                const filterContext = this._getFilterContext(filterId);
                if (filterContext) {
                    acc.push(filterContext);
                }
                return acc;
            }, []);
            return contexts;
        }

        /**
         * Return the string representation of a domain created by combining
         * appropriately (with an 'OR') the domains coming from the filters
         * active in the given group.
         * @private
         * @param {Object} group
         * @returns {string} string representation of a domain
         */
        _getGroupDomain(group) {
            const domains = group.activeFilterIds.map(o => {
                const filter = this.state.filters[o.filterId];
                return this._getFilterDomain(filter);
            });
            return pyUtils.assembleDomains(domains, 'OR');
        }

        /**
         * Return the groupBys coming form the filters active in the given group.
         * @private
         * @param {Object} group
         * @returns {string[]}
         */
        _getGroupGroupBys(group) {
            return group.activeFilterIds.reduce(
                (acc, { filterId, optionId }) => {
                    acc = acc.concat(this._getFilterGroupBys(filterId, optionId));
                    return acc;
                },
                []
            );
        }

        /**
         * Return the id of the group with the provided type within an array of groups.
         * @private
         * @param {string} type "groupBy", "favorite" or "timeRange"
         * @returns {(string|undefined)}
         */
        _getGroupIdOfType(type) {
            const group = Object.values(this.state.groups).find(g => g.type === type);
            if (group) {
                return group.id;
            }
        }

        /**
         * Used to get the key orderedBy of a favorite.
         * @private
         * @returns {(Object[]|undefined)} orderedBy
         */
        _getOrderedBy() {
            let orderedBy;
            const lastFavoriteGroup = this.state.query.reduce((acc, groupId) => {
                const group = this.state.groups[groupId];
                if (group.type === 'favorite') {
                    acc = group;
                }
                return acc;
            }, false);
            if (lastFavoriteGroup) {
                const favoriteId = lastFavoriteGroup.activeFilterIds[0].filterId;
                const favorite = this.state.filters[favoriteId];
                if (favorite.orderedBy && favorite.orderedBy.length) {
                    orderedBy = favorite.orderedBy;
                }
            }
            return orderedBy;
        }

        /**
         * Return an empty object or an object with a key timeRangeMenuData
         * containing info on time ranges and their descriptions if a filter of type
         * 'timeRange' is activated (only one can be).
         * The key timeRange and comparisonTimeRange will be string or array
         * representation of domains according to the value of evaluation:
         * array if evaluation is true, string if false.
         * @private
         * @param {boolean} [evaluation=false]
         * @returns {Object}
         */
        _getTimeRanges(evaluation = false) {
            // groupOfTimeRanges can be undefined in case withSearchBar is false
            const groupId = this._getGroupIdOfType('timeRange');
            const groupOfTimeRanges = this.state.groups[groupId];
            if (groupOfTimeRanges && groupOfTimeRanges.activeFilterIds.length) {
                const { filterId } = groupOfTimeRanges.activeFilterIds[0];
                const filter = this.state.filters[filterId];
                let timeRanges;
                if (evaluation) {
                    timeRanges = {
                        comparisonField: filter.fieldName,
                        range: Domain.prototype.stringToArray(filter.range),
                        rangeDescription: filter.rangeDescription,
                    };
                    if (filter.comparisonRangeId) {
                        timeRanges.comparisonRange = Domain.prototype.stringToArray(filter.comparisonRange);
                        timeRanges.comparisonRangeDescription = filter.comparisonRangeDescription;
                    }
                    return timeRanges;
                } else {
                    return {
                        field: filter.fieldName,
                        range: filter.rangeId,
                        comparisonRange: filter.comparisonRangeId,
                    };
                }
            }
            return {};
        }

        /**
         * @private
         */
        _prepareInitialState() {
            Object.assign(this.state, {
                filters: {},
                groups: {},
                query: [],
            });

            this._addFilters();
            this._activateFilters();
        }

        /**
         * Get the value and domain of each search default filters. For many2one
         * fields, the label is fetched in the search bar to keep the store loading
         * fully synchronous.
         * @private
         * @param {Object} filter
         * @param {Object} field
         */
        _processFieldFilter(filter, { selection, type }) {
            let { defaultValue } = filter;
            if (type === 'many2one') {
                if (defaultValue instanceof Array) {
                    // M2O search fields do not currently handle multiple default values
                    // there are many cases of {search_default_$m2ofield: [id]}, need
                    // to handle this as if it were a single value.
                    defaultValue = value[0];
                }
                filter.autoCompleteValues.push({ value: defaultValue });
            } else {
                const [value, label] = type === 'selection' ?
                    selection.find(([val, lab]) => val === defaultValue) :
                    [defaultValue, defaultValue.toString()];
                filter.autoCompleteValues.push({ label, value });
            }
            filter.domain = this._getAutoCompletionFilterDomain(filter, type);
        }

        /**
         * Compute the search Query and save it as an ir.filter in db.
         * No evaluation of domains is done in order to keep them dynamic.
         * If the operation is successful, a new filter of type 'favorite' is
         * created and activated.
         * @private
         * @param {Object} preFilter
         * @returns {Object}
         */
        async _saveQuery(preFilter) {
            const userContext = this.env.session.user_context;
            const controllerQueryParams = await new Promise(resolve => {
                this.trigger('get_controller_query_params', resolve);
            });

            const queryContext = this._getContext();
            const context = pyUtils.eval(
                'contexts',
                [userContext, controllerQueryParams.context, queryContext]
            );
            Object.keys(userContext).forEach(key => {
                delete context[key];
            });

            const requireEvaluation = false;
            const domain = this._getDomain(requireEvaluation);

            const groupBys = this._getGroupBy();
            if (groupBys.length) {
                context.group_by = groupBys;
            }

            const { field, range, comparisonRange } = this._getTimeRanges(false);
            let timeRanges = {};
            if (field && range) {
                context.time_ranges = { field, range, comparisonRange };
                timeRanges = this._extractTimeRange(field, range, comparisonRange);
            }

            let orderedBy = this._getOrderedBy() || [];
            if (controllerQueryParams.orderedBy) {
                orderedBy = controllerQueryParams.orderedBy;
            }
            const sort = orderedBy.map(function (order) {
                return order.name + (order.asc === false ? " desc" : "");
            });

            const userId = preFilter.isShared ? false : this.env.session.uid;

            const irFilter = {
                name: preFilter.description,
                context: context,
                domain: domain,
                is_default: preFilter.isDefault,
                user_id: userId,
                model_id: this.modelName,
                action_id: this.actionId,
                sort: JSON.stringify(sort),
            };

            const serverSideId = await dataManager.create_filter(irFilter);

            delete context.group_by;
            delete context.time_ranges;
            delete preFilter.isShared;

            Object.assign(preFilter, {
                serverSideId,
                removable: true,
                editable: true,
                groupNumber: userId ? 1 : 2,
                context,
                groupBys,
                domain,
                orderedBy,
                timeRanges,
                userId
            });
            return preFilter;
        }

        _cleanArch(arch) {
            if (arch.children) {
                arch.children = arch.children.reduce(
                    (children, child) => {
                        if (typeof child === 'string') {
                            return children;
                        }
                        this._cleanArch(child);
                        return children.concat(child);
                    },
                    []
                );
            }
            return arch;
        }

        /**
         * TODO: doc
         * @private
         * @param {Object} config
         */
        _setProperties(config) {
            this.modelName = config.modelName;
            this.actionDomain = config.actionDomain;
            this.actionContext = config.actionContext;
            this.actionId = config.actionId;

            this.searchDefaults = {};
            for (const key in this.actionContext) {
                const match = /^search_default_(.*)$/.exec(key);
                if (match) {
                    this.searchDefaults[match[1]] = this.actionContext[key];
                    delete this.actionContext[key];
                }
            }
            const viewInfo = config.viewInfo || { arch: '<search/>', fields: {} };

            const rawArch = parseArch(viewInfo.arch);
            this.parsedArch = this._cleanArch(rawArch);
            this.fields = viewInfo.fields;

            this.favoriteFilters = viewInfo.favoriteFilters || [];
            this.activateDefaultFavorite = config.activateDefaultFavorite;

            this.dynamicFilters = config.dynamicFilters || [];

            this.referenceMoment = moment();
            this.optionGenerators = Object.values(OPTION_GENERATORS).map(option => {
                const description = option.description ?
                    this.env._t(option.description) :
                    this.referenceMoment.clone()
                        .set(option.setParam)
                        .add(option.addParam)
                        .format(option.format);
                return Object.create(option, { description: { value: description } });
            });
        }

    }

    return ControlPanelStore;
});
