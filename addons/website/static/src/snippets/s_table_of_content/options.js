odoo.define('website.s_table_of_content_options', function (require) {
'use strict';

var options = require('web_editor.snippets.options');

options.registry.TableOfContent = options.Class.extend({
    /**
     * @override
     */
    start: function () {
        this.IsAnimateScrolling = this.$target.find('h1, h2')[0].dataset.anchor === 'true' ? 'true' : '0';
        this.$target.on('content_changed', () => this._generateNav());
        return this._super(...arguments);
    },
    /**
     * @override
     */
    cleanForSave: function () {
        this._generateNav();
    },

    //--------------------------------------------------------------------------
    // Options
    //--------------------------------------------------------------------------

    /**
     * Animate (or not) scrolling.
     *
     * @see this.selectClass for parameters
     */
    animateScrolling: function (previewMode, widgetValue, params) {
        var $headings = this.$target.find('h1, h2');
        if (widgetValue) {
            _.each($headings, el => el.dataset.anchor = 'true');
            this.IsAnimateScrolling = 'true';
        } else {
            _.each($headings, el => el.dataset.anchor = '0');
            this.IsAnimateScrolling = '0';
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _generateNav: function () {
        let activeClass = " active";
        let $nav = this.$target.find('.s_table_of_content_navbar');
        const $headings = this.$target.find('h1, h2');
        $nav.empty();
        _.each($headings, el => {
            const $el = $(el);
            const id = _.uniqueId('table_of_content_heading_');
            $('<a>').attr('href', "#" + id)
                    .addClass('list-group-item list-group-item-action py-2 border-0 rounded-0' + activeClass)
                    .text($el.text())
                    .appendTo($nav);
            $($el).attr('id', id);
            activeClass = "";
            $el[0].dataset.anchor = this.IsAnimateScrolling === 'true' ? 'true' : '0';
        });
    },

    /**
     * @override
     */
    _computeWidgetState: function (methodName, params) {
        if (methodName === 'animateScrolling') {
            const $headings = this.$target.find('h1, h2');
            if ($headings.length > 0) {
                return $headings[0].dataset.anchor === 'true' ? 'true' : '0';
            } else {
                return 'true';
            }
            
        }
        return this._super(...arguments);
    },
});

options.registry.TableOfContentNavbar = options.Class.extend({
    /**
     * @override
     */
    start: function () {
        var leftPanelEl = this.$overlay.data('$optionsSection')[0];
        leftPanelEl.querySelector('.oe_snippet_remove').classList.add('d-none'); // TODO improve the way to do that
        leftPanelEl.querySelector('.oe_snippet_clone').classList.add('d-none'); // TODO improve the way to do that
        return this._super.apply(this, arguments);
    },
});

options.registry.TableOfContentMain = options.Class.extend({
    /**
     * @override
     */
    start: function () {
        var leftPanelEl = this.$overlay.data('$optionsSection')[0];
        leftPanelEl.querySelector('.oe_snippet_remove').classList.add('d-none'); // TODO improve the way to do that
        leftPanelEl.querySelector('.oe_snippet_clone').classList.add('d-none'); // TODO improve the way to do that
        return this._super.apply(this, arguments);
    },
});
});
