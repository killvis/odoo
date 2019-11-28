odoo.define('mail.form_renderer', function (require) {
"use strict";

const ChatterManager = require('mail.component.ChatterManager');
const OwlMixin = require('mail.widget.OwlMixin');
const FormRenderer = require('web.FormRenderer');

/**
 * Include the FormRenderer to instanciate the chatter area containing (a
 * subset of) the mail widgets (mail_thread, mail_followers and mail_activity).
 */
FormRenderer.include({
    on_attach_callback: function () {
        if (this._chatterManager) {
            this._chatterManager.__callMounted();
        }
    },
    on_detach_callback: function () {
        if (this._chatterManager) {
            this._chatterManager.__callWillUnmount();
        }
    },

    /**
     * @override
     */
    init: function (parent, state, params) {
        this._super.apply(this, arguments);
        this.mailFields = params.mailFields;
        this._chatterManager = undefined;
        ChatterManager.env = OwlMixin.getEnv.call(this);
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
        if (this._chatterManager) {
            this._chatterManager.destroy();
            this._chatterManager = undefined;
        }
        this._super.apply(this, arguments);
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _createChatterManager: function(node) {
        const self = this;
        const $div = $('<div>');
        self.defs.push(self._mount($div).then(function(){
            const $el = $(self._chatterManager.el);
            $el.unwrap();
            self._handleAttributes($el, node);
        }));
        return $div;
    },

    /**
     * @private
     */
    async _mount($el) {
        const props = { id: this.state.res_id, model: this.state.model };
        if (this._chatterManager) {
            this._chatterManager.destroy();
            this._chatterManager = undefined;
        }
        if (props.id && props.model){
            this._chatterManager = new ChatterManager(null, props);
            await this._chatterManager.mount($el[0]);
        }
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
            const self = this;
            if (!self._chatterManager) {
                return self._createChatterManager(node);
            } else {
                return self._updateChatterManager();
            }
        } else {
            return this._super.apply(this, arguments);
        }
    },

    _updateChatterManager() {
        const self = this;
        // FIXME {xdu} needed to ensure the "willUpdateProps" method from chatter to be called
        // otherwise in some cases it is not called.
        // Example : contact list, then select contact A, back to contact list and select
        // contact B : without the setTimeout the chatter of contact A is shown instead of
        // B's. After investigation it happens that willUpdateProps is not called in that case.
        setTimeout(() => {
            self._chatterManager.state.id = self.state.res_id;
            self._chatterManager.state.model = self.state.model;
        });
        return $(self._chatterManager.el);
    },
});

});
