odoo.define('account.ShowAccrualRenderer', function (require) {
"use strict";

const { Component } = owl;
const { useState } = owl.hooks;
const OwlAbstractRenderer = require('web.AbstractRendererOwl');

class AccruedMoveLine extends Component { }
AccruedMoveLine.template = 'account.AccruedMoveLineWidget';
AccruedMoveLine.props = ["move_line"];

class AccruedMove extends Component { }
AccruedMove.template = 'account.AccruedMoveWidget';
AccruedMove.components = { AccruedMoveLine}
AccruedMove.props = ["move"];


class ShowAccrualRenderer extends OwlAbstractRenderer {
    constructor(...args) {
        super(...args);
        this.props = useState({
            move_data: [],
            discarded_number: 0,
        });
    }
    updateProps(props) {
        Object.assign(this.props, _.pick(JSON.parse(props), 'move_data', 'discarded_number'));
    }
}
ShowAccrualRenderer.template = 'account.AccrualRenderer';
ShowAccrualRenderer.components = { AccruedMove }

require('web.field_registry_owl').add('account_accrual_widget', ShowAccrualRenderer);
return ShowAccrualRenderer;
});
