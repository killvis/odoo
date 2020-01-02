odoo.define('mail.form_renderer', function (require) {
"use strict";

const Chatter = require('mail.component.Chatter');
const FormRenderer = require('web.FormRenderer');

/**
 * Include the FormRenderer to instanciate the chatter area containing (a
 * subset of) the mail widgets (mail_thread, mail_followers and mail_activity).
 */
FormRenderer.include({
    async on_attach_callback() {
        this._super(...arguments);
        // When the view is re-attached (_isInDom is true) and the chatter component already exists
        // the chatter component needs to be retargeted in the DOM by force mounting.
        if (this._chatterComponent && this._isInDom) {
            await this._forceMountChatterComponent();
        }
    },
    on_detach_callback() {
        this._super(...arguments);
        // When the view is detached, we totally delete chatter state from store and chatter
        // component to avoid any problem when view will be reattached
        if (this._chatterComponent) {
            this._deleteChatter();
        }
    },
    /**
     * @override
     */
    init(parent, state, params) {
        this._super(...arguments);
        this.env = this.call('messaging', 'getMessagingEnv');
        this.mailFields = params.mailFields;
        this._chatterComponent = undefined;
        this._chatterLocalId = undefined;
        /**
         * Determine if the form view has a chatter
         * (i.e. if a div .oe-chatter is detected in the arch)
         * @type {boolean}
         * @private
         */
        this._hasChatter = false;
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
    // Private
    //--------------------------------------------------------------------------
    /**
     * Create the chatter
     *
     * @private
     */
    async _createChatter() {
        // Generate chatter local id (+ fake thread or start loading real thread)
        const chatterLocalId = await this.env.store.dispatch('createChatter', {
            initialThreadId: this.state.res_id,
            initialThreadModel: this.state.model,
        });
        this._chatterLocalId = chatterLocalId;

        // Create chatter component and mount it
        this._chatterComponent = new Chatter(null, { chatterLocalId });
        await this._chatterComponent.mount(this.el); // options {position: 'self'} to replace {xdu}

        // TODO self._handleAttributes($el, node); ??
    },
    /**
     * Delete the chatter component
     *
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
     * Force mount the chatter
     *
     * FIXME {XDU} It's a hack : chatterComponent is in a fragment :
     * - no more in the DOM
     * - no more correctly connected to the store
     * We need to retarget it correctly in the DOM to fix that issue
     * The issue is that the component considers itself as mounted
     * but is no more added to the view as the super call to render view
     * re-rendered the view entirely and without this component.
     * @private
     */
    async _forceMountChatterComponent() {
        this._chatterComponent.__owl__.isMounted = false;
        await this._chatterComponent.mount(this.el);
    },
   /**
     * @override
     * @private
     */
    _renderNode(node) {
        if (node.tag === 'div' && node.attrs.class === 'oe_chatter') {
            // TODO {xdu} "store" the place where the oe_chatter is
            this._hasChatter = true;
            return null;
        } else {
            return this._super(...arguments);
        }
    },
    /**
     * Overrides the function to render the chatter once the form view is rendered.
     *
     * @override
     * @private
     */
    async _renderView() {
        await this._super(...arguments);
        if (this._hasChatter) {
            Chatter.env = this.env;
            if (!this._chatterComponent) {
                await this._createChatter();
            } else {
                if (this._isInDom) {
                    await this._forceMountChatterComponent();
                }
                await this.env.store.dispatch('updateChatter', this._chatterLocalId, {
                    threadId: this.state.res_id,
                    threadModel: this.state.model
                });
            }
        }
    },
});
});
