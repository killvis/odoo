odoo.define('mass_mailing.editor', function (require) {
"use strict";

var ajax = require("web.ajax");
var core = require("web.core");
var rte = require('web_editor.rte');
var web_editor = require('web_editor.editor');
var options = require('web_editor.snippets.options');
var snippets_editor = require('web_editor.snippet.editor');

var $editable_area = $("#editable_area");
if ($editable_area.length === 0 || !$editable_area.is(".o_mail_area")) {
    return;
}

// Snippet option for resizing  image and column width inline like excel
options.registry["width-x"] = options.Class.extend({
    start: function () {
        this.container_width = 600;
        var parent = this.$target.closest('[data-max-width]');
        if (parent.length) {
            this.container_width = parseInt(parent.attr('data-max-width'));
        }
        var self = this;
        var offset, sib_offset, target_width, sib_width;
        this.is_image = false;
        this._super();

        this.$overlay.find(".oe_handle.e, .oe_handle.w").removeClass("readonly");
        if (this.$target.is('img')) {
            this.$overlay.find(".oe_handle.w").addClass("readonly");
            this.$overlay.find(".oe_snippet_remove, .oe_snippet_move, .oe_snippet_clone").addClass("hidden");
            this.is_image=true;
        }

        this.$overlay.find(".oe_handle").on('mousedown', function (event) {
            event.preventDefault();
            var $handle = $(this);
            var compass = false;

            _.each(['n', 's', 'e', 'w' ], function(handler) {
                if ($handle.hasClass(handler)) { compass = handler; }
            });
            if (self.is_image) { compass = "image"; }
            self.buildingBlock.editor_busy = true;

            var $body = $(document.body);

            var body_mousemove = function (event) {
                event.preventDefault();
                offset = self.$target.offset().left;
                target_width = self.get_max_width(self.$target);
                if (compass === 'e' && self.$target.next().offset()) {
                    sib_width = self.get_max_width(self.$target.next());
                    sib_offset = self.$target.next().offset().left;
                    self.change_width(event, self.$target, target_width, offset ,'plus');
                    self.change_width(event, self.$target.next(), sib_width, sib_offset ,'minus');
                }
                if (compass === 'w' && self.$target.prev().offset()) {
                    sib_width = self.get_max_width(self.$target.prev());
                    sib_offset = self.$target.prev().offset().left;
                    self.change_width(event, self.$target, target_width, offset ,'minus');
                    self.change_width(event, self.$target.prev(), sib_width, sib_offset, 'plus');
                }
                if (compass === 'image') {
                    self.change_width(event, self.$target, target_width, offset ,'plus');
                }
            };
            var body_mouseup = function () {
                $body.unbind('mousemove', body_mousemove);
                $body.unbind('mouseup', body_mouseup);
                self.buildingBlock.editor_busy = false;
                self.$target.removeClass("resize_editor_busy");
            };
            $body.mousemove(body_mousemove);
            $body.mouseup(body_mouseup);
        });
    },
    change_width: function (event, target ,target_width, offset, type) {
        var self = this;
        var width;
        if (type === 'plus') {
            width = event.pageX-offset;
        } else {
            width = offset + target_width - event.pageX;
        }
        target.css("width", width + "px");
        self.buildingBlock.cover_target(self.$overlay, self.$target);
        return;
    },
    get_int_width: function ($el) {
        var el_width = $el.css('width');
        return parseInt(el_width);
    },
    get_max_width: function ($el) {
        var max_width = 0;
        var self = this;
        _.each($el.siblings(),function(sib){
            max_width +=  self.get_int_width($(sib));
        });
        return this.container_width - max_width;
    },
    on_clone: function ($clone) {
        var clone_index = $(this.$target).index();
        var $table = this.$target.parents('table[data-max-width]');
        if ($table.length === 1){
            _.each($table.find('tbody>tr'),function(row){
                var clone_selector = 'td:eq(' + clone_index + ')';
                var $col_to_clone = $(row).find(clone_selector);
                if ($col_to_clone.length !== 0){
                    $col_to_clone.after($col_to_clone.clone());
                }
            });
        }
        this._super($clone);
        this.buildingBlock.cover_target(this.$overlay, this.$target);
    },
    on_remove: function () {
        var remove_index = $(this.$target).index();
        var $table = this.$target.parents('table[data-max-width]');
        if ($table.length === 1){
            _.each($table.find('tbody>tr'),function(row){
                var remove_selector = 'td:eq(' + remove_index + ')';
                $(row).find(remove_selector).remove();
            });
        }
        this._super.apply(this, arguments);
        this.buildingBlock.cover_target(this.$overlay, this.$target);
    },
});

var fn_popover_update = $.summernote.eventHandler.modules.popover.update;
$.summernote.eventHandler.modules.popover.update = function ($popover, oStyle, isAirMode) {
    fn_popover_update.call(this, $popover, oStyle, isAirMode);
    $("span.o_table_handler, div.note-table").remove();
};

ajax.loadXML("/mass_mailing/static/src/xml/mass_mailing.xml", core.qweb);

snippets_editor.Class.include({
    _get_snippet_url: function () {
        var url = (typeof snippets_url !== "undefined" ? window["snippets_url"] : this._super.apply(this, arguments));
        return url;
    },
    compute_snippet_templates: function (html) {
        var ret = this._super.apply(this, arguments);

        var $themes = this.$("#email_designer_themes").children();
        if ($themes.length === 0) return ret;

        var $body = $(document.body);
        var $snippets = this.$(".oe_snippet");
        var all_classes = "";
        var themes_params = _.map($themes, function (theme) {
            var $theme = $(theme);
            var name = $theme.data("name");
            var classname = "o_" + name + "_theme";
            all_classes += " " + classname;
            return {
                name: name,
                className: classname || "",
                img: $theme.data("img") || "",
                template: $theme.html().trim(),
            };
        });
        $themes.parent().remove();

        var $dropdown = $(core.qweb.render("mass_mailing.theme_selector", {
            themes: themes_params
        }));

        var first_choice;
        check_if_must_force_theme_choice();

        $dropdown.on("mouseenter", "li > a", function (e) {
            e.preventDefault();
            var theme_params = themes_params[$(e.currentTarget).parent().index()];
            $body.removeClass(all_classes).addClass(theme_params.className);

            var $old_layout = $editable_area.find(".o_layout");
            var $new_layout = $("<div/>", {"class": "o_layout oe_structure " + theme_params.className});

            var $contents;
            if (first_choice || editable_area_is_empty($old_layout)) {
                $contents = theme_params.template;
            } else if ($old_layout.length) {
                $contents = ($old_layout.hasClass("oe_structure") ? $old_layout : $old_layout.find(".oe_structure").first()).contents();
            } else {
                $contents = $editable_area.contents();
            }

            $editable_area.empty().append($new_layout);
            $new_layout.append($contents);
            $old_layout.remove();
        });

        this.on("snippet_removed", this, function () {
            check_if_must_force_theme_choice();
        });

        $dropdown.insertAfter(this.$el.find("#snippets_menu"));

        return ret;

        function check_if_must_force_theme_choice() {
            first_choice = editable_area_is_empty();
            if (first_choice) {
                $body.addClass("o_force_mail_theme_choice");
                $dropdown.one("click", "li > a", function () {
                    $body.removeClass("o_force_mail_theme_choice");
                    first_choice = false;
                });
            }
        }

        function editable_area_is_empty($layout) {
            $layout = $layout || $editable_area.find(".o_layout");
            return ($editable_area.html().trim() === "" || ($layout.length > 0 && $layout.html().trim() === ""));
        }
    },
});

var odoo_top = window.top.odoo;
window.top.odoo[window["callback"]+"_updown"] = function (value, fields_values, field_name) {
    if (!window) {
        delete odoo_top[window["callback"]+"_updown"];
        return;
    }

    var $editable = $("#editable_area");
    var _val = $editable.prop("innerHTML");
    var editor_enable = $('body').hasClass('editor_enable');
    value = value || "";

    if(value !==_val) {
        if (editor_enable) {
            if (value !== fields_values[field_name]) {
                rte.history.recordUndo($editable);
            }
            snippets_editor.instance.make_active(false);
        }

        if (value.indexOf('on_change_model_and_list') === -1) {
            $editable.html(value);

            if (editor_enable) {
                if (value !== fields_values[field_name]) {
                    $editable.trigger("content_changed");
                }
            }
        }
    }

    if (fields_values.mailing_model && web_editor.editor_bar) {
        if (value.indexOf('on_change_model_and_list') !== -1) {
            odoo_top[window["callback"]+"_downup"](_val);
        }
    }
};

if ($editable_area.html().indexOf('on_change_model_and_list') !== -1) {
    $editable_area.empty();
}
});
