odoo.define('mail.component.ChatterTopbar', function (require) {
'use strict';

const { Component } = owl;
const useStore = require('mail.hooks.useStore');

class ChatterTopbar extends Component {
    /**
     * @override
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.storeProps = useStore((state, props) => {
            const chatter = state.chatters[props.chatterLocalId];
            const thread = state.threads[chatter.threadLocalId];
            return {
                areAttachmentsLoaded: thread && thread.areAttachmentsLoaded,
                attachmentsAmount: thread && thread.attachmentLocalIds
                    ? thread.attachmentLocalIds.length
                    : 0,
                // TODO SEB this is currently always 0 (yes I know - XDU)
                followersAmount: 0,
            };
        });
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickAttachments(ev) {
        this.trigger('o-chatter-topbar-select-attachment');
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollow(ev) {
        this.trigger('o-chatter-topbar-follow');
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickFollowers(ev) {
        this.trigger('o-chatter-topbar-show-followers');
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickLogNote(ev) {
        this.trigger('o-chatter-topbar-log-note');
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickScheduleActivity(ev) {
        this.trigger('o-chatter-topbar-schedule-activity');
    }

    /**
     * @private
     * @param {MouseEvent} ev
     */
    _onClickSendMessage(ev) {
        this.trigger('o-chatter-topbar-send-message');
    }
}

ChatterTopbar.defaultProps = {
    isDisabled: false,
};

ChatterTopbar.props = {
    isComposerLog: Boolean,
    isComposerVisible: Boolean,
    isDisabled: Boolean,
    chatterLocalId: String,
};

ChatterTopbar.template = 'mail.component.ChatterTopbar';

return ChatterTopbar;

});
