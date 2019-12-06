# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class MergeUtmCampaign(models.TransientModel):
    _name = 'utm.campaign.merge'
    _description = 'Merge UTM Campaigns'

    @api.model
    def default_get(self, fields):
        """Use active_ids from the context to fetch the UTM campaign to merge."""
        record_ids = self._context.get('active_ids')
        result = super(MergeUtmCampaign, self).default_get(fields)
        result['campaign_ids'] = record_ids
        result['campaign_id'] = record_ids[0]
        return result

    campaign_id = fields.Many2one('utm.campaign', string='Campaign to Keep', required=True)
    name = fields.Char('Campaign Name', translate=True, compute='_compute_campaign_values', store=True, readonly=False, required=True)
    user_id = fields.Many2one('res.users', string='Responsible', compute='_compute_campaign_values', store=True, readonly=False, required=True)
    stage_id = fields.Many2one('utm.stage', string='Stage', ondelete='restrict', compute='_compute_campaign_values', store=True, readonly=False, required=True)
    tag_ids = fields.Many2many('utm.tag', compute='_compute_campaign_values', store=True, readonly=False, string='Tags')
    campaign_ids = fields.Many2many('utm.campaign', string='Campaigns')

    @api.depends('campaign_id', 'campaign_ids')
    def _compute_campaign_values(self):
        self.name = self.campaign_id.name
        self.user_id = self.campaign_id.user_id
        self.stage_id = self.campaign_id.stage_id
        self.tag_ids = self.campaign_ids.mapped('tag_ids')

    def action_merge(self):
        self.ensure_one()
        self.campaign_ids._merge_utm_campaigns(self.campaign_id, {
            'name': self.name,
            'user_id': self.user_id,
            'stage_id': self.stage_id,
            'tag_ids': self.tag_ids
        })

        action = self.env.ref('utm.utm_campaign_action').read()[0]
        action.update({
            'views': [[False, 'form']],
            'res_id': self.campaign_id.id,
            'view_mode': 'form'
        })
        return action
