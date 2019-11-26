odoo.define('mail.form_renderer', function (require) {
"use strict";

var Chatter = require('mail.Chatter');
var ChatterManager = require('mail.component.ChatterManager');
var OwlMixin = require('mail.widget.OwlMixin');
var FormRenderer = require('web.FormRenderer');

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
        this.chatter = undefined;
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
        if (this.chatter) {
            var chatterFields = ['message_attachment_count'].concat(_.values(this.mailFields));
            var updatedMailFields = _.intersection(fields, chatterFields);
            if (updatedMailFields.length) {
                this.chatter.update(state, updatedMailFields);
            }
        }
        return this._super.apply(this, arguments);
    },

    destroy: function () {
        if (this._chatterManager) {
            this._chatterManager.destroy();
            this._chatterManager = undefined;
        }
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

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
            if (this._chatterManager) {
                this._chatterManager.state.id = this.state.res_id;
                this._chatterManager.state.model = this.state.model;
                return $(this._chatterManager.el);
            }
            else {
                const self = this;
                const $div = $('<div>');
                this.defs.push(self._mount($div).then(function(){
                    const $el = $(self._chatterManager.el);
                    $el.unwrap();
                    self._handleAttributes($el, node);
                }));
                return $div;
            }
        } else {
            return this._super.apply(this, arguments);
        }
    }, });

});
