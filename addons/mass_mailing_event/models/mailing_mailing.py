# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, api, _
from odoo.exceptions import UserError


class MassMailingCampaign(models.Model):
    _inherit = "mailing.mailing"

    @api.constrains('mailing_model_id', 'mailing_domain')
    def _check_domain_for_event_registration(self):
        for mass_mailing in self:
            if mass_mailing.mailing_model_name == 'event.registration' and 'event_id' not in mass_mailing.mailing_domain:
                raise UserError(_('You must filter on the event to contact attendees'))

    def _get_default_mailing_domain(self):
        mailing_domain = super(MassMailingCampaign, self)._get_default_mailing_domain()
        if self.mailing_model_name == 'event.registration' and not mailing_domain:
            mailing_domain = self.env.context.get('default_mailing_domain', [])
        return mailing_domain
