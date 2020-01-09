odoo.define('mail.component.MailFailureNotification', function (require) {
'use strict';

const useStore = require('mail.hooks.useStore');

const { Component } = owl;
const { useDispatch, useGetters } = owl.hooks;

class MailFailureNotification extends Component {

    /**
     * @override
     * @param {...any} args
     */
    constructor(...args) {
        super(...args);
        this.storeDispatch = useDispatch();
        this.storeGetters = useGetters();
        this.storeProps = useStore((state, props) => {
            return {
                isMobile: state.isMobile,
                mailFailure: state.mailFailures[props.mailFailureLocalId],
            };
        });
    }
}

MailFailureNotification.props = {
    mailFailureLocalId: String,
};

MailFailureNotification.template = 'mail.component.MailFailureNotification';

return MailFailureNotification;

});
