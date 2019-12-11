odoo.define('website_slides.slide.archive', function (require) {
'use strict';

var publicWidget = require('web.public.widget');
var Dialog = require('web.Dialog');
var core = require('web.core');
var _t = core._t;

var SlideDialog = Dialog.extend({
    template: 'slides.slide.archive',

    /**
     * @override
     */
    init: function (parent, options) {
        this.archive_category = options.archive_category || false;
        options = _.defaults(options || {}, {
            title:  this.archive_category ? _t('Archive Category') : _t('Archive Slide'),
            size: 'medium',
            buttons: [{
                text: _t('Archive'),
                classes: 'btn-primary',
                click: this._onClickSlide.bind(this)
            }, {
                text: _t('Cancel'),
                close: true
            }]
        });

        this.$slideTarget = options.slideTarget;
        this.slideId = this.$slideTarget.data('slideId');
        this._super(parent, options);
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Calls 'archive' or 'unlink' on slide controller and then visually removes the slide dom element
     */
    _onClickSlide: function () {
        const route = this.archive_category ? '/slides/category/archive': '/slides/slide/archive';
        const self = this;
        this._rpc({
            route: route,
            params: {
                slide_id: this.slideId
            }
        }).then(function () {
            if (self.archive_category) {
                window.location.reload();
            }
            self.$slideTarget.closest('.o_wslides_slides_list_slide').remove();
            self.close();
        });
    }
});

publicWidget.registry.websiteSlidesSlideArchive = publicWidget.Widget.extend({
    selector: '.o_wslides_js_slide_archive',
    xmlDependencies: ['/website_slides/static/src/xml/slide_management.xml'],
    events: {
        'click': '_onArchiveSlideClick',
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _openDialog: function ($slideTarget) {
        new SlideDialog(this, {slideTarget: $slideTarget}).open();
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Event} ev
     */
    _onArchiveSlideClick: function (ev) {
        ev.preventDefault();
        var $slideTarget = $(ev.currentTarget);
        this._openDialog($slideTarget);
    },
});

publicWidget.registry.websiteSlidesCategoryArchive = publicWidget.Widget.extend({
    selector: '.o_wslides_js_slide_unlink',
    xmlDependencies: ['/website_slides/static/src/xml/slide_management.xml'],
    events: {
        'click': '_onUnlinkSlideClick',
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _openDialog: function ($slideTarget) {
        new SlideDialog(this, {slideTarget: $slideTarget, archive_category: true}).open();
    },

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Event} ev
     */
    _onUnlinkSlideClick: function (ev) {
        ev.preventDefault();
        var $slideTarget = $(ev.currentTarget);
        this._openDialog($slideTarget);
    },
});

return {
    slideDialog: SlideDialog,
    websiteSlidesSlideArchive: publicWidget.registry.websiteSlidesSlideArchive,
    websiteSlidesCategoryArchive: publicWidget.registry.websiteSlidesCategoryArchive
};

});
