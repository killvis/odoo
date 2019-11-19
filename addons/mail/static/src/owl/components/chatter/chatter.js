odoo.define('mail.component.Chatter', function (require) {
'use strict';

const AttachmentBox = require('mail.component.AttachmentBox');
const ChatterTopbar = require('mail.component.ChatterTopbar');
const Composer = require('mail.component.Composer');
const Thread = require('mail.component.Thread');
const useStore = require('mail.hooks.useStore');

const { Component, useState } = owl;
const { useDispatch, useGetters, useRef } = owl.hooks;

class Chatter extends Component {
    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.state = useState({
            composerIsLog: null,
            isAttachmentBoxVisible: false,
            isComposerVisible: false,
        });
        this.storeDispatch = useDispatch();
        this.storeGetters = useGetters();
        this.storeProps = useStore((state, props) => {
            const thread = this.storeGetters.thread({
                _model: props.model,
                id: props.id,
            });
            return {
                composerLocalId: thread ? thread.composerLocalId : undefined,
                threadLocalId: thread ? thread.localId : undefined,
            };
        });
        this._threadRef = useRef('thread');
    }

    async willStart() {
        await this.storeDispatch('initChatter', {
            model: this.props.model,
            id: this.props.id,
        });
    }

    mounted(){
        this.storeDispatch('initChatter', {
            model: this.props.model,
            id: this.props.id,
        });
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @private
     */
    _showComposer() {
        if (!this.state.isComposerVisible) {
            this.state.isComposerVisible = true;
        }
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    _onComposerMessagePosted(){
        this.storeDispatch('loadNewMessagesOnThread', this.storeProps.threadLocalId);
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onTopbarSelectAttachment(ev) {
        this.state.isAttachmentBoxVisible = !this.state.isAttachmentBoxVisible;
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onTopbarLogNote(ev) {
        this.state.composerIsLog = true;
        this._showComposer();
    }

    /**
     * @private
     * @param {Event} ev
     */
    _onTopbarSendMessage(ev) {
        this.state.composerIsLog = false;
        this._showComposer();
    }
}

Chatter.components = { AttachmentBox, ChatterTopbar, Composer, Thread };

Chatter.props = {
    id: Number,
    model: String,
};

Chatter.template = 'mail.component.Chatter';

return Chatter;

});
