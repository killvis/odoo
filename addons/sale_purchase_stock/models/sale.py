# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _


class SaleOrder(models.Model):
    _inherit = 'sale.order'

    mto_purchase_order_ids = fields.Many2many('purchase.order', 'purchase_sale_rel', 'sale_id', 'purchase_id',
                                              string="Purchase Order Generated")
    mto_purchase_orders_count = fields.Integer('Sale order source', compute='_compute_mto_purchase_orders', store=True)

    @api.depends('mto_purchase_order_ids')
    def _compute_mto_purchase_orders(self):
        for purchase in self:
            purchase.mto_purchase_orders_count = len(purchase.mto_purchase_order_ids)

    def action_view_mto_purchase_orders(self):
        self.ensure_one()
        return {
            'name': _('Purchase Order generated from %s' % self.name),
            'domain': [('id', 'in', self.mto_purchase_order_ids.ids)],
            'res_model': 'purchase.order',
            'type': 'ir.actions.act_window',
            'view_mode': 'tree,form',
        }
