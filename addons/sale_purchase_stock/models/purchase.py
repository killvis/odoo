# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _


class PurchaseOrder(models.Model):
    _inherit = 'purchase.order'

    mto_sale_orders_ids = fields.Many2many('sale.order', 'purchase_sale_rel', 'purchase_id', 'sale_id',
                                           compute='_compute_mto_sale_orders', store=True, string="Source Sale orders")
    mto_sale_orders_count = fields.Integer('Number of source sale orders ', compute='_compute_mto_sale_orders', store=True)

    @api.depends('order_line.move_dest_ids.group_id.sale_id')
    def _compute_mto_sale_orders(self):
        for purchase in self:
            purchase.mto_sale_orders_ids = purchase.order_line.move_dest_ids.group_id.sale_id
            purchase.mto_sale_orders_count = len(purchase.mto_sale_orders_ids)

    def action_view_mto_sale_orders(self):
        self.ensure_one()
        return {
            'name': _('Sources Sale Orders %s' % self.name),
            'domain': [('id', 'in', self.mto_sale_orders_ids.ids)],
            'res_model': 'sale.order',
            'type': 'ir.actions.act_window',
            'view_mode': 'tree,form',
        }
