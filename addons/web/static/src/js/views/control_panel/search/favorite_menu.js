odoo.define('web.FavoriteMenu', function (require) {
    "use strict";

    const AddNewFavoriteMenu = require('web.AddNewFavoriteMenu');
    const Dialog = require('web.OwlDialog');
    const Domain = require('web.Domain');
    const DropdownMenu = require('web.DropdownMenu');
    const FilterMenuGenerator = require('web.FilterMenuGenerator');
    const { sprintf } = require('web.utils');

    const { useState } = owl;

    class FavoriteMenu extends DropdownMenu {
        constructor() {
            super(...arguments);

            this.title = this.env._t("Favorites");
            this.icon = 'fa fa-star';

            this.state = useState({
                deleteDialog: false,
                editDialog: false,
            });
            // this.style.mainButton.class = 'o_favorites_menu_button ' + this.style.mainButton.class;
        }

        //--------------------------------------------------------------------------
        // Getters
        //--------------------------------------------------------------------------

        /**
         * @override
         */
        get items() {
            return this.getters.getFiltersOfType('favorite');
        }

        //--------------------------------------------------------------------------
        // Handlers
        //--------------------------------------------------------------------------

        _editFavorite() {
            this.state.editDialog = false;
        }

        _removeFavorite() {
            this.dispatch('deleteFavorite', this.state.deleteDialog.favorite.id);
            this.state.deleteDialog = false;
        }

        _onCreateNewFilters(ev) {
            console.log({ filters: ev.detail });
        }

        _onDrag(item, ev) {
            if (!item.editable) {
                return;
            }
            console.log({ dragstart: ev });

            ev.target.style.opacity = 0.1;

            let initialPosition = ev.target.offsetTop + ev.target.offsetHeight / 2;
            let indexDiff = 0;
            const breakpoint = ev.target.offsetHeight;

            const onDrag = ev => {
                if (ev.pageX <= 0 || ev.pageY <= 0) {
                    return;
                }
                console.log({ dragging: ev });
                ev.preventDefault();
                const delta = ev.pageY - initialPosition;
                if (Math.abs(delta) > breakpoint) {
                    if (delta > 0) {
                        const next = ev.target.nextElementSibling;
                        if (next && next.classList.contains('o_dropdown_item')) {
                            indexDiff++;
                            ev.target.parentNode.insertBefore(next, ev.target);
                        }
                    } else {
                        const previous = ev.target.previousElementSibling;
                        if (previous && previous.classList.contains('o_dropdown_item')) {
                            indexDiff--;
                            ev.target.parentNode.insertBefore(ev.target, ev.target.previousElementSibling);
                        }
                    }
                    initialPosition = ev.target.offsetTop + ev.target.offsetHeight / 2;
                }
            };
            const onDragEnd = ev => {
                console.log({ dragend: ev });
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

        _onEditFavorite({ detail: favoriteId }) {
            const favorite = this.items.find(fav => fav.id === favoriteId);
            const title = sprintf(this.env._t("Edit filter"), favorite.description);
            const context = this.env.session.user_context;
            const domains = Domain.prototype.stringToArray(favorite.domain, context)
                .filter(condition => Array.isArray(condition));
            console.log({ domains });
            this.state.editDialog = { domains, favorite, title };
        }

        _onRemoveFavorite({ detail: favoriteId }) {
            const favorite = this.items.find(fav => fav.id === favoriteId);
            this.state.deleteDialog = { favorite };
        }
    }

    FavoriteMenu.components = Object.assign({}, DropdownMenu.components, {
        AddNewFavoriteMenu,
        Dialog,
        FilterMenuGenerator,
    });
    FavoriteMenu.props = {
        action: Object,
        viewType: String,
    };
    FavoriteMenu.template = 'FavoriteMenu';

    return FavoriteMenu;
});