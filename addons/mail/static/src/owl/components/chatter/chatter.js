odoo.define('mail.component.Chatter', function (require) {
'use strict';

const AttachmentBox = require('mail.component.AttachmentBox');
const ChatterTopbar = require('mail.component.ChatterTopbar');
const Composer = require('mail.component.Composer');
const Thread = require('mail.component.Thread');
const useStore = require('mail.hooks.useStore');

const { Component } = owl;
const { useDispatch, useGetters, useRef } = owl.hooks;

class Chatter extends Component {
    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.storeDispatch = useDispatch();
        this.storeGetters = useGetters();
        this.storeProps = useStore((state, { chatterLocalId }) => {
            const chatter = state.chatters[chatterLocalId];
            const thread = state.threads[chatter.threadLocalId];
            return { chatter, thread };
        });
        this._threadRef = useRef('thread');
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    _onComposerMessagePosted() {
        this.storeDispatch('hideChatterComposer', this.props.chatterLocalId);
    }
}

Chatter.components = { AttachmentBox, ChatterTopbar, Composer, Thread };

Chatter.props = {
    chatterLocalId: String,
};

Chatter.template = 'mail.component.Chatter';

return Chatter;

});
