odoo.define('website.s_rating_options', function (require) {
'use strict';

const weWidgets = require('wysiwyg.widgets');
const options = require('web_editor.snippets.options');

options.registry.Rating = options.Class.extend({
    /**
     * @override
     */
    start: function () {
        this.iconType = this.$target[0].dataset.icon;
        this.nbActiveIcons = this.$target.find('.s_rating_active_icons > i').length;
        this.nbTotalIcons = this.$target.find('.s_rating_icons i').length;
        this.faClassActiveCustomIcons = this.$target[0].dataset.activeCustomIcon || '';
        this.faClassInactiveCustomIcons = this.$target[0].dataset.inactiveCustomIcon || '';
        return this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Options
    //--------------------------------------------------------------------------

    /**
     * Display the selected icon type.
     *
     * @see this.selectClass for parameters
     */
    setIcons: function (previewMode, widgetValue, params) {
        this.iconType = widgetValue;
        this._renderIcons();
        this.$target[0].dataset.icon = widgetValue;
        delete this.$target[0].dataset.activeCustomIcon;
        delete this.$target[0].dataset.inactiveCustomIcon;
    },
    /**
     * Allows to select a font awesome icon with media dialog.
     *
     * @see this.selectClass for parameters
     */
    customIcon: async function (previewMode, widgetValue, params) {
        return new Promise(resolve => {
            const dialog = new weWidgets.MediaDialog(
                this,
                {noImages: true, noDocuments: true, noVideos: true, mediaWidth: 1920},
                $('<i/>')
            );
            this._saving = false;
            dialog.on('save', this, function (attachments) {
                this._saving = true;
                const customClass = 'fa fa-fw ' + attachments.className;
                const $activeIcons = this.$target.find('.s_rating_active_icons > i');
                const $inactiveIcons = this.$target.find('.s_rating_inactive_icons > i');
                const $icons = params.customActiveIcon === 'true' ? $activeIcons : $inactiveIcons;
                $icons.removeClass().addClass(customClass);
                this.faClassActiveCustomIcons = $activeIcons.length > 0 ? $activeIcons.attr('class') : customClass;
                this.faClassInactiveCustomIcons = $inactiveIcons.length > 0 ? $inactiveIcons.attr('class') : customClass;
                this.$target[0].dataset.activeCustomIcon = this.faClassActiveCustomIcons;
                this.$target[0].dataset.inactiveCustomIcon = this.faClassInactiveCustomIcons;
                this.$target[0].dataset.icon = 'custom';
                this.iconType = 'custom';
                resolve();
            });
            dialog.on('closed', this, function () {
                if (!this._saving) {
                    resolve();
                }
            });
            dialog.open();
        });
    },
    /**
     * Set the number of active icons.
     *
     * @see this.selectClass for parameters
     */
    activeIconsNumber: function (previewMode, widgetValue, params) {
        this.nbActiveIcons = parseInt(widgetValue);
        this._createIcons();
    },
    /**
     * Set the total number of icons.
     *
     * @see this.selectClass for parameters
     */
    totalIconsNumber: function (previewMode, widgetValue, params) {
        this.nbTotalIcons = parseInt(widgetValue);
        this._createIcons();
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * create the icons
     *
     * @private
     * 
     */
    _createIcons: function () {
        const $activeIcons = this.$target.find('.s_rating_active_icons');
        const $inactiveIcons = this.$target.find('.s_rating_inactive_icons');
        this.$target.find('.s_rating_icons i').remove();
        for (let i = 0; i < this.nbTotalIcons; i++) {
            if (i < this.nbActiveIcons) {
                $activeIcons.append('<i/> ');
            } else {
                $inactiveIcons.append('<i/> ');
            }
        }
        this._renderIcons();
    },
    /**
     * render icons with selected fonts
     *
     * @private
     * 
     */
    _renderIcons: function () {
        const icons = {
            'fa-star': 'fa-star-o',
            'fa-thumbs-up': 'fa-thumbs-o-up',
            'fa-circle': 'fa-circle-o',
            'fa-square': 'fa-square-o',
            'fa-heart': 'fa-heart-o'
        };
        const faClassActiveIcons = (this.iconType === "custom") ? this.faClassActiveCustomIcons : 'fa fa-fw ' + this.iconType;
        const faClassInactiveIcons = (this.iconType === "custom") ? this.faClassInactiveCustomIcons : 'fa fa-fw ' + icons[this.iconType];
        let $activeIcons = this.$target.find('.s_rating_active_icons > i');
        let $inactiveIcons = this.$target.find('.s_rating_inactive_icons > i');
        $activeIcons.removeClass().addClass(faClassActiveIcons);
        $inactiveIcons.removeClass().addClass(faClassInactiveIcons);
    },
    /**
     * @override
     */
    _computeWidgetState: function (methodName, params) {
        switch (methodName) {
            case 'setIcons': {
                return this.$target[0].dataset.icon;
            }
            case 'activeIconsNumber': {
                return this.$target.find('.s_rating_active_icons > i').length;
            }
            case 'totalIconsNumber': {
                return this.$target.find('.s_rating_icons i').length;
            }
        }
        return this._super(...arguments);
    },
});
});
