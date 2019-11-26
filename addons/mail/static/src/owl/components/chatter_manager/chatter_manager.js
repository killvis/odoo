odoo.define('mail.component.ChatterManager', function (require) {
'use strict';

const Chatter = require('mail.component.Chatter');

const { Component, useState } = owl;
const { xml } = owl.tags;

class ChatterManager extends Component {
    /**
     * @override
     */
    constructor(...args) {
        super(...args);
        this.state = useState({
            model: this.props.model,
            id: this.props.id
        });
    }
}

ChatterManager.components = { Chatter };

ChatterManager.props = {
    id: Number,
    model: String,
};

ChatterManager.template = xml`<Chatter id="state.id" model="state.model"/>`;

return ChatterManager;

});
