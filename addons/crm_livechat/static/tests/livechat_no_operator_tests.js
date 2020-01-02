odoo.define('crm_livechat.livechatNoOperatorTest', function (require) {
"use strict";

const ajax = require('web.ajax');
const core = require('web.core');
const concurrency = require('web.concurrency');
const Livechat = require('im_livechat.im_livechat');
const mailTestUtils = require('mail.testUtils')
const testUtils = require('web.test_utils');
const Widget = require('web.Widget');
const session = require('web.session');


QUnit.module('crm_livechat', {
    before: function () {
        this.services = mailTestUtils.getMailServices();
        return ajax.loadXML('/crm_livechat/static/src/xml/im_livechat.xml', core.qweb);
}}, function () {

QUnit.test('livechat: generation of lead when operator not giving reply', async function (assert) {
    assert.expect(4);

    const parent = new Widget();
    const options = {
        channel_id: 1,
        channel_name: "YourWebsite.com",
        generate_lead: true,
    };

    const livechat = new Livechat.LivechatButton(parent, location.origin, options);

    const livechatdata = {
        operator_pid: [false, "YourCompany, Mitchell Admin"],
        uuid: "c038331c-f32d-448a-9be3-012e5b826381",
    };

    testUtils.mock.patch(session, {
        rpc: function (route, args) {
            if (route === '/im_livechat/init') {
                return Promise.resolve({available_for_me: true, rule: {}});
            } else if (route === '/im_livechat/get_session') {
                return Promise.resolve(livechatdata);
            } else if (route === '/mail/chat_post') {
                return Promise.resolve({});
            }
            return this._super.apply(this, arguments);
        }
    });

    testUtils.mock.addMockEnvironment(livechat, {
        services: this.services,
        mockRPC: function (route, args) {
            if (route === location.origin + '/livechat/generate_lead') {
                assert.strictEqual(args.channel_uuid, livechatdata.uuid, "channel should be same");
                return Promise.resolve();
            }
            return this._super.apply(this, arguments);
        }
    });

    livechat._LeadGenerationTimer._duration = 2000;
    await livechat.appendTo($('#qunit-fixture'));
    await testUtils.dom.click(livechat.$el);
    $('.o_thread_composer input').val('hi');
    $('.o_thread_composer input').trigger($.Event('keydown', {which: $.ui.keyCode.ENTER}));

    await concurrency.delay(livechat._LeadGenerationTimer._duration); // wait for lead generate form to append in chat window
    assert.ok($('#lead_create_form').length, "should show lead generation form");
    assert.hasAttrValue($('.o_thread_composer'), 'style',
        'display: none;', "input box should be invisible");
    $('#lead_create_form input[name="name"]').val('test');
    $('#lead_create_form input[name="email_from"]').val('test@odoo.com');
    await testUtils.dom.click($('#lead_create_form .btn-primary'));

    assert.hasAttrValue($('#lead_create_form'), 'style',
        'display: none;', "lead generation form should be invisible");

    testUtils.mock.unpatch(session);
    parent.destroy();
    livechat.destroy();
});

});
});
