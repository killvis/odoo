odoo.define('web.AddNewFavoriteMenu', function (require) {
"use strict";

const SearchMenuItem = require('web.SearchMenuItem');
const { useFocusOnUpdate } = require('web.custom_hooks');

const { useDispatch, useRef, useState } = owl.hooks;

let favoriteId = 0;

class AddNewFavoriteMenu extends SearchMenuItem {

    /**
     * @param {Object} params
     * @param {Object} params.action
     * @param {Object} params.favorites
     */
    constructor() {
        super(...arguments);

        this.descriptionRef = useRef('description');
        this.dispatch = useDispatch(this.env.controlPanelStore);
        this.favId = favoriteId++;
        this.interactive = true;
        this.state = useState({
            description: this.props.action.name || "",
            isDefault: false,
            isShared: false,
            open: false,
        });

        const focusOnMounted = useFocusOnUpdate();
        focusOnMounted();
    }

    //--------------------------------------------------------------------------
    // Getters
    //--------------------------------------------------------------------------

    get useByDefaultId() {
        return `o_favorite_use_by_default_${this.favId}`;

    }

    get shareAllUsersId() {
        return `o_favorite_share_all_users_${this.favId}`;
    }

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    _doWarn(title, message) {
        this.env.bus.trigger('call_service', {
            data: {
                args: [{ title, message, type: 'danger' }],
                callback: _ => _,
                method: 'notify',
                service: 'notification',
            },
        });
    }

    /**
     * @private
     */
    _render() {
        if (this.state.open) {
            const $input = this.el.querySelector('.o_favorite_name input.o_input');
            $input.val(this.props.action.name);
            $input.focus();
        }
    }

    /**
     * @private
     */
    _saveFavorite() {
        if (!this.state.description.length) {
            this._doWarn(
                this.env._t("Error"),
                this.env._t("A name for your favorite is required.")
            );
            return this.descriptionRef.el.focus();
        }
        if (this.props.favorites.find(f => f.description === this.state.description)) {
            this._doWarn(
                this.env._t("Error"),
                this.env._t("Filter with same name already exists.")
            );
            return this.descriptionRef.el.focus();
        }
        this.dispatch('createNewFavorite', {
            type: 'favorite',
            description: this.state.description,
            isDefault: this.state.isDefault,
            isShared: this.state.isShared,
        });
        this.state.open = false;
    }

    /**
     * Hide and display the submenu which allows adding custom filters.
     *
     * @private
     */
    _toggleMenu() {
        this.state.open = !this.state.open;
        this.trigger('favorite_submenu_toggled');
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    /**
     * @private
     * @param {Event} ev change Event
     */
    _onCheckboxChange(ev) {
        const { checked, id } = ev.target;
        if (this.useByDefaultId === id) {
            this.state.isDefault = checked;
            if (checked) {
                this.state.isShared = false;
            }
        } else {
            this.state.isShared = checked;
            if (checked) {
                this.state.isDefault = false;
            }
        }
    }
    /**
     * @private
     * @param {Event} ev
     */
    _onInput(ev) {
        this.state.description = ev.target.value;
    }

    /**
     * @private
     * @param {jQueryEvent} ev
     */
    _onInputKeydown(ev) {
        switch (ev.key) {
            case 'Enter':
                ev.preventDefault();
                this._saveFavorite();
                break;
            case 'Escape':
                // Gives the focus back to the component.
                ev.preventDefault();
                ev.target.blur();
                break;
        }
    }
}

AddNewFavoriteMenu.template = 'AddNewFavoriteMenu';

return AddNewFavoriteMenu;
});
