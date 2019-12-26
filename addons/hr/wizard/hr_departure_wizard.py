# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models


class HrDepartureWizard(models.TransientModel):
    _name = 'hr.departure.wizard'
    _description = 'Departure Wizard'

    @api.model
    def default_get(self, fields):
        res = super(HrDepartureWizard, self).default_get(fields)
        if (not fields or 'employee_id' in fields) and 'employee_id' not in res:
            if self.env.context.get('active_id'):
                res['employee_id'] = self.env.context['active_id']
        return res

    departure_reason = fields.Selection([
        ('fired', 'Fired'),
        ('resigned', 'Resigned'),
        ('retired', 'Retired')
    ], string="Departure Reason", default="fired")
    departure_description = fields.Text(string="Additional Information")
    plan_id = fields.Many2one('hr.plan', default=lambda self: self.env['hr.plan'].search([], limit=1))
    employee_id = fields.Many2one('hr.employee', string='Employee', required=True)
    departure_date = fields.Date(string="Departure Date", required=True, default=fields.Date.today)
    archive_private_address = fields.Boolean('Archive Private Address', default=True)

    def action_register_departure(self):
        employee = self.employee_id
        employee.departure_reason = self.departure_reason
        employee.departure_description = self.departure_description
        employee.departure_date = self.departure_date

        # ignore contact links to internal users
        private_address = employee.address_home_id
        if private_address and private_address.active and not self.env['res.users'].search([('partner_id', '=', private_address.id)]):
            private_address.toggle_active()

        if not employee.user_id.partner_id:
            return

        for activity_type in self.plan_id.plan_activity_type_ids:
            self.env['mail.activity'].create({
                'res_id': employee.user_id.partner_id.id,
                'res_model_id': self.env['ir.model']._get('res.partner').id,
                'activity_type_id': activity_type.activity_type_id.id,
                'summary': activity_type.summary,
                'user_id': activity_type.get_responsible_id(employee).id,
            })

    def action_cancel_departure(self):
        self.employee_id.toggle_active()
