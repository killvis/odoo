odoo.define('website_blog.s_latest_posts_editor', function (require) {
'use strict';

var sOptions = require('web_editor.snippets.options');
var wUtils = require('website.utils');

sOptions.registry.js_get_posts_selectBlog = sOptions.Class.extend({
    /**
     * @override
     */
    start: function () {
        var def = this._rpc({
            model: 'blog.blog',
            method: 'search_read',
            args: [wUtils.websiteDomain(this), ['name']],
        }).then(blogs => {
            var allBlogsEl = this.el.querySelector('[data-filter-by-blog-id="0"]');
            var menuEl = allBlogsEl.parentNode;
            for (const blog of blogs) {
                let el = allBlogsEl.cloneNode();
                el.dataset.filterByBlogId = blog.id;
                el.textContent = blog.name;
                menuEl.appendChild(el);
            }
        });

        return Promise.all([this._super.apply(this, arguments), def]);
    },

    //--------------------------------------------------------------------------
    // Options
    //--------------------------------------------------------------------------

    /**
     * @see this.selectClass for parameters
     */
    filterByBlogId: function (previewMode, widgetValue, params) {
        const value = parseInt(widgetValue);
        this.$target.attr('data-filter-by-blog-id', value).data('filterByBlogId', value);
        this.trigger_up('widgets_start_request', {
            editableMode: true,
            $target: this.$target,
        });
    },

    //--------------------------------------------------------------------------
    // Private
    //--------------------------------------------------------------------------

    /**
     * @override
     */
    _setActive: function () {
        this._super.apply(this, arguments);

        var activeBlogId = this.$target.data('filterByBlogId') || 0;

        this.$el.find('[data-filter-by-blog-id]').removeClass('active');
        this.$el.find('[data-filter-by-blog-id=' + activeBlogId + ']').addClass('active');
    },
});
});
