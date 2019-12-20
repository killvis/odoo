odoo.define('mail.component.ChatterTopBarTests', function (require) {
'use strict';

const ChatterTopBar = require('mail.component.ChatterTopbar');
const {
    afterEach: utilsAfterEach,
    afterNextRender,
    beforeEach: utilsBeforeEach,
    pause,
    start: utilsStart,
} = require('mail.messagingTestUtils');

QUnit.module('mail.messaging', {}, function () {
QUnit.module('component', {}, function () {
QUnit.module('ChatterTopbar', {
    beforeEach() {
        utilsBeforeEach(this);
        this.createThread = async ({ _model, id }, { fetchAttachments=false }={}) => {
            const threadLocalId = this.env.store.dispatch('_createThread', { _model, id });
            if (fetchAttachments) {
                await this.env.store.dispatch('_fetchThreadAttachments', threadLocalId);
            }
            return threadLocalId;
        };
        this.createChatterTopbar = async (threadLocalId, otherProps) => {
            ChatterTopBar.env = this.env;
            const defaultProps = {
                isComposerLog: false,
                isComposerVisible: false
            };
            this.chatterTopbar = new ChatterTopBar(null, Object.assign({ threadLocalId }, defaultProps, otherProps));
            await this.chatterTopbar.mount(this.widget.el);
        };
        this.start = async params => {
            if (this.widget) {
                this.widget.destroy();
            }
            let { env, widget } = await utilsStart(Object.assign({}, params, {
                data: this.data,
            }));
            this.env = env;
            this.widget = widget;
        };
    },
    afterEach() {
        utilsAfterEach(this);
        if (this.chatterTopbar) {
            this.chatterTopbar.destroy();
        }
        if (this.widget) {
            this.widget.destroy();
        }
        delete ChatterTopBar.env;
        this.env = undefined;
    }
});

QUnit.test('base rendering', async function (assert) {
    assert.expect(10);

    await this.start({
        async mockRPC(route) {
            if (route.includes('ir.attachment/search_read')) {
                return [];
            }
            return this._super(...arguments);
        }
    });
    const threadLocalId = await this.createThread({
        _model: 'res.partner',
        id: 100,
    });
    await this.createChatterTopbar(threadLocalId, { isDisabled: false });
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar`).length,
        1,
        "should have a chatter topbar"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonSendMessage`).length,
        1,
        "should have a send message button in chatter menu"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonLogNote`).length,
        1,
        "should have a log note button in chatter menu"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonScheduleActivity`).length,
        1,
        "should have a schedule activity button in chatter menu"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonAttachments`).length,
        1,
        "should have an attachments button in chatter menu"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonAttachmentsCountLoader`).length,
        1,
        "attachments button should have a loader"
    );
    await this.env.store.dispatch('_fetchThreadAttachments', threadLocalId);
    await afterNextRender();
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonAttachmentsCount`).length,
        1,
        "attachments button should have a counter"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonFollow`).length,
        1,
        "should have a follow button in chatter menu"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonFollowers`).length,
        1,
        "should have a followers button in chatter menu"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonFollowersCount`).length,
        1,
        "followers button should have a counter"
    );
});

QUnit.test('base disabled rendering', async function (assert) {
    assert.expect(11);

    await this.start({
        async mockRPC(route) {
            if (route.includes('ir.attachment/search_read')) {
                return [];
            }
            return this._super(...arguments);
        }
    });
    await this.createChatterTopbar(undefined, { isDisabled: true });
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar`).length,
        1,
        "should have a chatter topbar"
    );
    assert.ok(
        document.querySelector(`.o_ChatterTopbar_buttonSendMessage`).disabled,
        "send message button should be disabled"
    );
    assert.ok(
        document.querySelector(`.o_ChatterTopbar_buttonLogNote`).disabled,
        "log note button should be disabled"
    );
    assert.ok(
        document.querySelector(`.o_ChatterTopbar_buttonScheduleActivity`).disabled,
        "schedule activity should be disabled"
    );
    assert.ok(
        document.querySelector(`.o_ChatterTopbar_buttonAttachments`).disabled,
        "attachments button should be disabled"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonAttachmentsCountLoader`).length,
        0,
        "attachments button should not have a loader"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonAttachmentsCount`).length,
        1,
        "attachments button should have a counter"
    );
    assert.strictEqual(
        document.querySelector(`.o_ChatterTopbar_buttonAttachmentsCount`).textContent,
        '0',
        "attachments button counter should be 0"
    );
    assert.ok(
        document.querySelector(`.o_ChatterTopbar_buttonFollow`).disabled,
        "follow button should be disabled"
    );
    assert.ok(
        document.querySelector(`.o_ChatterTopbar_buttonFollowers`).disabled,
        "followers button should be disabled"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonFollowersCount`).length,
        1,
        "followers button should have a counter"
    );
});

QUnit.test('attachment count without attachments', async function (assert) {
    assert.expect(4);

    await this.start({
        async mockRPC(route) {
            if (route.includes('ir.attachment/search_read')) {
                return [];
            }
            return this._super(...arguments);
        }
    });
    const threadLocalId = await this.createThread(
        { _model: 'res.partner', id: 100 },
        { fetchAttachments: true });
    await this.createChatterTopbar(threadLocalId, { isDisabled: false });
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar`).length,
        1,
        "should have a chatter topbar"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonAttachments`).length,
        1,
        "should have an attachments button in chatter menu"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonAttachmentsCount`).length,
        1,
        "attachments button should have a counter"
    );
    assert.strictEqual(
        document.querySelector(`.o_ChatterTopbar_buttonAttachmentsCount`).textContent,
        '0',
        'attachment counter should contain "0"'
    );
});

QUnit.test('attachment count with attachments', async function (assert) {
    assert.expect(4);

    await this.start({
        async mockRPC(route) {
            if (route.includes('ir.attachment/search_read')) {
                return [{
                    id: 143,
                    filename: 'Blah.txt',
                    mimetype: 'text/plain',
                    name: 'Blah.txt'
                }, {
                    id: 144,
                    filename: 'Blu.txt',
                    mimetype: 'text/plain',
                    name: 'Blu.txt'
                }];
            }
            return this._super(...arguments);
        }
    });
    const threadLocalId = await this.createThread({ _model: 'res.partner', id: 100 }, { fetchAttachments: true });
    await this.createChatterTopbar(threadLocalId, { isDisabled: false });
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar`).length,
        1,
        "should have a chatter topbar"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonAttachments`).length,
        1,
        "should have an attachments button in chatter menu"
    );
    assert.strictEqual(
        document.querySelectorAll(`.o_ChatterTopbar_buttonAttachmentsCount`).length,
        1,
        "attachments button should have a counter"
    );
    assert.strictEqual(
        document.querySelector(`.o_ChatterTopbar_buttonAttachmentsCount`).textContent,
        '2',
        'attachment counter should contain "2"'
    );
});

});
});
});
