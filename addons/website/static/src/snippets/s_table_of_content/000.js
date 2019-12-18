odoo.define('website.s_table_of_content', function (require) {
'use strict';

const publicWidget = require('web.public.widget');

const TableOfContent = publicWidget.Widget.extend({
    selector: 'section.s_table_of_content',
    disabledInEditableMode: false,

    /**
     * @override
     */
    start: function () {
        var menuLoading = $('.o_menu_loading');
        if (!menuLoading.length) {
            this._initializeNavbarTopPosition();
        } else {
            $('header #top_menu').one('menu_loaded', () => this._initializeNavbarTopPosition());
        }
        return this._super.apply(this, arguments);
    },
    /**
     * @override
     */
    destroy: function () {
        this.$('.s_table_of_content_navbar').css('top', '');
        this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Initialize the top position of the snippet navbar according to the height
     * of the headers of the page.
     * @private
     */
    _initializeNavbarTopPosition: function () {
        var headerHeight = ($('#web_editor-top-edit').height() || 0)
                            + ($('header.o_header_affix').height() || 0)
                            + ($('nav.o_main_navbar:not(.o_hidden)').height() || 0) + 32;
        this.$('.s_table_of_content_navbar').css('top', headerHeight);
        $('body').scrollspy({target: '.s_table_of_content_navbar', offset: headerHeight});
    },
});

publicWidget.registry.snippetTableOfContent = TableOfContent;

return TableOfContent;
});
