from odoo import fields, models, api
import uuid


class ReferralCampaign(models.Model):
    _name = 'website_crm_referral.referral.campaign'
    _description = 'Referral campaign'

    name = fields.Char()
    subject = fields.Char()
    reward = fields.Char()
    description = fields.Html()
    referrals = fields.One2many('website_crm_referral.referral', 'campaign_id')
    mail_template_id = fields.Many2one(
        'mail.template',
        string='Email Template',
        domain=[('model', '=', 'website_crm_referral.referral')])
    crm_stages = fields.Many2many('crm.stage', string="CRM Stages")


class Referral(models.Model):
    _name = 'website_crm_referral.referral'
    _description = 'Allow customers to send referral links.'

    user_id = fields.Many2one('res.users', string='Referrer')
    referred_id = fields.Many2one('res.partner')
    comment = fields.Text()
    crm_stage_id = fields.Many2one('crm.stage', string='CRM Stage')
    channel = fields.Selection([
        ('direct', 'Link'),
        ('facebook', 'Facebook'),
        ('twitter', 'Twitter'),
        ('linkedin', 'Linkedin')], default='direct')
    url = fields.Char(readonly=True, compute='_compute_url')
    lead_id = fields.Many2one('crm.lead')
    campaign_id = fields.Many2one('website_crm_referral.referral.campaign', required=True)

    @api.model
    def create(self, vals):
        if 'crm_stage_id' not in vals and 'campaign_id' in vals:
            campaign = self.env['website_crm_referral.referral.campaign'].search([('id', '=', vals['campaign_id'])], limit=1)
            stages = sorted(campaign.crm_stages, key=lambda s: s.sequence)
            if(len(stages) > 0):
                vals['crm_stage_id'] = stages[0].id
        return super().create(vals)

    @api.constrains('crm_stage_id')
    def _crm_stage_in_campaign(self):
        for r in self:
            if(r.crm_stage_id not in r.campaign_id.crm_stages):
                raise ValueError('Stage not valid for this referral')

    @api.depends('channel')
    def _compute_url(self):
        if not self.env.user.utm_source_id:
            utm_name = ('%s-%s') % (self.env.user.name, str(uuid.uuid4())[:6])
            self.env.user.utm_source_id = self.env['utm.source'].sudo().create({'name': utm_name}).id

        link_tracker = self.env['link.tracker'].sudo().create({
            'url': '/referral',  #TODO : id for specific referral
            #TODO 'campaign_id': self.env.ref(customer_referralProgram''),
            'source_id': self.env.user.utm_source_id.id,
            'medium_id': self.env.ref('utm.utm_medium_%s' % self.channel).id
        })
        if self.channel == 'direct':
            self.url = link_tracker.short_url
        elif self.channel == 'facebook':
            self.url = 'https://www.facebook.com/sharer/sharer.php?u=%s' % link_tracker.short_url
        elif self.channel == 'twitter':
            self.url = 'https://twitter.com/intent/tweet?tw_p=tweetbutton&text=Amazing job offer for %s! Check it live: %s' % (self.job_id.name, link_tracker.short_url)
        elif self.channel == 'linkedin':
            self.url = 'https://www.linkedin.com/shareArticle?mini=true&url=%s' % link_tracker.short_url

    def send_mail(self):
        self.ensure_one()
        self.campaign_id.mail_template_id.send_mail(self.id, force_send=True)
