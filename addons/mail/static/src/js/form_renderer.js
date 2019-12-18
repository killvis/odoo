odoo.define('mail.form_renderer', function (require) {
"use strict";

const Chatter = require('mail.component.Chatter');
const FormRenderer = require('web.FormRenderer');
const messagingEnv = require('mail.messagingEnv');

/**
 * Include the FormRenderer to instanciate the chatter area containing (a
 * subset of) the mail widgets (mail_thread, mail_followers and mail_activity).
 */
FormRenderer.include({
    env: messagingEnv,
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
        window.messagingEnv = messagingEnv;
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    destroy: function () {
        this._deleteChatter();
        this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Private (overrides)
    //--------------------------------------------------------------------------

    /**
     * Overrides the function that renders the nodes to return the chatter's $el
     * for the 'oe_chatter' div node. We just set a boolean to keep track that
     * the form renderer needs a chatter.
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

    /**
     * Overrides the function to render the chatter once the form view is rendered.
     * @returns {Promise<void>}
     * @private
     */
    async _renderView() {
        await this._super(...arguments);
        if (this._formHasChatter) {
            Chatter.env = this.env;
            if (this._chatter)
            {
                if (this._oldState.res_id !== this.state.res_id || this._oldState.model !== this.state.model)
                {
                    await this._deleteChatter();
                    await this._createChatter();
                } else {
                    this._chatter.unmount();
                    await this.env.store.dispatch('updateChatter', this._chatterLocalId);
                    await this._mountChatter();
                }
            }  else {
                await this._createChatter();
            }
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * Create the chatter
     * @returns {Promise<void>}
     * @private
     */
    async _createChatter() {
        // Generate chatter local id (+ fake thread or start loading real thread)
        const chatterLocalId = this.env.store.dispatch('initChatter', {
            id: this.state.res_id,
            model: this.state.model,
        });
        this._chatterLocalId = chatterLocalId;

        // Create chatter component and mount it
        this._chatter = new Chatter(null, { chatterLocalId });
        this._mountChatter();

        // TODO self._handleAttributes($el, node); ??
    },

    /**
     * Mount the chatter
     * @returns {Promise<void>}
     * @private
     */
    async _mountChatter() {
        const { res_id, model } = this.state;
        await this._chatter.mount(this.$el[0]);

        // Store current state as old state for further actions
        this._oldState = { res_id, model };
    },

    /**
     * Delete the chatter component
     * @returns {Promise<void>}
     * @private
     */
    async _deleteChatter() {
        if (this._chatter) {
            this._chatter.destroy();
            this._chatter = undefined;
        }
        this.env.store.dispatch('deleteChatter', this._chatterLocalId);
    },

});

});
