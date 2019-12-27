odoo.define('web.Tooltip', function (require) {
    "use strict";

    const { Component } = owl;

    class Tooltip extends Component {

        constructor() {
            super(...arguments);
            this.__attached = false;
        }

        mounted() {
            if (!this.__attached && this.props.target) {
                this._attach();
            }
        }

        patched() {
            if (!this.__attached && this.props.target) {
                this._attach();
            }
        }

        _attach() {
            const target = this.props.target.getBoundingClientRect();
            const tooltip = this.el.getBoundingClientRect();
            const position = {};
            switch (this.props.position) {
                case 'left':
                    position.top = target.height / 2 - tooltip.height / 2;
                    position.left = tooltip.width;
                    break;
                case 'top':
                    position.top = tooltip.height;
                    position.left = target.width / 2 - tooltip.width / 2;
                    break;
                case 'right':
                    position.top = target.height / 2 - tooltip.height / 2;
                    position.left = target.width;
                    break;
                case 'bottom':
                default:
                    position.top = target.height;
                    position.left = target.width / 2 - tooltip.width / 2;
            }
            this.el.style = this._positionToString(position);
            this.__attached = true;
        }

        _positionToString(position) {
            const styles = [];
            for (const key in position) {
                styles.push(`${this._camelToKebab(key)}: ${position[key]}px;`);
            }
            return styles.join(' ');
        }

        _camelToKebab(string) {
            const finalString = [];
            for (const char of string) {
                if (char === char.toUpperCase()) {
                    finalString.push('-', char.toLowerCase());
                } else {
                    finalString.push(char);
                }
            }
            return finalString.join('');
        }
    }

    Tooltip.template = 'Tooltip';

    return Tooltip;
});
