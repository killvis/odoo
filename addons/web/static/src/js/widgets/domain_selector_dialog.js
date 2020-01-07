odoo.define("web.DomainSelectorDialog", function (require) {
"use strict";

const Dialog = require("web.OwlDialog");
const DomainSelector = require("web.DomainSelector");

/**
 * @class DomainSelectorDialog
 */
class DomainSelectorDialog extends Dialog {
    constructor() {
        super(...arguments);

        this.domainSelectorRef = useRef('domain-selector');
    }

    mounted() {
        // this restores default modal height (bootstrap) and allows field selector to overflow
        this.el.dialogRef.style.overflow = 'visible';
        this.el.dialogRef.closest('.modal-dialog').style.height = 'auto';

        const footer = this.footerRef.el;
        for (const button of this.buttons) {
            const buttEl = Object.assign(document.createElement('button'), {
                className: ['btn'].concat(button.classes).join(' '),
                onclick: ev => {
                    this.trigger('dialog_closed');
                    if (button.click) {
                        button.click(ev);
                    }
                },
                innerText: button.text,
            });
            buttEl.appendChild(footer);
        }
    }

    get buttons() {
        const buttons = [];
        if (this.props.readonly) {
            buttons.push({
                text: this.env._t("Close"),
            });
        } else {
            buttons.push(
                {
                    text: this.env._t("Save"),
                    classes: "btn-primary",
                    click: ev => {
                        this.trigger('domain_selected', {
                            domain: this.domainSelectorRef.getDomain(),
                        });
                    }
                },
                {
                    text: this.env._t("Discard"), close: true
                },
            );
        }
        return buttons;
    }
}

DomainSelectorDialog.components = Object.assign({}, Dialog.components, {
    DomainSelector,
});
DomainSelectorDialog.defaultProps = Object.assign({}, Dialog.defaultProps, {
    title: "Domain",
    readonly: true,
    debugMode: false,
});
DomainSelectorDialog.props = Object.assign({}, Dialog.props, {
    model: String,
    domain: String,
    readonly: Boolean,
    debugMode: Boolean,
});
DomainSelectorDialog.template = 'DomainSelectorDialog';

});
