odoo.define('web.widget_tests', function (require) {
"use strict";

var AjaxService = require('web.AjaxService');
var concurrency = require('web.concurrency');
var core = require('web.core');
var QWeb = require('web.QWeb');
var Widget = require('web.Widget');
var testUtils = require('web.test_utils');

QUnit.module('core', {}, function () {

    QUnit.module('Widget');

    QUnit.test('proxy (String)', function (assert) {
        assert.expect(1);

        var W = Widget.extend({
            exec: function () {
                this.executed = true;
            }
        });
        var w = new W();
        var fn = w.proxy('exec');
        fn();
        assert.ok(w.executed, 'should execute the named method in the right context');
    });

    QUnit.test('proxy (String)(*args)', function (assert) {
        assert.expect(2);

        var W = Widget.extend({
            exec: function (arg) {
                this.executed = arg;
            }
        });
        var w = new W();
        var fn = w.proxy('exec');
        fn(42);
        assert.ok(w.executed, "should execute the named method in the right context");
        assert.strictEqual(w.executed, 42, "should be passed the proxy's arguments");
    });

    QUnit.test('proxy (String), include', function (assert) {
        assert.expect(1);

        // the proxy function should handle methods being changed on the class
        // and should always proxy "by name", to the most recent one
        var W = Widget.extend({
            exec: function () {
                this.executed = 1;
            }
        });
        var w = new W();
        var fn = w.proxy('exec');
        W.include({
            exec: function () { this.executed = 2; }
        });

        fn();
        assert.strictEqual(w.executed, 2, "should be lazily resolved");
    });

    QUnit.test('proxy (Function)', function (assert) {
        assert.expect(1);

        var w = new (Widget.extend({ }))();

        var fn = w.proxy(function () { this.executed = true; });
        fn();
        assert.ok(w.executed, "should set the function's context (like Function#bind)");
    });

    QUnit.test('proxy (Function)(*args)', function (assert) {
        assert.expect(1);

        var w = new (Widget.extend({ }))();

        var fn = w.proxy(function (arg) { this.executed = arg; });
        fn(42);
        assert.strictEqual(w.executed, 42, "should be passed the proxy's arguments");
    });



    QUnit.test('renderElement, no template, default', function (assert) {
        assert.expect(7);

        var widget = new (Widget.extend({ }))();

        assert.strictEqual(widget.$el, undefined, "should not have a root element");

        widget.renderElement();

        assert.ok(widget.$el, "should have generated a root element");
        assert.strictEqual(widget.$el, widget.$el, "should provide $el alias");
        assert.ok(widget.$el.is(widget.el), "should provide raw DOM alias");

        assert.strictEqual(widget.el.nodeName, 'DIV', "should have generated the default element");
        assert.strictEqual(widget.el.attributes.length, 0, "should not have generated any attribute");
        assert.ok(_.isEmpty(widget.$el.html(), "should not have generated any content"));
    });

    QUnit.test('no template, custom tag', function (assert) {
        assert.expect(1);


        var widget = new (Widget.extend({
            tagName: 'ul'
        }))();
        widget.renderElement();

        assert.strictEqual(widget.el.nodeName, 'UL', "should have generated the custom element tag");
    });

    QUnit.test('no template, @id', function (assert) {
        assert.expect(3);

        var widget = new (Widget.extend({
            id: 'foo'
        }))();
        widget.renderElement();

        assert.strictEqual(widget.el.attributes.length, 1, "should have one attribute");
        assert.hasAttrValue(widget.$el, 'id', 'foo', "should have generated the id attribute");
        assert.strictEqual(widget.el.id, 'foo', "should also be available via property");
    });

    QUnit.test('no template, @className', function (assert) {
        assert.expect(2);

        var widget = new (Widget.extend({
            className: 'oe_some_class'
        }))();
        widget.renderElement();

        assert.strictEqual(widget.el.className, 'oe_some_class', "should have the right property");
        assert.hasAttrValue(widget.$el, 'class', 'oe_some_class', "should have the right attribute");
    });

    QUnit.test('no template, bunch of attributes', function (assert) {
        assert.expect(9);

        var widget = new (Widget.extend({
            attributes: {
                'id': 'some_id',
                'class': 'some_class',
                'data-foo': 'data attribute',
                'clark': 'gable',
                'spoiler': // don't read the next line if you care about Harry Potter...
                        'snape kills dumbledore'
            }
        }))();
        widget.renderElement();

        assert.strictEqual(widget.el.attributes.length, 5, "should have all the specified attributes");

        assert.strictEqual(widget.el.id, 'some_id');
        assert.hasAttrValue(widget.$el, 'id', 'some_id');

        assert.strictEqual(widget.el.className, 'some_class');
        assert.hasAttrValue(widget.$el, 'class', 'some_class');

        assert.hasAttrValue(widget.$el, 'data-foo', 'data attribute');
        assert.strictEqual(widget.$el.data('foo'), 'data attribute');

        assert.hasAttrValue(widget.$el, 'clark', 'gable');
        assert.hasAttrValue(widget.$el, 'spoiler', 'snape kills dumbledore');
    });

    QUnit.test('template', function (assert) {
        assert.expect(3);

        core.qweb.add_template(
            '<no>' +
                '<t t-name="test.widget.template">' +
                    '<ol>' +
                        '<li t-foreach="5" t-as="counter" ' +
                            't-attf-class="class-#{counter}">' +
                            '<input/>' +
                            '<t t-esc="counter"/>' +
                        '</li>' +
                    '</ol>' +
                '</t>' +
            '</no>'
        );

        var widget = new (Widget.extend({
            template: 'test.widget.template'
        }))();
        widget.renderElement();

        assert.strictEqual(widget.el.nodeName, 'OL');
        assert.strictEqual(widget.$el.children().length, 5);
        assert.strictEqual(widget.el.textContent, '01234');
    });

    QUnit.test('repeated', async function (assert) {
        assert.expect(4);
        var $fix = $( "#qunit-fixture");

        core.qweb.add_template(
            '<no>' +
                '<t t-name="test.widget.template">' +
                    '<p><t t-esc="widget.value"/></p>' +
                '</t>' +
            '</no>'
        );
        var widget = new (Widget.extend({
            template: 'test.widget.template'
        }))();
        widget.value = 42;

        await widget.appendTo($fix)
            .then(function () {
                assert.strictEqual($fix.find('p').text(), '42', "DOM fixture should contain initial value");
                assert.strictEqual(widget.$el.text(), '42', "should set initial value");
                widget.value = 36;
                widget.renderElement();
                assert.strictEqual($fix.find('p').text(), '36', "DOM fixture should use new value");
                assert.strictEqual(widget.$el.text(), '36', "should set new value");
            });
    });


    QUnit.module('Widgets, with QWeb', {
        beforeEach: function() {
            this.oldQWeb = core.qweb;
            core.qweb = new QWeb();
            core.qweb.add_template(
                '<no>' +
                    '<t t-name="test.widget.template">' +
                        '<ol>' +
                            '<li t-foreach="5" t-as="counter" ' +
                                't-attf-class="class-#{counter}">' +
                                '<input/>' +
                                '<t t-esc="counter"/>' +
                            '</li>' +
                        '</ol>' +
                    '</t>' +
                '</no>'
            );
        },
        afterEach: function() {
            core.qweb = this.oldQWeb;
        },
    });

    QUnit.test('basic-alias', function (assert) {
        assert.expect(1);


        var widget = new (Widget.extend({
            template: 'test.widget.template'
        }))();
        widget.renderElement();

        assert.ok(widget.$('li:eq(3)').is(widget.$el.find('li:eq(3)')),
            "should do the same thing as calling find on the widget root");
    });


    QUnit.test('delegate', async function (assert) {
        assert.expect(5);

        var a = [];
        var widget = new (Widget.extend({
            template: 'test.widget.template',
            events: {
                'click': function () {
                    a[0] = true;
                    assert.strictEqual(this, widget, "should trigger events in widget");
                },
                'click li.class-3': 'class3',
                'change input': function () { a[2] = true; }
            },
            class3: function () { a[1] = true; }
        }))();
        widget.renderElement();

        await testUtils.dom.click(widget.$el, {allowInvisible: true});
        await testUtils.dom.click(widget.$('li:eq(3)'), {allowInvisible: true});
        await testUtils.fields.editAndTrigger(widget.$('input:last'), 'foo', 'change');

        for(var i=0; i<3; ++i) {
            assert.ok(a[i], "should pass test " + i);
        }
    });

    QUnit.test('undelegate', async function (assert) {
        assert.expect(4);

        var clicked = false;
        var newclicked = false;

        var widget = new (Widget.extend({
            template: 'test.widget.template',
            events: { 'click li': function () { clicked = true; } }
        }))();

        widget.renderElement();
        widget.$el.on('click', 'li', function () { newclicked = true; });

        await testUtils.dom.clickFirst(widget.$('li'), {allowInvisible: true});
        assert.ok(clicked, "should trigger bound events");
        assert.ok(newclicked, "should trigger bound events");

        clicked = newclicked = false;
        widget._undelegateEvents();
        await testUtils.dom.clickFirst(widget.$('li'), {allowInvisible: true});
        assert.ok(!clicked, "undelegate should unbind events delegated");
        assert.ok(newclicked, "undelegate should only unbind events it created");
    });

    QUnit.module('Widget, and async stuff');

    QUnit.test("alive(alive)", async function (assert) {
        assert.expect(1);

        var widget = new (Widget.extend({}));

        await widget.start()
            .then(function () { return widget.alive(Promise.resolve()) ;})
            .then(function () { assert.ok(true); });
    });

    QUnit.test("alive(dead)", function (assert) {
        assert.expect(1);
        var widget = new (Widget.extend({}));

        return new Promise(function (resolve, reject) {
            widget.start()
            .then(function () {
                // destroy widget
                widget.destroy();
                var promise = Promise.resolve();
                // leave time for alive() to do its stuff
                promise.then(function () {
                    return Promise.resolve();
                }).then(function () {
                    assert.ok(true);
                    resolve();
                });
                // ensure that widget.alive() refuses to resolve or reject
                return widget.alive(promise);
            }).then(function () {
                reject();
                assert.ok(false, "alive() should not terminate by default");
            }).catch(function() {
                reject();
                assert.ok(false, "alive() should not terminate by default");
            });
        });
    });

    QUnit.test("alive(alive, true)", function (assert) {
        assert.expect(1);
        var widget = new (Widget.extend({}));
        return widget.start()
        .then(function () { return widget.alive(Promise.resolve(), true); })
        .then(function () { assert.ok(true); });
    });

    /*QUnit.test("alive(dead, true)", function (assert) {
        assert.expect(1);
        var done = assert.async();

        var widget = new (Widget.extend({}));

        widget.start()
        .then(function () {
            // destroy widget
            widget.destroy();
            return widget.alive(Promise.resolve(), true);
        }).then(function () {
            assert.ok(false, "alive(p, true) should fail its promise");
            done();
        }, function () {
            assert.ok(true, "alive(p, true) should fail its promise");
            done();
        });
    });*/

    QUnit.test("calling _rpc on destroyed widgets", async function (assert) {
        assert.expect(3);

        var def;
        var parent = new Widget();
        testUtils.mock.addMockEnvironment(parent, {
            session: {
                rpc: function () {
                    def = testUtils.makeTestPromise();
                    def.abort = def.reject;
                    return def;
                },
            },
            services: {
                ajax: AjaxService
            },
        });
        var widget = new Widget(parent);

        widget._rpc({route: '/a/route'}).then(function () {
            assert.ok(true, "The ajax call should be resolve");
        });
        def.resolve();
        await testUtils.nextMicrotaskTick();
        def = null;

        widget._rpc({route: '/a/route'}).then(function () {
            throw Error("Calling _rpc on a destroyed widget should return a " +
            "deferred that is never resolved nor rejected");
        }).catch(function () {
            throw Error("Calling _rpc on a destroyed widget should return a " +
            "deferred that is never resolved nor rejected");
        });
        widget.destroy();
        def.resolve();
        await testUtils.nextMicrotaskTick();
        def = null;

        widget._rpc({route: '/a/route'}).then(function () {
            throw Error("Calling _rpc on a destroyed widget should return a " +
                "deferred that is never resolved nor rejected");
        }).catch(function () {
            throw Error("Calling _rpc on a destroyed widget should return a " +
            "deferred that is never resolved nor rejected");
        });
        assert.ok(!def,
            "The trigger_up is not performed and the call returns a deferred "+
                "never resolved nor rejected");

        assert.ok(true,
            "there should be no crash when calling _rpc on a destroyed widget");
        parent.destroy();
    });

    QUnit.test('start is not called when widget is destroyed', function (assert) {
        assert.expect(0);
        var slowWillStartPromise = testUtils.makeTestPromise();
        var $fix = $( "#qunit-fixture");

        var widget = new (Widget.extend({
            willStart: function () {
                return slowWillStartPromise;
            },
            start: function () {
                throw new Error('Should not call start method');
            },
        }))();

        widget.appendTo($fix);
        widget.destroy();
        slowWillStartPromise.resolve();
    });

});

});