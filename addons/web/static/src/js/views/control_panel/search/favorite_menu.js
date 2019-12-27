odoo.define('web.FavoriteMenu', function (require) {
"use strict";

const AddNewFavoriteMenu = require('web.AddNewFavoriteMenu');
const Dialog = require('web.OwlDialog');
const SearchMenu = require('web.SearchMenu');

const { useState } = owl;

class FavoriteMenu extends SearchMenu {
    // custom_events: _.extend({}, DropdownMenu.prototype.custom_events, {
    //     favorite_submenu_toggled: '_onSubMenuToggled',
    // }),

    /**
     * @param {Object} action
     */
    constructor() {
        super(...arguments);
        this.category = 'favorite';
        this.title = this.env._t("Favorites");
        this.icon = 'fa fa-star';

        this.state = useState({ deleteDialog: false });
        // this.style.mainButton.class = 'o_favorites_menu_button ' + this.style.mainButton.class;
    }

    //--------------------------------------------------------------------------
    // Handlers
    //--------------------------------------------------------------------------

    _onDrag(item, ev) {
        if (!item.editable) {
            return;
        }

        ev.target.style.opacity = 0.1;

        let initialPosition = ev.target.offsetTop + ev.target.offsetHeight / 2;
        let indexDiff = 0;
        const breakpoint = ev.target.offsetHeight;

        const onDrag = ev => {
            if (ev.pageX <= 0 || ev.pageY <= 0) {
                return;
            }
            ev.preventDefault();
            const delta = ev.pageY - initialPosition;
            if (Math.abs(delta) > breakpoint) {
                if (delta > 0) {
                    const next = ev.target.nextElementSibling;
                    if (next && next.classList.contains('o_search_menu_item')) {
                        indexDiff++;
                        ev.target.parentNode.insertBefore(next, ev.target);
                    }
                } else {
                    const previous = ev.target.previousElementSibling;
                    if (previous && previous.classList.contains('o_search_menu_item')) {
                        indexDiff--;
                        ev.target.parentNode.insertBefore(ev.target, ev.target.previousElementSibling);
                    }
                }
                initialPosition = ev.target.offsetTop + ev.target.offsetHeight / 2;
            }
        };
        const onDragEnd = ev => {
            ev.target.style.opacity = 1;
            if (indexDiff) {
                this.env.store.dispatch('resequenceFavorite', item, indexDiff);
            }
            window.removeEventListener('drag', onDrag, true);
            window.removeEventListener('dragend', onDragEnd, true);
        };

        window.addEventListener('drag', onDrag, true);
        window.addEventListener('dragend', onDragEnd, true);
    }

    _onRemoveFavorite({ detail: favoriteId }) {
        const favorite = this.items.find(fav => fav.id === favoriteId);
        const title = favorite.userId ?
            this.env._t("Are you sure that you want to remove this filter?") :
            this.env._t("This filter is global and will be removed for everybody if you continue.");

        this.state.deleteDialog = { favorite, title };
    }

    _onEditFavorite({ detail: favoriteId }) {
        console.log('Edited', favoriteId);
    }
}

FavoriteMenu.components = Object.assign({}, SearchMenu.components, { AddNewFavoriteMenu, Dialog });
FavoriteMenu.template = 'FavoriteMenu';

return FavoriteMenu;
});