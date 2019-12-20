odoo.define('mail.form_renderer', function (require) {
"use strict";

const Chatter = require('mail.component.Chatter');
const FormRenderer = require('web.FormRenderer');

/**
 * Include the FormRenderer to instanciate the chatter area containing (a
 * subset of) the mail widgets (mail_thread, mail_followers and mail_activity).
 */
FormRenderer.include({
    on_attach_callback() {
        this._super(...arguments);
        if (this._chatterComponent) {
            this._chatterComponent.mount(this.el);
        }
    },
    on_detach_callback() {
        this._super(...arguments);
        if (this._chatterComponent) {
            this._chatterComponent.unmount();
        }
    },

    /**
     * @override
     */
    init(parent, state, params) {
        this._super(...arguments);
        this.mailFields = params.mailFields;
        this._chatterComponent = undefined;
        this._chatterLocalId = undefined;
        this._hasChatter = false;
        this._prevRenderedThreadData = {};
    },

    start() {
        this.env = this.call('messaging', 'getMessagingEnv');
        return this._super(...arguments);
    },

    //--------------------------------------------------------------------------
    // Public
    //--------------------------------------------------------------------------

    destroy() {
        this._super(...arguments);
        if (this._hasChatter) {
            this._deleteChatter();
        }
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
            this._hasChatter = true;
            return null;
        } else {
            return this._super(...arguments);
        }
    },

    /**
     * Overrides the function to render the chatter once the form view is rendered.
     * @returns {Promise<void>}
     * @private
     */
    async _renderView() {
        await this._super(...arguments);
        if (this._hasChatter) {
            Chatter.env = this.env;
            if (this._chatterComponent)
            {
                if (this._prevRenderedThreadData.res_id !== this.state.res_id || this._prevRenderedThreadData.model !== this.state.model)
                {
                    await this._deleteChatter();
                    await this._createChatter();
                } else {
                    this._chatterComponent.unmount();
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
        this._chatterComponent = new Chatter(null, { chatterLocalId });
        this._mountChatter();

        // TODO self._handleAttributes($el, node); ??
    },

    /**
     * Delete the chatter component
     * @returns {Promise<void>}
     * @private
     */
    _deleteChatter() {
        if (this._chatterComponent) {
            this._chatterComponent.destroy();
            this._chatterComponent = undefined;
        }
        this.env.store.dispatch('deleteChatter', this._chatterLocalId);
    },

    /**
     * Mount the chatter
     * @returns {Promise<void>}
     * @private
     */
    async _mountChatter() {
        const { res_id, model } = this.state;
        await this._chatterComponent.mount(this.$el[0]);

        // Store current state as old state for further actions
        this._prevRenderedThreadData = { res_id, model };
    },
});
});
