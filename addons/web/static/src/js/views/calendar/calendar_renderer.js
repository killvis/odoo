odoo.define('web.CalendarRenderer', function (require) {
    "use strict";

    // TODO: MSH: Convert it to OWL, remove jQuery and underscore dependency
    // no need to define displayFields, model etc in this, it will be available in props I guess

    const { useState, onMounted, onPatched } = owl.hooks;
    const { Component } = owl;

    const AbstractRendererOwl = require('web.AbstractRendererOwl');
    const AdapterComponent = require('web.AdapterComponent');
    const CalendarPopover = require('web.CalendarPopover');
    const config = require('web.config');
    const core = require('web.core');
    const Dialog = require('web.Dialog');
    const fieldUtils = require('web.field_utils');
    const FieldManagerMixin = require('web.FieldManagerMixin');
    const relationalFields = require('web.relational_fields');
    const session = require('web.session');

    const _t = core._t;

    const scales = {
        day: 'agendaDay',
        week: 'agendaWeek',
        month: 'month'
    };

    const SidebarFilterM2O = relationalFields.FieldMany2One.extend({
        _getSearchBlacklist() {
            return this._super(...arguments).concat(this.filter_ids || []);
        },
    });
    /**
     * Owl Component Adapter for relationalFields.FieldMany2One (Odoo Widget)
     * TODO: Remove this adapter when relationalFields.FieldMany2One is a Component
     */
    class SidebarFilterM2OAdapter extends AdapterComponent {
        constructor(parent, props) {
            props.Component = SidebarFilterM2O;
            super(...arguments);
        }

        get widgetArgs() {
            return [this.props.name, this.props.record, this.props.options];
        }

        patched() {
            this.widget._reset(this.props.record);
        }
    }

    // TODO: MSH: Check if we can use SidbarFilterOwl as sub component
    class SidebarFilterOwl extends Component {

        constructor(parent, props) {
            super(...arguments);
            FieldManagerMixin.init.call(this);

            this.title = props.title;
            this.fields = props.fields;
            this.fieldName = props.fieldName;
            this.write_model = props.write_model;
            this.write_field = props.write_field;
            this.avatar_field = props.avatar_field;
            this.avatar_model = props.avatar_model;
            this.filters = props.filters;
            this.label = props.label;
            this.getColor = props.getColor;
            this.isSwipeEnabled = true;
            // TODO: MSH: temporary fix template error, remove underscore function if possible
            this.uniqueId = _.uniqueId;
        }
        /**
         * @override
         */
        async willStart() {
            await super.willStart(...arguments);

            if (this.write_model || this.write_field) {
                this.m2oRecordID = await this.model.makeRecord(this.write_model, [{
                    name: this.write_field,
                    relation: this.fields[this.fieldName].relation,
                    type: 'many2one',
                }]);
            }
        }
        /**
         * @override
         */
        async mounted() {
            if (this.write_model || this.write_field) {
                this.many2one = new SidebarFilterM2OAdapter(this, {
                    name: this.write_field,
                    record: this.model.get(this.m2oRecordID),
                    options: {
                        mode: 'edit',
                        attrs: {
                            placeholder: `+ ${_t(`Add ${this.title}`)}`,
                            can_create: false
                        },
                    }
                });
            }
            if (this.many2one) {
                await this.many2one.mount(this.el);
                this.many2one.widget.filter_ids = _.without(this.filters.map(f => f.value), 'all');
            }
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * @private
         * @param {OdooEvent} event
         */
        async _onFieldChanged(event) {
            event.stopPropagation();
            const createValues = { 'user_id': session.uid };
            const value = event.detail.changes[this.write_field].id;
            createValues[this.write_field] = value;
            await this.rpc({
                model: this.write_model,
                method: 'create',
                args: [createValues],
            });
            this.trigger('changeFilter', {
                'fieldName': this.fieldName,
                'value': value,
                'active': true,
            });
        }
        /**
         * @private
         * @param {MouseEvent} e
         */
        _onFilterActive(e) {
            const input = e.currentTarget;
            this.trigger('changeFilter', {
                'fieldName': this.fieldName,
                'value': parseInt(input.closest('.o_calendar_filter_item').getAttribute('data-value')),
                'active': input.checked,
            });
        }
        /**
         * @private
         * @param {MouseEvent} e
         */
        _onFilterRemove(e) {
            const self = this;
            const filter = (e.currentTarget).closest('.o_calendar_filter_item');
            Dialog.confirm(this, _t("Do you really want to delete this filter from favorites ?"), {
                confirm_callback: function () {
                    self.rpc({
                        model: self.write_model,
                        method: 'unlink',
                        args: [[parseInt(filter.getAttribute('data-id'))]],
                    }).then(function () {
                        self.trigger('changeFilter', {
                            'fieldName': self.fieldName,
                            'id': parseInt(filter.getAttribute('data-id')),
                            'active': false,
                            'value': parseInt(filter.getAttribute('data-value')),
                        });
                    });
                },
            });
        }
    }
    SidebarFilterOwl.template = 'CalendarView.sidebar.filter';
    // copy methods of FieldManagerMixin into SidebarFilterOwl
    // Object.assign(SidebarFilterOwl.prototype, FieldManagerMixin);
    // We need something like: https://hacks.mozilla.org/2015/08/es6-in-depth-subclassing/
    // instead of _.defaults or Object.assign(it will override with FieldManagerMixin methods)
    _.defaults(SidebarFilterOwl.prototype, FieldManagerMixin);

    class OwlCalendarRenderer extends AbstractRendererOwl {

        constructor(parent, props) {
            super(...arguments);
            this.displayFields = props.displayFields;
            this.model = props.model;
            this.filters = [];
            this.color_map = {};
            this.hideDate = props.hideDate;
            this.hideTime = props.hideTime;

            onMounted(() => this._render());

            onPatched(() => this._render());
        }
        /**
         * @override
         */
        destroy() {
            if (this.$calendar) {
                this.$calendar.fullCalendar('destroy');
            }
            if (this.$small_calendar) {
                this.$small_calendar.datepicker('destroy');
                $('#ui-datepicker-div:empty').remove();
            }
            this._super.apply(this, arguments);
        }
        /**
         * @override
         */
        mounted() {
            this._initCalendar();
            this._initSidebar();
            if (config.device.isMobile) {
                this._bindSwipe();
            }
        }
        /**
         * @override
         */
        on_attach_callback() {
            if (config.device.isMobile) {
                this.$el.height($(window).height() - this.$el.offset().top);
            }
            var scrollTop = this.$calendar.find('.fc-scroller').scrollTop();
            if (scrollTop) {
                this.$calendar.fullCalendar('reinitView');
            } else {
                this.$calendar.fullCalendar('render');
            }
        }

        //--------------------------------------------------------------------------
        // Public
        //--------------------------------------------------------------------------

        /**
         * Note: this is not dead code, it is called by two template
         *
         * @param {any} key
         * @returns {integer}
         */
        getColor(key) {
            if (!key) {
                return;
            }
            if (this.color_map[key]) {
                return this.color_map[key];
            }
            // check if the key is a css color
            if (typeof key === 'string' && key.match(/^((#[A-F0-9]{3})|(#[A-F0-9]{6})|((hsl|rgb)a?\(\s*(?:(\s*\d{1,3}%?\s*),?){3}(\s*,[0-9.]{1,4})?\))|)$/i)) {
                return this.color_map[key] = key;
            }
            const index = (((Object.keys(this.color_map).length + 1) * 5) % 24) + 1;
            this.color_map[key] = index;
            return index;
        }
        /**
         * @override
         */
        getLocalState() {
            const $fcScroller = this.$calendar.find('.fc-scroller');
            return {
                scrollPosition: $fcScroller.scrollTop(),
            };
        }
        /**
         * @override
         */
        setLocalState(localState) {
            if (localState.scrollPosition) {
                const $fcScroller = this.$calendar.find('.fc-scroller');
                $fcScroller.scrollTop(localState.scrollPosition);
            }
        }


        //--------------------------------------------------------------------------
        // Private
        //--------------------------------------------------------------------------

        /**
         * @private
         * Bind handlers to enable swipe navigation
         *
         * @private
         */
        _bindSwipe() {
            const self = this;
            let touchStartX;
            let touchEndX;
            this.$calendar.on('touchstart', function (event) {
                touchStartX = event.originalEvent.touches[0].pageX;
            });
            this.$calendar.on('touchend', function (event) {
                touchEndX = event.originalEvent.changedTouches[0].pageX;
                if (!self.isSwipeEnabled) {
                    return;
                }
                if (touchStartX - touchEndX > 100) {
                    self.trigger('next');
                } else if (touchStartX - touchEndX < -100) {
                    self.trigger('prev');
                }
            });
        }
        /**
         * @param {any} event
         * @returns {string} the html for the rendered event
         */
        _eventRender(event) {
            const qwebContext = {
                event: event,
                record: event.record,
                color: this.getColor(event.color_index),
            };
            this.qweb_context = qwebContext;
            if (_.isEmpty(qwebContext.record)) {
                return '';
            } else {
                return this.env.qweb.renderToString("calendar-box", qwebContext);
            }
        }

        /**
         * @private
         * @param {any} record
         * @param {any} fieldName
         * @returns {string}
         */
        _format(record, fieldName) {
            const field = this.props.fields[fieldName];
            if (field.type === "one2many" || field.type === "many2many") {
                return fieldUtils.format[field.type]({ data: record[fieldName] }, field);
            } else {
                return fieldUtils.format[field.type](record[fieldName], field, { forceString: true });
            }
        }
        /**
         * Prepare context to display in the popover.
         *
         * @private
         * @param {Object} eventData
         * @returns {Object} context
         */
        _getPopoverContext(eventData) {
            const context = {
                hideDate: this.hideDate,
                hideTime: this.hideTime,
                eventTime: {},
                eventDate: {},
                fields: this.props.fields,
                displayFields: this.displayFields,
                event: eventData,
                modelName: this.model,
            };

            const start = moment(eventData.r_start || eventData.start);
            const end = moment(eventData.r_end || eventData.end);
            const isSameDayEvent = start.clone().add(1, 'minute').isSame(end.clone().subtract(1, 'minute'), 'day');

            // Do not display timing if the event occur across multiple days. Otherwise use user's timing preferences
            if (!this.hideTime && !eventData.record.allday && isSameDayEvent) {
                // Fetch user's preferences
                const dbTimeFormat = _t.database.parameters.time_format.search('%H') != -1 ? 'HH:mm' : 'hh:mm a';

                context.eventTime.time = start.clone().format(dbTimeFormat) + ' - ' + end.clone().format(dbTimeFormat);

                // Calculate duration and format text
                const durationHours = moment.duration(end.diff(start)).hours();
                const durationHoursKey = (durationHours === 1) ? 'h' : 'hh';
                const durationMinutes = moment.duration(end.diff(start)).minutes();
                const durationMinutesKey = (durationMinutes === 1) ? 'm' : 'mm';

                const localeData = moment.localeData(); // i18n for 'hours' and "minutes" strings
                context.eventTime.duration = (durationHours > 0 ? localeData.relativeTime(durationHours, true, durationHoursKey) : '')
                    + (durationHours > 0 && durationMinutes > 0 ? ', ' : '')
                    + (durationMinutes > 0 ? localeData.relativeTime(durationMinutes, true, durationMinutesKey) : '');
            }

            if (!this.hideDate) {
                if (!isSameDayEvent && start.isSame(end, 'month')) {
                    // Simplify date-range if an event occurs into the same month (eg. '4-5 August 2019')
                    context.eventDate.date = start.clone().format('MMMM D') + '-' + end.clone().format('D, YYYY');
                } else {
                    context.eventDate.date = isSameDayEvent ? start.clone().format('dddd, LL') : start.clone().format('LL') + ' - ' + end.clone().format('LL');
                }

                if (eventData.record.allday && isSameDayEvent) {
                    context.eventDate.duration = _t("All day");
                } else if (eventData.record.allday && !isSameDayEvent) {
                    const daysLocaleData = moment.localeData();
                    const days = moment.duration(end.diff(start)).days();
                    context.eventDate.duration = daysLocaleData.relativeTime(days, true, 'dd');
                }
            }

            return context;
        }
        /**
         * Prepare the parameters for the popover.
         * This allow the parameters to be extensible.
         *
         * @private
         * @param {Object} eventData
         */
        _getPopoverParams(eventData) {
            return {
                animation: false,
                delay: {
                    show: 50,
                    hide: 100
                },
                trigger: 'manual',
                html: true,
                title: eventData.record.display_name,
                template: this.env.qweb.renderToString('CalendarView.event.popover.placeholder', { color: this.getColor(eventData.color_index) }),
                container: eventData.allDay ? '.fc-view' : '.fc-scroller',
            };
        }
        /**
         * Initialize the main calendar
         *
         * @private
        */
        _initCalendar() {
            var self = this;

            // TODO: MSH: Remove jQuery wrap here and change all other method where this.$calendar is used
            this.$calendar = $(this.el.querySelector(".o_calendar_widget"));

            // This seems like a workaround but apparently passing the locale
            // in the options is not enough. We should initialize it beforehand
            const locale = moment.locale();
            $.fullCalendar.locale(locale);

            //Documentation here : http://arshaw.com/fullcalendar/docs/
            const fcOptions = Object.assign({}, this.props.fc_options, {
                eventDrop: function (event) {
                    self.trigger('dropRecord', event);
                },
                eventResize: function (event) {
                    self._unselectEvent();
                    self.trigger('updateRecord', event);
                },
                eventClick: function (eventData, ev) {
                    self._unselectEvent();
                    self.$calendar.find(`[data-event-id=${eventData.id}]`).addClass('o_cw_custom_highlight');
                    self._renderEventPopover(eventData, $(ev.currentTarget));
                },
                select: function (startDate, endDate) {
                    self.isSwipeEnabled = false;
                    // Clicking on the view, dispose any visible popover. Otherwise create a new event.
                    if (self.el.querySelector('.o_cw_popover')) {
                        self._unselectEvent();
                    } else {
                        var data = {start: startDate, end: endDate};
                        if (self.props.context.default_name) {
                            data.title = self.props.context.default_name;
                        }
                        self.trigger('openCreate', data);
                    }
                    self.$calendar.fullCalendar('unselect');
                },
                eventRender: function (event, element, view) {
                    self.isSwipeEnabled = false;
                    let render = self._eventRender(event);
                    var $render = $(render);
                    element.find('.fc-content').html($render.html());
                    element.addClass($render.attr('class'));
                    element.attr('data-event-id', event.id);

                    // Add background if doesn't exist
                    if (!element.find('.fc-bg').length) {
                        element.find('.fc-content').after($('<div/>', {class: 'fc-bg'}));
                    }

                    // For month view: Show background for all-day/multidate events only
                    if (view.name === 'month' && event.record) {
                        var start = event.r_start || event.start;
                        var end = event.r_end || event.end;
                        // Detect if the event occurs in just one day
                        // note: add & remove 1 min to avoid issues with 00:00
                        var isSameDayEvent = start.clone().add(1, 'minute').isSame(end.clone().subtract(1, 'minute'), 'day');
                        if (!event.record.allday && isSameDayEvent) {
                            element.addClass('o_cw_nobg');
                        }
                    }

                    // On double click, edit the event
                    element.on('dblclick', function () {
                        self.trigger('edit_event', {id: event.id});
                    });
                },
                eventAfterAllRender: function () {
                    self.isSwipeEnabled = true;
                },
                viewRender: function (view) {
                    // compute mode from view.name which is either 'month', 'agendaWeek' or 'agendaDay'
                    var mode = view.name === 'month' ? 'month' : (view.name === 'agendaWeek' ? 'week' : 'day');
                    self.trigger('viewUpdated', {
                        mode: mode,
                        title: view.title,
                    });
                },
                // Add/Remove a class on hover to style multiple days events.
                // The css ":hover" selector can't be used because these events
                // are rendered using multiple elements.
                eventMouseover: function (eventData) {
                    self.$calendar.find(`[data-event-id=${eventData.id}]`).addClass('o_cw_custom_hover');
                },
                eventMouseout: function (eventData) {
                    self.$calendar.find(`[data-event-id=${eventData.id}]`).removeClass('o_cw_custom_hover');
                },
                eventDragStart: function (eventData) {
                    self.$calendar.find(`[data-event-id=${eventData.id}]`).addClass('o_cw_custom_hover');
                    self._unselectEvent();
                },
                eventResizeStart: function (eventData) {
                    self.$calendar.find(`[data-event-id=${eventData.id}]`).addClass('o_cw_custom_hover');
                    self._unselectEvent();
                },
                eventLimitClick: function () {
                    self._unselectEvent();
                    return 'popover';
                },
                windowResize: function () {
                    self._render();
                },
                views: {
                    day: {
                        columnFormat: 'LL'
                    },
                    week: {
                        columnFormat: 'ddd D'
                    },
                    month: {
                        columnFormat: config.device.isMobile ? 'ddd' : 'dddd'
                    }
                },
                height: 'parent',
                unselectAuto: false,
                isRTL: _t.database.parameters.direction === "rtl",
                locale: locale, // reset locale when fullcalendar has already been instanciated before now
            });

            this.$calendar.fullCalendar(fcOptions);
        }
        /**
         * Initialize the mini calendar in the sidebar
         *
         * @private
         */
        _initCalendarMini() {
            var self = this;
            // TODO: MSH: this should be sub component we can initialize datepicker in mounted method of that component
            // TODO: MSH: Remove jQuery wrap here
            this.$small_calendar = $(this.el.querySelector(".o_calendar_mini"));
            this.$small_calendar.datepicker({
                'onSelect': function (datum, obj) {
                    self.trigger('changeDate', {
                        date: moment(new Date(+obj.currentYear, +obj.currentMonth, +obj.currentDay))
                    });
                },
                'showOtherMonths': true,
                'dayNamesMin': this.props.fc_options.dayNamesShort,
                'monthNames': this.props.fc_options.monthNamesShort,
                'firstDay': this.props.fc_options.firstDay,
            });
        }
        /**
         * Initialize the sidebar
         *
         * @private
         */
        _initSidebar() {
            // TODO: MSH: Remove jQuery wrap
            this.$sidebar = $(this.el.querySelector('.o_calendar_sidebar'));
            this.$sidebar_container = $(this.el.querySelector(".o_calendar_sidebar_container"));
            this._initCalendarMini();
        }
        /**
         * Finalise the popover
         *
         * @param {jQueryElement} $popoverElement
         * @param {web.CalendarPopover} calendarPopover
         * @private
         */
        _onPopoverShown($popoverElement, calendarPopover) {
            const $popover = $($popoverElement.data('bs.popover').tip);
            $popover.find('.o_cw_popover_close').on('click', this._unselectEvent.bind(this));
            // TODO: MSH: Remove jQuery wrap
            $popover.find('.o_cw_body').replaceWith($(calendarPopover.el));
        }
        /**
         * Render the calendar view, this is the main entry point.
         *
         * @override method from AbstractRenderer
         * @private
         * @returns {Promise}
         */
        _render() {
            // TODO: MSH: Convert to es6 syntax
            var $calendar = this.$calendar;
            var $fc_view = $calendar.find('.fc-view');
            var scrollPosition = $fc_view.scrollLeft();

            $fc_view.scrollLeft(0);
            $calendar.fullCalendar('unselect');

            if (scales[this.props.scale] !== $calendar.data('fullCalendar').getView().type) {
                $calendar.fullCalendar('changeView', scales[this.props.scale]);
            }

            if (this.target_date !== this.props.target_date.toString()) {
                $calendar.fullCalendar('gotoDate', moment(this.props.target_date));
                this.target_date = this.props.target_date.toString();
            }

            this.$small_calendar.datepicker("setDate", this.props.highlight_date.toDate())
                .find('.o_selected_range')
                .removeClass('o_color o_selected_range');
            var $a;
            switch (this.props.scale) {
                case 'month': $a = this.$small_calendar.find('td'); break;
                case 'week': $a = this.$small_calendar.find('tr:has(.ui-state-active)'); break;
                case 'day': $a = this.$small_calendar.find('a.ui-state-active'); break;
            }
            $a.addClass('o_selected_range');
            setTimeout(function () {
                $a.not('.ui-state-active').addClass('o_color');
            });

            $fc_view.scrollLeft(scrollPosition);

            this._unselectEvent();
            var filterProm = this._renderFilters();
            this._renderEvents();
            this.$calendar.prependTo($(this.el.querySelector('.o_calendar_view')));

            return Promise.all([filterProm]);
        }
        /**
         * Render all events
         *
         * @private
        */
        _renderEvents() {
            this.$calendar.fullCalendar('removeEvents');
            this.$calendar.fullCalendar('addEventSource', this.props.data);
        }
        /**
         * Render all filters
         *
         * @private
         * @returns {Promise} resolved when all filters have been rendered
         */
        _renderFilters() {
            // Dispose of filter popover
            $(this.el).find('.o_calendar_filter_item').popover('dispose');
            (this.filters || (this.filters = [])).forEach(filter => {
                filter.destroy();
            });
            if (this.props.fullWidth) {
                return;
            }
            return this._renderFiltersOneByOne();
        }
        /**
         * Renders each filter one by one, waiting for the first filter finished to
         * be rendered and appended to render the next one.
         * We need to do like this since render a filter is asynchronous, we don't
         * know which one will be appened at first and we want tp force them to be
         * rendered in order.
         *
         * @param {number} filterIndex if not set, 0 by default
         * @returns {Promise} resolved when all filters have been rendered
         */
        _renderFiltersOneByOne(filterIndex) {
            // TODO: MSH: Instead of doing stuff here, we can create separate component for SidebarFilters
            // iterate over filters in template and add condition like we add here and add SidebarFilter component in loop
            // put it inside sidebar element, code of then will moved in mounted method of SidebarFilter component
            // for this.filters, we can use t-ref and get the component and add into this.filters
            // need to check, as we are manually destroying filter in _renderFilter method
            filterIndex = filterIndex || 0;
            const arrFilters = _.toArray(this.props.filters);
            let prom;

            if (filterIndex < arrFilters.length) {
                var options = arrFilters[filterIndex];
                if (!options.filters.find((f) => { return f.display == null || f.display; })) {
                    return;
                }

                const self = this;
                options.getColor = this.getColor.bind(this);
                options.fields = this.props.fields;
                const filter = new SidebarFilterOwl(self, options);
                prom = filter.mount(this.$sidebar[0]).then(function () {
                    // Show filter popover
                    if (options.avatar_field) {
                        options.filters.forEach((filter) => {
                            if (filter.value !== 'all') {
                                const selector = `.o_calendar_filter_item[data-value=${filter.value}]`;
                                self.$sidebar.find(selector).popover({
                                    animation: false,
                                    trigger: 'hover',
                                    html: true,
                                    placement: 'top',
                                    title: filter.label,
                                    delay: {show: 300, hide: 0},
                                    content: function () {
                                        return $('<img>', {
                                            src: `/web/image/${options.avatar_model}/${filter.value}/${options.avatar_field}`,
                                            class: 'mx-auto',
                                        });
                                    },
                                });
                            }
                        });
                    }
                    return self._renderFiltersOneByOne(filterIndex + 1);
                });
                this.filters.push(filter);
            }
            return Promise.resolve(prom);
        }
        /**
         * Render event popover
         *
         * @private
         * @param {Object} eventData
         * @param {jQueryElement} $eventElement
         */
        _renderEventPopover(eventData, $eventElement) {
            const self = this;
            // Initialize popover widget
            const calendarPopover = new this.config.CalendarPopover(this, this._getPopoverContext(eventData));
            // TODO: MSH: Remove jQuery wrap
            calendarPopover.mount($('<div>')[0]).then(() => {
                $eventElement.popover(
                    this._getPopoverParams(eventData)
                ).on('shown.bs.popover', function () {
                    self._onPopoverShown($(this), calendarPopover);
                }).popover('show');
            });
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        /**
         * Remove highlight classes and dispose of popovers
         *
         * @private
        */
        _unselectEvent() {
            $(this.el).find('.fc-event').removeClass('o_cw_custom_highlight');
            $(this.el).find('.o_cw_popover').popover('dispose');
        }
        /**
         * @private
         * @param {OdooEvent} event
         */
        _onEditEvent(event) {
            this._unselectEvent();
            this.trigger('openEvent', {
                _id: event.detail.id,
                title: event.detail.title,
            });
        }
        /**
         * @private
         * @param {OdooEvent} event
         */
        _onDeleteEvent(event) {
            this._unselectEvent();
            this.trigger('deleteRecord', { id: event.detail.id});
        }
    }

    OwlCalendarRenderer.prototype.config = {
        CalendarPopover,
    };
    OwlCalendarRenderer.prototype.custom_events = Object.assign({}, AbstractRendererOwl.prototype.custom_events || {}, {
        edit_event: '_onEditEvent',
        delete_event: '_onDeleteEvent',
    });
    OwlCalendarRenderer.template = "web.OwlCalendarView";

    return OwlCalendarRenderer;

});
