odoo.define('mail.form_renderer', function (require) {
"use strict";

var Chatter = require('mail.Chatter');
var OwlChatter = require('mail.component.Chatter');
var FormRenderer = require('web.FormRenderer');

/**
 * Include the FormRenderer to instanciate the chatter area containing (a
 * subset of) the mail widgets (mail_thread, mail_followers and mail_activity).
 */
FormRenderer.include({
    dependencies: ['owl'],
    on_attach_callback: function () {
        if (this.chatter_component) {
            this.chatter_component.__callMounted();
        }
    },
    on_detach_callback: function () {
        if (this.chatter_component) {
            this.chatter_component.__callWillUnmount();
        }
    },

    /**
     * @override
     */
    init: function (parent, state, params) {
        this._super.apply(this, arguments);
        this.mailFields = params.mailFields;
        this.chatter = undefined;
        this.chatter_component = undefined;
        OwlChatter.env = this.call('owl', 'getEnv');
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    /**
     * Updates the chatter area with the new state if its fields has changed
     *
     * @override
     */
    confirmChange: function (state, id, fields) {
        if (this.chatter) {
            var chatterFields = ['message_attachment_count'].concat(_.values(this.mailFields));
            var updatedMailFields = _.intersection(fields, chatterFields);
            if (updatedMailFields.length) {
                this.chatter.update(state, updatedMailFields);
            }
        }
        return this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    async _mount() {
        const props = { id: this.state.res_id, model: this.state.model };
        if (this.chatter_component) {
            this.chatter_component.destroy();
            this.chatter_component = undefined;
        }
        if (props.id && props.model){
            this.chatter_component = new OwlChatter(null, props);
            await this.chatter_component.mount(this.$el[0]);
        }
    },

    /**
     * Overrides the function that renders the nodes to return the chatter's $el
     * for the 'oe_chatter' div node.
     *
     * @override
     * @private
     */
    _renderNode: function (node) {
        if (node.tag === 'div' && node.attrs.class === 'oe_chatter') {
            return;
        } else {
            return this._super.apply(this, arguments);
        }
    },

    /**
     * @override
     * @private
     */
    async _renderView() {
        await this._super.apply(this, arguments);
        await this._mount();
    },
});

});
