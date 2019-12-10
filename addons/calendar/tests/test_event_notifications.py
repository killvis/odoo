# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from unittest import skip
from datetime import datetime, date
from dateutil.relativedelta import relativedelta

from odoo.tests.common import SavepointCase, new_test_user
from odoo.addons.mail.tests.common import MailCase


class TestEventNotifications(SavepointCase, MailCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.event = cls.env['calendar.event'].create({
            'name': "Doom's day",
            'start': datetime(2019, 10, 25, 8, 0),
            'stop': datetime(2019, 10, 27, 18, 0),
        }).with_context(mail_notrack=True)
        cls.user = new_test_user(cls.env, 'xav', email='em@il.com', notification_type='inbox')
        cls.partner = cls.user.partner_id

    def test_attendee_added(self):
        self.event.partner_ids = self.partner
        self.assertTrue(self.event.attendee_ids, "It should have created an attendee")
        self.assertEqual(self.event.attendee_ids.partner_id, self.partner, "It should be linked to the partner")
        self.assertIn(self.partner, self.event.message_follower_ids.partner_id, "He should be follower of the event")

    def test_attendee_added_create(self):
        event = self.env['calendar.event'].create({
            'name': "Doom's day",
            'start': datetime(2019, 10, 25, 8, 0),
            'stop': datetime(2019, 10, 27, 18, 0),
            'partner_ids': [(4, self.partner.id)],
        })
        self.assertTrue(event.attendee_ids, "It should have created an attendee")
        self.assertEqual(event.attendee_ids.partner_id, self.partner, "It should be linked to the partner")
        self.assertIn(self.partner, event.message_follower_ids.partner_id, "He should be follower of the event")

    def test_attendee_added_multi(self):
        event = self.env['calendar.event'].create({
            'name': "Doom's day",
            'start': datetime(2019, 10, 25, 8, 0),
            'stop': datetime(2019, 10, 27, 18, 0),
        })
        events = self.event | event
        events.partner_ids = self.partner
        self.assertEqual(len(events.attendee_ids), 2, "It should have created one attendee per event")

    def test_existing_attendee_added(self):
        self.event.partner_ids = self.partner
        attendee = self.event.attendee_ids
        self.event.write({'partner_ids': [(4, self.partner.id)]})  # Add existing partner
        self.assertEqual(self.event.attendee_ids, attendee, "It should not have created an new attendee record")

    def test_attendee_add_self(self):
        self.event.with_user(self.user).partner_ids = self.partner
        self.assertTrue(self.event.attendee_ids, "It should have created an attendee")
        self.assertEqual(self.event.attendee_ids.partner_id, self.partner, "It should be linked to the partner")
        self.assertEqual(self.event.attendee_ids.state, 'accepted', "It should be accepted for the current user")

    def test_attendee_removed(self):
        partner_bis = self.env['res.partner'].create({'name': "Xavier"})
        self.event.partner_ids = partner_bis
        attendee = self.event.attendee_ids
        self.event.partner_ids |= self.partner
        self.event.partner_ids -= self.partner
        self.assertEqual(attendee, self.event.attendee_ids, "It should not have re-created an attendee record")
        self.assertNotIn(self.partner, self.event.attendee_ids.partner_id, "It should have removed the attendee")
        self.assertNotIn(self.partner, self.event.message_follower_ids.partner_id, "It should have unsubscribed the partner")
        self.assertIn(partner_bis, self.event.attendee_ids.partner_id, "It should have left the attendee")

    def test_message_invite(self):
        with self.assertSinglePostNotifications([{'partner': self.partner, 'type': 'inbox'}], {
            'message_type': 'user_notification',
            'subtype': 'mail.mt_note',
        }):
            self.event.partner_ids = self.partner

    def test_message_invite_self(self):
        with self.assertNoNotifications():
            self.event.with_user(self.user).partner_ids = self.partner

    def test_message_inactive_invite(self):
        self.event.active = False
        with self.assertNoNotifications():
            self.event.partner_ids = self.partner

    def test_message_set_inactive_invite(self):
        self.event.active = False
        with self.assertNoNotifications():
            self.event.write({
                'partner_ids': [(4, self.partner.id)],
                'active': False,
            })

    def test_message_datetime_changed(self):
        self.event.partner_ids = self.partner
        "Invitation to Presentation of the new Calendar"
        with self.assertSinglePostNotifications([{'partner': self.partner, 'type': 'inbox'}], {
            'message_type': 'user_notification',
            'subtype': 'mail.mt_note',
        }):
            self.event.start += relativedelta(days=-1)

    def test_message_date_changed(self):
        self.event.write({
            'allday': True,
            'start_date': date(2019, 10, 15),
            'stop_date': date(2019, 10, 15),
        })
        self.event.partner_ids = self.partner
        with self.assertSinglePostNotifications([{'partner': self.partner, 'type': 'inbox'}], {
            'message_type': 'user_notification',
            'subtype': 'mail.mt_note',
        }):
            self.event.start_date += relativedelta(days=-1)

    def test_message_set_inactive_date_changed(self):
        self.event.write({
            'allday': True,
            'start_date': date(2019, 10, 15),
            'stop_date': date(2019, 10, 15),
        })
        self.event.partner_ids = self.partner
        with self.assertNoNotifications():
            self.event.write({
                'start_date': self.event.start_date - relativedelta(days=1),
                'active': False,
            })

    def test_message_inactive_date_changed(self):
        self.event.write({
            'allday': True,
            'start_date': date(2019, 10, 15),
            'stop_date': date(2019, 10, 15),
            'active': False,
        })
        self.event.partner_ids = self.partner
        with self.assertNoNotifications():
            self.event.start_date += relativedelta(days=-1)

    def test_message_add_and_date_changed(self):
        self.event.partner_ids -= self.partner
        with self.assertSinglePostNotifications([{'partner': self.partner, 'type': 'inbox'}], {
            'message_type': 'user_notification',
            'subtype': 'mail.mt_note',
        }):
            self.event.write({
                'start': self.event.start - relativedelta(days=1),
                'partner_ids': [(4, self.partner.id)],
            })

    @skip("Currently broken in master")
    def test_bus_notif(self):
        alarm = self.env['calendar.alarm'].create({
            'name': 'Alarm',
            'alarm_type': 'notification',
            'interval': 'minutes',
            'duration': 30,
        })
        self.event.write({
            'start': datetime.now() + relativedelta(minutes=945),
            'stop': datetime.now() + relativedelta(minutes=950),
            'partner_ids': [(4, self.partner.id)],
            'alarm_ids': [(4, alarm.id)]
        })

        with self.assertBus([(self.env.cr.dbname, 'calendar.alarm', self.partner.id)]):
            self.env['calendar.alarm_manager']._notify_next_alarm(self.partner.ids)
            self.env['calendar.alarm_manager']._get_next_potential_limit_alarm('notification', 900000000)

    @skip("Currently broken in master")
    def test_email_alarm(self):
        alarm = self.env['calendar.alarm'].create({
            'name': 'Alarm',
            'alarm_type': 'email',
            'interval': 'minutes',
            'duration': 30,
        })
        self.event.write({
            'start': datetime.now() + relativedelta(minutes=25),
            'stop': datetime.now() + relativedelta(minutes=40),
            'partner_ids': [(4, self.partner.id)],
            'alarm_ids': [(4, alarm.id)]
        })
        with self.mock_mail_gateway():
            self.env['calendar.alarm_manager']._get_partner_next_mail(self.partner)
        self.assertEqual(len(self._new_mails), 1, "It should have sent a reminder")
