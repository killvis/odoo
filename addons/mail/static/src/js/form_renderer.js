odoo.define('mail.form_renderer', function (require) {
"use strict";

const Chatter = require('mail.component.Chatter');
const OwlMixin = require('mail.widget.OwlMixin');
const FormRenderer = require('web.FormRenderer');
const { useDispatch } = owl.hooks;

/**
 * Include the FormRenderer to instanciate the chatter area containing (a
 * subset of) the mail widgets (mail_thread, mail_followers and mail_activity).
 */
FormRenderer.include({
    on_attach_callback: function () {
        if (this._chatter) {
            this._chatter.mount(this.$el[0]);
        }
    },
    on_detach_callback: function () {
        if (this._chatter) {
            this._chatter.unmount();
        }
    },

    /**
     * @override
     */
    init: function (parent, state, params) {
        this._super.apply(this, arguments);
        this.mailFields = params.mailFields;
        this._chatter = undefined;
        this._chatterLocalId = undefined;
        this._formHasChatter = false;
        this._oldState = {};

        // Owl stuffs
        const owlEnv = OwlMixin.getEnv.call(this);
        Chatter.env = owlEnv;
        this.storeDispatch = useDispatch(owlEnv.store);
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
        // FIXME adapt this ?
        // if (this.chatter) {
        //     const chatterFields = ['message_attachment_count'].concat(_.values(this.mailFields));
        //     const updatedMailFields = _.intersection(fields, chatterFields);
        //     if (updatedMailFields.length) {
        //         this.chatter.update(state, updatedMailFields);
        //     }
        // }
        return this._super.apply(this, arguments);
    },

    destroy: function () {
        if (this._chatter) {
            this._chatter.destroy();
            this._chatter = undefined;
        }
        this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    async _createChatter() {
        const { res_id, model } = this.state;
        // Generate chatter local id (+ fake thread or start loading real thread)
        const chatterLocalId = this.storeDispatch('initChatter', {
            id: this.state.res_id,
            model: this.state.model,
        });
        this._chatterLocalId = chatterLocalId;

        // Create chatter component and mount it
        this._chatter = new Chatter(null, { chatterLocalId });
        await this._chatter.mount(this.$el[0]);

        // Store current state as old state for further actions
        this._oldState = { res_id, model };

        // TODO self._handleAttributes($el, node); ??
    },

    async _deleteChatter() {
        this._chatter.destroy();
        this._chatter = undefined;
        this.storeDispatch('deleteChatter', this._chatterLocalId);
    },

    /**
     * Overrides the function that renders the nodes to return the chatter's $el
     * for the 'oe_chatter' div node.
     *
     * @override
     * @private
     */
    _renderNode(node) {
        if (node.tag === 'div' && node.attrs.class === 'oe_chatter') {
            this._formHasChatter = true;
            return null;
        } else {
            return this._super.apply(this, arguments);
        }
    },
    async _renderView() {
        await this._super(...arguments);
        if (this._formHasChatter) {
            if (this._chatter)
            {
                if (this._oldState.res_id !== this.state.res_id || this._oldState.model !== this.state.model)
                {
                    await this._deleteChatter();
                    await this._createChatter();
                }
            }
            else {
                await this._createChatter();
            }
        }
    }
});

});
