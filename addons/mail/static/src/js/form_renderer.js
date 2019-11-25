odoo.define('mail.form_renderer', function (require) {
"use strict";

var Chatter = require('mail.Chatter');
var OwlChatter = require('mail.component.Chatter');
var OwlMixin = require('mail.widget.OwlMixin');
var FormRenderer = require('web.FormRenderer');

/**
 * Include the FormRenderer to instanciate the chatter area containing (a
 * subset of) the mail widgets (mail_thread, mail_followers and mail_activity).
 */
FormRenderer.include({
    on_attach_callback: function () {
        if (this._chatterComponent) {
            this._chatterComponent.__callMounted();
        }
    },
    on_detach_callback: function () {
        if (this._chatterComponent) {
            this._chatterComponent.__callWillUnmount();
        }
    },

    /**
     * @override
     */
    init: function (parent, state, params) {
        this._super.apply(this, arguments);
        this.mailFields = params.mailFields;
        this.chatter = undefined;
        this._chatterComponent = undefined;
        OwlChatter.env = OwlMixin.getEnv.call(this);
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
        if (this._chatterComponent) {
            this._chatterComponent.destroy();
            this._chatterComponent = undefined;
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
        if (this._chatterComponent) {
            this._chatterComponent.destroy();
            this._chatterComponent = undefined;
        }
        if (props.id && props.model){
            this._chatterComponent = new OwlChatter(null, props);
            await this._chatterComponent.mount($el[0]);
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
            // FIXME {xdu}
            // if (this._chatterComponent) {
            //     this._chatterComponent.update();
            // }
            const self = this;
            const $div = $('<div>');
            this.defs.push(self._mount($div).then(function(){
                const $el = $(self._chatterComponent.el);
                $el.unwrap();
                self._handleAttributes($el, node);
            }));
            return $div;
        } else {
            return this._super.apply(this, arguments);
        }
    }, });

});
