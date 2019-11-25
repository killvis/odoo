# -*- coding: utf-8 -*-

import datetime
from dateutil.relativedelta import relativedelta

from odoo.addons.event.tests.common import TestEventCommon
from odoo.exceptions import ValidationError, UserError, AccessError
from odoo.tools import mute_logger
from odoo.fields import Datetime
try:
    from unittest.mock import patch
except ImportError:
    from mock import patch


class TestEventFlow(TestEventCommon):

    @mute_logger('odoo.addons.base.models.ir_model', 'odoo.models')
    def test_00_basic_event_auto_confirm(self):
        """ Basic event management with auto confirmation """
        # EventUser creates a new event: ok
        test_event = self.env['event.event'].with_user(self.user_eventmanager).create({
            'name': 'TestEvent',
            'auto_confirm': True,
            'date_begin': datetime.datetime.now() + relativedelta(days=-1),
            'date_end': datetime.datetime.now() + relativedelta(days=1),
            'seats_max': 2,
            'seats_availability': 'limited',
        })

        # EventUser create registrations for this event
        test_reg1 = self.env['event.registration'].with_user(self.user_eventuser).create({
            'name': 'TestReg1',
            'event_id': test_event.id,
        })
        self.assertEqual(test_reg1.state, 'open', 'Event: auto_confirmation of registration failed')
        self.assertEqual(test_event.seats_reserved, 1, 'Event: wrong number of reserved seats after confirmed registration')
        test_reg2 = self.env['event.registration'].with_user(self.user_eventuser).create({
            'name': 'TestReg2',
            'event_id': test_event.id,
        })
        self.assertEqual(test_reg2.state, 'open', 'Event: auto_confirmation of registration failed')
        self.assertEqual(test_event.seats_reserved, 2, 'Event: wrong number of reserved seats after confirmed registration')

        # EventUser create registrations for this event: too much registrations
        with self.assertRaises(ValidationError):
            self.env['event.registration'].with_user(self.user_eventuser).create({
                'name': 'TestReg3',
                'event_id': test_event.id,
            })

        # EventUser validates registrations
        test_reg1.action_reg_close()
        self.assertEqual(test_reg1.state, 'done', 'Event: wrong state of attended registration')
        self.assertEqual(test_event.seats_used, 1, 'Event: incorrect number of attendees after closing registration')
        test_reg2.action_reg_close()
        self.assertEqual(test_reg1.state, 'done', 'Event: wrong state of attended registration')
        self.assertEqual(test_event.seats_used, 2, 'Event: incorrect number of attendees after closing registration')

    @mute_logger('odoo.addons.base.models.ir_model', 'odoo.models')
    def test_10_advanced_event_flow(self):
        """ Avanced event flow: no auto confirmation, manage minimum / maximum
        seats, ... """
        # EventUser creates a new event: ok
        test_event = self.env['event.event'].with_user(self.user_eventmanager).create({
            'name': 'TestEvent',
            'date_begin': datetime.datetime.now() + relativedelta(days=-1),
            'date_end': datetime.datetime.now() + relativedelta(days=1),
            'seats_max': 10,
        })

        # EventUser create registrations for this event -> no auto confirmation
        test_reg1 = self.env['event.registration'].with_user(self.user_eventuser).create({
            'name': 'TestReg1',
            'event_id': test_event.id,
        })
        self.assertEqual(
            test_reg1.state, 'draft',
            'Event: new registration should not be confirmed with auto_confirmation parameter being False')

    def test_event_access_rights(self):
        # EventManager required to create or update events
        with self.assertRaises(AccessError):
            self.env['event.event'].with_user(self.user_eventuser).create({
                'name': 'TestEvent',
                'date_begin': datetime.datetime.now() + relativedelta(days=-1),
                'date_end': datetime.datetime.now() + relativedelta(days=1),
                'seats_max': 10,
            })
        with self.assertRaises(AccessError):
            self.event_0.with_user(self.user_eventuser).write({
                'name': 'TestEvent Modified',
            })

        # Settings access rights required to enable some features
        self.user_eventmanager.write({'groups_id': [
            (3, self.env.ref('base.group_system').id),
            (4, self.env.ref('base.group_erp_manager').id)
        ]})
        with self.assertRaises(AccessError):
            event_config = self.env['res.config.settings'].with_user(self.user_eventmanager).create({
            })
            event_config.execute()

    def test_event_data(self):
        self.event_0.write({'registration_ids': [(0, 0, {'partner_id': self.user_eventuser.partner_id.id})]})
        self.assertEqual(self.event_0.registration_ids.get_date_range_str(), u'tomorrow')
        self.event_0.write({
            'date_begin': '2019-11-09 14:30:00',
            'date_end': '2019-11-10 00:00:00',
            'date_tz': 'Mexico/General'
        })
        self.assertTrue(self.event_0.is_one_day)

    def test_event_date_range(self):
        self.event_0.write({'registration_ids': [(0, 0, {'partner_id': self.user_eventuser.partner_id.id})]})
        self.patcher = patch('odoo.addons.event.models.event.fields.Datetime', wraps=Datetime)
        self.mock_datetime = self.patcher.start()

        self.mock_datetime.now.return_value = datetime.datetime(2015, 12, 31, 12, 0)

        self.event_0.date_begin = datetime.datetime(2015, 12, 31, 18, 0)
        self.assertEqual(self.event_0.registration_ids.get_date_range_str(), u'today')

        self.event_0.date_begin = datetime.datetime(2016, 1, 1, 6, 0)
        self.assertEqual(self.event_0.registration_ids.get_date_range_str(), u'tomorrow')

        self.event_0.date_begin = datetime.datetime(2016, 1, 2, 6, 0)
        self.assertEqual(self.event_0.registration_ids.get_date_range_str(), u'in 2 days')

        self.mock_datetime.now.return_value = datetime.datetime(2015, 12, 10, 12, 0)
        self.event_0.date_begin = datetime.datetime(2016, 1, 25, 6, 0)
        self.assertEqual(self.event_0.registration_ids.get_date_range_str(), u'next month')

        self.patcher.stop()
