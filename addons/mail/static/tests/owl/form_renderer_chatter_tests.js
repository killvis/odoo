odoo.define('mail.FormRendererChatterTests', function (require) {
"use strict";

const FormView = require('web.FormView');

const {
    afterNextRender,
    pause,
    start,
} = require('mail.messagingTestUtils');

QUnit.module('mail.messaging', {}, function () {
QUnit.module('Chatter', {
    beforeEach: function () {
        this.underscoreDebounce = _.debounce;
        this.underscoreThrottle = _.throttle;
        _.debounce = _.identity;
        _.throttle = _.identity;
        this.data = {
            'ir.attachment': {
                fields:{
                    name:{type:'char', string:"attachment name", required:true},
                    res_model:{type:'char', string:"res model"},
                    res_id:{type:'integer', string:"res id"},
                    url:{type:'char', string:'url'},
                    type:{ type:'selection', selection:[['url',"URL"],['binary',"BINARY"]]},
                    mimetype:{type:'char', string:"mimetype"},
                },
                records:[
                    {id:1, type:'url', mimetype:'image/png', name:'filename.jpg',
                     res_id: 7, res_model: 'partner'},
                    {id:2, type:'binary', mimetype:"application/x-msdos-program",
                     name:"file2.txt", res_id: 7, res_model: 'partner'},
                    {id:3, type:'binary', mimetype:"application/x-msdos-program",
                     name:"file3.txt", res_id: 5, res_model: 'partner'},
                ],
            },
            'mail.message': {
                fields: {
                    attachment_ids: {
                        string: "Attachments",
                        type: 'many2many',
                        relation: 'ir.attachment',
                        default: [],
                    },
                    author_id: {
                        string: "Author",
                        relation: 'res.partner',
                    },
                    body: {
                        string: "Contents",
                        type: 'html',
                    },
                    date: {
                        string: "Date",
                        type: 'datetime',
                    },
                    is_note: {
                        string: "Note",
                        type: 'boolean',
                    },
                    is_discussion: {
                        string: "Discussion",
                        type: 'boolean',
                    },
                    is_notification: {
                        string: "Notification",
                        type: 'boolean',
                    },
                    is_starred: {
                        string: "Starred",
                        type: 'boolean',
                    },
                    model: {
                        string: "Related Document Model",
                        type: 'char',
                    },
                    res_id: {
                        string: "Related Document ID",
                        type: 'integer',
                    }
                },
                records: [],
            },
            'res.partner': {
                fields: {
                    display_name: { string: "Displayed name", type: "char" },
                    foo: { string: "Foo", type: "char", default: "My little Foo Value" },
                    message_follower_ids: {
                        string: "Followers",
                        type: "one2many",
                        relation: 'mail.followers',
                        relation_field: "res_id",
                    },
                    message_ids: {
                        string: "messages",
                        type: "one2many",
                        relation: 'mail.message',
                        relation_field: "res_id",
                    },
                    activity_ids: {
                        string: 'Activities',
                        type: 'one2many',
                        relation: 'mail.activity',
                        relation_field: 'res_id',
                    },
                    activity_exception_decoration: {
                        string: 'Decoration',
                        type: 'selection',
                        selection: [['warning', 'Alert'], ['danger', 'Error']],
                    },
                    activity_exception_icon: {
                        string: 'icon',
                        type: 'char',
                    },
                    activity_state: {
                        string: 'State',
                        type: 'selection',
                        selection: [['overdue', 'Overdue'], ['today', 'Today'], ['planned', 'Planned']],
                    },
                    message_attachment_count: {
                        string: 'Attachment count',
                        type: 'integer',
                    },
                },
                records: [{
                    id: 1,
                    message_attachment_count: 0,
                    display_name: "first partner",
                    foo: "HELLO",
                    message_follower_ids: [],
                    message_ids: [],
                    activity_ids: [],
                }, {
                    id: 2,
                    message_attachment_count: 0,
                    display_name: "second partner",
                    foo: "HELLO BITCH",
                    message_follower_ids: [],
                    message_ids: [],
                    activity_ids: [],
                }]
            }
        };
    },
    afterEach: function () {
        _.debounce = self.underscoreDebounce;
        _.throttle = self.underscoreThrottle;
    }
});

QUnit.test('basic chatter rendering', async function (assert) {
    assert.expect(1);
    const { widget } = await start({
        hasView: true,
        async mockRPC(route, args) {
            const _super = this._super.bind(this, route, args); // limitation on class.js with async/await
            if (route === '/mail/init_messaging') {
                return {
                    channel_slots: {},
                    commands: [],
                    is_moderator: false,
                    mail_failures: [],
                    mention_partner_suggestions: [],
                    menu_id: false,
                    moderation_counter: 0,
                    moderation_channel_ids: [],
                    needaction_inbox_counter: 0,
                    shortcodes: [],
                    starred_counter: 0,
                }
            }
            return _super();
},
        // View params
        View: FormView,
        model: 'res.partner',
        data: this.data,
        arch: `<form string="Partners">
                <sheet>
                    <field name="foo"/>
                </sheet>
                <div class="oe_chatter"></div>
            </form>`,
        res_id: 2,
    });

    await afterNextRender();

    assert.strictEqual(
        document.querySelectorAll(`.o_Chatter`).length,
        1,
        "there should be a chatter"
    );
    widget.destroy();
});

QUnit.test('chatter updating', async function (assert) {
    assert.expect(6);

    const { widget } = await start({
        hasView: true,
        async mockRPC(route, args) {
            const _super = this._super.bind(this, route, args); // limitation on class.js with async/await
            if (route === '/mail/init_messaging') {
                return {
                    channel_slots: {},
                    commands: [],
                    is_moderator: false,
                    mail_failures: [],
                    mention_partner_suggestions: [],
                    menu_id: false,
                    moderation_counter: 0,
                    moderation_channel_ids: [],
                    needaction_inbox_counter: 0,
                    shortcodes: [],
                    starred_counter: 0,
                }
            } else if (route === '/web/dataset/call_kw/mail.message/message_fetch') {
                if(args.args[0][1][2] === 1) {
                    assert.step('message_fetch_res_id_1');
                    return [];
                } else {
                    assert.step('message_fetch_res_id_2');
                    return [{
                        id: 1,
                        body: "<p>test 1</p>",
                        author_id: [100, "Someone"],
                        channel_ids: [1],
                        model: 'mail.channel',
                        res_id: 1,
                        moderation_status: 'accepted',
                    }];
                }
            }
            return _super();
        },
        // View params
        View: FormView,
        model: 'res.partner',
        data: this.data,
        res_id: 1,
        viewOptions: {
            ids: [1, 2],
            index: 0
        },
        arch: `<form string="Partners">
            <sheet>
                <field name="foo"/>
            </sheet>
            <div class="oe_chatter"></div>
        </form>`,
    });
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll(`.o_Chatter`).length,
        1,
        "there should be a chatter"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_Message`).length,
        0,
        "there should be no message"
    );

    document.querySelector(`.o_pager_next`).click();
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll(`.o_Message`).length,
        1,
        "there should be a message"
    );
    assert.verifySteps(['message_fetch_res_id_1', 'message_fetch_res_id_2']);

    // teardown
    widget.destroy();
});

});
});
