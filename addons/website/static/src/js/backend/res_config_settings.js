odoo.define('website.settings', function (require) {

const BaseSettingController = require('base.settings').Controller;
const core = require('web.core');
const Dialog = require('web.Dialog');
const FieldBoolean = require('web.basic_fields').FieldBoolean;
const fieldRegistry = require('web.field_registry');
const FormController = require('web.FormController');

const _t = core._t;

BaseSettingController.include({

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * Bypasses the discard confirmation dialog when going to a website because
     * the target website will be the one selected and when selecting a theme
     * because the theme will be installed on the selected website.
     *
     * Without this override, it is impossible to go to a website other than the
     * first because discarding will revert it back to the default value.
     *
     * Without this override, it is impossible to install a theme on a website
     * other than the first because discarding will revert it back to the
     * default value.
     *
     * @override
     */
    _onButtonClicked: function (ev) {
        if (ev.data.attrs.name === 'website_go_to'
                || ev.data.attrs.name === 'install_theme_on_current_website') {
            FormController.prototype._onButtonClicked.apply(this, arguments);
        } else {
            this._super.apply(this, arguments);
        }
    },
});

const WebsiteCookiesbarField = FieldBoolean.extend({
    _onChange: function () {
        const checked = this.$input[0].checked;
        if (!checked) {
            return this._setValue(checked);
        }

        let message = $('<main/>', {
            role: 'alert',
        }).html(
            $('<p/>').html(
                _t("<b>Cookie bars are bad for the experience</b> of your visitors. We believe you should not annoy your visitors with such a practice, unless you absolutly need it.")
            )
        ).append(_.str.sprintf(
            _t("For session cookies, authentification and analytics, <b>you do not need to ask for the consent</b>, provided that your analytics is anonymized, which should be the case if you use Google Analytics. (%s, adopted in June 2012)"),
            "<a target='_blank' href='https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2012/wp194_en.pdf'>cf wp194 of Art 29</a>"
        ));

        const cancelCallback = () => {
            return this.$input[0].checked = !checked;
        };
        Dialog.confirm(this, null, {
            title: _t("Please confirm"),
            $content: $('<main/>', {
                role: 'alert',
            }).html(message),
            buttons: [{
                text: 'Do not activate',
                classes: 'btn-primary',
                close: true,
                click: cancelCallback,
            },
            {
                text: 'Activate bad experience',
                close: true,
                click: () => {
                    return this._setValue(checked);
                },
            }],
            cancel_callback: cancelCallback,
        });
    },
});

fieldRegistry.add('website_cookiesbar_field', WebsiteCookiesbarField);
});
